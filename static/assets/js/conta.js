// Área do cliente (auth.html, account.html, order.html). Tudo ligado por atributos data-ct-*:
//   data-ct-aba / data-ct-painel / data-ct-ir   troca de painel no login (?tab=login|register|esqueci)
//   data-ct-abas + data-ct-aba-conta / data-ct-conteudo   abas da conta (lembra pelo #hash)
//   data-ct-olho            mostra/esconde a senha do campo ao lado
//   data-ct-senha           campo que alimenta a lista [data-ct-regras] e a barra [data-ct-forca]
//   data-ct-cadastro        confere os campos antes de enviar e mostra o erro em [data-ct-erro]
//   data-ct-enviando        trava o botão enquanto o formulário é enviado
//   data-ct-filtros         botões [data-valor] que filtram os [data-ct-item] pelo data-grupo
//   data-ct-chat            abre o chat de suporte do site
//   data-ct-entrega="id"    abre a escolha de entrega de um personalizado aprovado
(function () {
    "use strict";

    const ICONE_OLHO = '<svg class="a-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const ICONE_OLHO_OFF = '<svg class="a-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.9 17.9A10 10 0 0 1 12 19C5.5 19 2 12 2 12a18 18 0 0 1 4.1-5.1M9.9 5.2A9 9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/></svg>';

    const REGRAS = {
        tamanho: (s) => s.length >= 8,
        maiuscula: (s) => /[A-Z]/.test(s),
        minuscula: (s) => /[a-z]/.test(s),
        especial: (s) => /[^A-Za-z0-9]/.test(s)
    };
    const senhaForte = (s) => Object.values(REGRAS).every((r) => r(s));

    // ── painéis do login ───────────────────────────────────────────────
    const paineis = document.querySelectorAll("[data-ct-painel]");
    if (paineis.length) {
        const abrir = (nome, atualizarUrl) => {
            if (![...paineis].some((p) => p.dataset.ctPainel === nome)) nome = "login";
            paineis.forEach((p) => { p.hidden = p.dataset.ctPainel !== nome; });
            document.querySelectorAll("[data-ct-aba]").forEach((b) => {
                const ativo = b.dataset.ctAba === nome;
                b.classList.toggle("is-active", ativo);
                b.setAttribute("aria-selected", String(ativo));
            });
            if (atualizarUrl) {
                const url = new URL(location.href);
                url.searchParams.set("tab", nome);
                history.replaceState(null, "", url);
                // leva o e-mail digitado de um painel para o outro
                const email = document.querySelector("[data-ct-painel]:not([hidden]) input[type=email]");
                const origem = [...document.querySelectorAll("input[type=email]")].find((i) => i.value);
                if (email && !email.value && origem) email.value = origem.value;
                document.querySelector("[data-ct-painel]:not([hidden]) .ct-input")?.focus();
            }
        };
        document.querySelectorAll("[data-ct-aba], [data-ct-ir]").forEach((b) =>
            b.addEventListener("click", () => abrir(b.dataset.ctAba || b.dataset.ctIr, true)));
        abrir(new URLSearchParams(location.search).get("tab") || "login", false);
    }

    // ── mostrar/esconder senha ─────────────────────────────────────────
    document.querySelectorAll("[data-ct-olho]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const campo = botao.parentElement.querySelector("input");
            const mostrar = campo.type === "password";
            campo.type = mostrar ? "text" : "password";
            botao.innerHTML = mostrar ? ICONE_OLHO_OFF : ICONE_OLHO;
            botao.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
        });
    });

    // ── regras da senha ao vivo ────────────────────────────────────────
    document.querySelectorAll("[data-ct-senha]").forEach((campo) => {
        const form = campo.closest("form");
        const lista = form.querySelector("[data-ct-regras]");
        const barra = form.querySelector("[data-ct-forca]");
        const atualizar = () => {
            const s = campo.value;
            let ok = 0;
            lista?.querySelectorAll("[data-regra]").forEach((li) => {
                const passou = REGRAS[li.dataset.regra](s);
                li.classList.toggle("is-ok", passou);
                if (passou) ok++;
            });
            if (barra) {
                barra.style.width = s ? `${Math.max(ok, 1) * 25}%` : "0";
                barra.style.background = ok >= 4 ? "#22c55e" : ok >= 3 ? "#f59e0b" : "#ef4444";
            }
        };
        campo.addEventListener("input", atualizar);
        atualizar();
    });

    // ── conferência antes de enviar + trava do botão ───────────────────
    const conferir = (form) => {
        const campo = (nome) => form.elements.namedItem(nome);
        const valor = (nome) => (campo(nome)?.value || "").trim();
        const erro = (nome, msg) => ({ nome, msg });
        for (const el of form.querySelectorAll("[required]")) {
            if (!el.value.trim()) return erro(el.name, "Preencha todos os campos.");
        }
        if (campo("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor("email"))) return erro("email", "Informe um e-mail válido.");
        if (campo("phone") && !/^\d{10,11}$/.test(valor("phone").replace(/\D/g, ""))) return erro("phone", "Informe um telefone com DDD.");
        if (campo("cpf") && typeof window.validateCpf === "function" && !window.validateCpf(valor("cpf"))) return erro("cpf", "CPF inválido. Confira os números.");
        const senha = campo("password")?.value || campo("nova")?.value || "";
        if ((campo("password") || campo("nova")) && !senhaForte(senha)) return erro(campo("password") ? "password" : "nova", "A senha ainda não atende todas as regras.");
        const confirmacao = campo("confirmPassword") || campo("confirmar");
        if (confirmacao && confirmacao.value !== senha) return erro(confirmacao.name, "A confirmação não confere com a senha.");
        return null;
    };

    document.querySelectorAll("form[data-ct-cadastro], form[data-ct-enviando]").forEach((form) => {
        form.addEventListener("submit", (e) => {
            if (form.hasAttribute("data-ct-cadastro")) {
                const problema = conferir(form);
                const caixa = form.querySelector("[data-ct-erro]");
                if (problema) {
                    e.preventDefault();
                    if (caixa) { caixa.hidden = false; caixa.querySelector("span").textContent = problema.msg; }
                    form.elements.namedItem(problema.nome)?.focus?.();
                    return;
                }
                if (caixa) caixa.hidden = true;
            }
            if (form.hasAttribute("data-ct-enviando")) {
                const botao = form.querySelector("button[type=submit]");
                if (botao) {
                    // trava depois do envio começar, para o valor do botão ainda ir junto
                    setTimeout(() => { botao.disabled = true; botao.dataset.textoOriginal = botao.innerHTML; botao.textContent = "Aguarde…"; }, 0);
                }
            }
        });
    });
    // se o usuário voltar pelo histórico, destrava os botões
    window.addEventListener("pageshow", () => document.querySelectorAll("button[data-texto-original]").forEach((b) => {
        b.disabled = false; b.innerHTML = b.dataset.textoOriginal; delete b.dataset.textoOriginal;
    }));

    // ── abas da conta ──────────────────────────────────────────────────
    const abasConta = document.querySelector("[data-ct-abas]");
    if (abasConta) {
        const botoes = [...abasConta.querySelectorAll("[data-ct-aba-conta]")];
        const ativar = (nome, rolar) => {
            if (!botoes.some((b) => b.dataset.ctAbaConta === nome)) nome = botoes[0].dataset.ctAbaConta;
            botoes.forEach((b) => {
                const ativo = b.dataset.ctAbaConta === nome;
                b.classList.toggle("is-active", ativo);
                b.setAttribute("aria-selected", String(ativo));
                if (ativo) b.scrollIntoView({ block: "nearest", inline: "nearest" });
            });
            document.querySelectorAll("[data-ct-conteudo]").forEach((c) => { c.hidden = c.dataset.ctConteudo !== nome; });
            if (rolar) {
                const topo = abasConta.getBoundingClientRect().top + scrollY - 110;
                if (scrollY > topo) scrollTo({ top: topo, behavior: "instant" });
            }
        };
        botoes.forEach((b) => b.addEventListener("click", () => {
            history.replaceState(null, "", `#${b.dataset.ctAbaConta}`);
            ativar(b.dataset.ctAbaConta, true);
        }));
        document.querySelectorAll("[data-ct-ir-aba]").forEach((l) => l.addEventListener("click", (e) => {
            e.preventDefault();
            history.replaceState(null, "", `#${l.dataset.ctIrAba}`);
            ativar(l.dataset.ctIrAba, true);
        }));
        window.addEventListener("hashchange", () => ativar(location.hash.slice(1), true));
        ativar(location.hash.slice(1), false);
    }

    // ── filtros de lista ───────────────────────────────────────────────
    document.querySelectorAll("[data-ct-filtros]").forEach((grupo) => {
        const lista = document.querySelector(grupo.dataset.ctFiltros);
        grupo.addEventListener("click", (e) => {
            const botao = e.target.closest("[data-valor]");
            if (!botao || !lista) return;
            grupo.querySelectorAll("[data-valor]").forEach((b) => b.classList.toggle("is-active", b === botao));
            let visiveis = 0;
            lista.querySelectorAll("[data-ct-item]").forEach((item) => {
                const mostrar = !botao.dataset.valor || item.dataset.grupo === botao.dataset.valor;
                item.hidden = !mostrar;
                if (mostrar) visiveis++;
            });
            const vazio = document.querySelector(`[data-ct-vazio="${grupo.dataset.ctFiltros}"]`);
            if (vazio) vazio.hidden = visiveis > 0;
        });
    });

    // ── personalizado aprovado: escolher a entrega (janela do app.js) ──
    document.querySelectorAll("[data-ct-entrega]").forEach((b) => b.addEventListener("click", () => {
        if (typeof window.abrirModalEntregaCustom === "function") window.abrirModalEntregaCustom(b.dataset.ctEntrega);
    }));

    // ── abrir o chat do site ───────────────────────────────────────────
    document.querySelectorAll("[data-ct-chat]").forEach((b) => b.addEventListener("click", () => {
        const gatilho = document.getElementById("chat-trigger");
        if (gatilho) gatilho.click();
        else location.href = "/contact";
    }));
})();
