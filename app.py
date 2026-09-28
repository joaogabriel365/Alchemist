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

# --- ROTA: AUTENTICAÇÃO (LOGIN) ---
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        senha = request.form.get('password', '')

        # Verificação de admin (credenciais fixas, sem depender do banco)
        # O e-mail do admin só entra com a senha do .env (não cai na conta do banco)
        if email.lower() == ADMIN_EMAIL.lower():
            if not secrets.compare_digest(senha.encode(), ADMIN_PASSWORD.encode()):
                flash('E-mail ou senha incorretos.', 'error')
                return redirect(url_for('auth') + '?tab=login')
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
            cur.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
            usuario = cur.fetchone()
            cur.close()

            if usuario and _senha_confere(usuario['senha_hash'], senha):
                session['user_id'] = str(usuario['id'])
                session['user_nome'] = usuario['nome']
                session['user_sobrenome'] = usuario.get('sobrenome', '')
                session['user_email'] = usuario['email']
                session['user_telefone'] = usuario.get('telefone', '')
                session['is_admin'] = bool(usuario.get('is_admin', False))
                next_page = request.args.get('next')
                if session['is_admin']:
                    return redirect(url_for('admin_dashboard'))
                seguro = next_page and next_page.startswith('/') and not next_page.startswith('//')
                return redirect(next_page if seguro else url_for('index'))

            flash('E-mail ou senha incorretos.', 'error')
        except Exception as e:
            print(f"Erro de login: {e}")
            flash('Erro interno ao tentar logar. Tente novamente.', 'error')
        finally:
            if conn: conn.close()
        return redirect(url_for('auth') + '?tab=login')
    return render_template('auth.html')

# --- ROTA: REGISTRO (PROCESSAMENTO) ---
@app.route('/register', methods=['POST'])
def register():
    nome = request.form.get('firstName', '').strip()
    sobrenome = request.form.get('lastName', '').strip()
    email = request.form.get('email', '').strip()
    senha = request.form.get('password', '')
    confirma = request.form.get('confirmPassword', '')
    cpf = request.form.get('cpf', '').strip()
    cidade = request.form.get('city', '').strip()
    estado = request.form.get('state', 'SP').strip()[:2]
    telefone = request.form.get('phone', '').strip()

    if senha != confirma:
        flash('As senhas não conferem. Verifique e tente novamente.', 'error')
        return redirect(url_for('auth') + '?tab=register')

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO usuarios (nome, sobrenome, email, senha_hash, cpf, cidade, estado, telefone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome, sobrenome, email
        """, (nome, sobrenome, email, generate_password_hash(senha), cpf, cidade, estado, telefone))
        novo = cur.fetchone()
        conn.commit()
        cur.close()
        # Login automático após cadastro
        session['user_id'] = str(novo[0])
        session['user_nome'] = novo[1]
        session['user_sobrenome'] = novo[2]
        session['user_email'] = novo[3]
        session['user_telefone'] = telefone
        flash(f'Bem-vindo, {novo[1]}! Sua conta foi criada com sucesso.', 'success')
        next_page = request.args.get('next')
        seguro = next_page and next_page.startswith('/') and not next_page.startswith('//')
        return redirect(next_page if seguro else url_for('index'))
    except Exception as e:
        if conn: conn.rollback()
        print(f"ERRO CRÍTICO NO BANCO: {e}")
        flash('Erro ao cadastrar: verifique se o e-mail ou CPF já existem.', 'error')
        return redirect(url_for('auth') + '?tab=register')
    finally:
        if conn: conn.close()

# --- ROTA: MINHA CONTA (PROTEGIDA) ---
@app.route('/account')
def account():
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('account.html', user_nome=session.get('user_nome'))

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
@login_required
def custom():
    return render_template('custom.html')

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
            "INSERT INTO pedidos_personalizados (usuario_id, descricao, arquivo_url, status, preview_url, cores_json) VALUES (%s::uuid, %s, %s, 'aguardando', %s, %s)",
            (usuario_id, descricao, arquivo_url, preview_url, cores_json)
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
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('orders.html')

@app.route('/order')
def order_detail():
    if 'user_id' not in session:
        return redirect(url_for('auth'))
    return render_template('order.html')

# =============================================================================
# ÁREA ADMINISTRATIVA
# =============================================================================

# --- ADMIN: DASHBOARD ---
@app.route('/admin')
@admin_required
def admin_dashboard():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM produtos WHERE ativo = TRUE")
        total_produtos = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM pedidos 
            WHERE status != 'no_carrinho'
        """)
        total_pedidos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM usuarios")
        total_usuarios = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM comentarios WHERE resposta_admin IS NULL")
        comentarios_pendentes = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM pedidos_personalizados WHERE status IN ('aguardando', 'Em An\u00e1lise')")
        custom_pendentes = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM financeiro WHERE status_pagamento = 'Aguardando Aprovação'")
        pagamentos_pendentes = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE status NOT IN ('no_carrinho', 'Pedido Cancelado')")
        faturamento_total = float(cur.fetchone()[0])
        try:
            cur.execute("SELECT COUNT(*) FROM chat_suporte WHERE lida = FALSE AND enviado_por = 'cliente'")
            chat_nao_lidas = cur.fetchone()[0]
        except Exception:
            chat_nao_lidas = 0
        # Lista de usuários para o dashboard
        cur.execute("""
            SELECT u.id, u.nome, u.sobrenome, u.email, u.cidade, u.estado, u.telefone, u.criado_em,
                   COUNT(DISTINCT p.id) AS total_pedidos,
                   COUNT(DISTINCT pp.id) AS total_personalizados
            FROM usuarios u
            LEFT JOIN pedidos p ON p.usuario_id = u.id
            LEFT JOIN pedidos_personalizados pp ON pp.usuario_id = u.id
            WHERE u.email != %s
            GROUP BY u.id, u.nome, u.sobrenome, u.email, u.cidade, u.estado, u.telefone, u.criado_em
            ORDER BY u.criado_em DESC
        """, (ADMIN_EMAIL,))
        usuarios_list = cur.fetchall()
        cur.close()
        return render_template('admin.html',
            total_produtos=total_produtos,
            total_pedidos=total_pedidos,
            total_usuarios=total_usuarios,
            comentarios_pendentes=comentarios_pendentes,
            custom_pendentes=custom_pendentes,
            pagamentos_pendentes=pagamentos_pendentes,
            faturamento_total=faturamento_total,
            chat_nao_lidas=chat_nao_lidas,
            usuarios_list=usuarios_list)
    except Exception as e:
        print(f"Erro no dashboard admin: {e}")
        return render_template('admin.html',
            total_produtos=0, total_pedidos=0, total_usuarios=0,
            comentarios_pendentes=0, custom_pendentes=0, pagamentos_pendentes=0,
            faturamento_total=0, chat_nao_lidas=0, usuarios_list=[])
    finally:
        if conn: conn.close()

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
        chaveiros = [p for p in todos if 'chaveiro' in (p.get('categoria') or '').lower()]
        outros    = [p for p in todos if 'chaveiro' not in (p.get('categoria') or '').lower()]
        destaques = [p for p in todos if p.get('destaque')]
        return render_template('admin_products.html',
                               chaveiros=chaveiros, outros=outros,
                               destaques=destaques, total=len(todos),
                               novidade=novidade)
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
                   pp.usuario_id::text AS usuario_id,
                   u.nome, u.sobrenome, u.email
            FROM pedidos_personalizados pp
            LEFT JOIN usuarios u ON pp.usuario_id = u.id
            ORDER BY pp.criado_em DESC
        """)
        custom_requests = cur.fetchall()
        cur.close()
        status_custom = ['aguardando', 'Em Análise', 'Aprovado', 'Produção', 'Finalizado', 'Entregue', 'Recusado']
        solicitacoes  = [r for r in custom_requests if r['status'] in ('aguardando', 'Em Análise')]
        pedidos_ativos = [r for r in custom_requests if r['status'] in ('Aprovado', 'Produção', 'Finalizado', 'Entregue')]
        recusados = [r for r in custom_requests if r['status'] == 'Recusado']
        return render_template('admin_comments.html',
            comentarios=comentarios,
            custom_requests=custom_requests,
            solicitacoes=solicitacoes,
            pedidos_ativos=pedidos_ativos,
            recusados=recusados,
            status_custom=status_custom)
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
        return redirect(url_for('admin_comments'))
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE comentarios SET resposta_admin=%s WHERE id=%s",
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
    return redirect(url_for('admin_comments'))

# --- ADMIN: RESPONDER PEDIDO PERSONALIZADO ---
@app.route('/admin/custom/reply/<uuid:custom_id>', methods=['POST'])
@admin_required
def admin_custom_reply(custom_id):
    resposta = request.form.get('resposta', '').strip()
    novo_status = request.form.get('status', '').strip()
    status_validos = ['aguardando', 'Em Análise', 'Aprovado', 'Produção', 'Finalizado', 'Entregue', 'Recusado']
    if novo_status not in status_validos:
        novo_status = None
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        if novo_status:
            cur.execute("""
                UPDATE pedidos_personalizados SET resposta_admin=%s, status=%s WHERE id=%s
            """, (resposta or None, novo_status, str(custom_id)))
        else:
            cur.execute("""
                UPDATE pedidos_personalizados SET resposta_admin=%s WHERE id=%s
            """, (resposta or None, str(custom_id)))
        conn.commit()
        cur.close()
        flash('Pedido personalizado atualizado.', 'success')
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro ao responder pedido personalizado: {e}")
        flash('Erro ao atualizar pedido personalizado.', 'error')
    finally:
        if conn: conn.close()
    return redirect(url_for('admin_comments'))

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
        erro_msg = traceback.format_exc()
        with open('erro_financeiro.txt', 'w') as f:
            f.write(str(e) + '\n\n')
            f.write(erro_msg)
        flash(f'Erro: {str(e)}', 'error')
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
    return redirect(url_for('admin_comments'))

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
    return redirect(url_for('admin_comments'))

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


@app.route('/admin/suporte')
@admin_required
def admin_suporte():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Aggregate conversations per user with unread count
        cur.execute("""
            SELECT
                cs.usuario_id::text,
                COALESCE(u.nome || ' ' || COALESCE(u.sobrenome,''), cs.usuario_id::text) AS nome_usuario,
                COALESCE(u.email, '') AS email_usuario,
                COUNT(*) FILTER (WHERE cs.enviado_por = 'cliente' AND cs.lida = FALSE) AS nao_lidas,
                MAX(cs.criado_em) AS ultima_msg
            FROM chat_suporte cs
            LEFT JOIN usuarios u ON u.id = cs.usuario_id
            GROUP BY cs.usuario_id, u.nome, u.sobrenome, u.email
            ORDER BY ultima_msg DESC
        """)
        conversas = [dict(r) for r in cur.fetchall()]
        cur.close()
        # Unread count for badge
        unread_total = sum(int(c['nao_lidas']) for c in conversas)
    except Exception as e:
        print(f"[Chat Admin] Erro: {e}")
        conversas = []
        unread_total = 0
    finally:
        if conn: conn.close()
    return render_template('admin_suporte.html', conversas=conversas, unread_total=unread_total)


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
        cur.close()
        return _json.dumps({'ok': True, 'mensagens': msgs}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
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