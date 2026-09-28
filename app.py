from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from functools import wraps
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json as _json
import secrets
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Carrega as configurações do arquivo .env (veja .env.example)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

def _env_obrigatoria(nome):
    valor = os.environ.get(nome)
    if not valor:
        raise RuntimeError(f"Variável {nome} não definida. Copie .env.example para .env e preencha.")
    return valor

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = _env_obrigatoria('SECRET_KEY')

# No Render o app fica atrás de um proxy HTTPS: assim os links gerados (ex.: redefinir senha) saem com https
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

def _env_bool(nome, padrao=False):
    return os.environ.get(nome, str(padrao)).strip().lower() in ('1', 'true', 'sim', 'yes')

# Debug NUNCA deve ficar ligado em produção: a página de erro permite executar código no servidor
DEBUG = _env_bool('FLASK_DEBUG')

app.config.update(
    # MAX_UPLOAD_MB é o limite por arquivo; a requisição inteira ganha folga para a imagem de prévia
    MAX_CONTENT_LENGTH=(int(os.environ.get('MAX_UPLOAD_MB', '10')) + 6) * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    # Em produção (HTTPS) use SESSION_COOKIE_SECURE=1; em localhost (HTTP) deixe 0
    SESSION_COOKIE_SECURE=_env_bool('SESSION_COOKIE_SECURE'),
)

@app.errorhandler(413)
def arquivo_grande_demais(_erro):
    limite = int(os.environ.get('MAX_UPLOAD_MB', '10'))
    mensagem = f'Arquivo muito grande. O limite é {limite} MB por arquivo.'
    if request.path.startswith('/api/') or request.path == '/custom/enviar':
        return jsonify({'ok': False, 'error': mensagem}), 413
    flash(mensagem, 'error')
    return redirect(request.referrer or url_for('index'))

# --- CONSTANTES DE ADMIN ---
ADMIN_EMAIL = _env_obrigatoria('ADMIN_EMAIL')
ADMIN_PASSWORD = _env_obrigatoria('ADMIN_PASSWORD')
UPLOAD_FOLDER = os.path.join('static', 'assets', 'projects')
COMMENT_UPLOAD_FOLDER = os.path.join('static', 'assets', 'comentarios')
MEMBROS_UPLOAD_FOLDER = os.path.join('static', 'assets', 'membros')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'jfif'}
MODEL_EXTENSIONS = {'stl', 'obj', '3mf', 'zip'}  # modelos 3D (zip = compactado pelo configurador)
CHECKOUT_FRETE_PADRAO = 18  # igual a CART_DEFAULT_SHIPPING no app.js

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Com CLOUDINARY_URL no .env as imagens vão para o Cloudinary (produção);
# sem ele, ficam salvas na pasta static/ (desenvolvimento local).
USAR_CLOUDINARY = bool(os.environ.get('CLOUDINARY_URL'))
if USAR_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(secure=True)

def salvar_upload(arquivo, pasta_local, prefixo=''):
    """Salva uma imagem enviada e devolve a URL pública dela."""
    import uuid as _uuid
    nome = f"{prefixo}{_uuid.uuid4().hex}"
    ext = os.path.splitext(secure_filename(arquivo.filename))[1].lower()
    if USAR_CLOUDINARY:
        eh_imagem = ext.lstrip('.') in ALLOWED_EXTENSIONS
        resultado = cloudinary.uploader.upload(
            arquivo.stream, folder=f"alchemist/{os.path.basename(pasta_local)}",
            public_id=nome if eh_imagem else nome + ext,
            resource_type='image' if eh_imagem else 'raw')
        return resultado['secure_url']
    os.makedirs(pasta_local, exist_ok=True)
    arquivo.save(os.path.join(pasta_local, nome + ext))
    return '/' + os.path.join(pasta_local, nome + ext).replace(os.sep, '/')

# --- MIGRAÇÃO DE SCHEMA: COLUNAS OPCIONAIS ---
def ensure_db_schema():
    """Adiciona colunas opcionais sem destruir dados existentes."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='comentarios' AND column_name='nota') THEN
                    ALTER TABLE comentarios ADD COLUMN nota INTEGER DEFAULT 5;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='comentarios' AND column_name='imagem_url') THEN
                    ALTER TABLE comentarios ADD COLUMN imagem_url TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pagamentos' AND column_name='nome_cliente') THEN
                    ALTER TABLE pagamentos ADD COLUMN nome_cliente TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='comentarios' AND column_name='resposta_vista') THEN
                    ALTER TABLE comentarios ADD COLUMN resposta_vista BOOLEAN DEFAULT FALSE;
                END IF;
                -- Remove CHECK constraint on pedidos.status para permitir labels de gestão
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'pedidos_status_check'
                    AND conrelid = 'pedidos'::regclass
                ) THEN
                    ALTER TABLE pedidos DROP CONSTRAINT pedidos_status_check;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_name='chat_suporte') THEN
                    CREATE TABLE chat_suporte (
                        id SERIAL PRIMARY KEY,
                        usuario_id TEXT NOT NULL,
                        mensagem TEXT NOT NULL,
                        enviado_por TEXT NOT NULL CHECK (enviado_por IN ('cliente', 'admin')),
                        lida BOOLEAN DEFAULT FALSE,
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                ELSE
                    -- Renomeia data_envio→criado_em em instalações antigas
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='chat_suporte' AND column_name='data_envio') THEN
                        ALTER TABLE chat_suporte RENAME COLUMN data_envio TO criado_em;
                    END IF;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_name='notificacoes_pedido') THEN
                    CREATE TABLE notificacoes_pedido (
                        id SERIAL PRIMARY KEY,
                        usuario_id TEXT NOT NULL,
                        pedido_id TEXT NOT NULL,
                        mensagem TEXT NOT NULL,
                        lida BOOLEAN DEFAULT FALSE,
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                END IF;
                -- Remove CHECK constraint on pedidos_personalizados.status to allow production statuses
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'pedidos_personalizados_status_check'
                    AND conrelid = 'pedidos_personalizados'::regclass
                ) THEN
                    ALTER TABLE pedidos_personalizados DROP CONSTRAINT pedidos_personalizados_status_check;
                END IF;
                -- Add delivery columns to pedidos_personalizados if not present
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='tipo_entrega') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN tipo_entrega TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='endereco_entrega') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN endereco_entrega TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='preview_url') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN preview_url TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='cores_json') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN cores_json TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='referencias_json') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN referencias_json TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='detalhes_json') THEN
                    ALTER TABLE pedidos_personalizados ADD COLUMN detalhes_json TEXT;
                END IF;
                -- Orçamento enviado pela loja e a decisão do cliente (aceitar / recusar / negociar)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='pedidos_personalizados' AND column_name='orcamento_valor') THEN
                    ALTER TABLE pedidos_personalizados
                        ADD COLUMN orcamento_valor NUMERIC(10,2),
                        ADD COLUMN orcamento_prazo INTEGER,
                        ADD COLUMN orcamento_mensagem TEXT,
                        ADD COLUMN orcamento_em TIMESTAMP,
                        ADD COLUMN decisao_em TIMESTAMP,
                        ADD COLUMN motivo_cliente TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='produtos' AND column_name='destaque') THEN
                    ALTER TABLE produtos ADD COLUMN destaque BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='membros_equipe' AND column_name='foto_url') THEN
                    ALTER TABLE membros_equipe ADD COLUMN foto_url TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_name='site_config') THEN
                    CREATE TABLE site_config (
                        chave TEXT PRIMARY KEY,
                        valor TEXT NOT NULL DEFAULT ''
                    );
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_name='novidade') THEN
                    CREATE TABLE novidade (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL DEFAULT '',
                        descricao TEXT DEFAULT '',
                        preco NUMERIC(10,2),
                        imagens TEXT,
                        visivel BOOLEAN DEFAULT TRUE,
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                END IF;
            END $$;
        """)
        conn.commit()
        cur.close()
        print("[DB] Schema verificado com sucesso.")
    except Exception as e:
        print(f"[DB] Aviso na migração: {e}")
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

def migrar_senhas_texto_puro():
    """Converte senhas antigas salvas em texto puro para hash (roda uma vez por senha)."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, senha_hash FROM usuarios WHERE senha_hash NOT LIKE 'scrypt:%%' AND senha_hash NOT LIKE 'pbkdf2:%%'")
        pendentes = cur.fetchall()
        for uid, senha in pendentes:
            cur.execute("UPDATE usuarios SET senha_hash = %s WHERE id = %s", (generate_password_hash(senha), uid))
        conn.commit()
        cur.close()
        if pendentes:
            print(f"[DB] {len(pendentes)} senha(s) convertida(s) para hash.")
    except Exception as e:
        print(f"[DB] Aviso na migração de senhas: {e}")
        if conn: conn.rollback()
    finally:
        if conn: conn.close()

# Configuração da Conexão com o Banco de Dados
def get_db_connection():
    # Em produção (Neon) usamos a URL completa; localmente, as variáveis DB_*
    if os.environ.get('DATABASE_URL'):
        return psycopg2.connect(os.environ['DATABASE_URL'])
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database=os.environ.get('DB_NAME', 'loja3d'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=_env_obrigatoria('DB_PASS'),
        port=os.environ.get('DB_PORT', '5432')
    )

# --- SENHAS ---
_PREFIXOS_HASH = ('scrypt:', 'pbkdf2:')

def _senha_confere(senha_hash, senha):
    """Confere a senha; aceita hashes e senhas antigas salvas em texto puro."""
    if not senha_hash:
        return False
    if senha_hash.startswith(_PREFIXOS_HASH):
        return check_password_hash(senha_hash, senha)
    return secrets.compare_digest(senha_hash.encode(), senha.encode())

# --- DECORADOR: PROTEÇÃO DE ROTAS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth', next=request.full_path.rstrip('?')))
        return f(*args, **kwargs)
    return decorated_function

# --- DECORADOR: PROTEÇÃO DE ROTAS ADMIN ---
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or not session.get('is_admin'):
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_admin_badges():
    """Contadores de pendências do menu lateral do admin (só nas páginas do admin)."""
    if not (session.get('is_admin') and (request.endpoint or '').startswith('admin')):
        return {}
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT
              (SELECT COUNT(*) FROM financeiro WHERE status_pagamento = 'Aguardando Aprovação'),
              (SELECT COUNT(*) FROM pedidos_personalizados WHERE status IN ('aguardando', 'Em Análise', 'Em negociação')),
              (SELECT COUNT(*) FROM comentarios WHERE resposta_admin IS NULL),
              (SELECT COUNT(*) FROM chat_suporte WHERE lida = FALSE AND enviado_por = 'cliente'),
              (SELECT COUNT(*) FROM pedidos WHERE COALESCE(status_pedido, status) IN ('Pedido Solicitado', 'Pagamento Aprovado'))
        """)
        fin, custom, coment, chat, pedidos = cur.fetchone()
        cur.close()
        return {'admin_badges': {'financeiro': fin, 'personalizados': custom + coment, 'suporte': chat, 'pedidos': pedidos}}
    except Exception:
        return {'admin_badges': {}}
    finally:
        if conn: conn.close()

@app.template_filter('primeira_imagem')
def _filtro_primeira_imagem(valor):
    """imagem_url pode ser uma URL ou uma lista JSON de URLs; devolve a primeira."""
    valor = (valor or '').strip()
    if valor.startswith('['):
        try:
            lista = _json.loads(valor)
            return next((u for u in lista if u), '')
        except (ValueError, TypeError):
            return ''
    return valor

@app.template_filter('brl')
def _filtro_brl(valor):
    try:
        return 'R$ ' + f"{float(valor or 0):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    except (ValueError, TypeError):
        return 'R$ 0,00'

@app.template_filter('fromjson')
def _filtro_fromjson(valor):
    try:
        return _json.loads(valor) if valor else []
    except (ValueError, TypeError):
        return []

# --- CONTEXTO GLOBAL: USUÁRIO DA SESSÃO ---
@app.context_processor
def inject_flask_user():
    if 'user_id' in session:
        flask_user = {
            'id': session['user_id'],
            'firstName': session.get('user_nome', ''),
            'lastName': session.get('user_sobrenome', ''),
            'fullName': (session.get('user_nome', '') + ' ' + session.get('user_sobrenome', '')).strip(),
            'email': session.get('user_email', ''),
            'phone': session.get('user_telefone', ''),
            'is_admin': bool(session.get('is_admin', False))
        }
    else:
        flask_user = None
    return {'flask_user': flask_user}

# --- ROTA: HOME ---
@app.route('/')
def index():
    conn = None
    comentarios = []
    produtos_js = []
    novidade_js = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id, c.texto, c.resposta_admin,
                   COALESCE(c.nota, 5) AS nota, c.imagem_url,
                   c.data_comentario AS data_postagem,
                   COALESCE(u.nome, 'Anônimo') AS nome,
                   COALESCE(u.sobrenome, '') AS sobrenome,
                   pr.nome AS produto_nome
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN produtos pr ON c.produto_id = pr.id
            ORDER BY c.data_comentario DESC NULLS LAST
            LIMIT 3
        """)
        comentarios = cur.fetchall()
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c2.nota)::numeric, 1) AS nota_media,
                COUNT(c2.id) FILTER (WHERE c2.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c2 ON c2.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos_js = [_produto_to_js(p) for p in cur.fetchall()]
        try:
            cur.execute("SELECT * FROM novidade ORDER BY id DESC LIMIT 1")
            nov = cur.fetchone()
            if nov and nov.get('visivel'):
                imgs = _json.loads(nov['imagens']) if nov.get('imagens') else []
                novidade_js = {'nome': nov['nome'], 'descricao': nov.get('descricao') or '', 'preco': float(nov['preco']) if nov.get('preco') else None, 'imagens': imgs}
        except Exception as e_nov:
            print(f"[novidade] {e_nov}")
            conn.rollback()
        cur.close()
    except Exception as e:
        print(f"Erro na home: {e}")
    finally:
        if conn: conn.close()
    return render_template('index.html', comentarios=comentarios,
                           produtos_json=_json.dumps(produtos_js, ensure_ascii=False),
                           novidade_json=_json.dumps(novidade_js, ensure_ascii=False))

@app.route('/favicon.ico')
def favicon():
    return redirect(url_for('static', filename='assets/icons/logo-alchemist.png'))

# --- VALIDAÇÕES DE CADASTRO (as mesmas regras do app.js) ---
import re as _re_conta
import hashlib as _hashlib

_REGRAS_SENHA = [
    (lambda s: len(s) >= 8, 'mínimo de 8 caracteres'),
    (lambda s: _re_conta.search(r'[A-Z]', s), 'uma letra maiúscula'),
    (lambda s: _re_conta.search(r'[a-z]', s), 'uma letra minúscula'),
    (lambda s: _re_conta.search(r'[^A-Za-z0-9]', s), 'um caractere especial'),
]

def _erro_senha(senha):
    """Devolve a mensagem de erro da senha, ou None se ela atende todas as regras."""
    faltando = [msg for regra, msg in _REGRAS_SENHA if not regra(senha or '')]
    return ('A senha precisa ter ' + ', '.join(faltando) + '.') if faltando else None

def _so_digitos(valor):
    return _re_conta.sub(r'\D', '', valor or '')

def _cpf_valido(cpf):
    d = _so_digitos(cpf)
    if len(d) != 11 or d == d[0] * 11:
        return False
    for tam in (9, 10):
        soma = sum(int(d[i]) * (tam + 1 - i) for i in range(tam))
        if (soma * 10 % 11) % 10 != int(d[tam]):
            return False
    return True

def _telefone_valido(tel):
    return len(_so_digitos(tel)) in (10, 11)

def _email_valido(email):
    return bool(_re_conta.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email or ''))

def _voltar_auth(aba, **extra):
    return redirect(url_for('auth', tab=aba, **{k: v for k, v in extra.items() if v}))

def _proximo_seguro(padrao):
    nxt = request.args.get('next') or ''
    return nxt if nxt.startswith('/') and not nxt.startswith('//') else padrao


# --- E-MAIL (Brevo, via HTTPS) ---
# Configure BREVO_API_KEY e EMAIL_REMETENTE no .env / Render. Sem isso, o link de
# redefinição de senha só aparece no log do servidor (e o admin pode gerar pelo painel).
def _enviar_email(para, assunto, html):
    import urllib.request
    chave = os.environ.get('BREVO_API_KEY', '').strip()
    remetente = os.environ.get('EMAIL_REMETENTE', '').strip()
    if not chave or not remetente:
        return False
    corpo = _json.dumps({
        'sender': {'name': 'ALCHEMIST 3D', 'email': remetente},
        'to': [{'email': para}],
        'subject': assunto,
        'htmlContent': html,
    }).encode()
    req = urllib.request.Request('https://api.brevo.com/v3/smtp/email', data=corpo, method='POST', headers={
        'api-key': chave, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return 200 <= resp.status < 300
    except Exception as e:
        print(f"[E-mail] Falha ao enviar para {para}: {e}")
        return False


# --- REDEFINIÇÃO DE SENHA ---
# O link leva um token aleatório; no banco fica só o hash dele (tokens_redefinicao_senha).
_VALIDADE_TOKEN_MIN = 60

def _hash_token(token):
    return _hashlib.sha256(token.encode()).hexdigest()

def _criar_link_redefinicao(cur, usuario_id):
    """Invalida os links anteriores do usuário e cria um novo. Devolve a URL completa."""
    token = secrets.token_urlsafe(32)
    cur.execute("UPDATE tokens_redefinicao_senha SET usado = TRUE WHERE usuario_id = %s AND usado = FALSE", (usuario_id,))
    cur.execute("""
        INSERT INTO tokens_redefinicao_senha (usuario_id, token, expira_em, usado)
        VALUES (%s, %s, NOW() + make_interval(mins => %s), FALSE)
    """, (usuario_id, _hash_token(token), _VALIDADE_TOKEN_MIN))
    return url_for('redefinir_senha', token=token, _external=True)

def _buscar_token_valido(cur, token):
    cur.execute("""
        SELECT t.id, t.usuario_id, u.nome, u.email
        FROM tokens_redefinicao_senha t JOIN usuarios u ON u.id = t.usuario_id
        WHERE t.token = %s AND t.usado = FALSE AND t.expira_em > NOW()
    """, (_hash_token(token),))
    return cur.fetchone()


# --- ROTA: AUTENTICAÇÃO (LOGIN) ---
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        senha = request.form.get('password', '')
        nxt = request.args.get('next')

        # O e-mail do admin só entra com a senha do .env (não cai na conta do banco)
        if email.lower() == ADMIN_EMAIL.lower():
            if not secrets.compare_digest(senha.encode(), ADMIN_PASSWORD.encode()):
                flash('E-mail ou senha incorretos.', 'error')
                return _voltar_auth('login', next=nxt, email=email)
            session.clear()
            session['user_id'] = 'admin'
            session['user_nome'] = 'Admin'
            session['user_sobrenome'] = 'Alchemist'
            session['user_email'] = ADMIN_EMAIL
            session['is_admin'] = True
            return redirect(url_for('admin_dashboard'))

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(%s)", (email,))
            usuario = cur.fetchone()
            cur.close()

            if usuario and _senha_confere(usuario['senha_hash'], senha):
                session.clear()
                session['user_id'] = str(usuario['id'])
                session['user_nome'] = usuario['nome']
                session['user_sobrenome'] = usuario.get('sobrenome', '')
                session['user_email'] = usuario['email']
                session['user_telefone'] = usuario.get('telefone', '')
                session['is_admin'] = bool(usuario.get('is_admin', False))
                if session['is_admin']:
                    return redirect(url_for('admin_dashboard'))
                return redirect(_proximo_seguro(url_for('index')))

            flash('E-mail ou senha incorretos.', 'error')
        except Exception as e:
            print(f"Erro de login: {e}")
            flash('Erro interno ao tentar entrar. Tente novamente.', 'error')
        finally:
            if conn: conn.close()
        return _voltar_auth('login', next=nxt, email=email)

    if session.get('user_id') and not request.args.get('tab'):
        return redirect(url_for('admin_dashboard') if session.get('is_admin') else url_for('account'))
    return render_template('auth.html', modo='acesso')

# --- ROTA: REGISTRO (PROCESSAMENTO) ---
@app.route('/register', methods=['POST'])
def register():
    f = request.form
    nome = f.get('firstName', '').strip()
    sobrenome = f.get('lastName', '').strip()
    email = f.get('email', '').strip().lower()
    senha = f.get('password', '')
    confirma = f.get('confirmPassword', '')
    cpf = f.get('cpf', '').strip()
    cidade = f.get('city', '').strip()
    estado = (f.get('state', 'SP').strip() or 'SP')[:2].upper()
    telefone = f.get('phone', '').strip()
    nxt = request.args.get('next')

    erro = None
    if not (nome and sobrenome and email and cpf and cidade and telefone):
        erro = 'Preencha todos os campos para criar a conta.'
    elif not _email_valido(email):
        erro = 'Informe um e-mail válido.'
    elif not _telefone_valido(telefone):
        erro = 'Informe um telefone com DDD.'
    elif not _cpf_valido(cpf):
        erro = 'CPF inválido. Confira os números.'
    elif _erro_senha(senha):
        erro = _erro_senha(senha)
    elif senha != confirma:
        erro = 'A confirmação não confere com a senha.'
    if erro:
        flash(erro, 'error')
        return _voltar_auth('register', next=nxt)

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT LOWER(email) = LOWER(%s) FROM usuarios WHERE LOWER(email) = LOWER(%s) OR regexp_replace(cpf, '\\D', '', 'g') = %s LIMIT 1",
                    (email, email, _so_digitos(cpf)))
        repetido = cur.fetchone()
        if repetido:
            flash('Já existe uma conta com este e-mail. Entre ou redefina a senha.' if repetido[0]
                  else 'Já existe uma conta com este CPF.', 'error')
            return _voltar_auth('login' if repetido[0] else 'register', next=nxt, email=email if repetido[0] else None)
        cur.execute("""
            INSERT INTO usuarios (nome, sobrenome, email, senha_hash, cpf, cidade, estado, telefone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome, sobrenome, email
        """, (nome, sobrenome, email, generate_password_hash(senha), cpf, cidade, estado, telefone))
        novo = cur.fetchone()
        conn.commit()
        cur.close()
        # Login automático após cadastro
        session.clear()
        session['user_id'] = str(novo[0])
        session['user_nome'] = novo[1]
        session['user_sobrenome'] = novo[2]
        session['user_email'] = novo[3]
        session['user_telefone'] = telefone
        flash(f'Bem-vindo, {novo[1]}! Sua conta foi criada.', 'success')
        return redirect(_proximo_seguro(url_for('account')))
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro no cadastro: {e}")
        flash('Não foi possível criar a conta agora. Tente novamente.', 'error')
        return _voltar_auth('register', next=nxt)
    finally:
        if conn: conn.close()

# --- ROTA: ESQUECI A SENHA ---
@app.route('/auth/esqueci', methods=['POST'])
def esqueci_senha():
    email = request.form.get('email', '').strip()
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, nome, email FROM usuarios WHERE LOWER(email) = LOWER(%s)", (email,))
        usuario = cur.fetchone()
        if usuario:
            # no máximo um pedido por minuto para o mesmo e-mail
            cur.execute("SELECT 1 FROM tokens_redefinicao_senha WHERE usuario_id = %s AND criado_em > NOW() - INTERVAL '1 minute'", (usuario['id'],))
            if not cur.fetchone():
                link = _criar_link_redefinicao(cur, usuario['id'])
                conn.commit()
                enviado = _enviar_email(usuario['email'], 'Redefina sua senha — ALCHEMIST 3D', render_template(
                    'email_redefinir.html', nome=usuario['nome'], link=link, minutos=_VALIDADE_TOKEN_MIN))
                if not enviado:
                    print(f"[Senha] E-mail não configurado. Link para {usuario['email']}: {link}")
        cur.close()
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao pedir redefinição de senha: {e}")
    finally:
        if conn: conn.close()
    # a resposta é sempre a mesma, para não revelar quais e-mails têm conta
    return render_template('auth.html', modo='enviado', email=email)

@app.route('/redefinir-senha/<token>', methods=['GET', 'POST'])
def redefinir_senha(token):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        registro = _buscar_token_valido(cur, token)
        if not registro:
            return render_template('auth.html', modo='token_invalido')
        if request.method == 'GET':
            return render_template('auth.html', modo='redefinir', token=token, nome=registro['nome'], email=registro['email'])

        senha = request.form.get('password', '')
        erro = _erro_senha(senha) or (None if senha == request.form.get('confirmPassword', '') else 'A confirmação não confere com a senha.')
        if erro:
            flash(erro, 'error')
            return redirect(url_for('redefinir_senha', token=token))
        cur.execute("UPDATE usuarios SET senha_hash = %s WHERE id = %s", (generate_password_hash(senha), registro['usuario_id']))
        cur.execute("UPDATE tokens_redefinicao_senha SET usado = TRUE WHERE usuario_id = %s", (registro['usuario_id'],))
        conn.commit()
        cur.close()
        flash('Senha alterada! Entre com a nova senha.', 'success')
        return _voltar_auth('login', email=registro['email'])
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao redefinir senha: {e}")
        flash('Não foi possível redefinir a senha agora. Tente novamente.', 'error')
        return _voltar_auth('esqueci')
    finally:
        if conn: conn.close()

# --- ADMIN: GERAR LINK DE REDEFINIÇÃO (para mandar ao cliente pelo WhatsApp) ---
@app.route('/api/admin/usuario/<uuid:usuario_id>/link-senha', methods=['POST'])
@admin_required
def api_admin_link_senha(usuario_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT nome FROM usuarios WHERE id = %s", (str(usuario_id),))
        if not cur.fetchone():
            return jsonify({'ok': False, 'error': 'Cliente não encontrado.'}), 404
        link = _criar_link_redefinicao(cur, str(usuario_id))
        conn.commit()
        cur.close()
        return jsonify({'ok': True, 'link': link, 'validade_min': _VALIDADE_TOKEN_MIN})
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao gerar link de senha: {e}")
        return jsonify({'ok': False, 'error': 'Erro ao gerar o link.'}), 500
    finally:
        if conn: conn.close()


# --- ÁREA DO CLIENTE ---
# Etapas mostradas ao cliente (status no banco → rótulo)
ETAPAS_PEDIDO = [
    ('Pedido Solicitado', 'Pedido feito'),
    ('Pagamento Aprovado', 'Pagamento confirmado'),
    ('Pedido Aprovado', 'Aprovado pela loja'),
    ('Pedido em Andamento', 'Em produção'),
    ('Pedido Finalizado', 'Pronto'),
    ('Pedido Entregue', 'Entregue'),
]
# Status dos personalizados (valor no banco → nome mostrado). Fluxo:
#   aguardando → Em Análise → Orçamento enviado ⇄ Em negociação → Aprovado → Produção → Finalizado → Entregue
#   saídas: Recusado (a loja não faz) · Cancelado (o cliente recusou o orçamento)
STATUS_CUSTOM = {
    'aguardando': 'Aguardando análise',
    'Em Análise': 'Em análise',
    'Orçamento enviado': 'Orçamento enviado',
    'Em negociação': 'Em negociação',
    'Aprovado': 'Aprovado',
    'Produção': 'Em produção',
    'Finalizado': 'Pronto',
    'Entregue': 'Entregue',
    'Recusado': 'Recusado pela loja',
    'Cancelado': 'Recusado pelo cliente',
}
# status que o admin escolhe à mão; os de orçamento mudam pelos botões (enviar orçamento / decisão do cliente)
STATUS_CUSTOM_MANUAIS = ['aguardando', 'Em Análise', 'Aprovado', 'Produção', 'Finalizado', 'Entregue', 'Recusado']
STATUS_CUSTOM_PENDENTES = ('aguardando', 'Em Análise', 'Em negociação')   # a loja precisa agir
STATUS_CUSTOM_ORCAVEIS = ('aguardando', 'Em Análise', 'Orçamento enviado', 'Em negociação')

ETAPAS_PERSONALIZADO = [
    ('aguardando', 'Enviado'),
    ('Em Análise', 'Em análise'),
    ('Orçamento enviado', 'Orçamento'),
    ('Aprovado', 'Aprovado'),
    ('Produção', 'Em produção'),
    ('Finalizado', 'Pronto'),
    ('Entregue', 'Entregue'),
]
_ETAPA_EQUIVALENTE = {'Em negociação': 'Orçamento enviado'}

def _etapa(etapas, status):
    chaves = [c for c, _ in etapas]
    status = _ETAPA_EQUIVALENTE.get(status, status)
    return chaves.index(status) if status in chaves else 0

def _valor_brl(valor):
    return 'R$ ' + f'{float(valor or 0):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')

def _cliente_logado():
    """user_id do cliente logado, ou None (admin não tem área de cliente)."""
    uid = session.get('user_id')
    return None if not uid or uid == 'admin' else str(uid)

def _pedidos_do_cliente(cur, usuario_id, pedido_id=None):
    filtro = "AND p.id = %s::uuid" if pedido_id else ""
    params = (usuario_id, pedido_id) if pedido_id else (usuario_id,)
    cur.execute(f"""
        SELECT p.id::text AS id, COALESCE(NULLIF(p.status, 'no_carrinho'), p.status_pedido) AS status,
               COALESCE(p.valor_total, p.total, 0) AS total, p.criado_em, p.atualizado_em,
               p.tipo_entrega, p.nome_completo, p.telefone_entrega, p.endereco_completo, p.cep,
               f.status_pagamento, f.metodo_pagamento
        FROM pedidos p
        LEFT JOIN financeiro f ON f.pedido_id = p.id
        WHERE p.usuario_id = %s::uuid AND p.status <> 'no_carrinho' {filtro}
        ORDER BY p.criado_em DESC
    """, params)
    pedidos = [dict(r) for r in cur.fetchall()]
    if pedidos:
        cur.execute("""
            SELECT ip.pedido_id::text AS pedido_id, ip.quantidade, ip.preco_unitario,
                   pr.id::text AS produto_id, COALESCE(pr.nome, 'Produto removido') AS nome, pr.imagem_url
            FROM itens_pedido ip LEFT JOIN produtos pr ON pr.id = ip.produto_id
            WHERE ip.pedido_id = ANY(%s::uuid[])
        """, ([p['id'] for p in pedidos],))
        itens = {}
        for i in cur.fetchall():
            itens.setdefault(i['pedido_id'], []).append(dict(i))
    for p in pedidos:
        p['itens'] = itens.get(p['id'], []) if pedidos else []
        p['qtd_itens'] = sum(int(i['quantidade'] or 0) for i in p['itens'])
        p['subtotal'] = sum(float(i['preco_unitario'] or 0) * int(i['quantidade'] or 0) for i in p['itens'])
        p['frete'] = max(float(p['total'] or 0) - p['subtotal'], 0)
        p['cancelado'] = p['status'] == 'Pedido Cancelado'
        p['etapa'] = _etapa(ETAPAS_PEDIDO, p['status'])
    return pedidos

# --- ROTA: MINHA CONTA ---
@app.route('/account')
def account():
    if 'user_id' not in session:
        return redirect(url_for('auth', next='/account'))
    if session.get('is_admin'):
        return redirect(url_for('admin_dashboard'))
    uid = _cliente_logado()
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id::text AS id, nome, sobrenome, email, telefone, cpf, cidade, estado, criado_em FROM usuarios WHERE id = %s::uuid", (uid,))
        usuario = cur.fetchone()
        if not usuario:
            session.clear()
            return redirect(url_for('auth'))
        pedidos = _pedidos_do_cliente(cur, uid)
        cur.execute("""
            SELECT id::text AS id, descricao, arquivo_url, status, resposta_admin, criado_em,
                   preview_url, cores_json, referencias_json, detalhes_json, tipo_entrega, endereco_entrega,
                   orcamento_valor, orcamento_prazo, orcamento_mensagem, orcamento_em, decisao_em, motivo_cliente
            FROM pedidos_personalizados WHERE usuario_id = %s::uuid ORDER BY criado_em DESC
        """, (uid,))
        personalizados = []
        for s in cur.fetchall():
            s = dict(s)
            partes = (s['descricao'] or '').split('\n\nReferência de tamanho:')
            s['texto'] = partes[0].strip()
            s['tamanho'] = partes[1].strip() if len(partes) > 1 else ''
            s['recusado'] = s['status'] in ('Recusado', 'Cancelado')
            s['aguarda_decisao'] = s['status'] in ('Orçamento enviado', 'Em negociação') and s['orcamento_valor'] is not None
            s['etapa'] = _etapa(ETAPAS_PERSONALIZADO, s['status'])
            personalizados.append(s)
        cur.close()
    except Exception as e:
        print(f"Erro ao abrir a conta: {e}")
        flash('Não foi possível carregar sua conta agora.', 'error')
        return redirect(url_for('index'))
    finally:
        if conn: conn.close()

    ativos = [p for p in pedidos if not p['cancelado'] and p['status'] != 'Pedido Entregue']
    resumo = {
        'pedidos': len(pedidos),
        'em_andamento': len(ativos),
        'investido': sum(float(p['total'] or 0) for p in pedidos if not p['cancelado']),
        'personalizados': len(personalizados),
        'personalizados_abertos': sum(1 for s in personalizados if s['status'] not in ('Entregue', 'Recusado', 'Cancelado')),
        'orcamentos_esperando': [s for s in personalizados if s['status'] == 'Orçamento enviado' and s['orcamento_valor'] is not None],
    }
    return render_template('account.html', usuario=usuario, pedidos=pedidos, personalizados=personalizados,
                           resumo=resumo, etapas_pedido=ETAPAS_PEDIDO, etapas_personalizado=ETAPAS_PERSONALIZADO,
                           status_custom_nomes=STATUS_CUSTOM)

@app.route('/account/perfil', methods=['POST'])
@login_required
def account_perfil():
    uid = _cliente_logado()
    if not uid:
        return redirect(url_for('admin_dashboard'))
    nome = request.form.get('nome', '').strip()[:60]
    sobrenome = request.form.get('sobrenome', '').strip()[:80]
    telefone = request.form.get('telefone', '').strip()[:20]
    cidade = request.form.get('cidade', '').strip()[:80]
    if not (nome and sobrenome and cidade):
        flash('Nome, sobrenome e cidade são obrigatórios.', 'error')
    elif not _telefone_valido(telefone):
        flash('Informe um telefone com DDD.', 'error')
    else:
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("UPDATE usuarios SET nome=%s, sobrenome=%s, telefone=%s, cidade=%s WHERE id=%s::uuid",
                        (nome, sobrenome, telefone, cidade, uid))
            conn.commit()
            cur.close()
            session['user_nome'] = nome
            session['user_sobrenome'] = sobrenome
            session['user_telefone'] = telefone
            flash('Dados atualizados.', 'success')
        except Exception as e:
            if conn: conn.rollback()
            print(f"Erro ao salvar perfil: {e}")
            flash('Não foi possível salvar agora. Tente novamente.', 'error')
        finally:
            if conn: conn.close()
    return redirect(url_for('account') + '#dados')

@app.route('/account/senha', methods=['POST'])
@login_required
def account_senha():
    uid = _cliente_logado()
    if not uid:
        return redirect(url_for('admin_dashboard'))
    atual = request.form.get('atual', '')
    nova = request.form.get('nova', '')
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT senha_hash FROM usuarios WHERE id = %s::uuid", (uid,))
        row = cur.fetchone()
        erro = None
        if not row or not _senha_confere(row[0], atual):
            erro = 'A senha atual está incorreta.'
        elif _erro_senha(nova):
            erro = _erro_senha(nova)
        elif nova != request.form.get('confirmar', ''):
            erro = 'A confirmação não confere com a nova senha.'
        elif nova == atual:
            erro = 'A nova senha precisa ser diferente da atual.'
        if erro:
            flash(erro, 'error')
        else:
            cur.execute("UPDATE usuarios SET senha_hash = %s WHERE id = %s::uuid", (generate_password_hash(nova), uid))
            conn.commit()
            flash('Senha alterada com sucesso.', 'success')
        cur.close()
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao trocar senha: {e}")
        flash('Não foi possível alterar a senha agora.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('account') + '#seguranca')

# --- ROTA: LOGOUT ---
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


# --- ROTAS DE NAVEGAÇÃO DO SITE (RESOLVE O NOT FOUND) ---

def _produto_to_js(p):
    """Converte um produto do banco para o formato esperado pelo app.js."""
    import re as _re
    import json as _j
    preco = float(p.get('preco') or 0)
    nome = p.get('nome') or ''
    slug = _re.sub(r'[^a-z0-9]+', '-', nome.lower()).strip('-') or str(p.get('id', 'prod'))
    categoria_raw = (p.get('categoria') or 'Personalizados').strip()
    # Support comma-separated multi-tags; primary category is the first
    all_tags = [t.strip() for t in categoria_raw.split(',') if t.strip()]
    categoria = all_tags[0] if all_tags else 'Personalizados'
    imagem_raw = (p.get('imagem_url') or '').strip()

    # Build image list — supports JSON array (new) and single URL (legacy)
    imgs = []
    if imagem_raw.startswith('['):
        try:
            url_list = _j.loads(imagem_raw)
            imgs = [{'src': u.strip(), 'position': 'center center'} for u in url_list if u and str(u).strip()]
        except Exception:
            imgs = [{'src': imagem_raw, 'position': 'center center'}]
    elif imagem_raw:
        pos = 'center center'
        if _re.search(r'-01\.(jpg|jpeg|png|webp)$', imagem_raw, _re.I):
            second = _re.sub(r'-01\.', '-02.', imagem_raw)
            imgs = [
                {'src': imagem_raw, 'position': 'center 48%'},
                {'src': second,     'position': 'center 48%'},
            ]
        elif _re.search(r'chaveiro(\d+)\.(jfif|jpg|jpeg|png)$', imagem_raw, _re.I):
            m = _re.search(r'(chaveiro)(\d+)(\.\w+)$', imagem_raw, _re.I)
            if m:
                spaced = imagem_raw[:m.start()] + m.group(1) + ' ' + m.group(2).lstrip('0').zfill(len(m.group(2))) + m.group(3)
                imgs = [
                    {'src': imagem_raw, 'position': pos},
                    {'src': spaced,     'position': pos},
                ]
            else:
                imgs = [{'src': imagem_raw, 'position': pos}]
        else:
            imgs = [{'src': imagem_raw, 'position': pos}]

    return {
        'id': slug,
        'db_id': str(p.get('id', '')),
        'name': nome,
        'category': categoria,
        'tags': all_tags,
        'destaque': bool(p.get('destaque')),
        'price': preco,
        'material': 'PLA',
        'size': 'Sob demanda',
        'shape': categoria[:3].upper(),
        'description': p.get('descricao') or '',
        'accent': categoria,
        'rating': float(p['nota_media']) if p.get('nota_media') is not None else None,
        'ratingCount': int(p.get('rating_count') or 0),
        'images': imgs,
        'variants': [{
            'id': 'default',
            'label': 'Padrão',
            'tone': 'black',
            'isDefault': True,
            'price': preco,
            'images': imgs
        }]
    }

@app.route('/products')
def products():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c.nota)::numeric, 1) AS nota_media,
                COUNT(c.id) FILTER (WHERE c.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c ON c.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos = cur.fetchall()
        cur.close()
        import json as _j
        produtos_js = [_produto_to_js(p) for p in produtos]
        return render_template('products.html', produtos_json=_j.dumps(produtos_js, ensure_ascii=False))
    except Exception as e:
        print(f'Erro ao carregar produtos: {e}')
        return render_template('products.html', produtos_json='[]')
    finally:
        if conn: conn.close()

@app.route('/api/products')
def api_products():
    from flask import jsonify
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c.nota)::numeric, 1) AS nota_media,
                COUNT(c.id) FILTER (WHERE c.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c ON c.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos = cur.fetchall()
        cur.close()
        return jsonify([_produto_to_js(p) for p in produtos])
    except Exception as e:
        print(f'Erro na API de produtos: {e}')
        return jsonify([])
    finally:
        if conn: conn.close()

@app.route('/product') # Caso algum link aponte para o singular
def product_detail():
    import json as _j
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c.nota)::numeric, 1) AS nota_media,
                COUNT(c.id) FILTER (WHERE c.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c ON c.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos = cur.fetchall()
        cur.close()
        produtos_js = [_produto_to_js(p) for p in produtos]
        return render_template('product.html', produtos_json=_j.dumps(produtos_js, ensure_ascii=False))
    except Exception as e:
        print(f'Erro ao carregar produto detalhe: {e}')
        return render_template('product.html', produtos_json='[]')
    finally:
        if conn: conn.close()

@app.route('/custom')
def custom():
    # a página é aberta sem login; o login é pedido só na hora de enviar (o projeto
    # fica salvo no navegador e é restaurado depois)
    galeria = []
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM produtos WHERE ativo = TRUE ORDER BY destaque DESC, criado_em DESC")
        for p in cur.fetchall():
            item = _produto_to_js(p)
            if item['images']:
                galeria.append({'id': item['id'], 'nome': item['name'], 'categoria': item['category'], 'imagem': item['images'][0]['src']})
        cur.close()
    except Exception as e:
        print(f"Erro ao carregar galeria de personalizados: {e}")
    finally:
        if conn: conn.close()
    return render_template('custom.html', galeria=galeria)

@app.route('/custom/enviar', methods=['POST'])
@login_required
def custom_enviar():
    """Salva pedido personalizado no banco de dados."""
    usuario_id = str(session['user_id'])
    if usuario_id == 'admin':
        return _json.dumps({'ok': False, 'error': 'Entre com uma conta de cliente para enviar solicitações.'}), 403, {'Content-Type': 'application/json'}
    descricao = request.form.get('description', '').strip()
    tamanho = request.form.get('sizeReference', '').strip()
    if tamanho:
        descricao = descricao + '\n\nReferência de tamanho: ' + tamanho if descricao else tamanho

    if not descricao:
        return _json.dumps({'ok': False, 'error': 'Descrição do projeto é obrigatória.'}), 400, {'Content-Type': 'application/json'}

    limite_arquivo = int(os.environ.get('MAX_UPLOAD_MB', '10')) * 1024 * 1024

    def _tamanho(arq):
        arq.stream.seek(0, os.SEEK_END)
        tamanho = arq.stream.tell()
        arq.stream.seek(0)
        return tamanho

    preview_url = None
    preview = request.files.get('preview')
    if preview and preview.filename and allowed_file(preview.filename) and _tamanho(preview) <= 5 * 1024 * 1024:
        preview_url = salvar_upload(preview, UPLOAD_FOLDER, prefixo='preview-')

    cores_json = None
    cores_raw = request.form.get('cores', '').strip()
    if cores_raw:
        try:
            cores = _json.loads(cores_raw)
            if isinstance(cores, list):
                cores_json = _json.dumps([
                    {'hex': str(c.get('hex', ''))[:9], 'nome': str(c.get('nome', ''))[:30], 'pct': round(float(c.get('pct', 0)), 1)}
                    for c in cores[:30] if isinstance(c, dict)
                ], ensure_ascii=False)
        except (ValueError, TypeError):
            cores_json = None

    referencias = []
    for ref in request.files.getlist('referencias')[:4]:
        if ref and ref.filename and allowed_file(ref.filename) and _tamanho(ref) <= 5 * 1024 * 1024:
            referencias.append(salvar_upload(ref, UPLOAD_FOLDER, prefixo='referencia-'))
    referencias_json = _json.dumps(referencias) if referencias else None

    detalhes_json = None
    detalhes_raw = request.form.get('detalhes', '').strip()
    if detalhes_raw:
        try:
            d = _json.loads(detalhes_raw)
            if isinstance(d, dict):
                limpo = {k: str(d.get(k, ''))[:60] for k in ('finalidade', 'prazo', 'investimento') if d.get(k)}
                detalhes_json = _json.dumps(limpo, ensure_ascii=False) if limpo else None
        except (ValueError, TypeError):
            detalhes_json = None

    arquivo_url = None
    arquivo = request.files.get('arquivo')
    if arquivo and arquivo.filename and _tamanho(arquivo) > limite_arquivo:
        return _json.dumps({'ok': False, 'error': f'Arquivo muito grande. O limite é {limite_arquivo // (1024 * 1024)} MB por arquivo.'}), 413, {'Content-Type': 'application/json'}
    if arquivo and arquivo.filename:
        ext = arquivo.filename.rsplit('.', 1)[-1].lower() if '.' in arquivo.filename else ''
        if ext in ALLOWED_EXTENSIONS or ext in MODEL_EXTENSIONS:
            arquivo_url = salvar_upload(arquivo, UPLOAD_FOLDER)
        else:
            return _json.dumps({'ok': False, 'error': 'Formato de arquivo não suportado. Envie STL, OBJ, 3MF, ZIP, PNG ou JPG.'}), 400, {'Content-Type': 'application/json'}

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO pedidos_personalizados (usuario_id, descricao, arquivo_url, status, preview_url, cores_json, referencias_json, detalhes_json) VALUES (%s::uuid, %s, %s, 'aguardando', %s, %s, %s, %s)",
            (usuario_id, descricao, arquivo_url, preview_url, cores_json, referencias_json, detalhes_json)
        )
        conn.commit()
        print(f"[Custom] Pedido personalizado salvo — usuário {usuario_id}, desc: {descricao[:60]}")
        cur.close()
        return _json.dumps({'ok': True}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        if conn: conn.rollback()
        import traceback
        erro_msg = traceback.format_exc()
        with open('erro_custom.txt', 'w') as f:
            f.write(str(e) + '\n\n')
            f.write(erro_msg)
        return _json.dumps({'ok': False, 'error': 'Erro interno ao salvar solicitação.'}), 500, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()

@app.route('/cart')
@login_required
def cart():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c.nota)::numeric, 1) AS nota_media,
                COUNT(c.id) FILTER (WHERE c.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c ON c.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos = cur.fetchall()
        cur.close()
        import json as _j
        produtos_js = [_produto_to_js(p) for p in produtos]
        return render_template('cart.html', produtos_json=_j.dumps(produtos_js, ensure_ascii=False))
    except Exception as e:
        print(f'Erro ao carregar produtos para carrinho: {e}')
        return render_template('cart.html', produtos_json='[]')
    finally:
        if conn: conn.close()

@app.route('/checkout')
@login_required
def checkout():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT p.*,
                ROUND(AVG(c.nota)::numeric, 1) AS nota_media,
                COUNT(c.id) FILTER (WHERE c.nota IS NOT NULL) AS rating_count
            FROM produtos p
            LEFT JOIN comentarios c ON c.produto_id = p.id
            WHERE p.ativo = TRUE
            GROUP BY p.id
            ORDER BY p.criado_em DESC
        """)
        produtos = cur.fetchall()
        cur.close()
        import json as _j
        produtos_js = [_produto_to_js(p) for p in produtos]
        return render_template('checkout.html', produtos_json=_j.dumps(produtos_js, ensure_ascii=False))
    except Exception as e:
        print(f'Erro ao carregar produtos para checkout: {e}')
        return render_template('checkout.html', produtos_json='[]')
    finally:
        if conn: conn.close()

@app.route('/about')
def about():
    cfg = load_cms_config()
    galeria, membros, total_produtos = [], [], 0
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM produtos WHERE ativo = TRUE ORDER BY destaque DESC, criado_em DESC")
        produtos = [_produto_to_js(p) for p in cur.fetchall()]
        total_produtos = len(produtos)
        galeria = [{'id': p['id'], 'nome': p['name'], 'categoria': p['category'],
                    'imagem': p['images'][0]['src']} for p in produtos if p['images']]
        membros = _carregar_membros(cur)
        cur.close()
    except Exception as e:
        print(f"Erro ao carregar página Sobre: {e}")
    finally:
        if conn: conn.close()
    return render_template('about.html',
        about_titulo=cfg.get('about_titulo', 'Sobre a ALCHEMIST 3D'),
        about_descricao=cfg.get('about_descricao', ''),
        galeria=galeria, membros=membros, total_produtos=total_produtos)

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/feedback')
def feedback():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id, c.texto, c.resposta_admin,
                   COALESCE(c.nota, 5) AS nota, c.imagem_url,
                   c.data_comentario AS data_postagem,
                   COALESCE(u.nome, 'Anônimo') AS nome,
                   COALESCE(u.sobrenome, '') AS sobrenome,
                   pr.nome AS produto_nome
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN produtos pr ON c.produto_id = pr.id
            ORDER BY c.data_comentario DESC NULLS LAST
        """)
        comentarios = cur.fetchall()
        cur.close()
    except Exception as e:
        print(f"Erro ao buscar comentários: {e}")
        comentarios = []
    finally:
        if conn: conn.close()
    return render_template('feedback.html', comentarios=comentarios)

def _carregar_membros(cur):
    """Lista de membros com nome e apelido separados ("Pedro (Pedrin)" -> Pedro / Pedrin)."""
    import re as _re
    cur.execute('SELECT * FROM membros_equipe ORDER BY id ASC')
    membros = []
    for m in cur.fetchall():
        m = dict(m)
        achou = _re.match(r'^\s*(.*?)\s*\((.+)\)\s*$', m.get('nome') or '')
        m['nome_exibicao'] = achou.group(1) if achou else (m.get('nome') or '')
        m['apelido'] = achou.group(2) if achou else ''
        partes = m['nome_exibicao'].split()
        m['iniciais'] = ''.join(p[0] for p in partes[:2]).upper() or '?'
        membros.append(m)
    return membros

@app.route('/members')
def members():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        membros = _carregar_membros(cur)
        cur.close()
        return render_template('members.html', membros=membros)
    except Exception as e:
        print(f'Erro ao carregar membros: {e}')
        return render_template('members.html', membros=[])
    finally:
        if conn: conn.close()

@app.route('/orders')
def orders_list():
    # a lista de pedidos agora fica dentro da conta
    return redirect(url_for('account') + '#pedidos')

@app.route('/order')
def order_detail():
    if 'user_id' not in session:
        return redirect(url_for('auth', next=request.full_path.rstrip('?')))
    uid = _cliente_logado()
    if not uid:
        return redirect(url_for('admin_orders'))
    pedido = None
    pedido_id = request.args.get('id', '').strip()
    conn = None
    try:
        import uuid as _uuid
        _uuid.UUID(pedido_id)
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        encontrados = _pedidos_do_cliente(cur, uid, pedido_id)
        pedido = encontrados[0] if encontrados else None
        cur.close()
    except ValueError:
        pedido = None
    except Exception as e:
        print(f"Erro ao abrir pedido: {e}")
    finally:
        if conn: conn.close()
    return render_template('order.html', pedido=pedido, etapas=ETAPAS_PEDIDO), (200 if pedido else 404)

# =============================================================================
# ÁREA ADMINISTRATIVA
# =============================================================================

# --- ADMIN: DASHBOARD ---
@app.route('/admin')
@admin_required
def admin_dashboard():
    """Visão geral: números do negócio, o que precisa de atenção e movimento recente."""
    dados = {
        'kpi': {}, 'status_pedidos': [], 'ultimos_pedidos': [], 'pendencias': [],
        'pedidos_dias': [], 'usuarios_list': []
    }
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        um = lambda sql, args=(): (cur.execute(sql, args), list(cur.fetchone().values())[0])[1]

        k = dados['kpi']
        k['produtos'] = um("SELECT COUNT(*) FROM produtos WHERE ativo = TRUE")
        k['produtos_inativos'] = um("SELECT COUNT(*) FROM produtos WHERE ativo = FALSE")
        k['pedidos'] = um("SELECT COUNT(*) FROM pedidos WHERE status != 'no_carrinho'")
        k['pedidos_30d'] = um("SELECT COUNT(*) FROM pedidos WHERE status != 'no_carrinho' AND criado_em >= NOW() - INTERVAL '30 days'")
        k['faturamento'] = float(um("SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE status NOT IN ('no_carrinho', 'Pedido Cancelado')"))
        k['recebido'] = float(um("SELECT COALESCE(SUM(valor_total), 0) FROM financeiro WHERE status_pagamento = 'Aprovado'"))
        k['a_receber'] = float(um("SELECT COALESCE(SUM(valor_total), 0) FROM financeiro WHERE status_pagamento = 'Aguardando Aprovação'"))
        k['ticket_medio'] = k['faturamento'] / k['pedidos'] if k['pedidos'] else 0
        k['usuarios'] = um("SELECT COUNT(*) FROM usuarios WHERE LOWER(email) != LOWER(%s)", (ADMIN_EMAIL,))
        k['usuarios_30d'] = um("SELECT COUNT(*) FROM usuarios WHERE LOWER(email) != LOWER(%s) AND criado_em >= NOW() - INTERVAL '30 days'", (ADMIN_EMAIL,))
        k['custom_pendentes'] = um("SELECT COUNT(*) FROM pedidos_personalizados WHERE status IN ('aguardando', 'Em Análise', 'Em negociação')")
        k['custom_producao'] = um("SELECT COUNT(*) FROM pedidos_personalizados WHERE status IN ('Aprovado', 'Produção', 'Finalizado')")
        k['pagamentos_pendentes'] = um("SELECT COUNT(*) FROM financeiro WHERE status_pagamento = 'Aguardando Aprovação'")
        k['comentarios_pendentes'] = um("SELECT COUNT(*) FROM comentarios WHERE resposta_admin IS NULL")
        k['chat_nao_lidas'] = um("SELECT COUNT(*) FROM chat_suporte WHERE lida = FALSE AND enviado_por = 'cliente'")

        cur.execute("""
            SELECT COALESCE(status_pedido, status) AS status, COUNT(*) AS n
            FROM pedidos WHERE status != 'no_carrinho'
            GROUP BY 1 ORDER BY 2 DESC
        """)
        dados['status_pedidos'] = cur.fetchall()

        # pedidos por dia nos últimos 14 dias (inclui dias sem pedido)
        cur.execute("""
            SELECT d::date AS dia, COUNT(p.id) AS n, COALESCE(SUM(p.valor_total), 0) AS valor
            FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
            LEFT JOIN pedidos p ON p.criado_em::date = d::date AND p.status != 'no_carrinho'
            GROUP BY 1 ORDER BY 1
        """)
        dados['pedidos_dias'] = [{'dia': r['dia'], 'n': r['n'], 'valor': float(r['valor'])} for r in cur.fetchall()]

        cur.execute("""
            SELECT p.id, COALESCE(p.status_pedido, p.status) AS status, p.valor_total, p.criado_em, p.tipo_entrega,
                   COALESCE(NULLIF(p.nome_completo, ''), TRIM(COALESCE(u.nome, '') || ' ' || COALESCE(u.sobrenome, ''))) AS cliente
            FROM pedidos p LEFT JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.status != 'no_carrinho'
            ORDER BY p.criado_em DESC LIMIT 6
        """)
        dados['ultimos_pedidos'] = cur.fetchall()

        # "Precisa da sua atenção": tudo que espera uma ação do admin, mais antigo primeiro
        pend = dados['pendencias']
        cur.execute("""
            SELECT f.id, f.valor_total, f.data_solicitacao AS quando, COALESCE(f.nome_cliente, 'Cliente') AS nome
            FROM financeiro f WHERE f.status_pagamento = 'Aguardando Aprovação'
            ORDER BY f.data_solicitacao ASC LIMIT 5
        """)
        for r in cur.fetchall():
            pend.append({'tipo': 'pagamento', 'titulo': f"Pagamento de {r['nome']}", 'detalhe': f"R$ {float(r['valor_total'] or 0):.2f} aguardando aprovação".replace('.', ','), 'quando': r['quando'], 'link': url_for('admin_financeiro')})
        cur.execute("""
            SELECT pp.id, COALESCE(pp.decisao_em, pp.criado_em) AS quando, LEFT(pp.descricao, 80) AS resumo, pp.status,
                   TRIM(COALESCE(u.nome, '') || ' ' || COALESCE(u.sobrenome, '')) AS nome
            FROM pedidos_personalizados pp LEFT JOIN usuarios u ON u.id = pp.usuario_id
            WHERE pp.status IN ('aguardando', 'Em Análise', 'Em negociação')
            ORDER BY COALESCE(pp.decisao_em, pp.criado_em) ASC LIMIT 5
        """)
        for r in cur.fetchall():
            negociando = r['status'] == 'Em negociação'
            pend.append({'tipo': 'personalizado',
                         'titulo': f"{r['nome'] or 'Cliente'} quer negociar" if negociando else f"Personalizado de {r['nome'] or 'cliente'}",
                         'detalhe': 'Orçamento em negociação no chat' if negociando else (r['resumo'] or '').replace('\n', ' '),
                         'quando': r['quando'], 'link': url_for('admin_comments') + f"#custom-{r['id']}"})
        cur.execute("""
            SELECT c.id, c.data_comentario AS quando, LEFT(c.texto, 80) AS resumo, COALESCE(u.nome, 'Visitante') AS nome
            FROM comentarios c LEFT JOIN usuarios u ON u.id = c.usuario_id
            WHERE c.resposta_admin IS NULL ORDER BY c.data_comentario ASC LIMIT 5
        """)
        for r in cur.fetchall():
            pend.append({'tipo': 'comentario', 'titulo': f"Comentário de {r['nome']}", 'detalhe': r['resumo'] or '', 'quando': r['quando'], 'link': url_for('admin_comments') + '#comentarios'})
        cur.execute("""
            SELECT cs.usuario_id::text AS uid, COUNT(*) AS n, MIN(cs.criado_em) AS quando,
                   TRIM(COALESCE(u.nome, '') || ' ' || COALESCE(u.sobrenome, '')) AS nome
            FROM chat_suporte cs LEFT JOIN usuarios u ON u.id = cs.usuario_id
            WHERE cs.lida = FALSE AND cs.enviado_por = 'cliente'
            GROUP BY cs.usuario_id, u.nome, u.sobrenome ORDER BY MIN(cs.criado_em) ASC LIMIT 5
        """)
        for r in cur.fetchall():
            pend.append({'tipo': 'suporte', 'titulo': f"Mensagem de {r['nome'] or 'cliente'}", 'detalhe': f"{r['n']} mensagem(ns) sem resposta", 'quando': r['quando'], 'link': url_for('admin_suporte') + f"?uid={r['uid']}"})
        pend.sort(key=lambda x: str(x['quando'] or ''))

        cur.execute("""
            SELECT u.id, u.nome, u.sobrenome, u.email, u.cidade, u.estado, u.telefone, u.criado_em,
                   COUNT(DISTINCT p.id) AS total_pedidos,
                   COUNT(DISTINCT pp.id) AS total_personalizados
            FROM usuarios u
            LEFT JOIN pedidos p ON p.usuario_id = u.id AND p.status != 'no_carrinho'
            LEFT JOIN pedidos_personalizados pp ON pp.usuario_id = u.id
            WHERE LOWER(u.email) != LOWER(%s)
            GROUP BY u.id ORDER BY u.criado_em DESC
        """, (ADMIN_EMAIL,))
        dados['usuarios_list'] = cur.fetchall()
        cur.close()
    except Exception as e:
        import traceback; traceback.print_exc()
        flash('Não foi possível carregar todos os números do painel agora.', 'error')
    finally:
        if conn: conn.close()
    return render_template('admin.html', **dados)

# --- ADMIN: LISTAR PRODUTOS ---
@app.route('/admin/products')
@admin_required
def admin_products():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM produtos ORDER BY criado_em DESC")
        todos = cur.fetchall()
        novidade = None
        try:
            cur.execute("SELECT * FROM novidade ORDER BY id DESC LIMIT 1")
            novidade = cur.fetchone()
        except Exception as e_nov:
            print(f"[novidade admin] {e_nov}")
            conn.rollback()
        cur.close()
        produtos = []
        for p in todos:
            p = dict(p)
            p['imagem'] = _filtro_primeira_imagem(p.get('imagem_url'))
            p['tags'] = [t.strip() for t in (p.get('categoria') or '').split(',') if t.strip()]
            produtos.append(p)
        categorias = sorted({t for p in produtos for t in p['tags']})
        destaques = [p for p in produtos if p.get('destaque')]
        novidade_imgs = []
        if novidade and novidade.get('imagens'):
            try:
                novidade_imgs = [u for u in _json.loads(novidade['imagens']) if u]
            except (ValueError, TypeError):
                novidade_imgs = []
        return render_template('admin_products.html',
                               produtos=produtos, categorias=categorias,
                               destaques=destaques, total=len(produtos),
                               novidade=novidade, novidade_imgs=novidade_imgs)
    except Exception as e:
        print(f"Erro ao listar produtos: {e}")
        flash('Erro ao carregar produtos.', 'error')
        return redirect(url_for('admin_dashboard'))
    finally:
        if conn: conn.close()

# --- ADMIN: TOGGLE DESTAQUE ---
@app.route('/admin/novidade', methods=['POST'])
@admin_required
def admin_novidade():
    import uuid as _uuid, os as _os
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        nome = request.form.get('nome', '').strip()
        descricao = request.form.get('descricao', '').strip()
        preco_str = request.form.get('preco', '').strip()
        preco = float(preco_str.replace(',', '.')) if preco_str else None
        visivel = request.form.get('visivel') == '1'
        # Build image list: keep existing if no new upload/url provided
        cur.execute("SELECT imagens FROM novidade ORDER BY id DESC LIMIT 1")
        existing = cur.fetchone()
        old_imgs = _json.loads(existing['imagens']) if existing and existing.get('imagens') else ['', '', '', '']
        while len(old_imgs) < 4: old_imgs.append('')
        imgs = []
        for i in range(1, 5):
            arquivo = request.files.get(f'imagem_file_{i}')
            url_input = request.form.get(f'imagem_url_{i}', '').strip()
            hidden = request.form.get(f'imagem_existing_{i}', '').strip()
            if arquivo and arquivo.filename:
                if allowed_file(arquivo.filename):
                    imgs.append(salvar_upload(arquivo, UPLOAD_FOLDER))
                else:
                    imgs.append(hidden or old_imgs[i-1])
            elif url_input:
                imgs.append(url_input)
            else:
                imgs.append(hidden or old_imgs[i-1])
        imgs_clean = [u for u in imgs if u]
        imagens_json = _json.dumps(imgs_clean) if imgs_clean else '[]'
        cur.execute("SELECT id FROM novidade ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            cur.execute("UPDATE novidade SET nome=%s, descricao=%s, preco=%s, imagens=%s, visivel=%s WHERE id=%s",
                        (nome, descricao, preco, imagens_json, visivel, row['id']))
        else:
            cur.execute("INSERT INTO novidade (nome, descricao, preco, imagens, visivel) VALUES (%s,%s,%s,%s,%s)",
                        (nome, descricao, preco, imagens_json, visivel))
        conn.commit()
        cur.close()
        flash('Novidade atualizada!', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao salvar novidade: {e}")
        flash('Erro ao salvar novidade.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_products'))

# --- ADMIN: TOGGLE DESTAQUE ---
@app.route('/admin/product/toggle-destaque/<uuid:product_id>', methods=['POST'])
@admin_required
def admin_product_toggle_destaque(product_id):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT destaque FROM produtos WHERE id = %s", (str(product_id),))
        row = cur.fetchone()
        if not row:
            if is_ajax:
                return jsonify({'ok': False, 'error': 'Produto não encontrado.'}), 404
            flash('Produto não encontrado.', 'error')
            return redirect(url_for('admin_products'))
        is_destaque = bool(row['destaque'])
        if not is_destaque:
            cur.execute("SELECT COUNT(*) AS cnt FROM produtos WHERE destaque = TRUE")
            cnt = cur.fetchone()['cnt']
            if cnt >= 3:
                if is_ajax:
                    return jsonify({'ok': False, 'error': 'Máximo de 3 produtos em destaque atingido. Remova um antes de adicionar outro.'}), 400
                flash('Máximo de 3 produtos em destaque. Remova um antes de adicionar outro.', 'error')
                return redirect(url_for('admin_products'))
        cur.execute("UPDATE produtos SET destaque = %s WHERE id = %s", (not is_destaque, str(product_id)))
        conn.commit()
        cur.execute("SELECT id, nome, categoria, imagem_url, destaque FROM produtos WHERE destaque = TRUE ORDER BY nome")
        destaques = [{'id': str(d['id']), 'nome': d['nome'], 'categoria': d.get('categoria') or '', 'imagem_url': d.get('imagem_url') or ''} for d in cur.fetchall()]
        cur.close()
        if is_ajax:
            return jsonify({'ok': True, 'destaque': not is_destaque, 'destaques': destaques})
        flash('Destaque atualizado!', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao alterar destaque: {e}")
        if is_ajax:
            return jsonify({'ok': False, 'error': 'Erro interno.'}), 500
        flash('Erro ao alterar destaque.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_products'))

# --- ADMIN: ATIVAR / DESATIVAR PRODUTO (AJAX) ---
@app.route('/admin/product/toggle-ativo/<uuid:product_id>', methods=['POST'])
@admin_required
def admin_product_toggle_ativo(product_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE produtos SET ativo = NOT ativo WHERE id = %s RETURNING ativo", (str(product_id),))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        if not row:
            return jsonify({'ok': False, 'error': 'Produto não encontrado.'}), 404
        return jsonify({'ok': True, 'ativo': bool(row[0])})
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao ativar/desativar produto: {e}")
        return jsonify({'ok': False, 'error': 'Erro interno.'}), 500
    finally:
        if conn: conn.close()

# --- ADMIN: ADICIONAR PRODUTO ---
@app.route('/admin/product/add', methods=['GET', 'POST'])
@admin_required
def admin_product_add():
    if request.method == 'POST':
        import json as _j, uuid as _uuid
        nome = request.form.get('nome', '').strip()
        descricao = request.form.get('descricao', '').strip()
        preco = request.form.get('preco', '0').strip()
        categoria = request.form.get('categoria', '').strip() or 'Personalizados'
        ativo = request.form.get('ativo') == 'on'

        # Collect up to 4 image slots (file upload takes priority over URL)
        image_urls = []
        for i in range(1, 5):
            arquivo = request.files.get(f'imagem_file_{i}')
            url_input = request.form.get(f'imagem_url_{i}', '').strip()
            if arquivo and arquivo.filename and allowed_file(arquivo.filename):
                image_urls.append(salvar_upload(arquivo, UPLOAD_FOLDER))
            elif url_input:
                image_urls.append(url_input)

        if len(image_urls) == 1:
            imagem_url = image_urls[0]
        elif len(image_urls) > 1:
            imagem_url = _j.dumps(image_urls, ensure_ascii=False)
        else:
            imagem_url = ''

        if not nome or not preco:
            flash('Nome e preço são obrigatórios.', 'error')
            return redirect(url_for('admin_product_add'))

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO produtos (nome, descricao, preco, categoria, imagem_url, ativo)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (nome, descricao, preco, categoria, imagem_url, ativo))
            conn.commit()
            cur.close()
            flash('Produto adicionado com sucesso!', 'success')
            return redirect(url_for('admin_products'))
        except Exception as e:
            if conn: conn.rollback()
            print(f"Erro ao adicionar produto: {e}")
            flash('Erro ao adicionar produto.', 'error')
            return redirect(url_for('admin_product_add'))
        finally:
            if conn: conn.close()

    return render_template('admin_product_form.html', produto=None,
                           imagens=['', '', '', ''],
                           categorias_ativas=[],
                           categorias_str='',
                           action=url_for('admin_product_add'))

# --- ADMIN: EDITAR PRODUTO ---
@app.route('/admin/product/edit/<uuid:product_id>', methods=['GET', 'POST'])
@admin_required
def admin_product_edit(product_id):
    import json as _j, uuid as _uuid
    conn = None
    if request.method == 'POST':
        nome = request.form.get('nome', '').strip()
        descricao = request.form.get('descricao', '').strip()
        preco = request.form.get('preco', '0').strip()
        categoria = request.form.get('categoria', '').strip() or 'Personalizados'
        ativo = request.form.get('ativo') == 'on'

        # Collect up to 4 image slots
        image_urls = []
        for i in range(1, 5):
            arquivo = request.files.get(f'imagem_file_{i}')
            url_input = request.form.get(f'imagem_url_{i}', '').strip()
            if arquivo and arquivo.filename and allowed_file(arquivo.filename):
                image_urls.append(salvar_upload(arquivo, UPLOAD_FOLDER))
            elif url_input:
                image_urls.append(url_input)

        if len(image_urls) == 1:
            imagem_url = image_urls[0]
        elif len(image_urls) > 1:
            imagem_url = _j.dumps(image_urls, ensure_ascii=False)
        else:
            imagem_url = ''

        try:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                UPDATE produtos SET nome=%s, descricao=%s, preco=%s, categoria=%s,
                imagem_url=%s, ativo=%s WHERE id=%s
            """, (nome, descricao, preco, categoria, imagem_url, ativo, str(product_id)))
            conn.commit()
            cur.close()
            flash('Produto atualizado com sucesso!', 'success')
            return redirect(url_for('admin_products'))
        except Exception as e:
            if conn: conn.rollback()
            print(f"Erro ao editar produto: {e}")
            flash('Erro ao atualizar produto.', 'error')
        finally:
            if conn: conn.close()

    # GET — carrega dados do produto
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM produtos WHERE id = %s", (str(product_id),))
        produto = cur.fetchone()
        cur.close()
        if not produto:
            flash('Produto não encontrado.', 'error')
            return redirect(url_for('admin_products'))

        # Parse existing images into a list of up to 4 URLs
        imagem_raw = (produto.get('imagem_url') or '').strip()
        if imagem_raw.startswith('['):
            try:
                imagens = _j.loads(imagem_raw)
            except Exception:
                imagens = [imagem_raw]
        elif imagem_raw:
            imagens = [imagem_raw]
        else:
            imagens = []
        while len(imagens) < 4:
            imagens.append('')

        # Parse existing categories
        cat_raw = (produto.get('categoria') or '').strip()
        categorias_ativas = [c.strip() for c in cat_raw.split(',') if c.strip()]

        return render_template('admin_product_form.html', produto=produto,
                               imagens=imagens,
                               categorias_ativas=categorias_ativas,
                               categorias_str=cat_raw,
                               action=url_for('admin_product_edit', product_id=product_id))
    except Exception as e:
        print(f"Erro ao carregar produto: {e}")
        flash('Erro ao carregar produto.', 'error')
        return redirect(url_for('admin_products'))
    finally:
        if conn: conn.close()

# --- ADMIN: EXCLUIR PRODUTO ---
@app.route('/admin/product/delete/<uuid:product_id>', methods=['POST'])
@admin_required
def admin_product_delete(product_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM produtos WHERE id = %s", (str(product_id),))
        conn.commit()
        cur.close()
        flash('Produto excluído.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao excluir produto: {e}")
        flash('Erro ao excluir produto. Pode haver pedidos associados.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_products'))

# --- ADMIN: LISTAR PEDIDOS ---
@app.route('/admin/orders')
@admin_required
def admin_orders():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                p.id, p.status, p.status_pedido, p.valor_total, p.total,
                p.criado_em, p.atualizado_em, p.tipo_entrega, p.nome_completo,
                p.telefone_entrega, p.endereco_completo, p.cep,
                u.nome, u.sobrenome, u.email,
                f.status_pagamento, f.id as financeiro_id
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            LEFT JOIN financeiro f ON f.pedido_id = p.id
            WHERE p.status != 'no_carrinho'
            ORDER BY p.criado_em DESC
        """)
        pedidos = cur.fetchall()
        # Buscar itens de cada pedido
        cur.execute("""
            SELECT ip.pedido_id, ip.quantidade, ip.preco_unitario,
                   pr.nome AS produto_nome, pr.imagem_url, pr.descricao
            FROM itens_pedido ip
            LEFT JOIN produtos pr ON ip.produto_id = pr.id
        """)
        itens_rows = cur.fetchall()
        from collections import defaultdict
        itens_por_pedido = defaultdict(list)
        for row in itens_rows:
            itens_por_pedido[str(row['pedido_id'])].append(row)
        cur.close()
        status_options = ['Pedido Solicitado', 'Pagamento Aprovado', 'Pedido Aprovado', 'Pedido em Andamento', 'Pedido Finalizado', 'Pedido Entregue', 'Pedido Cancelado']
        return render_template('admin_orders.html', pedidos=pedidos, status_options=status_options, itens_por_pedido=itens_por_pedido)
    except Exception as e:
        print(f"Erro ao listar pedidos: {e}")
        flash('Erro ao carregar pedidos.', 'error')
        return redirect(url_for('admin_dashboard'))
    finally:
        if conn: conn.close()

# --- ADMIN: ATUALIZAR STATUS DO PEDIDO ---
_STATUS_NOTIF = {
    'Pagamento Aprovado': 'Pagamento confirmado! Seu pedido será processado em breve.',
    'Pedido Aprovado': 'Seu pedido foi aprovado pela loja! Estamos iniciando a produção.',
    'Pedido em Andamento': 'Seu pedido entrou em produção! Em breve estará pronto.',
    'Pedido Finalizado': 'Seu pedido foi finalizado! Aguarde a entrega ou retire na loja.',
    'Pedido Entregue': 'Pedido entregue! Obrigado pela compra na ALCHEMIST 3D.',
    'Pedido Cancelado': 'Seu pedido foi cancelado. Entre em contato para mais informações.',
}

def _notificar_pedido(cur, row, pedido_id, status):
    """Cria notificação para o cliente dono do pedido (row = (usuario_id,))."""
    mensagem = _STATUS_NOTIF.get(status)
    if mensagem and row and row[0]:
        cur.execute(
            "INSERT INTO notificacoes_pedido (usuario_id, pedido_id, mensagem) VALUES (%s, %s, %s)",
            (str(row[0]), str(pedido_id), mensagem))

@app.route('/admin/order/status/<uuid:order_id>', methods=['POST'])
@admin_required
def admin_order_status(order_id):
    status_validos = ['Pedido Solicitado', 'Pagamento Aprovado', 'Pedido Aprovado', 'Pedido em Andamento', 'Pedido Finalizado', 'Pedido Entregue', 'Pedido Cancelado']
    novo_status = request.form.get('status', '')
    if novo_status not in status_validos:
        flash('Status inválido.', 'error')
        return redirect(url_for('admin_orders'))
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE pedidos SET status=%s, status_pedido=%s, atualizado_em=NOW() WHERE id=%s
        """, (novo_status, novo_status, str(order_id)))
        # Criar notificação para o cliente
        mensagem = _STATUS_NOTIF.get(novo_status)
        if mensagem:
            cur.execute("SELECT usuario_id FROM pedidos WHERE id = %s", (str(order_id),))
            row = cur.fetchone()
            if row and row[0]:
                try:
                    cur.execute("""
                        INSERT INTO notificacoes_pedido (usuario_id, pedido_id, mensagem)
                        VALUES (%s, %s, %s)
                    """, (str(row[0]), str(order_id), mensagem))
                except Exception:
                    pass  # tabela pode ainda não existir antes da migração
        conn.commit()
        cur.close()
        flash('Status do pedido atualizado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao atualizar status: {e}")
        flash('Erro ao atualizar status.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_orders'))

# --- ADMIN: COMENTÁRIOS E PEDIDOS PERSONALIZADOS ---
@app.route('/admin/comments')
@admin_required
def admin_comments():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id, c.texto, c.resposta_admin, c.data_comentario,
                   c.nota, c.imagem_url, c.produto_id,
                   u.nome, u.sobrenome, u.email,
                   pr.nome AS produto_nome
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN produtos pr ON c.produto_id = pr.id
            ORDER BY c.data_comentario DESC
        """)
        comentarios = cur.fetchall()
        cur.execute("""
            SELECT pp.id, pp.descricao, pp.arquivo_url, pp.status,
                   pp.resposta_admin, pp.criado_em, pp.preview_url, pp.cores_json,
                   pp.referencias_json, pp.detalhes_json, pp.tipo_entrega, pp.endereco_entrega,
                   pp.orcamento_valor, pp.orcamento_prazo, pp.orcamento_mensagem, pp.orcamento_em,
                   pp.decisao_em, pp.motivo_cliente,
                   pp.usuario_id::text AS usuario_id,
                   u.nome, u.sobrenome, u.email
            FROM pedidos_personalizados pp
            LEFT JOIN usuarios u ON pp.usuario_id = u.id
            ORDER BY pp.criado_em DESC
        """)
        custom_requests = cur.fetchall()
        cur.close()
        status_custom = STATUS_CUSTOM_MANUAIS
        solicitacoes  = [r for r in custom_requests if r['status'] in STATUS_CUSTOM_PENDENTES]
        esperando_cliente = [r for r in custom_requests if r['status'] == 'Orçamento enviado']
        pedidos_ativos = [r for r in custom_requests if r['status'] in ('Aprovado', 'Produção', 'Finalizado', 'Entregue')]
        recusados = [r for r in custom_requests if r['status'] in ('Recusado', 'Cancelado')]
        return render_template('admin_comments.html',
            comentarios=comentarios,
            custom_requests=custom_requests,
            solicitacoes=solicitacoes,
            esperando_cliente=esperando_cliente,
            pedidos_ativos=pedidos_ativos,
            recusados=recusados,
            status_custom=status_custom,
            status_custom_nomes=STATUS_CUSTOM,
            status_orcaveis=STATUS_CUSTOM_ORCAVEIS)
    except Exception as e:
        print(f"Erro ao listar comentários: {e}")
        flash('Erro ao carregar comentários.', 'error')
        return redirect(url_for('admin_dashboard'))
    finally:
        if conn: conn.close()

# --- ADMIN: RESPONDER COMENTÁRIO ---
@app.route('/admin/comment/reply/<uuid:comment_id>', methods=['POST'])
@admin_required
def admin_comment_reply(comment_id):
    resposta = request.form.get('resposta', '').strip()
    if not resposta:
        flash('A resposta não pode estar vazia.', 'error')
        return redirect(url_for('admin_comments') + '#comentarios')
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE comentarios SET resposta_admin=%s, resposta_vista=FALSE WHERE id=%s",
                    (resposta, str(comment_id)))
        conn.commit()
        cur.close()
        flash('Resposta ao comentário publicada.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao responder comentário: {e}")
        flash('Erro ao publicar resposta.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_comments') + '#comentarios')

# --- ADMIN: RESPONDER PEDIDO PERSONALIZADO ---
@app.route('/admin/custom/reply/<uuid:custom_id>', methods=['POST'])
@admin_required
def admin_custom_reply(custom_id):
    resposta = request.form.get('resposta', '').strip()
    novo_status = request.form.get('status', '').strip()
    if novo_status not in STATUS_CUSTOM_MANUAIS:
        novo_status = None  # status de orçamento só mudam pelos botões; aqui mantém o atual
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT usuario_id, status, resposta_admin FROM pedidos_personalizados WHERE id=%s", (str(custom_id),))
        antes = cur.fetchone()
        if novo_status:
            cur.execute("""
                UPDATE pedidos_personalizados SET resposta_admin=%s, status=%s WHERE id=%s
            """, (resposta or None, novo_status, str(custom_id)))
        else:
            cur.execute("""
                UPDATE pedidos_personalizados SET resposta_admin=%s WHERE id=%s
            """, (resposta or None, str(custom_id)))
        if antes and antes[0]:
            mensagens_status = {
                'Em Análise': 'Sua solicitação personalizada está em análise pela nossa equipe.',
                'Aprovado': 'Sua solicitação personalizada foi aprovada! Confira os detalhes na sua conta.',
                'Produção': 'Seu pedido personalizado entrou em produção.',
                'Finalizado': 'Seu pedido personalizado está pronto!',
                'Entregue': 'Seu pedido personalizado foi entregue. Obrigado!',
                'Recusado': 'Sua solicitação personalizada não pôde ser atendida. Veja a resposta da loja na sua conta.',
            }
            aviso = None
            if novo_status and novo_status != antes[1]:
                aviso = mensagens_status.get(novo_status)
            elif (resposta or None) and (resposta or None) != antes[2]:
                aviso = 'A loja respondeu sua solicitação personalizada.'
            if aviso:
                cur.execute("INSERT INTO notificacoes_pedido (usuario_id, pedido_id, mensagem) VALUES (%s, %s, %s)",
                            (str(antes[0]), f'custom:{custom_id}', aviso))
        conn.commit()
        cur.close()
        flash('Pedido personalizado atualizado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao responder pedido personalizado: {e}")
        flash('Erro ao atualizar pedido personalizado.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_comments') + '#personalizados')

# --- ADMIN: ENVIAR ORÇAMENTO DE UM PERSONALIZADO ---
@app.route('/admin/custom/orcamento/<uuid:custom_id>', methods=['POST'])
@admin_required
def admin_custom_orcamento(custom_id):
    destino = redirect(url_for('admin_comments') + f'#custom-{custom_id}')
    bruto = request.form.get('valor', '').strip().replace('R$', '').replace(' ', '')
    if ',' in bruto:  # aceita "1.234,56" e "280,00"
        bruto = bruto.replace('.', '').replace(',', '.')
    try:
        valor = round(float(bruto), 2)
    except ValueError:
        valor = 0
    prazo_txt = request.form.get('prazo', '').strip()
    prazo = int(prazo_txt) if prazo_txt.isdigit() else None
    mensagem = request.form.get('mensagem', '').strip()[:2000] or None
    if valor <= 0 or valor > 1000000:
        flash('Informe um valor de orçamento válido.', 'error')
        return destino
    if prazo is not None and not 1 <= prazo <= 365:
        flash('O prazo deve ficar entre 1 e 365 dias.', 'error')
        return destino
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT usuario_id, status, orcamento_valor FROM pedidos_personalizados WHERE id = %s", (str(custom_id),))
        row = cur.fetchone()
        if not row:
            flash('Solicitação não encontrada.', 'error')
            return destino
        if row[1] not in STATUS_CUSTOM_ORCAVEIS:
            flash(f'Esta solicitação já está em "{STATUS_CUSTOM.get(row[1], row[1])}"; não dá para mandar orçamento agora.', 'error')
            return destino
        cur.execute("""
            UPDATE pedidos_personalizados
            SET status = 'Orçamento enviado', orcamento_valor = %s, orcamento_prazo = %s, orcamento_mensagem = %s,
                orcamento_em = NOW(), decisao_em = NULL, motivo_cliente = NULL
            WHERE id = %s
        """, (valor, prazo, mensagem, str(custom_id)))
        novo = row[2] is not None
        aviso = (f"{'Novo orçamento' if novo else 'Seu orçamento chegou'}: {_valor_brl(valor)}"
                 + (f" em {prazo} dias" if prazo else '') + '. Aceite, recuse ou negocie na sua conta.')
        cur.execute("INSERT INTO notificacoes_pedido (usuario_id, pedido_id, mensagem) VALUES (%s, %s, %s)",
                    (str(row[0]), f'custom:{custom_id}', aviso))
        conn.commit()
        cur.close()
        flash(f'Orçamento de {_valor_brl(valor)} enviado. O cliente foi avisado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao enviar orçamento: {e}")
        flash('Erro ao enviar o orçamento.', 'error')
    finally:
        if conn: conn.close()
    return destino

# --- CLIENTE: ACEITAR, RECUSAR OU NEGOCIAR O ORÇAMENTO ---
@app.route('/api/custom/<uuid:custom_id>/decisao', methods=['POST'])
@login_required
def api_custom_decisao(custom_id):
    uid = _cliente_logado()
    if not uid:
        return jsonify({'ok': False, 'error': 'Entre com uma conta de cliente.'}), 403
    dados = request.get_json(silent=True) or {}
    acao = str(dados.get('acao', '')).strip()
    motivo = str(dados.get('motivo', '')).strip()[:500] or None
    if acao not in ('aceitar', 'recusar', 'negociar'):
        return jsonify({'ok': False, 'error': 'Ação inválida.'}), 400
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id::text AS id, status, orcamento_valor, orcamento_prazo
            FROM pedidos_personalizados WHERE id = %s::uuid AND usuario_id = %s::uuid
        """, (str(custom_id), uid))
        sol = cur.fetchone()
        if not sol:
            return jsonify({'ok': False, 'error': 'Solicitação não encontrada.'}), 404
        if sol['status'] not in ('Orçamento enviado', 'Em negociação') or sol['orcamento_valor'] is None:
            return jsonify({'ok': False, 'error': 'Este orçamento não está mais aguardando resposta.'}), 409

        novo_status = {'aceitar': 'Aprovado', 'recusar': 'Cancelado', 'negociar': 'Em negociação'}[acao]
        cur.execute("""
            UPDATE pedidos_personalizados SET status = %s, decisao_em = NOW(), motivo_cliente = %s
            WHERE id = %s::uuid
        """, (novo_status, motivo, sol['id']))

        # a conversa com a loja já começa com o resumo do orçamento
        codigo = sol['id'][:8].upper()
        resumo = _valor_brl(sol['orcamento_valor']) + (f" em {sol['orcamento_prazo']} dias" if sol['orcamento_prazo'] else '')
        texto_chat = {
            'negociar': f"Quero negociar o orçamento do personalizado #{codigo} ({resumo})." + (f" {motivo}" if motivo else ''),
            'aceitar': f"Aceitei o orçamento do personalizado #{codigo} ({resumo}).",
            'recusar': f"Recusei o orçamento do personalizado #{codigo} ({resumo})." + (f" Motivo: {motivo}" if motivo else ''),
        }[acao]
        cur.execute("INSERT INTO chat_suporte (usuario_id, mensagem, enviado_por, lida) VALUES (%s, %s, 'cliente', FALSE)",
                    (uid, texto_chat))
        conn.commit()
        cur.close()
        return jsonify({'ok': True, 'status': novo_status})
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro na decisão do orçamento: {e}")
        return jsonify({'ok': False, 'error': 'Não foi possível registrar sua resposta agora.'}), 500
    finally:
        if conn: conn.close()

# --- ADMIN: MEMBROS DA EQUIPE ---
@app.route('/admin/membros')
@admin_required
def admin_membros():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM membros_equipe ORDER BY id ASC')
        membros = cur.fetchall()
        cur.close()
        return render_template('admin_membros.html', membros=membros)
    except Exception as e:
        print(f'Erro ao listar membros: {e}')
        flash('Erro ao carregar membros.', 'error')
        return redirect(url_for('admin_dashboard'))
    finally:
        if conn: conn.close()

@app.route('/admin/membros/save', methods=['POST'])
@admin_required
def admin_membros_save():
    conn = None
    try:
        ids = request.form.getlist('membro_id')
        nomes = request.form.getlist('membro_nome')
        cargos = request.form.getlist('membro_cargo')
        bios = request.form.getlist('membro_bio')
        conn = get_db_connection()
        cur = conn.cursor()
        for i, mid in enumerate(ids):
            cur.execute("""
                UPDATE membros_equipe
                SET nome=%s, cargo=%s, bio=%s, data_atualizacao=NOW()
                WHERE id=%s
            """, (
                nomes[i].strip() if i < len(nomes) else '',
                cargos[i].strip() if i < len(cargos) else '',
                bios[i].strip() if i < len(bios) else '',
                int(mid)
            ))
            foto = request.files.get(f'membro_foto_{int(mid)}')
            if foto and foto.filename and allowed_file(foto.filename):
                cur.execute("UPDATE membros_equipe SET foto_url=%s WHERE id=%s",
                            (salvar_upload(foto, MEMBROS_UPLOAD_FOLDER), int(mid)))
            elif request.form.get(f'remover_foto_{int(mid)}') == '1':
                cur.execute("UPDATE membros_equipe SET foto_url=NULL WHERE id=%s", (int(mid),))
        conn.commit()
        cur.close()
        flash(f'{len(ids)} membro(s) atualizados com sucesso!', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f'Erro ao salvar membros: {e}')
        flash('Erro ao salvar alterações.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_membros'))

@app.route('/admin/membros/add', methods=['POST'])
@admin_required
def admin_membro_add():
    nome = request.form.get('nome', '').strip()
    cargo = request.form.get('cargo', '').strip()
    bio = request.form.get('bio', '').strip()
    if not nome:
        flash('O nome do membro é obrigatório.', 'error')
        return redirect(url_for('admin_membros'))
    foto_url = None
    foto = request.files.get('foto')
    if foto and foto.filename and allowed_file(foto.filename):
        foto_url = salvar_upload(foto, MEMBROS_UPLOAD_FOLDER)
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO membros_equipe (nome, cargo, bio, foto_url)
            VALUES (%s, %s, %s, %s)
        """, (nome, cargo, bio, foto_url))
        conn.commit()
        cur.close()
        flash(f'Membro "{nome}" adicionado com sucesso!', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f'Erro ao adicionar membro: {e}')
        flash('Erro ao adicionar membro.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_membros'))

@app.route('/admin/membros/delete/<int:membro_id>', methods=['POST'])
@admin_required
def admin_membro_delete(membro_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM membros_equipe WHERE id = %s', (membro_id,))
        conn.commit()
        cur.close()
        flash('Membro removido.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f'Erro ao remover membro: {e}')
        flash('Erro ao remover membro.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_membros'))

# --- ADMIN: FINANCEIRO — LISTAR PAGAMENTOS PENDENTES ---
@app.route('/admin/financeiro')
@admin_required
def admin_financeiro():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT 
                f.id,
                f.pedido_id,
                f.nome_cliente,
                f.valor_total,
                f.metodo_pagamento,
                f.status_pagamento,
                f.data_solicitacao,
                u.sobrenome,
                p.tipo_entrega,
                p.endereco_completo,
                p.nome_completo,
                p.telefone_entrega AS telefone,
                p.status_pedido,
                u.nome,
                u.email
            FROM financeiro f
            LEFT JOIN pedidos p ON p.id = f.pedido_id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY f.data_solicitacao DESC
        """)
        registros = cur.fetchall()
        cur.close()
        return render_template('admin_financeiro.html', registros=registros)
    except Exception as e:
        import traceback
        traceback.print_exc()
        flash('Erro ao carregar o financeiro.', 'error')
        return redirect(url_for('admin_dashboard'))
    finally:
        if conn: conn.close()

# --- ADMIN: APROVAR PAGAMENTO VIA FINANCEIRO ---
@app.route('/admin/financeiro/aprovar/<int:financeiro_id>', methods=['POST'])
@admin_required
def admin_financeiro_aprovar(financeiro_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE financeiro 
            SET status_pagamento = 'Aprovado'
            WHERE id = %s
            RETURNING pedido_id
        """, (financeiro_id,))
        row = cur.fetchone()
        if row:
            pedido_id = row[0]
            # mantém a tabela de pagamentos coerente com o financeiro
            cur.execute("UPDATE pagamentos SET status = %s, confirmado_em = NOW() WHERE pedido_id = %s", ('confirmado', str(pedido_id)))
            cur.execute("""
                UPDATE pedidos 
                SET status = 'Pagamento Aprovado',
                    status_pedido = 'Pagamento Aprovado',
                    atualizado_em = NOW()
                WHERE id = %s
                RETURNING usuario_id
            """, (str(pedido_id),))
            _notificar_pedido(cur, cur.fetchone(), pedido_id, 'Pagamento Aprovado')
        conn.commit()
        cur.close()
        flash('Pagamento confirmado! Pedido atualizado para Pagamento Aprovado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        import traceback
        traceback.print_exc()
        flash('Erro ao aprovar pagamento.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_financeiro'))

# --- ADMIN: CANCELAR PAGAMENTO VIA FINANCEIRO ---
@app.route('/admin/financeiro/cancelar/<int:financeiro_id>', methods=['POST'])
@admin_required
def admin_financeiro_cancelar(financeiro_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE financeiro 
            SET status_pagamento = 'Cancelado'
            WHERE id = %s
            RETURNING pedido_id
        """, (financeiro_id,))
        row = cur.fetchone()
        if row:
            pedido_id = row[0]
            # mantém a tabela de pagamentos coerente com o financeiro
            cur.execute("UPDATE pagamentos SET status = %s WHERE pedido_id = %s", ('cancelado', str(pedido_id)))
            cur.execute("""
                UPDATE pedidos 
                SET status = 'Pedido Cancelado',
                    status_pedido = 'Pedido Cancelado',
                    atualizado_em = NOW()
                WHERE id = %s
                RETURNING usuario_id
            """, (str(pedido_id),))
            _notificar_pedido(cur, cur.fetchone(), pedido_id, 'Pedido Cancelado')
        conn.commit()
        cur.close()
        flash('Pagamento não autorizado. Pedido cancelado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        import traceback
        traceback.print_exc()
        flash('Erro ao cancelar pedido.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_financeiro'))

# --- ADMIN: EXCLUIR PEDIDO ---
@app.route('/admin/pedido/deletar/<uuid:pedido_id>', methods=['POST'])
@admin_required
def admin_pedido_deletar(pedido_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM itens_pedido WHERE pedido_id = %s", (str(pedido_id),))
        cur.execute("DELETE FROM pagamentos WHERE pedido_id = %s", (str(pedido_id),))
        cur.execute("DELETE FROM financeiro WHERE pedido_id = %s", (str(pedido_id),))
        cur.execute("DELETE FROM pedidos WHERE id = %s", (str(pedido_id),))
        conn.commit()
        cur.close()
        flash('Pedido excluído com sucesso.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        import traceback
        traceback.print_exc()
        flash('Erro ao excluir pedido.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_orders'))

# --- ADMIN: APROVAR PAGAMENTO (legado — mantido para compatibilidade) ---
@app.route('/admin/payment/approve/<uuid:payment_id>', methods=['POST'])
@admin_required
def admin_payment_approve(payment_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE pagamentos SET status='confirmado', confirmado_em=NOW() WHERE id=%s
            RETURNING pedido_id
        """, (str(payment_id),))
        row = cur.fetchone()
        if row:
            pedido_id = str(row[0])
            cur.execute("""
                UPDATE pedidos SET status='Pagamento Aprovado', status_pedido='Pagamento Aprovado',
                atualizado_em=NOW() WHERE id=%s
            """, (pedido_id,))
            cur.execute("""
                UPDATE financeiro SET status_pagamento='Aprovado' WHERE pedido_id=%s::uuid
            """, (pedido_id,))
        conn.commit()
        cur.close()
        flash('Pagamento aprovado com sucesso!', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao aprovar pagamento: {e}")
        flash('Erro ao aprovar pagamento.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_financeiro'))

# --- ADMIN: RECUSAR PAGAMENTO (legado — mantido para compatibilidade) ---
@app.route('/admin/payment/reject/<uuid:payment_id>', methods=['POST'])
@admin_required
def admin_payment_reject(payment_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE pagamentos SET status='cancelado' WHERE id=%s
            RETURNING pedido_id
        """, (str(payment_id),))
        row = cur.fetchone()
        if row:
            pedido_id = str(row[0])
            cur.execute("""
                UPDATE pedidos SET status='Pedido Cancelado', status_pedido='Pedido Cancelado',
                atualizado_em=NOW() WHERE id=%s
            """, (pedido_id,))
            cur.execute("""
                UPDATE financeiro SET status_pagamento='Cancelado' WHERE pedido_id=%s::uuid
            """, (pedido_id,))
        conn.commit()
        cur.close()
        flash('Pagamento não autorizado e pedido cancelado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao recusar pagamento: {e}")
        flash('Erro ao não autorizar pagamento.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_financeiro'))

# --- ADMIN: ATUALIZAR STATUS DO PEDIDO VIA AJAX ---
@app.route('/api/admin/pedido/status/<uuid:order_id>', methods=['POST'])
@admin_required
def api_admin_pedido_status(order_id):
    from flask import jsonify
    STATUS_VALIDOS = ['Pedido Solicitado', 'Pagamento Aprovado', 'Pedido Aprovado',
                      'Pedido em Andamento', 'Pedido Finalizado', 'Pedido Entregue', 'Pedido Cancelado']
    data = request.get_json(force=True, silent=True) or {}
    novo_status = str(data.get('status', '')).strip()
    if novo_status not in STATUS_VALIDOS:
        return jsonify({'ok': False, 'error': 'Status inválido'}), 400
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE pedidos SET status=%s, status_pedido=%s, atualizado_em=NOW() WHERE id=%s
        """, (novo_status, novo_status, str(order_id)))
        # Criar notificação para o cliente
        mensagem = _STATUS_NOTIF.get(novo_status)
        if mensagem:
            cur.execute("SELECT usuario_id FROM pedidos WHERE id = %s", (str(order_id),))
            row = cur.fetchone()
            if row and row[0]:
                try:
                    cur.execute("""
                        INSERT INTO notificacoes_pedido (usuario_id, pedido_id, mensagem)
                        VALUES (%s, %s, %s)
                    """, (str(row[0]), str(order_id), mensagem))
                except Exception:
                    pass
        conn.commit()
        cur.close()
        return jsonify({'ok': True, 'status': novo_status})
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao atualizar status via API: {e}")
        return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        if conn: conn.close()

# --- ADMIN: EXCLUIR COMENTÁRIO ---
@app.route('/admin/comment/delete/<uuid:comment_id>', methods=['POST'])
@admin_required
def admin_comment_delete(comment_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM comentarios WHERE id=%s", (str(comment_id),))
        conn.commit()
        cur.close()
        flash('Comentário excluído.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao excluir comentário: {e}")
        flash('Erro ao excluir comentário.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_comments') + '#comentarios')

# --- ADMIN: EXCLUIR PEDIDO PERSONALIZADO ---
@app.route('/admin/custom/delete/<uuid:custom_id>', methods=['POST'])
@admin_required
def admin_custom_delete(custom_id):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM pedidos_personalizados WHERE id=%s", (str(custom_id),))
        conn.commit()
        cur.close()
        flash('Pedido personalizado excluído.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao excluir pedido personalizado: {e}")
        flash('Erro ao excluir solicitação.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_comments') + '#personalizados')

# --- ADMIN: CMS — EDITAR CONTEÚDO DO SITE ---
import json as _json

CMS_CONFIG_FILE = os.path.join('static', 'cms_config.json')

def load_cms_config():
    """Textos editáveis do site. Ficam no banco (tabela site_config); o
    cms_config.json é só o valor inicial, usado enquanto nada foi salvo."""
    cfg = {}
    if os.path.exists(CMS_CONFIG_FILE):
        with open(CMS_CONFIG_FILE, 'r', encoding='utf-8') as f:
            cfg = _json.load(f)
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT chave, valor FROM site_config")
        cfg.update(dict(cur.fetchall()))
        cur.close()
    except Exception as e:
        print(f"[CMS] Usando valores do arquivo: {e}")
    finally:
        if conn: conn.close()
    return cfg

def save_cms_config(data):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        for chave, valor in data.items():
            cur.execute("""
                INSERT INTO site_config (chave, valor) VALUES (%s, %s)
                ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
            """, (chave, str(valor)))
        conn.commit()
        cur.close()
    finally:
        conn.close()

@app.route('/admin/cms', methods=['GET', 'POST'])
@admin_required
def admin_cms():
    config = load_cms_config()
    return render_template('admin_cms.html', config=config)

@app.route('/api/cms/about', methods=['POST'])
@admin_required
def api_cms_about_save():
    data = request.get_json(force=True, silent=True) or {}
    titulo = str(data.get('about_titulo', '')).strip()
    descricao = str(data.get('about_descricao', '')).strip()
    if not titulo:
        return _json.dumps({'ok': False, 'error': 'Título não pode ser vazio'}), 400, {'Content-Type': 'application/json'}
    try:
        save_cms_config({'about_titulo': titulo, 'about_descricao': descricao})
    except Exception as e:
        print(f"[CMS] Erro ao salvar: {e}")
        return _json.dumps({'ok': False, 'error': 'Erro ao salvar'}), 500, {'Content-Type': 'application/json'}
    return _json.dumps({'ok': True}), 200, {'Content-Type': 'application/json'}

# =============================================================================
# APIs PARA FRONT-END (chamadas AJAX/fetch do app.js)
# =============================================================================

# --- API: CONFIRMAR PEDIDO VIA PIX ---
@app.route('/api/checkout/confirmar', methods=['POST'])
@login_required
def api_checkout_confirmar():
    import uuid as _uuid
    data = request.get_json(force=True, silent=True) or {}
    order_id = str(data.get('orderId', '')).strip()
    items = data.get('items', [])
    pix_code = str(data.get('pixCode', '') or '')[:500]

    # Campos de logística
    full_name = str(data.get('fullName', '') or '')[:200].strip()
    phone = str(data.get('phone', '') or '')[:30].strip()
    delivery_method = str(data.get('deliveryMethod', 'delivery') or 'delivery').strip()
    street = str(data.get('street', '') or '').strip()
    city = str(data.get('city', '') or '').strip()
    state = str(data.get('state', '') or '').strip()
    zip_code = str(data.get('zip', '') or '')[:10].strip()

    tipo_entrega = 'Retirada' if delivery_method == 'pickup' else 'Entrega'
    if delivery_method == 'pickup':
        endereco_completo = 'RETIRADA NA LOJA'
        cep = ''
    else:
        parts = [p for p in [street, city, state] if p]
        endereco_completo = ', '.join(parts) + (f', CEP {zip_code}' if zip_code else '')
        cep = zip_code

    user_id = session.get('user_id')
    # Admins não fazem compras
    if not order_id or user_id == 'admin':
        return {'ok': False, 'error': 'invalid'}, 400

    # Garantir que order_id seja um UUID válido
    try:
        _uuid.UUID(order_id)
    except ValueError:
        order_id = str(_uuid.uuid4())

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Resolver itens no banco (aceita UUID ou slug) e usar o preço do banco,
        # nunca o preço enviado pelo navegador.
        cur.execute("SELECT id, nome, preco FROM produtos WHERE ativo = TRUE")
        produtos_db = cur.fetchall()
        por_id = {str(p['id']): p for p in produtos_db}
        por_slug = {_produto_to_js(p)['id']: p for p in produtos_db}
        itens_validos = []
        for item in items if isinstance(items, list) else []:
            pid = str(item.get('productId', '')).strip()
            produto = por_id.get(pid) or por_slug.get(pid)
            try:
                qtd = int(item.get('quantity', 1))
            except (TypeError, ValueError):
                qtd = 0
            if produto and qtd > 0:
                itens_validos.append((str(produto['id']), qtd, float(produto['preco'])))

        if not itens_validos:
            return {'ok': False, 'error': 'Nenhum produto válido no carrinho.'}, 400

        subtotal = sum(qtd * preco for _, qtd, preco in itens_validos)
        frete = 0 if delivery_method == 'pickup' else CHECKOUT_FRETE_PADRAO
        total = round(subtotal + frete, 2)
        if total <= 0:
            return {'ok': False, 'error': 'Total do pedido inválido.'}, 400

        # Inserir pedido com dados de logística (ON CONFLICT evita duplicatas)
        cur.execute("""
            INSERT INTO pedidos
                (id, usuario_id, status, total, valor_total, status_pedido,
                 tipo_entrega, endereco_completo, cep, nome_completo, telefone_entrega)
            VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (order_id, user_id, 'Pedido Solicitado', total, total, 'Pedido Solicitado',
              tipo_entrega, endereco_completo, cep, full_name, phone))
        if cur.rowcount == 0:
            # Pedido já registrado (clique duplo / reenvio): não duplicar itens e pagamentos
            conn.rollback()
            return {'ok': True, 'orderId': order_id}

        for pid, qtd, preco in itens_validos:
            cur.execute("""
                INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
                VALUES (%s::uuid, %s::uuid, %s, %s)
            """, (order_id, pid, qtd, preco))

        # Inserir registro de pagamento (status pendente — aguarda aprovação admin)
        cur.execute("""
            INSERT INTO pagamentos (pedido_id, valor, metodo, status, chave_pix, nome_cliente)
            VALUES (%s::uuid, %s, %s, %s, %s, %s)
        """, (order_id, total, 'pix', 'pendente', pix_code or None, full_name or None))

        # Registrar na tabela financeiro (controle administrativo)
        cur.execute("""
            INSERT INTO financeiro (pedido_id, nome_cliente, valor_total, metodo_pagamento, status_pagamento)
            VALUES (%s::uuid, %s, %s, 'PIX', 'Aguardando Aprovação')
        """, (order_id, full_name or 'Cliente', total))

        conn.commit()
        cur.close()
        return {'ok': True, 'orderId': order_id}
    except Exception as e:
        if conn:
            conn.rollback()
        import traceback
        erro_msg = traceback.format_exc()
        with open('erro_checkout.txt', 'w') as f:
            f.write(str(e) + '\n\n')
            f.write(erro_msg)
        return {'ok': False, 'error': str(e)}, 500
    finally:
        if conn:
            conn.close()


# --- API: MEUS PEDIDOS (usuário autenticado) ---
@app.route('/api/meus-pedidos')
@login_required
def api_meus_pedidos():
    import uuid as _uuid
    user_id = session.get('user_id')
    if not user_id or user_id == 'admin':
        return {'ok': False, 'pedidos': []}, 200
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Support both UUID and integer user IDs
        try:
            _uuid.UUID(str(user_id))
            cur.execute("""
                SELECT id, status, valor_total, criado_em, tipo_entrega,
                       nome_completo, telefone_entrega, endereco_completo, cep
                FROM pedidos
                WHERE usuario_id = %s::uuid
                ORDER BY criado_em DESC
            """, (user_id,))
        except ValueError:
            cur.execute("""
                SELECT id, status, valor_total, criado_em, tipo_entrega,
                       nome_completo, telefone_entrega, endereco_completo, cep
                FROM pedidos
                WHERE usuario_id::text = %s
                ORDER BY criado_em DESC
            """, (str(user_id),))
        rows = cur.fetchall()
        cur.close()
        pedidos = []
        for r in rows:
            pedidos.append({
                'id': str(r['id']),
                'status': r['status'] or 'Pedido Solicitado',
                'total': float(r['valor_total'] or 0),
                'criadoEm': r['criado_em'].isoformat() if r['criado_em'] else None,
                'tipoEntrega': r['tipo_entrega'] or '',
                'nomeCompleto': r['nome_completo'] or '',
                'telefone': r['telefone_entrega'] or '',
                'endereco': r['endereco_completo'] or '',
                'cep': r['cep'] or ''
            })
        return {'ok': True, 'pedidos': pedidos}
    except Exception as e:
        print(f"Erro ao buscar meus pedidos: {e}")
        return {'ok': False, 'pedidos': [], 'error': str(e)}, 500
    finally:
        if conn:
            conn.close()


@app.route('/api/minhas-solicitacoes')
@login_required
def api_minhas_solicitacoes():
    user_id = session.get('user_id')
    if not user_id or user_id == 'admin':
        return {'ok': False, 'solicitacoes': []}, 200
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, descricao, arquivo_url, status,
                   resposta_admin, criado_em, preview_url
            FROM pedidos_personalizados
            WHERE usuario_id = %s::uuid
            ORDER BY criado_em DESC
        """, (user_id,))
        solicitacoes = cur.fetchall()
        cur.close()
        result = []
        for s in solicitacoes:
            result.append({
                'id': str(s['id']),
                'descricao': s['descricao'],
                'arquivo_url': s['arquivo_url'],
                'preview_url': s['preview_url'],
                'status': s['status'],
                'resposta_admin': s['resposta_admin'],
                'criado_em': s['criado_em'].isoformat() if s['criado_em'] else None
            })
        return {'ok': True, 'solicitacoes': result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'ok': False, 'solicitacoes': [], 'error': str(e)}, 500
    finally:
        if conn: conn.close()


@app.route('/api/custom/confirmar-entrega', methods=['POST'])
@login_required
def api_custom_confirmar_entrega():
    """Client confirms delivery method for an approved custom order."""
    user_id = session.get('user_id')
    data = request.get_json(silent=True) or {}
    sol_id = data.get('sol_id', '').strip()
    tipo_entrega = data.get('tipo_entrega', '').strip()  # 'retirada' or 'entrega'
    endereco_entrega = data.get('endereco_entrega', '').strip()
    nome_completo = data.get('nome_completo', '').strip()
    telefone = data.get('telefone', '').strip()

    if not sol_id or tipo_entrega not in ('retirada', 'entrega'):
        return {'ok': False, 'error': 'Dados incompletos.'}, 400
    if tipo_entrega == 'entrega' and not endereco_entrega:
        return {'ok': False, 'error': 'Informe o endereço de entrega.'}, 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        addr_text = f"{nome_completo} | {telefone} | {endereco_entrega}" if tipo_entrega == 'entrega' else 'Retirada com o vendedor'
        cur.execute("""
            UPDATE pedidos_personalizados
            SET tipo_entrega = %s, endereco_entrega = %s, status = 'Produção'
            WHERE id = %s::uuid AND usuario_id = %s::uuid AND status = 'Aprovado'
        """, (tipo_entrega, addr_text, sol_id, user_id))
        if cur.rowcount == 0:
            conn.rollback()
            return {'ok': False, 'error': 'Solicitação não encontrada ou ainda não aprovada.'}, 404
        conn.commit()
        cur.close()
        return {'ok': True}
    except Exception as e:
        if conn: conn.rollback()
        import traceback; traceback.print_exc()
        return {'ok': False, 'error': str(e)}, 500
    finally:
        if conn: conn.close()


# --- HELPER: BUSCAR COMENTÁRIOS DO BANCO COMO JSON ---
def _get_comentarios_json(limit=100):
    import json as _json
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id, c.texto, c.data_comentario,
                   COALESCE(c.nota, 5) AS nota, c.imagem_url,
                   COALESCE(u.nome, 'Anônimo') AS nome,
                   COALESCE(u.sobrenome, '') AS sobrenome,
                   pr.nome AS produto_nome
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            LEFT JOIN produtos pr ON c.produto_id = pr.id
            ORDER BY c.data_comentario DESC NULLS LAST
            LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        cur.close()
        result = []
        for r in rows:
            ts = r['data_comentario']
            result.append({
                'id': str(r['id']),
                'name': (r['nome'] + ' ' + r['sobrenome']).strip() or 'Anônimo',
                'context': r['produto_nome'] or 'Cliente ALCHEMIST 3D',
                'rating': int(r.get('nota') or 5),
                'imagem_url': r.get('imagem_url') or None,
                'message': r['texto'] or '',
                'createdAt': ts.isoformat() if ts else ''
            })
        return _json.dumps(result, ensure_ascii=False)
    except Exception as e:
        print(f'Erro ao buscar comentários: {e}')
        return '[]'
    finally:
        if conn: conn.close()


# --- API: LISTAR COMENTÁRIOS (JSON) ---
@app.route('/api/comentarios')
def api_comentarios_list():
    import json as _json
    data = _get_comentarios_json(limit=100)
    return app.response_class(response=data, status=200, mimetype='application/json')


# --- API: ENVIAR COMENTÁRIO / AVALIAÇÃO ---
@app.route('/api/comentario', methods=['POST'])
def api_comentario():
    data = request.get_json(force=True, silent=True) or {}
    texto = str(data.get('message', '') or data.get('texto', '')).strip()
    nome = str(data.get('name', '')).strip()
    produto_id = data.get('produto_id') or None
    nota = max(1, min(5, int(data.get('rating') or data.get('nota') or 5)))
    imagem_url = data.get('imagem_url') or None

    if not texto:
        return {'ok': False, 'error': 'Texto obrigatório'}, 400

    usuario_id = session.get('user_id')
    if usuario_id == 'admin':
        usuario_id = None

    # Usuário anônimo: embutir o nome no texto para que o admin visualize
    if not usuario_id and nome:
        texto = f"[{nome}] {texto}"

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if usuario_id:
            cur.execute("""
                INSERT INTO comentarios (usuario_id, produto_id, texto, nota, imagem_url, data_comentario)
                VALUES (%s::uuid, %s::uuid, %s, %s, %s, NOW())
            """, (usuario_id, produto_id, texto, nota, imagem_url))
        else:
            cur.execute("""
                INSERT INTO comentarios (produto_id, texto, nota, imagem_url, data_comentario)
                VALUES (%s::uuid, %s, %s, %s, NOW())
            """, (produto_id, texto, nota, imagem_url))
        conn.commit()
        cur.close()
        return {'ok': True}
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Erro ao salvar comentário: {e}")
        return {'ok': False, 'error': str(e)}, 500
    finally:
        if conn:
            conn.close()


# --- API: UPLOAD DE IMAGEM PARA COMENTÁRIO ---
@app.route('/api/comentario/imagem', methods=['POST'])
def api_comentario_imagem():
    if 'imagem' not in request.files:
        return {'ok': False, 'error': 'Nenhuma imagem enviada'}, 400
    arquivo = request.files['imagem']
    if not arquivo.filename or not allowed_file(arquivo.filename):
        return {'ok': False, 'error': 'Formato não suportado. Use PNG, JPG ou WEBP.'}, 400
    try:
        url = salvar_upload(arquivo, COMMENT_UPLOAD_FOLDER, prefixo='comentario-')
    except Exception as e:
        print(f"Erro no upload da imagem do comentário: {e}")
        return {'ok': False, 'error': 'Não foi possível enviar a imagem.'}, 500
    return {'ok': True, 'url': url}


# =============================================================================
# CHAT DE SUPORTE EM TEMPO REAL
# =============================================================================

@app.route('/enviar_mensagem', methods=['POST'])
def enviar_mensagem():
    if 'user_id' not in session:
        return _json.dumps({'ok': False, 'error': 'Não autenticado'}), 401, {'Content-Type': 'application/json'}
    data = request.get_json(force=True, silent=True) or {}
    mensagem = str(data.get('mensagem', '')).strip()[:2000]
    if not mensagem:
        return _json.dumps({'ok': False, 'error': 'Mensagem vazia'}), 400, {'Content-Type': 'application/json'}
    usuario_id = str(session['user_id'])
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO chat_suporte (usuario_id, mensagem, enviado_por, lida) VALUES (%s, %s, 'cliente', FALSE)",
            (usuario_id, mensagem)
        )
        conn.commit()
        cur.close()
        return _json.dumps({'ok': True}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        if conn: conn.rollback()
        print(f"[Chat] Erro ao enviar mensagem: {e}")
        return _json.dumps({'ok': False, 'error': 'Erro interno'}), 500, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


@app.route('/api/chat/mensagens')
def api_chat_mensagens():
    if 'user_id' not in session:
        return _json.dumps({'ok': False, 'mensagens': []}), 200, {'Content-Type': 'application/json'}
    usuario_id = str(session['user_id'])
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT id, mensagem, enviado_por, lida,
                      TO_CHAR(criado_em, 'HH24:MI') AS hora,
                      TO_CHAR(criado_em, 'DD/MM/YYYY') AS data
               FROM chat_suporte
               WHERE usuario_id = %s
               ORDER BY criado_em ASC
               LIMIT 200""",
            (usuario_id,)
        )
        msgs = [dict(r) for r in cur.fetchall()]
        cur.execute(
            "UPDATE chat_suporte SET lida = TRUE WHERE usuario_id = %s AND enviado_por = 'admin' AND lida = FALSE",
            (usuario_id,)
        )
        conn.commit()
        cur.close()
        return _json.dumps({'ok': True, 'mensagens': msgs}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"[Chat] Erro ao buscar mensagens: {e}")
        return _json.dumps({'ok': False, 'mensagens': []}), 200, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


_SQL_CONVERSAS = """
    SELECT
        cs.usuario_id::text AS usuario_id,
        COALESCE(NULLIF(TRIM(COALESCE(u.nome, '') || ' ' || COALESCE(u.sobrenome, '')), ''), 'Cliente') AS nome_usuario,
        COALESCE(u.email, '') AS email_usuario,
        COUNT(*) FILTER (WHERE cs.enviado_por = 'cliente' AND cs.lida = FALSE) AS nao_lidas,
        MAX(cs.criado_em) AS ultima_msg,
        (ARRAY_AGG(cs.mensagem ORDER BY cs.criado_em DESC))[1] AS previa,
        (ARRAY_AGG(cs.enviado_por ORDER BY cs.criado_em DESC))[1] AS ultimo_autor
    FROM chat_suporte cs
    LEFT JOIN usuarios u ON u.id = cs.usuario_id
    GROUP BY cs.usuario_id, u.nome, u.sobrenome, u.email
    ORDER BY ultima_msg DESC
"""

def _conversas_suporte(cur):
    """Uma linha por cliente que já usou o chat, com não lidas e a última mensagem."""
    cur.execute(_SQL_CONVERSAS)
    conversas = []
    for r in cur.fetchall():
        c = dict(r)
        c['nao_lidas'] = int(c['nao_lidas'] or 0)
        c['quando'] = c['ultima_msg'].strftime('%d/%m %H:%M') if c['ultima_msg'] else ''
        c['ultima_msg'] = c['ultima_msg'].isoformat() if c['ultima_msg'] else ''
        c['previa'] = (c['previa'] or '')[:90]
        conversas.append(c)
    return conversas


@app.route('/admin/suporte')
@admin_required
def admin_suporte():
    # ?uid= abre direto a conversa (links do painel e dos personalizados)
    uid = (request.args.get('uid') or request.args.get('user') or '').strip()
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        conversas = _conversas_suporte(cur)
        if uid and not any(c['usuario_id'] == uid for c in conversas):
            # cliente que ainda não usou o chat: começa uma conversa nova com ele
            cur.execute("SELECT id::text AS usuario_id, TRIM(nome || ' ' || COALESCE(sobrenome, '')) AS nome_usuario, email AS email_usuario FROM usuarios WHERE id::text = %s", (uid,))
            novo = cur.fetchone()
            if novo:
                conversas.insert(0, dict(novo, nao_lidas=0, quando='nova', ultima_msg='', previa='Nenhuma mensagem ainda', ultimo_autor=''))
            else:
                uid = ''
        cur.close()
    except Exception as e:
        print(f"[Chat Admin] Erro: {e}")
        conversas = []
    finally:
        if conn: conn.close()
    return render_template('admin_suporte.html', conversas=conversas,
                           unread_total=sum(c['nao_lidas'] for c in conversas), uid_inicial=uid)


@app.route('/api/chat/admin/conversas')
@admin_required
def api_chat_admin_conversas():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        conversas = _conversas_suporte(cur)
        cur.close()
        return jsonify({'ok': True, 'conversas': conversas})
    except Exception as e:
        print(f"[Chat Admin] Erro ao listar conversas: {e}")
        return jsonify({'ok': False, 'conversas': []}), 500
    finally:
        if conn: conn.close()


@app.route('/admin/suporte/responder', methods=['POST'])
@admin_required
def admin_suporte_responder():
    data = request.get_json(force=True, silent=True) or {}
    usuario_id = str(data.get('usuario_id', '')).strip()
    mensagem = str(data.get('mensagem', '')).strip()[:2000]
    if not usuario_id or not mensagem:
        return _json.dumps({'ok': False, 'error': 'Dados inválidos'}), 400, {'Content-Type': 'application/json'}
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO chat_suporte (usuario_id, mensagem, enviado_por, lida) VALUES (%s, %s, 'admin', FALSE)",
            (usuario_id, mensagem)
        )
        # Mark client messages for this user as read
        cur.execute(
            "UPDATE chat_suporte SET lida = TRUE WHERE usuario_id = %s AND enviado_por = 'cliente' AND lida = FALSE",
            (usuario_id,)
        )
        conn.commit()
        cur.close()
        return _json.dumps({'ok': True}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        if conn: conn.rollback()
        print(f"[Chat Admin] Erro ao responder: {e}")
        return _json.dumps({'ok': False, 'error': 'Erro interno'}), 500, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


@app.route('/api/chat/admin/mensagens/<usuario_id>')
@admin_required
def api_chat_admin_mensagens(usuario_id):
    usuario_id = str(usuario_id)
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """SELECT id, mensagem, enviado_por, lida,
                      TO_CHAR(criado_em, 'HH24:MI') AS hora,
                      TO_CHAR(criado_em, 'DD/MM/YYYY') AS data
               FROM chat_suporte
               WHERE usuario_id = %s
               ORDER BY criado_em ASC
               LIMIT 200""",
            (usuario_id,)
        )
        msgs = [dict(r) for r in cur.fetchall()]
        # o admin abriu a conversa: as mensagens do cliente contam como lidas
        cur.execute("UPDATE chat_suporte SET lida = TRUE WHERE usuario_id = %s AND enviado_por = 'cliente' AND lida = FALSE", (usuario_id,))
        conn.commit()
        cur.close()
        return _json.dumps({'ok': True, 'mensagens': msgs}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        if conn: conn.rollback()
        print(f"[Chat Admin] Erro ao buscar conversa: {e}")
        return _json.dumps({'ok': False, 'mensagens': []}), 200, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


@app.route('/api/chat/admin/unread')
@admin_required
def api_chat_admin_unread():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM chat_suporte WHERE lida = FALSE AND enviado_por = 'cliente'")
        count = cur.fetchone()[0]
        cur.close()
        return _json.dumps({'ok': True, 'count': count}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return _json.dumps({'ok': True, 'count': 0}), 200, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


@app.route('/api/notificacoes')
def api_notificacoes():
    """Retorna notificações não lidas para o usuário logado:
       - Mensagens de chat respondidas pelo admin (não lidas)
       - Comentários que receberam resposta da loja (não visualizados)
    """
    if 'user_id' not in session:
        return _json.dumps({'ok': False, 'notificacoes': [], 'total': 0}), 200, {'Content-Type': 'application/json'}
    usuario_id = str(session['user_id'])
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        notifs = []

        # 1. Mensagens de chat do admin não lidas
        cur.execute("""
            SELECT id, mensagem, TO_CHAR(criado_em, 'DD/MM HH24:MI') AS hora
            FROM chat_suporte
            WHERE usuario_id = %s AND enviado_por = 'admin' AND lida = FALSE
            ORDER BY criado_em DESC
            LIMIT 10
        """, (usuario_id,))
        for row in cur.fetchall():
            notifs.append({
                'tipo': 'chat',
                'id': str(row['id']),
                'texto': 'Suporte respondeu: ' + (row['mensagem'][:60] + '…' if len(row['mensagem']) > 60 else row['mensagem']),
                'hora': row['hora'],
                'link': None
            })

        # 2. Comentários com nova resposta da loja (resposta_admin preenchida e não visualizada)
        cur.execute("""
            SELECT c.id, c.resposta_admin, c.texto,
                   TO_CHAR(COALESCE(c.data_postagem, c.data_comentario), 'DD/MM') AS data,
                   pr.nome AS produto_nome
            FROM comentarios c
            LEFT JOIN produtos pr ON c.produto_id = pr.id
            WHERE c.usuario_id = %s
              AND c.resposta_admin IS NOT NULL
              AND COALESCE(c.resposta_vista, FALSE) = FALSE
            ORDER BY COALESCE(c.data_postagem, c.data_comentario) DESC
            LIMIT 10
        """, (usuario_id,))
        for row in cur.fetchall():
            nome_prod = row['produto_nome'] or 'seu comentário'
            texto_resp = row['resposta_admin'] or ''
            notifs.append({
                'tipo': 'comentario',
                'id': str(row['id']),
                'texto': 'Loja respondeu em ' + nome_prod + ': ' + (texto_resp[:55] + '…' if len(texto_resp) > 55 else texto_resp),
                'hora': row['data'],
                'link': None
            })

        # 3. Notificações de evolução de pedido
        try:
            cur.execute("""
                SELECT id, pedido_id, mensagem, TO_CHAR(criado_em, 'DD/MM HH24:MI') AS hora
                FROM notificacoes_pedido
                WHERE usuario_id = %s AND lida = FALSE
                ORDER BY criado_em DESC
                LIMIT 10
            """, (usuario_id,))
            for row in cur.fetchall():
                notifs.append({
                    'tipo': 'pedido',
                    'id': str(row['id']),
                    'texto': row['mensagem'],
                    'hora': row['hora'],
                    'pedido_id': str(row['pedido_id'])
                })
        except Exception:
            pass  # tabela ainda não existe

        cur.close()
        total = len(notifs)
        return _json.dumps({'ok': True, 'notificacoes': notifs, 'total': total}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"[Notif] Erro: {e}")
        return _json.dumps({'ok': False, 'notificacoes': [], 'total': 0}), 200, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


@app.route('/api/notificacoes/marcar_lidas', methods=['POST'])
def api_notificacoes_marcar_lidas():
    """Marca todas as notificações do usuário como vistas."""
    if 'user_id' not in session:
        return _json.dumps({'ok': False}), 401, {'Content-Type': 'application/json'}
    usuario_id = str(session['user_id'])
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Mark admin chat messages as read
        cur.execute(
            "UPDATE chat_suporte SET lida = TRUE WHERE usuario_id = %s AND enviado_por = 'admin' AND lida = FALSE",
            (usuario_id,)
        )
        # Mark comment replies as seen (only if column exists)
        try:
            cur.execute(
                "UPDATE comentarios SET resposta_vista = TRUE WHERE usuario_id = %s AND resposta_admin IS NOT NULL AND COALESCE(resposta_vista, FALSE) = FALSE",
                (usuario_id,)
            )
        except Exception:
            conn.rollback()
            # Column may not exist yet — that's OK
        # Mark pedido notifications as read
        try:
            cur.execute(
                "UPDATE notificacoes_pedido SET lida = TRUE WHERE usuario_id = %s AND lida = FALSE",
                (usuario_id,)
            )
        except Exception:
            pass  # tabela ainda não existe
        conn.commit()
        cur.close()
        return _json.dumps({'ok': True}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        if conn: conn.rollback()
        print(f"[Notif] Erro ao marcar lidas: {e}")
        return _json.dumps({'ok': False}), 500, {'Content-Type': 'application/json'}
    finally:
        if conn: conn.close()


# --- EXECUÇÃO DO SERVIDOR ---
if __name__ == '__main__':
    # Servidor de desenvolvimento (localhost). Em produção use: waitress-serve wsgi:app
    ensure_db_schema()
    migrar_senhas_texto_puro()
    app.run(debug=DEBUG, host='localhost', port=5050)