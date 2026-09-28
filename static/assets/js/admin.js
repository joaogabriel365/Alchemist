// Comportamentos comuns do painel admin. Tudo é ligado por atributos data-*:
//
//   data-confirm="Texto"          em <form> ou <button>: pede confirmação antes de enviar
//     data-confirm-titulo, data-confirm-botao, data-confirm-perigo="1" (botão vermelho)
//   data-tabs / data-tab="x" / data-tab-painel="x"   abas (lembra a aba pelo #hash)
//   data-busca="#lista"          campo que filtra os [data-item] da lista pelo texto
//   data-filtros="#lista" data-campo="status"  botões [data-valor] que filtram por atributo
//   data-filtro-select="#lista" data-campo="x"  <select> que filtra do mesmo jeito
//   (nos itens, atributos com vários valores usam "|" como separador: data-estado="ativo|destaque")
//   data-flash                    mensagens do servidor viram avisos flutuantes
//
// E expõe: Admin.aviso(msg, tipo), Admin.confirmar(opções) → Promise<bool>, Admin.post(url, dados)
(function () {
    "use strict";

    const normalizar = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    // ── Avisos flutuantes ───────────────────────────────────────────────────
    let caixaAvisos = null;
    function aviso(mensagem, tipo = "success") {
        if (!caixaAvisos) {
            caixaAvisos = document.createElement("div");
            caixaAvisos.className = "a-toasts";
            caixaAvisos.setAttribute("role", "status");
            caixaAvisos.setAttribute("aria-live", "polite");
            document.body.appendChild(caixaAvisos);
        }
        const el = document.createElement("div");
        el.className = `a-toast ${tipo === "error" ? "is-error" : tipo === "info" ? "is-info" : ""}`;
        el.textContent = mensagem;
        caixaAvisos.appendChild(el);
        setTimeout(() => {
            el.classList.add("is-saindo");
            setTimeout(() => el.remove(), 260);
        }, tipo === "error" ? 6000 : 3500);
    }

    // ── Janela de confirmação ───────────────────────────────────────────────
    function confirmar({ titulo = "Tem certeza?", texto = "", botao = "Confirmar", perigo = false } = {}) {
        return new Promise((resolver) => {
            const fundo = document.createElement("div");
            fundo.className = "a-modal";
            fundo.innerHTML = `
                <div class="a-modal-box" role="dialog" aria-modal="true">
                    <h3></h3><p></p>
                    <div class="a-modal-actions">
                        <button type="button" class="a-btn a-btn-ghost" data-r="nao">Cancelar</button>
                        <button type="button" class="a-btn ${perigo ? "a-btn-danger" : "a-btn-primary"}" data-r="sim"></button>
                    </div>
                </div>`;
            fundo.querySelector("h3").textContent = titulo;
            fundo.querySelector("p").textContent = texto;
            fundo.querySelector("p").hidden = !texto;
            fundo.querySelector('[data-r="sim"]').textContent = botao;
            const fechar = (resposta) => {
                document.removeEventListener("keydown", teclado);
                fundo.remove();
                resolver(resposta);
            };
            const teclado = (e) => { if (e.key === "Escape") fechar(false); };
            fundo.addEventListener("click", (e) => {
                if (e.target === fundo) return fechar(false);
                const r = e.target.closest("[data-r]")?.dataset.r;
                if (r) fechar(r === "sim");
            });
            document.addEventListener("keydown", teclado);
            document.body.appendChild(fundo);
            fundo.querySelector('[data-r="sim"]').focus();
        });
    }

    // formulários e botões com data-confirm
    document.addEventListener("submit", async (e) => {
        const form = e.target;
        const origem = e.submitter?.dataset.confirm !== undefined ? e.submitter : form;
        if (origem.dataset.confirm === undefined || form.dataset.confirmado === "1") return;
        e.preventDefault();
        const ok = await confirmar({
            titulo: origem.dataset.confirmTitulo || "Tem certeza?",
            texto: origem.dataset.confirm,
            botao: origem.dataset.confirmBotao || "Confirmar",
            perigo: origem.dataset.confirmPerigo === "1"
        });
        if (!ok) return;
        form.dataset.confirmado = "1";
        if (e.submitter && e.submitter.name) {
            // preserva o valor do botão que disparou o envio; se já existe um campo com o
            // mesmo nome (ex.: <select name="status">), ele recebe o valor do botão
            const campos = [...form.elements].filter((el) => el.name === e.submitter.name && el.tagName !== "BUTTON");
            if (campos.length) {
                campos.forEach((el) => { el.value = e.submitter.value; });
            } else {
                const extra = document.createElement("input");
                extra.type = "hidden";
                extra.name = e.submitter.name;
                extra.value = e.submitter.value;
                form.appendChild(extra);
            }
        }
        form.submit();
    });

    // ── Chamadas ao servidor ────────────────────────────────────────────────
    async function post(url, dados) {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: dados ? JSON.stringify(dados) : undefined,
            credentials: "same-origin"
        });
        let json = {};
        try { json = await resp.json(); } catch { /* resposta sem JSON */ }
        if (!resp.ok || json.ok === false) throw new Error(json.error || `Erro ${resp.status}`);
        return json;
    }

    // ── Abas ────────────────────────────────────────────────────────────────
    document.querySelectorAll("[data-tabs]").forEach((grupo) => {
        const botoes = [...grupo.querySelectorAll("[data-tab]")];
        const escopo = document;
        const ativar = (nome, atualizarHash) => {
            if (!botoes.some((b) => b.dataset.tab === nome)) return;
            botoes.forEach((b) => {
                const ativo = b.dataset.tab === nome;
                b.classList.toggle("is-active", ativo);
                b.setAttribute("aria-selected", String(ativo));
            });
            escopo.querySelectorAll("[data-tab-painel]").forEach((p) => { p.hidden = p.dataset.tabPainel !== nome; });
            if (atualizarHash) history.replaceState(null, "", `#${nome}`);
        };
        botoes.forEach((b) => b.addEventListener("click", () => ativar(b.dataset.tab, true)));
        ativar(location.hash.slice(1) || botoes[0]?.dataset.tab, false);
    });

    // ── Busca e filtros em listas ───────────────────────────────────────────
    const estadoListas = new Map(); // seletor → { texto, filtros: {campo: valor} }
    const aplicarLista = (seletor) => {
        const lista = document.querySelector(seletor);
        if (!lista) return;
        const estado = estadoListas.get(seletor) || { texto: "", filtros: {} };
        let visiveis = 0;
        lista.querySelectorAll("[data-item]").forEach((item) => {
            const texto = !estado.texto || normalizar(item.dataset.textoBusca ?? item.textContent).includes(estado.texto);
            const filtros = Object.entries(estado.filtros).every(([campo, valor]) =>
                !valor || (item.dataset[campo] || "").split("|").includes(valor));
            const mostrar = texto && filtros;
            item.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        const vazio = document.querySelector(`[data-vazio="${seletor}"]`);
        if (vazio) vazio.hidden = visiveis > 0;
    };
    const estado = (seletor) => {
        if (!estadoListas.has(seletor)) estadoListas.set(seletor, { texto: "", filtros: {} });
        return estadoListas.get(seletor);
    };

    document.querySelectorAll("[data-busca]").forEach((campo) => {
        const alvo = campo.dataset.busca;
        campo.addEventListener("input", () => {
            estado(alvo).texto = normalizar(campo.value.trim());
            aplicarLista(alvo);
        });
    });

    document.querySelectorAll("[data-filtros]").forEach((grupo) => {
        const alvo = grupo.dataset.filtros;
        const campo = grupo.dataset.campo;
        grupo.addEventListener("click", (e) => {
            const botao = e.target.closest("[data-valor]");
            if (!botao) return;
            grupo.querySelectorAll("[data-valor]").forEach((b) => b.classList.toggle("is-active", b === botao));
            estado(alvo).filtros[campo] = botao.dataset.valor;
            aplicarLista(alvo);
        });
    });

    // listas de seleção como filtro: <select data-filtro-select="#lista" data-campo="categorias">
    document.querySelectorAll("[data-filtro-select]").forEach((sel) => {
        const alvo = sel.dataset.filtroSelect;
        sel.addEventListener("change", () => {
            estado(alvo).filtros[sel.dataset.campo] = sel.value;
            aplicarLista(alvo);
        });
    });

    // ── Menu lateral no celular ─────────────────────────────────────────────
    document.querySelector("[data-menu-toggle]")?.addEventListener("click", () => document.body.classList.toggle("a-menu-aberto"));
    document.addEventListener("click", (e) => {
        if (document.body.classList.contains("a-menu-aberto") && !e.target.closest(".a-side, [data-menu-toggle]")) {
            document.body.classList.remove("a-menu-aberto");
        }
    });

    // ── Mensagens do servidor (flash) ───────────────────────────────────────
    document.querySelectorAll("[data-flash]").forEach((el) => {
        aviso(el.textContent.trim(), el.dataset.flash === "error" ? "error" : el.dataset.flash === "info" ? "info" : "success");
        el.remove();
    });

    window.Admin = { aviso, confirmar, post, normalizar, aplicarLista };
})();
