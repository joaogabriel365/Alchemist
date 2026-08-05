"""
routes_pedidos_financeiro.py
============================
Blueprint Flask com as rotas de Pedidos e Financeiro da Loja3D.

COMO REGISTRAR EM app.py:
    from routes_pedidos_financeiro import pedidos_bp
    app.register_blueprint(pedidos_bp)

DEPENDÊNCIAS: psycopg2, Flask, functools
BANCO: PostgreSQL — tabelas: pedidos, financeiro, usuarios, itens_pedido
"""

import uuid as _uuid
from functools import wraps
from collections import defaultdict

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify, session, redirect, url_for

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DO BLUEPRINT
# ---------------------------------------------------------------------------
pedidos_bp = Blueprint("pedidos_bp", __name__)

# ---------------------------------------------------------------------------
# UTILITÁRIOS INTERNOS
# ---------------------------------------------------------------------------

def _get_conn():
    """Abre e retorna uma conexão psycopg2 com o banco loja3d."""
    return psycopg2.connect(
        host="localhost",
        database="loja3d",
        user="postgres",
        password="AEC12bdf10.",
        port="5432",
    )


def _login_required(f):
    """Redireciona para /auth se o usuário não estiver logado."""
    @wraps(f)
    def _inner(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("auth", next=request.path))
        return f(*args, **kwargs)
    return _inner


def _admin_required(f):
    """Redireciona para / se o usuário não for admin."""
    @wraps(f)
    def _inner(*args, **kwargs):
        if "user_id" not in session or not session.get("is_admin"):
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return _inner


# Status permitidos para a tabela pedidos.status_pedido
STATUS_PEDIDO_VALIDOS = [
    "Pedido Solicitado",
    "Pagamento Aprovado",
    "Pedido Aprovado",
    "Pedido em Andamento",
    "Pedido Finalizado",
    "Pedido Entregue",
    "Pedido Cancelado",
]


# ===========================================================================
# 1. ROTA: /checkout/confirmar_pagamento  [POST]
# ===========================================================================
@pedidos_bp.route("/checkout/confirmar_pagamento", methods=["POST"])
@_login_required
def checkout_confirmar_pagamento():
    """
    Confirma um pedido e registra na tabela financeiro em uma única transação.

    Payload JSON esperado:
        {
            "usuario_id": "<uuid>",           # opcional — fallback para session
            "itens": [
                {"produto_id": "<uuid>", "quantidade": 2, "preco_unitario": 49.90}
            ],
            "valor_total": 99.80,
            "endereco_completo": "Rua X, 10 — SP",  # null se retirada
            "tipo_entrega": "entrega" | "retirada"
        }

    Retorna JSON: { "ok": true, "pedido_id": "<uuid>" }
    """
    data = request.get_json(force=True, silent=True) or {}

    # --- Extrair e validar campos obrigatórios ---
    usuario_id = str(data.get("usuario_id") or session.get("user_id") or "").strip()
    itens = data.get("itens", [])
    valor_total = float(data.get("valor_total") or 0)
    tipo_entrega = str(data.get("tipo_entrega") or "entrega").strip().lower()
    endereco_completo = data.get("endereco_completo")  # pode ser None / null

    # Admins não fazem compras
    if not usuario_id or usuario_id == "admin":
        return jsonify({"ok": False, "error": "Usuário inválido ou não autenticado."}), 400

    if tipo_entrega not in ("entrega", "retirada"):
        return jsonify({"ok": False, "error": "tipo_entrega deve ser 'entrega' ou 'retirada'."}), 400

    if tipo_entrega == "entrega" and not endereco_completo:
        return jsonify({"ok": False, "error": "endereco_completo é obrigatório para entrega."}), 400

    if not itens:
        return jsonify({"ok": False, "error": "O carrinho está vazio."}), 400

    # Gerar UUID para o novo pedido
    pedido_id = str(_uuid.uuid4())

    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor()

        # ------------------------------------------------------------------
        # a) INSERT em pedidos (status inicial = 'Pedido Solicitado')
        # ------------------------------------------------------------------
        cur.execute(
            """
            INSERT INTO pedidos
                (id, usuario_id, status, status_pedido,
                 total, valor_total, tipo_entrega, endereco_completo)
            VALUES
                (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s)
            """,
            (
                pedido_id,
                usuario_id,
                "Pedido Solicitado",   # coluna legacy status
                "Pedido Solicitado",   # coluna principal status_pedido
                valor_total,
                valor_total,
                tipo_entrega,
                endereco_completo,     # NULL se retirada
            ),
        )

        # ------------------------------------------------------------------
        # Inserir itens do pedido usando SAVEPOINT para pular IDs inválidos
        # ------------------------------------------------------------------
        for item in itens:
            try:
                pid = str(item.get("produto_id", "")).strip()
                _uuid.UUID(pid)  # valida formato UUID antes de enviar ao banco
                cur.execute("SAVEPOINT sp_item")
                cur.execute(
                    """
                    INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
                    VALUES (%s::uuid, %s::uuid, %s, %s)
                    """,
                    (pedido_id, pid, int(item.get("quantidade", 1)), float(item.get("preco_unitario", 0))),
                )
            except Exception as item_err:
                # Item com UUID inválido ou produto inexistente — ignora sem abortar
                cur.execute("ROLLBACK TO SAVEPOINT sp_item")
                print(f"[checkout] item ignorado: {item_err}")

        # ------------------------------------------------------------------
        # b) INSERT em financeiro (vinculado ao pedido recém-criado)
        # ------------------------------------------------------------------
        cur.execute(
            """
            INSERT INTO financeiro (pedido_id, valor_total, status_pagamento)
            VALUES (%s::uuid, %s, 'Aguardando Aprovação')
            """,
            (pedido_id, valor_total),
        )

        # ------------------------------------------------------------------
        # c) COMMIT único — ambos os INSERTs confirmados juntos
        # ------------------------------------------------------------------
        conn.commit()
        cur.close()

        return jsonify({"ok": True, "pedido_id": pedido_id}), 201

    except Exception as e:
        # ------------------------------------------------------------------
        # d) Se qualquer INSERT falhar, desfaz TUDO
        # ------------------------------------------------------------------
        if conn:
            conn.rollback()
        print(f"[checkout_confirmar_pagamento] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro interno ao registrar pedido."}), 500

    finally:
        if conn:
            conn.close()


# ===========================================================================
# 2. ROTA ADMIN: /admin/financeiro/aprovar/<int:financeiro_id>  [POST]
# ===========================================================================
@pedidos_bp.route("/admin/financeiro/aprovar/<int:financeiro_id>", methods=["POST"])
@_admin_required
def admin_financeiro_aprovar(financeiro_id):
    """
    Aprova um pagamento pendente e avança o pedido para 'Pagamento Aprovado'.
    Ambas as atualizações são salvas em uma única transação.

    Retorna JSON: {
        "ok": true,
        "financeiro_id": 1,
        "pedido_id": "<uuid>",
        "status_pagamento": "Aprovado",
        "status_pedido": "Pagamento Aprovado"
    }
    """
    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor()

        # --- Atualiza financeiro e recupera o pedido_id vinculado ---
        cur.execute(
            """
            UPDATE financeiro
            SET status_pagamento = 'Aprovado'
            WHERE id = %s
            RETURNING pedido_id
            """,
            (financeiro_id,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"ok": False, "error": "Registro financeiro não encontrado."}), 404

        pedido_id = str(row[0])

        # --- Atualiza o pedido vinculado no mesmo bloco ---
        cur.execute(
            """
            UPDATE pedidos
            SET status = 'Pagamento Aprovado',
                status_pedido = 'Pagamento Aprovado',
                atualizado_em = NOW()
            WHERE id = %s::uuid
            """,
            (pedido_id,),
        )

        # --- COMMIT único — ambas as atualizações confirmadas juntas ---
        conn.commit()
        cur.close()

        return jsonify(
            {
                "ok": True,
                "financeiro_id": financeiro_id,
                "pedido_id": pedido_id,
                "status_pagamento": "Aprovado",
                "status_pedido": "Pagamento Aprovado",
            }
        ), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[admin_financeiro_aprovar] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro ao aprovar pagamento."}), 500

    finally:
        if conn:
            conn.close()


# ===========================================================================
# 3. ROTA ADMIN: /admin/financeiro/cancelar/<int:financeiro_id>  [POST]
# ===========================================================================
@pedidos_bp.route("/admin/financeiro/cancelar/<int:financeiro_id>", methods=["POST"])
@_admin_required
def admin_financeiro_cancelar(financeiro_id):
    """
    Cancela um pagamento e marca o pedido como 'Pedido Cancelado'.
    Ambas as atualizações são salvas em uma única transação.

    Retorna JSON: {
        "ok": true,
        "financeiro_id": 1,
        "pedido_id": "<uuid>",
        "status_pagamento": "Cancelado",
        "status_pedido": "Pedido Cancelado"
    }
    """
    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor()

        # --- Atualiza financeiro e recupera o pedido_id vinculado ---
        cur.execute(
            """
            UPDATE financeiro
            SET status_pagamento = 'Cancelado'
            WHERE id = %s
            RETURNING pedido_id
            """,
            (financeiro_id,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"ok": False, "error": "Registro financeiro não encontrado."}), 404

        pedido_id = str(row[0])

        # --- Cancela o pedido vinculado no mesmo bloco ---
        cur.execute(
            """
            UPDATE pedidos
            SET status = 'Pedido Cancelado',
                status_pedido = 'Pedido Cancelado',
                atualizado_em = NOW()
            WHERE id = %s::uuid
            """,
            (pedido_id,),
        )

        # --- COMMIT único — ambas as atualizações confirmadas juntas ---
        conn.commit()
        cur.close()

        return jsonify(
            {
                "ok": True,
                "financeiro_id": financeiro_id,
                "pedido_id": pedido_id,
                "status_pagamento": "Cancelado",
                "status_pedido": "Pedido Cancelado",
            }
        ), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[admin_financeiro_cancelar] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro ao cancelar pagamento."}), 500

    finally:
        if conn:
            conn.close()


# ===========================================================================
# 4. ROTA ADMIN: /admin/pedidos/atualizar_status/<uuid:pedido_id>  [POST]
# ===========================================================================
@pedidos_bp.route("/admin/pedidos/atualizar_status/<uuid:pedido_id>", methods=["POST"])
@_admin_required
def admin_pedidos_atualizar_status(pedido_id):
    """
    Atualiza o status_pedido de um pedido específico.

    Aceita form-data OU JSON com o campo 'novo_status'.
    Valida que o valor está dentro da lista de status permitidos.

    Retorna JSON: { "ok": true, "pedido_id": "<uuid>", "novo_status": "..." }
    """
    # Suporte a form-data e JSON na mesma rota
    data = request.get_json(force=True, silent=True) or {}
    novo_status = (
        str(request.form.get("novo_status", "") or data.get("novo_status", ""))
        .strip()
    )

    # --- Validação do status recebido ---
    if novo_status not in STATUS_PEDIDO_VALIDOS:
        return jsonify(
            {
                "ok": False,
                "error": f"Status inválido. Valores aceitos: {STATUS_PEDIDO_VALIDOS}",
            }
        ), 400

    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor()

        # Atualiza as duas colunas de status (status = legacy, status_pedido = principal)
        cur.execute(
            """
            UPDATE pedidos
            SET status = %s,
                status_pedido = %s,
                atualizado_em = NOW()
            WHERE id = %s::uuid
            """,
            (novo_status, novo_status, str(pedido_id)),
        )

        if cur.rowcount == 0:
            return jsonify({"ok": False, "error": "Pedido não encontrado."}), 404

        conn.commit()
        cur.close()

        return jsonify({"ok": True, "pedido_id": str(pedido_id), "novo_status": novo_status}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[admin_pedidos_atualizar_status] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro ao atualizar status do pedido."}), 500

    finally:
        if conn:
            conn.close()


# ===========================================================================
# 5. ROTA ADMIN: /admin/pedidos  [GET]
# ===========================================================================
@pedidos_bp.route("/admin/pedidos", methods=["GET"])
@_admin_required
def admin_pedidos_listar():
    """
    Retorna TODOS os pedidos de TODOS os usuários.

    Faz JOIN com 'usuarios' (nome, email do cliente) e
    LEFT JOIN com 'financeiro' (status_pagamento).
    Inclui o total_pedidos via COUNT direto na tabela.
    Ordenado por data de criação DESC (mais recente primeiro).

    Retorna JSON: {
        "ok": true,
        "total_pedidos": 42,
        "pedidos": [ {...}, ... ]
    }
    """
    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # --- COUNT direto — nunca retorna 0 se houver dados ---
        cur.execute("SELECT COUNT(*) AS total FROM pedidos")
        total_pedidos = cur.fetchone()["total"]

        # --- Busca todos os pedidos com JOIN em usuarios e financeiro ---
        cur.execute(
            """
            SELECT
                p.id,
                p.status_pedido,
                p.status        AS status_legado,
                p.valor_total,
                p.total,
                p.tipo_entrega,
                p.endereco_completo,
                p.nome_completo,
                p.telefone_entrega,
                p.criado_em,
                p.atualizado_em,
                u.nome          AS cliente_nome,
                u.sobrenome     AS cliente_sobrenome,
                u.email         AS cliente_email,
                f.id            AS financeiro_id,
                f.status_pagamento
            FROM pedidos p
            LEFT JOIN usuarios  u ON p.usuario_id = u.id
            LEFT JOIN financeiro f ON f.pedido_id = p.id
            ORDER BY p.criado_em DESC NULLS LAST
            """
        )
        pedidos_raw = cur.fetchall()

        # --- Busca os itens de todos os pedidos em uma única query ---
        cur.execute(
            """
            SELECT
                ip.pedido_id,
                ip.quantidade,
                ip.preco_unitario,
                pr.nome         AS produto_nome,
                pr.imagem_url
            FROM itens_pedido ip
            LEFT JOIN produtos pr ON ip.produto_id = pr.id
            """
        )
        itens_por_pedido = defaultdict(list)
        for row in cur.fetchall():
            itens_por_pedido[str(row["pedido_id"])].append(dict(row))

        cur.close()

        # Montar lista final combinando pedido + itens
        pedidos = []
        for p in pedidos_raw:
            p_dict = dict(p)
            p_dict["itens"] = itens_por_pedido.get(str(p["id"]), [])
            # Serializa UUID e datetime para string (compatibilidade JSON)
            p_dict["id"] = str(p_dict["id"])
            if p_dict.get("criado_em"):
                p_dict["criado_em"] = p_dict["criado_em"].isoformat()
            if p_dict.get("atualizado_em"):
                p_dict["atualizado_em"] = p_dict["atualizado_em"].isoformat()
            pedidos.append(p_dict)

        return jsonify({"ok": True, "total_pedidos": total_pedidos, "pedidos": pedidos}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[admin_pedidos_listar] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro ao buscar pedidos."}), 500

    finally:
        if conn:
            conn.close()


# ===========================================================================
# 6. ROTA ADMIN: /admin/financeiro  [GET]
# ===========================================================================
@pedidos_bp.route("/admin/financeiro", methods=["GET"])
@_admin_required
def admin_financeiro_listar():
    """
    Retorna APENAS os registros de financeiro com status_pagamento =
    'Aguardando Aprovação' — os que precisam de ação do admin.

    Faz JOIN com 'pedidos' (valor_total, tipo_entrega, endereco_completo, status_pedido)
    e JOIN com 'usuarios' (nome, email do cliente).
    Ordenado do mais antigo para o mais recente (admin processa em fila FIFO).

    Retorna JSON: {
        "ok": true,
        "total_pendentes": 3,
        "registros": [ {...}, ... ]
    }
    """
    conn = None
    try:
        conn = _get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            """
            SELECT
                f.id                AS financeiro_id,
                f.pedido_id,
                f.valor_total       AS valor_financeiro,
                f.status_pagamento,
                f.data_solicitacao,
                p.valor_total       AS valor_pedido,
                p.tipo_entrega,
                p.endereco_completo,
                COALESCE(p.status_pedido, p.status, 'Pedido Solicitado') AS status_pedido,
                u.nome              AS cliente_nome,
                u.sobrenome         AS cliente_sobrenome,
                u.email             AS cliente_email
            FROM financeiro f
            JOIN  pedidos  p ON f.pedido_id  = p.id
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE f.status_pagamento = 'Aguardando Aprovação'
            ORDER BY f.data_solicitacao ASC NULLS LAST
            """
        )
        registros_raw = cur.fetchall()
        cur.close()

        # Serializar UUIDs e datetimes
        registros = []
        for r in registros_raw:
            r_dict = dict(r)
            r_dict["pedido_id"] = str(r_dict["pedido_id"])
            if r_dict.get("data_solicitacao"):
                r_dict["data_solicitacao"] = r_dict["data_solicitacao"].isoformat()
            registros.append(r_dict)

        return jsonify(
            {
                "ok": True,
                "total_pendentes": len(registros),
                "registros": registros,
            }
        ), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[admin_financeiro_listar] ERRO: {e}")
        return jsonify({"ok": False, "error": "Erro ao buscar registros financeiros."}), 500

    finally:
        if conn:
            conn.close()
