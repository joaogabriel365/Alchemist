// Configurador 3D da home: o cliente monta a peça (tipo, material, cor, tamanho,
// acabamento) e vê uma prévia em WebGL. O botão leva ao formulário de pedido
// personalizado já preenchido. A biblioteca three.js só é baixada quando a seção
// aparece na tela.

const root = document.querySelector("[data-cfg]");

const TIPOS = {
    chaveiro: { nome: "Chaveiro", medida: "Altura", min: 3, max: 8, padrao: 5 },
    miniatura: { nome: "Miniatura", medida: "Altura", min: 5, max: 25, padrao: 10 },
    decoracao: { nome: "Decoração", medida: "Altura", min: 8, max: 30, padrao: 15 },
    tecnica: { nome: "Peça técnica", medida: "Diâmetro", min: 2, max: 20, padrao: 6 }
};

const CORES = [
    ["Laranja", "#f47a20"], ["Branco", "#e8eaee"], ["Preto", "#23262c"],
    ["Cinza", "#8b919a"], ["Vermelho", "#d4283f"], ["Azul", "#2f6fdb"],
    ["Verde", "#2fa36b"], ["Roxo", "#7b4fd6"], ["Amarelo", "#f2c230"]
];

// Mesma régua do formulário de personalizado: pequeno até 6 cm, médio 7–12, grande acima
const classeTamanho = (cm) => (cm <= 6 ? "Pequeno" : cm <= 12 ? "Médio" : "Grande");

if (root) iniciar();

function iniciar() {
    const form = root.querySelector("[data-cfg-form]");
    const swatches = root.querySelector("[data-cfg-swatches]");
    const sizeInput = root.querySelector("[data-cfg-size]");
    const qtyInput = root.querySelector("[data-cfg-qty-input]");
    const ui = {
        colorName: root.querySelector("[data-cfg-color-name]"),
        sizeOut: root.querySelector("[data-cfg-size-out]"),
        sizeClass: root.querySelector("[data-cfg-size-class]"),
        sizeLabel: root.querySelector("[data-cfg-size-label]"),
        sizeMin: root.querySelector("[data-cfg-size-min]"),
        sizeMax: root.querySelector("[data-cfg-size-max]"),
        summary: root.querySelector("[data-cfg-summary]"),
        cta: root.querySelector("[data-cfg-cta]"),
        badge: root.querySelector("[data-cfg-badge]"),
        canvas: root.querySelector("[data-cfg-canvas]")
    };

    swatches.innerHTML = CORES.map(([nome, hex], i) => `
        <label class="cfg-swatch" title="${nome}">
            <input type="radio" name="cor" value="${nome}" ${i === 0 ? "checked" : ""} aria-label="${nome}">
            <span style="--swatch:${hex}"></span>
        </label>`).join("");

    const lerEstado = () => {
        const dados = new FormData(form);
        const tipo = dados.get("tipo");
        const corNome = dados.get("cor");
        return {
            tipo,
            material: dados.get("material"),
            corNome,
            cor: CORES.find(([nome]) => nome === corNome)[1],
            tamanho: Number(sizeInput.value),
            acabamento: dados.get("acabamento"),
            quantidade: Math.min(99, Math.max(1, parseInt(qtyInput.value, 10) || 1))
        };
    };

    let viewer = null; // preenchido quando o three.js terminar de carregar
    let tipoAnterior = null;

    const atualizar = () => {
        const estado = lerEstado();
        const tipo = TIPOS[estado.tipo];

        // ao trocar o tipo, a régua de tamanho muda de faixa
        if (estado.tipo !== tipoAnterior) {
            sizeInput.min = tipo.min;
            sizeInput.max = tipo.max;
            if (tipoAnterior !== null) sizeInput.value = tipo.padrao;
            estado.tamanho = Number(sizeInput.value);
            ui.sizeLabel.textContent = tipo.medida;
            ui.sizeMin.textContent = `${tipo.min} cm`;
            ui.sizeMax.textContent = `${tipo.max} cm`;
            tipoAnterior = estado.tipo;
        }
        const pct = ((estado.tamanho - tipo.min) / (tipo.max - tipo.min)) * 100;
        sizeInput.style.setProperty("--fill", `${pct}%`);

        ui.colorName.textContent = estado.corNome;
        ui.sizeOut.textContent = estado.tamanho;
        ui.sizeClass.textContent = classeTamanho(estado.tamanho);
        ui.badge.textContent = `${tipo.nome} · ${estado.material}`;
        const unidades = `${estado.quantidade} ${estado.quantidade === 1 ? "unidade" : "unidades"}`;
        const resumo = `${tipo.nome} em ${estado.material} ${estado.corNome.toLowerCase()}, ${estado.tamanho} cm de ${tipo.medida.toLowerCase()}, ${estado.acabamento.toLowerCase()} · ${unidades}`;
        ui.summary.textContent = resumo;
        ui.canvas.setAttribute("aria-label", `Prévia 3D: ${resumo}`);

        const params = new URLSearchParams({
            origem: "configurador",
            tipo: tipo.nome,
            material: estado.material,
            cor: estado.corNome,
            tamanho: estado.tamanho,
            medida: tipo.medida,
            acabamento: estado.acabamento,
            qtd: estado.quantidade
        });
        ui.cta.href = `/custom?${params}`;

        if (viewer) viewer.atualizar(estado);
    };

    form.addEventListener("input", atualizar);
    form.addEventListener("change", atualizar);
    root.querySelectorAll("[data-cfg-qty]").forEach((botao) => {
        botao.addEventListener("click", () => {
            qtyInput.value = Math.min(99, Math.max(1, (parseInt(qtyInput.value, 10) || 1) + Number(botao.dataset.cfgQty)));
            atualizar();
        });
    });
    form.addEventListener("submit", (e) => e.preventDefault());
    atualizar();

    // Carrega o 3D só quando a seção estiver perto de aparecer
    const carregar = async () => {
        const loading = root.querySelector("[data-cfg-loading]");
        try {
            const { criarViewer } = await import("./configurador-3d.js");
            viewer = await criarViewer(root);
            viewer.atualizar(lerEstado());
            loading.hidden = true;
        } catch (erro) {
            console.warn("Prévia 3D indisponível:", erro);
            root.querySelector("[data-cfg-loading-text]").textContent = "A prévia 3D não pôde ser carregada neste navegador. Você ainda pode configurar e pedir o orçamento.";
            loading.classList.add("is-error");
        }
    };

    if ("IntersectionObserver" in window) {
        const obs = new IntersectionObserver((entradas) => {
            if (entradas.some((e) => e.isIntersecting)) { obs.disconnect(); carregar(); }
        }, { rootMargin: "300px" });
        obs.observe(root);
    } else {
        carregar();
    }
}
