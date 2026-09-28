// Configurador 3D da home, em 5 etapas:
//   1. tipo de impressão (filamento/resina) · 2. modelo (arquivo do cliente ou da loja)
//   3. tamanho e orientação · 4. cores (pintura por partes no arquivo do cliente)
//   5. resultado + envio do pedido para /custom/enviar (com imagem da prévia e cores).
// O three.js só é baixado quando a seção aparece. O projeto fica salvo no navegador
// (IndexedDB) para não se perder no login nem se a página for recarregada.

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

const FORMATOS = ["stl", "obj", "3mf"];
const LIMITE_VISUALIZAR = 60 * 1024 * 1024;  // o navegador aguenta; acima disso fica lento
const LIMITE_ENVIO = 10 * 1024 * 1024;       // limite por arquivo no servidor/Cloudinary

const classeTamanho = (cm) => (cm <= 6 ? "Pequeno" : cm <= 12 ? "Médio" : "Grande");
const fmt = (n, casas = 1) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 });
const fmtCm = (v) => fmt(v, v < 1 ? 2 : 1);
const fmtBytes = (b) => (b >= 1048576 ? `${fmt(b / 1048576)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const nomeCor = (hex) => (CORES.find(([, h]) => h.toLowerCase() === hex.toLowerCase()) || [hex])[0];

if (root) iniciar();

function iniciar() {
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => [...root.querySelectorAll(sel)];
    const form = $("[data-cfg-form]");
    const viewerEl = $("[data-cfg-viewer]");
    const sizeInput = $("[data-cfg-size]");
    const qtyInput = $("[data-cfg-qty-input]");
    const fileInput = $("[data-cfg-file]");
    const loading = $("[data-cfg-loading]");
    const loadingText = $("[data-cfg-loading-text]");

    const st = {
        passo: 1,
        arquivo: null,        // { file: File|null, nome, bytes, exemplo }
        triangulos: 0,
        tinta: CORES[0],
        desfazerOk: false,
        cores: [],
        enviando: false
    };
    let viewer = null;
    let tipoAnterior = null;

    // ── Paletas ──────────────────────────────────────────────────────────────
    const swatch = (nome, hex, grupo, marcado) => `
        <label class="cfg-swatch" title="${nome}">
            <input type="radio" name="${grupo}" value="${hex}" data-nome="${nome}" ${marcado ? "checked" : ""} aria-label="${nome}">
            <span style="--swatch:${hex}"></span>
        </label>`;
    $("[data-cfg-swatches]").innerHTML = CORES.map(([n, h], i) => swatch(n, h, "cor", i === 0)).join("");
    $("[data-cfg-tintas]").insertAdjacentHTML("afterbegin", CORES.map(([n, h], i) => swatch(n, h, "tinta", i === 0)).join(""));

    // ── Leitura do estado do formulário ──────────────────────────────────────
    const valor = (nome) => form.querySelector(`input[name="${nome}"]:checked`)?.value;
    const fonteEscolhida = () => valor("fonte");
    const fonteEfetiva = () => (fonteEscolhida() === "arquivo" && st.arquivo ? "arquivo" : "loja");
    const ehIdeia = () => fonteEscolhida() === "ideia";
    const campoIdeia = $("[data-cfg-ideia]");       // só existe na versão completa (/custom)
    const MAX_REFS = 4;
    st.refs = [];                                    // imagens de referência: { blob, nome, url }

    const estadoLoja = () => {
        const corHex = valor("cor");
        return {
            tipo: valor("tipo"),
            impressao: valor("impressao"),
            cor: corHex,
            corNome: nomeCor(corHex),
            tamanho: Number(sizeInput.value),
            acabamento: valor("acabamento")
        };
    };
    const quantidade = () => Math.min(99, Math.max(1, parseInt(qtyInput.value, 10) || 1));

    // ── Etapas ───────────────────────────────────────────────────────────────
    const irPara = (passo) => {
        st.passo = passo;
        $$("[data-cfg-step]").forEach((s) => { s.hidden = Number(s.dataset.cfgStep) !== passo; });
        $$(".cfg-steps [data-cfg-ir]").forEach((b) => {
            const n = Number(b.dataset.cfgIr);
            b.toggleAttribute("aria-current", n === passo);
            b.classList.toggle("is-done", n < passo);
        });
        if (passo === 5) montarResumo();
        sincronizarViewer();
        // no celular, rola para mostrar o começo da etapa
        if (window.matchMedia("(max-width: 1024px)").matches) {
            form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };
    root.addEventListener("click", (e) => {
        const alvo = e.target.closest("[data-cfg-ir]");
        if (alvo) irPara(Number(alvo.dataset.cfgIr));
    });

    // ── Interface que depende da fonte (arquivo/loja) ───────────────────────
    const atualizarInterface = () => {
        const fonte = fonteEfetiva();
        $$("[data-cfg-so]").forEach((el) => { el.hidden = el.dataset.cfgSo !== fonte; });
        $$("[data-cfg-painel-fonte]").forEach((el) => { el.hidden = !el.dataset.cfgPainelFonte.split(" ").includes(fonteEscolhida()); });

        if (fonte === "arquivo") {
            const lim = viewer?.infoArquivo().limites || { min: 1, max: 40 };
            sizeInput.min = lim.min; sizeInput.max = lim.max; sizeInput.step = "any";
            $("[data-cfg-size-label]").textContent = "Altura";
            $("[data-cfg-size-min]").textContent = `${fmtCm(lim.min)} cm`;
            $("[data-cfg-size-max]").textContent = `${fmtCm(lim.max)} cm`;
            tipoAnterior = null;
        } else {
            const e = estadoLoja();
            const tipo = TIPOS[e.tipo];
            if (e.tipo !== tipoAnterior) {
                sizeInput.step = 0.1;
                sizeInput.min = tipo.min; sizeInput.max = tipo.max;
                if (tipoAnterior !== null || Number(sizeInput.value) < tipo.min || Number(sizeInput.value) > tipo.max) sizeInput.value = tipo.padrao;
                $("[data-cfg-size-label]").textContent = tipo.medida;
                $("[data-cfg-size-min]").textContent = `${tipo.min} cm`;
                $("[data-cfg-size-max]").textContent = `${tipo.max} cm`;
                tipoAnterior = e.tipo;
            }
            $("[data-cfg-nativo]").hidden = true;
            $("[data-cfg-color-name]").textContent = e.corNome;
        }
        const cm = Number(sizeInput.value);
        const pct = ((cm - Number(sizeInput.min)) / (Number(sizeInput.max) - Number(sizeInput.min))) * 100;
        sizeInput.style.setProperty("--fill", `${pct}%`);
        $("[data-cfg-size-out]").textContent = fmtCm(cm);
        $("[data-cfg-size-class]").textContent = classeTamanho(cm);

        const impressao = valor("impressao");
        $("[data-cfg-badge]").textContent = ehIdeia()
            ? `Sua ideia · ${impressao}`
            : fonte === "arquivo"
            ? `${st.arquivo.exemplo ? "Modelo de exemplo" : "Seu arquivo"} · ${impressao}`
            : `${TIPOS[valor("tipo")].nome} · ${impressao}`;
        $("[data-cfg-tinta-nome]").textContent = st.tinta[0];
    };

    const atualizarDimensoes = () => {
        if (!viewer) return;
        const d = viewer.dimensoesCm();
        $("[data-cfg-dims]").textContent = `L ${fmtCm(d.larguraCm)} · C ${fmtCm(d.profundidadeCm)} · A ${fmtCm(d.alturaCm)} cm`;
        const valores = { x: d.larguraCm, z: d.profundidadeCm, y: d.alturaCm };
        $$("[data-cfg-dim]").forEach((campo) => {
            if (document.activeElement !== campo) campo.value = fmtCm(valores[campo.dataset.cfgDim]);
            campo.closest(".cfg-dim").classList.remove("is-invalid");
        });
        if (fonteEfetiva() === "arquivo") {
            const nativo = $("[data-cfg-nativo]");
            // avisa só quando a MAIOR medida é improvável (peças finas e achatadas são normais)
            const estranho = d.nativoMaiorCm < 0.5 || d.nativoMaiorCm > 100;
            nativo.hidden = !estranho;
            nativo.textContent = `No arquivo, a maior medida da peça é ${fmtCm(d.nativoMaiorCm)} cm. Confira a unidade acima.`;
            nativo.classList.add("is-warning");
        }
    };

    // Deixa a visualização coerente com a etapa e a fonte
    const sincronizarViewer = () => {
        atualizarInterface();
        if (!viewer) return;
        const fonte = fonteEfetiva();
        viewer.setImpressao(valor("impressao"));
        if (fonte === "loja") viewer.mostrarLoja(estadoLoja());
        else if (viewer.fonte !== "arquivo") viewer.mostrarArquivo();

        const pintando = fonte === "arquivo" && st.passo === 4;
        $("[data-cfg-modo]").hidden = !pintando;
        viewer.setApresentacao(st.passo === 5);
        if (st.passo !== 5) definirModo(pintando ? "pintar" : "girar");
        atualizarDimensoes();
    };

    const toque = window.matchMedia("(hover: none)").matches;
    const definirModo = (modo) => {
        viewer?.setModo(modo);
        $$("[data-cfg-modo-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cfgModoBtn === modo)));
        $("[data-cfg-dica]").textContent = modo === "pintar"
            ? (toque ? "Toque para pintar · dois dedos giram e aproximam" : "Clique para pintar · botão direito gira · role para aproximar")
            : (toque ? "Arraste para girar · pinça para aproximar" : "Arraste para girar · role para aproximar · botão direito move");
    };
    $$("[data-cfg-modo-btn]").forEach((b) => b.addEventListener("click", () => definirModo(b.dataset.cfgModoBtn)));

    // ── Eventos do formulário ────────────────────────────────────────────────
    form.addEventListener("submit", (e) => e.preventDefault());
    form.addEventListener("change", (e) => {
        const nome = e.target.name;
        if (nome === "tinta") {
            st.tinta = [e.target.dataset.nome, e.target.value];
            viewer?.setCorAtual(e.target.value, e.target.dataset.nome);
            atualizarInterface();
            return;
        }
        if (nome === "ferramenta") { escolherFerramenta(e.target.value); return; }
        if (e.target.matches("[data-cfg-dim]")) { aplicarMedida(e.target); return; }
        if (e.target.matches("[data-cfg-cor-livre]")) return;
        if (e.target.matches("[data-cfg-unidade]")) {
            viewer?.setUnidade(e.target.value);
            sizeInput.value = viewer?.infoArquivo().alvoCm ?? sizeInput.value;
            atualizarInterface(); atualizarDimensoes(); agendarSalvar();
            return;
        }
        sincronizarViewer();
        agendarSalvar();
    });
    sizeInput.addEventListener("input", () => {
        avisoDims.hidden = true;
        if (fonteEfetiva() === "arquivo") viewer?.setAlturaCm(Number(sizeInput.value));
        sincronizarViewer();
        agendarSalvar();
    });
    $$("[data-cfg-qty]").forEach((b) => b.addEventListener("click", () => {
        qtyInput.value = Math.min(99, Math.max(1, quantidade() + Number(b.dataset.cfgQty)));
        agendarSalvar();
    }));
    qtyInput.addEventListener("change", () => { qtyInput.value = quantidade(); agendarSalvar(); });

    const avisoDims = $("[data-cfg-dims-aviso]");
    const aplicarMedida = (campo) => {
        if (!viewer) return;
        const eixo = campo.dataset.cfgDim;
        const pedido = parseFloat(String(campo.value).replace(",", ".").replace(/[^0-9.]/g, ""));
        const d = viewer.dimensoesCm();
        const atual = { x: d.larguraCm, z: d.profundidadeCm, y: d.alturaCm }[eixo];
        if (!(pedido > 0) || !(atual > 0)) {
            campo.closest(".cfg-dim").classList.add("is-invalid");
            avisoDims.textContent = "Digite um número maior que zero.";
            avisoDims.hidden = false;
            return;
        }
        // o controle deslizante representa a altura (ou o diâmetro); escala na mesma proporção
        const alvo = Number(sizeInput.value) * (pedido / atual);
        if (fonteEfetiva() === "arquivo") {
            viewer.setAlturaCm(alvo);
            sizeInput.value = viewer.infoArquivo().alvoCm;
        } else {
            sizeInput.value = Math.min(Number(sizeInput.max), Math.max(Number(sizeInput.min), Math.round(alvo * 10) / 10));
        }
        sincronizarViewer();
        const obtido = { x: viewer.dimensoesCm().larguraCm, z: viewer.dimensoesCm().profundidadeCm, y: viewer.dimensoesCm().alturaCm }[eixo];
        const ajustado = Math.abs(obtido - pedido) / pedido > 0.01;
        avisoDims.hidden = !ajustado;
        if (ajustado) {
            avisoDims.textContent = fonteEfetiva() === "arquivo"
                ? `Ajustamos para ${fmtCm(obtido)} cm: a maior medida da peça precisa ficar entre 0,5 e 50 cm.`
                : `Ajustamos para ${fmtCm(obtido)} cm, o limite desse modelo da loja.`;
        }
        campo.value = fmtCm(obtido);
        agendarSalvar();
    };
    $$("[data-cfg-dim]").forEach((campo) => {
        campo.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); campo.blur(); } });
        campo.addEventListener("focus", () => campo.select());
    });

    $$("[data-cfg-girar]").forEach((b) => b.addEventListener("click", async () => {
        if (!viewer) return;
        b.disabled = true;
        await viewer.girar(b.dataset.cfgGirar);
        b.disabled = false;
        sizeInput.value = viewer.infoArquivo().alvoCm; // a altura muda com a nova posição
        atualizarInterface();
        atualizarDimensoes();
        agendarSalvar();
    }));

    // ── Ferramentas de pintura ───────────────────────────────────────────────
    const escolherFerramenta = (f) => {
        viewer?.setFerramenta(f);
        $$("[data-cfg-tool-opt]").forEach((el) => { el.hidden = el.dataset.cfgToolOpt !== f; });
    };

    // ajuda de cada etapa: fica escondida atrás do "?"
    root.addEventListener("click", (e) => {
        const botao = e.target.closest("[data-cfg-ajuda]");
        if (!botao) return;
        const cabecalho = botao.closest(".cfg-step-head");
        const aberto = cabecalho.classList.toggle("is-open");
        botao.setAttribute("aria-expanded", String(aberto));
    });
    escolherFerramenta("parte");

    const tol = $("[data-cfg-tol]");
    tol.addEventListener("input", () => { $("[data-cfg-tol-out]").textContent = tol.value; viewer?.setTolerancia(Number(tol.value)); });
    const pincel = $("[data-cfg-pincel]");
    pincel.addEventListener("input", () => { $("[data-cfg-pincel-out]").textContent = fmt(pincel.value); viewer?.setRaioPincel(Number(pincel.value)); });

    const corLivre = $("[data-cfg-cor-livre]");
    corLivre.addEventListener("input", () => {
        const hex = corLivre.value;
        corLivre.closest(".cfg-swatch").style.setProperty("--swatch", hex);
        form.querySelectorAll('input[name="tinta"]').forEach((r) => { r.checked = false; });
        corLivre.closest(".cfg-swatch").classList.add("is-selected");
        st.tinta = [`Personalizada ${hex.toUpperCase()}`, hex];
        viewer?.setCorAtual(hex, st.tinta[0]);
        atualizarInterface();
    });
    form.addEventListener("change", (e) => {
        if (e.target.name === "tinta") corLivre.closest(".cfg-swatch").classList.remove("is-selected");
    });

    $("[data-cfg-base]").addEventListener("click", () => viewer?.setCorBase(st.tinta[1], st.tinta[0]));
    $("[data-cfg-desfazer]").addEventListener("click", () => viewer?.desfazer());
    $("[data-cfg-limpar]").addEventListener("click", () => viewer?.limparPintura());
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && st.passo === 4 && fonteEfetiva() === "arquivo"
            && !/^(input|textarea)$/i.test(document.activeElement?.tagName || "")) {
            e.preventDefault();
            viewer?.desfazer();
        }
    });

    const aoMudarPintura = ({ completo, cores, podeDesfazer }) => {
        $("[data-cfg-desfazer]").disabled = !podeDesfazer;
        if (!completo) return;
        st.cores = cores;
        $("[data-cfg-uso-barra]").innerHTML = cores.map((c) => `<span style="flex:${c.pct};background:${c.hex}" title="${c.nome}"></span>`).join("");
        $("[data-cfg-uso-lista]").innerHTML = cores.map((c) => `
            <li><i style="background:${c.hex}"></i>${c.nome}<b>${fmt(c.pct, c.pct < 10 ? 1 : 0)}%</b></li>`).join("");
        agendarSalvar();
    };

    // ── Barra de ferramentas da visualização ─────────────────────────────────
    root.querySelector('[data-cfg-acao="resetar"]').addEventListener("click", () => viewer?.resetarVista());
    const botaoMedidas = root.querySelector('[data-cfg-acao="medidas"]');
    botaoMedidas.addEventListener("click", () => { if (viewer) botaoMedidas.setAttribute("aria-pressed", String(viewer.alternarMedidas())); });
    const botaoGrade = root.querySelector('[data-cfg-acao="grade"]');
    botaoGrade.addEventListener("click", () => { if (viewer) botaoGrade.setAttribute("aria-pressed", String(viewer.alternarGrade())); });
    const botaoTela = root.querySelector('[data-cfg-acao="tela-cheia"]');
    if (!viewerEl.requestFullscreen) botaoTela.hidden = true;
    botaoTela.addEventListener("click", () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else viewerEl.requestFullscreen().catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => viewerEl.classList.toggle("is-fullscreen", document.fullscreenElement === viewerEl));

    // ── Arquivo do cliente ───────────────────────────────────────────────────
    const erroArquivo = (msg) => {
        const el = $("[data-cfg-file-erro]");
        el.textContent = msg || "";
        el.hidden = !msg;
    };
    const mostrarCarregando = (texto) => { loadingText.textContent = texto; loading.classList.remove("is-error"); loading.hidden = false; };
    const esconderCarregando = () => { loading.hidden = true; };

    const aposCarregar = (info, arquivo) => {
        st.arquivo = arquivo;
        st.triangulos = info.triangulos;
        $("[data-cfg-file-nome]").textContent = arquivo.nome;
        $("[data-cfg-file-meta]").textContent = [arquivo.bytes ? fmtBytes(arquivo.bytes) : null, `${info.triangulos.toLocaleString("pt-BR")} triângulos`].filter(Boolean).join(" · ");
        $("[data-cfg-file-card]").hidden = false;
        $("[data-cfg-dropzone]").hidden = true;
        form.querySelector('input[name="fonte"][value="arquivo"]').checked = true;
        const info2 = viewer.infoArquivo();
        root.querySelector("[data-cfg-unidade]").value = info2.unidade;
        sizeInput.min = info2.limites.min; sizeInput.max = info2.limites.max; sizeInput.step = "any";
        sizeInput.value = info2.alvoCm;
        viewer.setCorAtual(st.tinta[1], st.tinta[0]);
    };

    const carregarArquivo = async (file, restaurar = null) => {
        erroArquivo("");
        const ext = file.name.split(".").pop().toLowerCase();
        if (!FORMATOS.includes(ext)) { erroArquivo("Formato não suportado. Envie um arquivo STL, OBJ ou 3MF."); return false; }
        if (file.size > LIMITE_VISUALIZAR) { erroArquivo(`O arquivo tem ${fmtBytes(file.size)}. Para visualizar no navegador o limite é 60 MB; envie uma versão simplificada.`); return false; }
        if (!viewer) { erroArquivo("A visualização 3D ainda está carregando. Tente de novo em instantes."); return false; }
        mostrarCarregando(`Lendo ${file.name}…`);
        await new Promise((r) => setTimeout(r, 30)); // deixa o aviso aparecer antes do processamento pesado
        try {
            const info = await viewer.carregarArquivo(file, { unidade: restaurar?.info?.unidade || "mm", restaurar: restaurar ? { ...restaurar.pintura, rotacoes: restaurar.info.rotacoes, alvoCm: restaurar.info.alvoCm } : null });
            aposCarregar(info, { file, nome: file.name, bytes: file.size, exemplo: false });
            esconderCarregando();
            return true;
        } catch (err) {
            console.warn(err);
            esconderCarregando();
            erroArquivo(err?.message?.startsWith("O modelo") || err?.message?.startsWith("Formato") || err?.message?.startsWith("Não encontramos") || err?.message?.startsWith("O arquivo")
                ? err.message
                : "Não conseguimos ler esse arquivo. Confira se ele é um STL, OBJ ou 3MF válido.");
            return false;
        }
    };

    const carregarExemplo = async (restaurar = null) => {
        if (!viewer) return;
        erroArquivo("");
        mostrarCarregando("Preparando o modelo de exemplo…");
        await new Promise((r) => setTimeout(r, 30));
        const info = await viewer.carregarExemplo({ restaurar: restaurar ? { ...restaurar.pintura, rotacoes: restaurar.info.rotacoes, alvoCm: restaurar.info.alvoCm } : null });
        aposCarregar(info, { file: null, nome: "Modelo de exemplo (alquimista)", bytes: 0, exemplo: true });
        esconderCarregando();
    };

    const aoEscolherArquivo = async (file) => {
        if (await carregarArquivo(file)) { irPara(3); agendarSalvar(); }
        else sincronizarViewer();
    };

    fileInput.addEventListener("change", () => {
        const f = fileInput.files?.[0];
        fileInput.value = "";
        if (f) aoEscolherArquivo(f);
    });
    $("[data-cfg-trocar]").addEventListener("click", () => fileInput.click());
    $("[data-cfg-exemplo]").addEventListener("click", async () => {
        form.querySelector('input[name="fonte"][value="arquivo"]').checked = true;
        await carregarExemplo();
        irPara(3);
        agendarSalvar();
    });

    // arrastar e soltar: na área 3D e na caixa de upload
    const drop = $("[data-cfg-drop]");
    const dropzone = $("[data-cfg-dropzone]");
    let contadorArraste = 0;
    const temArquivo = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
    root.addEventListener("dragenter", (e) => {
        if (!temArquivo(e)) return;
        e.preventDefault();
        contadorArraste++;
        drop.hidden = false;
        dropzone.classList.add("is-over");
    });
    root.addEventListener("dragover", (e) => { if (temArquivo(e)) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
    root.addEventListener("dragleave", () => {
        if (--contadorArraste <= 0) { contadorArraste = 0; drop.hidden = true; dropzone.classList.remove("is-over"); }
    });
    root.addEventListener("drop", (e) => {
        if (!temArquivo(e)) return;
        e.preventDefault();
        contadorArraste = 0;
        drop.hidden = true;
        dropzone.classList.remove("is-over");
        const arquivos = [...(e.dataTransfer.files || [])];
        if (ehIdeia() && arquivos.length && arquivos.every((f) => f.type.startsWith("image/"))) { adicionarRefs(arquivos); return; }
        if (arquivos[0]) aoEscolherArquivo(arquivos[0]);
    });

    // ── Imagens de referência (versão completa) ──────────────────────────────
    const listaRefs = $("[data-cfg-refs-lista]");
    const inputRefs = $("[data-cfg-refs]");
    const erroIdeia = (msg) => { const el = $("[data-cfg-ideia-erro]"); if (!el) return; el.textContent = msg || ""; el.hidden = !msg; };

    /** Reduz a foto para no máximo 1600 px (JPEG) antes de guardar/enviar: fica leve e rápida. */
    const reduzirImagem = (arquivo) => new Promise((ok) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement("canvas");
            c.width = Math.round(img.naturalWidth * escala);
            c.height = Math.round(img.naturalHeight * escala);
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob((b) => ok(b), "image/jpeg", 0.85);
        };
        img.onerror = () => { URL.revokeObjectURL(url); ok(null); };
        img.src = url;
    });

    const desenharRefs = () => {
        if (!listaRefs) return;
        listaRefs.querySelectorAll(".cfg-ref").forEach((el) => el.remove());
        const adicionar = $("[data-cfg-refs-add]");
        st.refs.forEach((r, i) => {
            const el = document.createElement("div");
            el.className = "cfg-ref";
            el.innerHTML = `<img alt=""><button type="button" aria-label="Remover imagem">×</button>`;
            el.querySelector("img").src = r.url;
            el.querySelector("img").alt = r.nome;
            el.querySelector("button").addEventListener("click", () => {
                URL.revokeObjectURL(r.url);
                st.refs.splice(i, 1);
                desenharRefs();
                agendarSalvar();
            });
            listaRefs.insertBefore(el, adicionar);
        });
        adicionar.hidden = st.refs.length >= MAX_REFS;
    };

    const adicionarRefs = async (arquivos) => {
        erroIdeia("");
        const imagens = [...arquivos].filter((f) => /^image\/(png|jpe?g|webp)$/i.test(f.type));
        if (imagens.length < arquivos.length) erroIdeia("Use imagens PNG, JPG ou WEBP.");
        for (const f of imagens) {
            if (st.refs.length >= MAX_REFS) { erroIdeia(`No máximo ${MAX_REFS} imagens.`); break; }
            const blob = await reduzirImagem(f);
            if (!blob) { erroIdeia(`Não conseguimos abrir ${f.name}.`); continue; }
            st.refs.push({ blob, nome: f.name, url: URL.createObjectURL(blob) });
        }
        desenharRefs();
        agendarSalvar();
    };
    inputRefs?.addEventListener("change", () => { adicionarRefs(inputRefs.files || []); inputRefs.value = ""; });
    campoIdeia?.addEventListener("input", () => { erroIdeia(""); agendarSalvar(); });

    // detalhes do pedido (versão completa)
    const campoPrazo = $("[data-cfg-prazo]");
    if (campoPrazo) {
        const hoje = new Date();
        campoPrazo.min = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    const detalhesPedido = () => {
        if (!campoPrazo) return null;
        const prazo = campoPrazo.value ? campoPrazo.value.split("-").reverse().join("/") : "";
        return {
            finalidade: valor("finalidade") || "",
            prazo,
            investimento: $("[data-cfg-investimento]").value || ""
        };
    };

    // ── Resumo e envio ───────────────────────────────────────────────────────
    const descricaoCores = () => {
        if (fonteEfetiva() === "loja") {
            const e = estadoLoja();
            return `${e.corNome}, ${e.acabamento.toLowerCase()}`;
        }
        const cores = st.cores.length ? st.cores : (viewer?.coresUsadas() || []);
        if (cores.length <= 1) return `${cores[0]?.nome.replace(" (base)", "") || "Cor base"} (uma cor)`;
        return cores.map((c) => `${c.nome.replace(" (base)", "")} ${fmt(c.pct, 0)}%`).join(", ");
    };

    const linhasResumo = () => {
        const d = viewer?.dimensoesCm();
        const medidas = d ? `${fmtCm(d.larguraCm)} × ${fmtCm(d.profundidadeCm)} × ${fmtCm(d.alturaCm)} cm` : `${sizeInput.value} cm`;
        const modelo = ehIdeia()
            ? `Ideia do cliente (tamanho de referência: ${TIPOS[valor("tipo")].nome.toLowerCase()})`
            : fonteEfetiva() === "arquivo"
                ? (st.arquivo.exemplo ? "Modelo de exemplo da loja (alquimista)" : `Arquivo enviado: ${st.arquivo.nome}`)
                : `${TIPOS[valor("tipo")].nome} (modelo da loja)`;
        const extras = [];
        if (ehIdeia()) extras.push(["Referências", st.refs.length ? `${st.refs.length} ${st.refs.length === 1 ? "imagem" : "imagens"}` : "nenhuma imagem"]);
        return [
            ["Impressão", valor("impressao")],
            ["Modelo", modelo],
            ...extras,
            ["Tamanho", `${medidas} (L × C × A)`],
            ["Cores", descricaoCores()],
            ["Quantidade", `${quantidade()} ${quantidade() === 1 ? "unidade" : "unidades"}`]
        ];
    };

    const montarResumo = () => {
        $("[data-cfg-resumo]").innerHTML = linhasResumo().map(([k, v]) => `<div><dt>${k}</dt><dd>${v.replace(/</g, "&lt;")}</dd></div>`).join("");
    };

    const erroEnvio = (msg) => { const el = $("[data-cfg-envio-erro]"); el.textContent = msg || ""; el.hidden = !msg; };

    const prepararArquivoParaEnvio = async () => {
        const f = st.arquivo?.file;
        if (!f) return null;
        if (f.size <= LIMITE_ENVIO) return f;
        // arquivos grandes: compacta (STL costuma encolher bastante)
        const { zipSync } = await import("three/addons/libs/fflate.module.js");
        const zip = zipSync({ [f.name]: new Uint8Array(await f.arrayBuffer()) }, { level: 6 });
        if (zip.byteLength > LIMITE_ENVIO) {
            throw new Error(`Mesmo compactado, o arquivo ficou com ${fmtBytes(zip.byteLength)} (limite de 10 MB). Envie uma versão simplificada ou fale com a gente pelo WhatsApp para mandar o arquivo por link.`);
        }
        return new File([zip], f.name.replace(/\.[^.]+$/, "") + ".zip", { type: "application/zip" });
    };

    const botaoEnviar = $("[data-cfg-enviar]");
    botaoEnviar.addEventListener("click", async () => {
        if (st.enviando) return;
        erroEnvio("");
        if (ehIdeia() && !campoIdeia.value.trim()) {
            irPara(2);
            erroIdeia("Conte um pouco da sua ideia para a gente conseguir orçar.");
            campoIdeia.focus();
            return;
        }
        if (!window.__FLASK_USER__) {
            // salva o projeto e volta para esta mesma página depois do login
            await salvarProjeto({ aposLogin: true });
            window.location.href = `/auth?next=${encodeURIComponent(`${window.location.pathname}?projeto=continuar`)}`;
            return;
        }
        st.enviando = true;
        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando…";
        try {
            const dados = new FormData();
            const notas = $("[data-cfg-notas]").value.trim();
            const linhas = linhasResumo();
            const descricao = ["Pedido montado no configurador 3D", ...linhas.filter(([k]) => k !== "Tamanho").map(([k, v]) => `${k}: ${v}`)];
            if (fonteEfetiva() === "arquivo" && st.cores.length > 1) descricao.push("Pintura: conforme a prévia anexada");
            const detalhes = detalhesPedido();
            if (detalhes?.finalidade) descricao.push(`Finalidade: ${detalhes.finalidade}`);
            if (detalhes?.prazo) descricao.push(`Precisa até: ${detalhes.prazo}`);
            if (detalhes?.investimento) descricao.push(`Investimento previsto: ${detalhes.investimento}`);
            if (ehIdeia()) descricao.push("", `Ideia: ${campoIdeia.value.trim()}`);
            if (notas) descricao.push("", `Observações: ${notas}`);
            dados.append("description", descricao.join("\n"));
            dados.append("sizeReference", `Aproximadamente ${linhas.find(([k]) => k === "Tamanho")[1].replace("(L × C × A)", "(largura × comprimento × altura)")}`);

            const arquivo = await prepararArquivoParaEnvio();
            if (arquivo) dados.append("arquivo", arquivo);

            const imagem = await viewer?.capturarImagem();
            if (imagem) dados.append("preview", new File([imagem], "previa.png", { type: "image/png" }));

            const cores = fonteEfetiva() === "arquivo"
                ? (viewer.coresUsadas() || []).map((c) => ({ hex: c.hex, nome: c.nome, pct: c.pct }))
                : [{ hex: estadoLoja().cor, nome: estadoLoja().corNome, pct: 100 }];
            dados.append("cores", JSON.stringify(cores));
            if (ehIdeia()) st.refs.forEach((r, i) => dados.append("referencias", new File([r.blob], `referencia-${i + 1}.jpg`, { type: "image/jpeg" })));
            if (detalhes) dados.append("detalhes", JSON.stringify(detalhes));

            const resp = await fetch("/custom/enviar", { method: "POST", body: dados, credentials: "same-origin" });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok || !json.ok) throw new Error(json.error || "Não foi possível enviar o pedido agora. Tente de novo em instantes.");

            $("[data-cfg-sucesso]").hidden = false;
            $$('[data-cfg-step="5"] > :not([data-cfg-sucesso])').forEach((el) => { el.hidden = true; });
            await apagarProjeto();
        } catch (err) {
            erroEnvio(err.message);
        } finally {
            st.enviando = false;
            botaoEnviar.disabled = false;
            botaoEnviar.innerHTML = 'Enviar para orçamento <span aria-hidden="true">→</span>';
        }
    });

    $("[data-cfg-novo]").addEventListener("click", () => {
        $("[data-cfg-sucesso]").hidden = true;
        $$('[data-cfg-step="5"] > :not([data-cfg-sucesso])').forEach((el) => { el.hidden = el.matches("[data-cfg-envio-erro]"); });
        $("[data-cfg-notas]").value = "";
        if (campoIdeia) campoIdeia.value = "";
        st.refs.forEach((r) => URL.revokeObjectURL(r.url));
        st.refs = [];
        desenharRefs();
        form.querySelectorAll('input[name="finalidade"]').forEach((r) => { r.checked = false; });
        if (campoPrazo) { campoPrazo.value = ""; $("[data-cfg-investimento]").value = ""; }
        irPara(1);
    });

    // ── Projeto salvo no navegador (IndexedDB) ───────────────────────────────
    const abrirBanco = () => new Promise((ok, falha) => {
        const req = indexedDB.open("alchemist-configurador", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("projeto");
        req.onsuccess = () => ok(req.result);
        req.onerror = () => falha(req.error);
    });
    const operar = async (modo, fn) => {
        const db = await abrirBanco();
        return new Promise((ok, falha) => {
            const tx = db.transaction("projeto", modo);
            const req = fn(tx.objectStore("projeto"));
            tx.oncomplete = () => { db.close(); ok(req?.result); };
            tx.onerror = () => { db.close(); falha(tx.error); };
        });
    };

    async function salvarProjeto(extra = {}) {
        if (!("indexedDB" in window)) return;
        try {
            const fonte = fonteEfetiva();
            const projeto = {
                versao: 1, salvoEm: Date.now(), passo: st.passo, ...extra,
                impressao: valor("impressao"), fonte, fonteEscolhida: fonteEscolhida(),
                ideia: campoIdeia?.value || "",
                refs: st.refs.map((r) => ({ blob: r.blob, nome: r.nome })),
                detalhes: detalhesPedido(),
                loja: estadoLoja(), quantidade: quantidade(), notas: $("[data-cfg-notas]").value,
                tinta: st.tinta,
                arquivo: fonte === "arquivo" ? { blob: st.arquivo.file, nome: st.arquivo.nome, exemplo: st.arquivo.exemplo } : null,
                info: fonte === "arquivo" ? viewer.infoArquivo() : null,
                pintura: fonte === "arquivo" ? viewer.estadoPintura() : null
            };
            await operar("readwrite", (s) => s.put(projeto, "atual"));
        } catch (err) {
            console.warn("Não foi possível salvar o projeto:", err);
        }
    }
    async function apagarProjeto() {
        try { await operar("readwrite", (s) => s.delete("atual")); } catch { /* sem armazenamento */ }
    }
    const lerProjeto = async () => {
        if (!("indexedDB" in window)) return null;
        try { return await operar("readonly", (s) => s.get("atual")); } catch { return null; }
    };

    let timerSalvar;
    function agendarSalvar() {
        if (!viewer || (fonteEfetiva() !== "arquivo" && !ehIdeia())) return; // guarda trabalho com arquivo ou ideia
        clearTimeout(timerSalvar);
        timerSalvar = setTimeout(() => salvarProjeto(), 1500);
    }

    const restaurarProjeto = async (p) => {
        const marcar = (nome, v) => { const el = form.querySelector(`input[name="${nome}"][value="${v}"]`); if (el) el.checked = true; };
        marcar("impressao", p.impressao);
        marcar("tipo", p.loja?.tipo);
        marcar("cor", p.loja?.cor);
        marcar("acabamento", p.loja?.acabamento);
        marcar("fonte", p.fonteEscolhida || p.fonte);
        if (campoIdeia) campoIdeia.value = p.ideia || "";
        if (listaRefs && p.refs?.length) {
            st.refs = p.refs.map((r) => ({ blob: r.blob, nome: r.nome, url: URL.createObjectURL(r.blob) }));
            desenharRefs();
        }
        if (campoPrazo && p.detalhes) {
            if (p.detalhes.finalidade) marcar("finalidade", p.detalhes.finalidade);
            if (p.detalhes.prazo) campoPrazo.value = p.detalhes.prazo.split("/").reverse().join("-");
            $("[data-cfg-investimento]").value = p.detalhes.investimento || "";
        }
        qtyInput.value = p.quantidade || 1;
        $("[data-cfg-notas]").value = p.notas || "";
        if (p.tinta) { st.tinta = p.tinta; marcar("tinta", p.tinta[1]); }
        tipoAnterior = null;
        atualizarInterface();
        if (p.fonte === "loja") { sizeInput.value = p.loja?.tamanho || sizeInput.value; }

        if (p.fonte === "arquivo" && p.arquivo) {
            if (p.arquivo.exemplo) await carregarExemplo(p);
            else if (p.arquivo.blob) await carregarArquivo(new File([p.arquivo.blob], p.arquivo.nome), p);
        }
        irPara(p.aposLogin ? 5 : (p.passo || 3));
        if (viewer && p.tinta) viewer.setCorAtual(p.tinta[1], p.tinta[0]);
    };

    const oferecerRetomada = (p) => {
        const aviso = document.createElement("div");
        aviso.className = "cfg-resume";
        aviso.innerHTML = `<span>Você tem um projeto salvo: <strong></strong></span>
            <span class="cfg-btn-row"><button type="button" class="cfg-chip-btn" data-r="sim">Continuar</button><button type="button" class="cfg-link-btn" data-r="nao">Descartar</button></span>`;
        aviso.querySelector("strong").textContent = p.arquivo?.nome || (p.ideia ? `ideia "${p.ideia.slice(0, 40)}${p.ideia.length > 40 ? "…" : ""}"` : "configuração");
        form.prepend(aviso);
        aviso.addEventListener("click", async (e) => {
            const r = e.target.closest("[data-r]")?.dataset.r;
            if (!r) return;
            aviso.remove();
            if (r === "sim") await restaurarProjeto(p);
            else await apagarProjeto();
        });
    };

    // ── Carregamento do 3D (quando a seção aparece) ──────────────────────────
    atualizarInterface();
    definirModo("girar");

    const params = new URLSearchParams(window.location.search);
    const voltouDoLogin = params.get("projeto") === "continuar";

    const carregar3D = async () => {
        try {
            const { criarViewer } = await import("./configurador-3d.js");
            viewer = await criarViewer(root, { aoMudarPintura });
            viewer.setCorAtual(st.tinta[1], st.tinta[0]);
            viewer.setFerramenta(valor("ferramenta"));
            sincronizarViewer();
            esconderCarregando();

            const salvo = await lerProjeto();
            if (salvo && voltouDoLogin) {
                await restaurarProjeto(salvo);
                history.replaceState(null, "", window.location.pathname + "#configurador");
            } else if (salvo?.arquivo || (salvo?.ideia && campoIdeia)) {
                oferecerRetomada(salvo);
            }
        } catch (erro) {
            console.warn("Prévia 3D indisponível:", erro);
            loadingText.textContent = "A prévia 3D não pôde ser carregada neste navegador. Você ainda pode escolher as opções e pedir o orçamento.";
            loading.classList.add("is-error");
        }
    };

    if (voltouDoLogin) {
        root.scrollIntoView({ block: "start" });
        carregar3D();
    } else if ("IntersectionObserver" in window) {
        const obs = new IntersectionObserver((entradas) => {
            if (entradas.some((e) => e.isIntersecting)) { obs.disconnect(); carregar3D(); }
        }, { rootMargin: "300px" });
        obs.observe(root);
    } else {
        carregar3D();
    }
}
