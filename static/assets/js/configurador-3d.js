// Prévia WebGL do configurador. Unidades da cena = centímetros.
//
// Dois tipos de modelo:
//  • "loja": peças de exemplo modeladas por código (chaveiro, miniatura, vaso, engrenagem);
//  • "arquivo": modelo enviado pelo cliente (STL, OBJ, 3MF), que pode ser pintado
//    triângulo a triângulo com quatro ferramentas (peça solta, parte, superfície e pincel).
//
// Pintura: a geometria do arquivo fica "não indexada" (cada triângulo tem os próprios
// 3 vértices), então cada triângulo pode ter uma cor. Guardamos em triCor[t] o índice
// da cor na paleta (0 = cor base) e escrevemos o RGB no atributo "color".
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { lerArquivo3D } from "./configurador-leitura.js";
import { prepararPintura, calcularArestas, pecasSoltas, prepararDivisao, cortar, arestasDeDivisao, limiteDaDivisao } from "./configurador-partes.js";

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const LIMITE_TRIANGULOS = 1_500_000;

// ─── Material e linhas de camada ─────────────────────────────────────────────
// Faixas horizontais sutis calculadas pela altura no mundo (~60 na altura da peça;
// a camada real seria densa demais para a tela). Resina quase não mostra camadas.
const uniformsCamada = { uFreq: { value: 12 }, uForca: { value: 0.08 } };

function aplicarLinhasDeCamada(material) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uFreq = uniformsCamada.uFreq;
        shader.uniforms.uForca = uniformsCamada.uForca;
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying float vAlturaMundo;")
            .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvAlturaMundo = (modelMatrix * vec4(transformed, 1.0)).y;");
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nvarying float vAlturaMundo;\nuniform float uFreq;\nuniform float uForca;")
            .replace("#include <color_fragment>", `#include <color_fragment>
                float faixa = 0.5 + 0.5 * sin(vAlturaMundo * uFreq * 6.2831853);
                diffuseColor.rgb *= 1.0 - uForca * smoothstep(0.55, 1.0, faixa);`);
    };
    material.customProgramCacheKey = () => "camadas";
    return material;
}

function criarMaterial({ cor, impressao, acabamento, vertexColors = false }) {
    const pintado = acabamento === "Pintado à mão";
    const params = { color: new THREE.Color(vertexColors ? 0xffffff : cor), vertexColors };
    const m = impressao === "Resina"
        ? new THREE.MeshPhysicalMaterial({ ...params, roughness: pintado ? 0.42 : 0.3, clearcoat: pintado ? 0.1 : 0.3, clearcoatRoughness: 0.3 })
        : new THREE.MeshStandardMaterial({ ...params, roughness: pintado ? 0.55 : 0.72 });
    m.envMapIntensity = 0.55;
    return aplicarLinhasDeCamada(m);
}

function forcaCamadas(impressao, acabamento) {
    if (impressao === "Resina") return 0.015;
    return acabamento === "Pintado à mão" ? 0.035 : 0.09;
}

const metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.28 });

// ─── Modelos da loja (modelados por código) ──────────────────────────────────

function estrela(raioExt, raioInt, pontas = 5) {
    const forma = new THREE.Shape();
    for (let i = 0; i < pontas * 2; i++) {
        const r = i % 2 ? raioInt : raioExt;
        const a = (i / (pontas * 2)) * Math.PI * 2 + Math.PI / 2;
        const p = [Math.cos(a) * r, Math.sin(a) * r];
        i ? forma.lineTo(...p) : forma.moveTo(...p);
    }
    forma.closePath();
    return forma;
}

function modeloChaveiro(mat, matDetalhe, comArgola = true) {
    const g = new THREE.Group();
    const w = 0.62, h = 0.82, r = 0.14;
    const placa = new THREE.Shape();
    placa.moveTo(-w / 2 + r, 0);
    placa.lineTo(w / 2 - r, 0);
    placa.quadraticCurveTo(w / 2, 0, w / 2, r);
    placa.lineTo(w / 2, h - r);
    placa.quadraticCurveTo(w / 2, h, w / 2 - r, h);
    placa.lineTo(-w / 2 + r, h);
    placa.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
    placa.lineTo(-w / 2, r);
    placa.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    const furo = new THREE.Path();
    furo.absarc(0, h - 0.11, 0.055, 0, Math.PI * 2, true);
    placa.holes.push(furo);
    const geoPlaca = new THREE.ExtrudeGeometry(placa, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 4, curveSegments: 24 });
    geoPlaca.translate(0, 0, -0.04);
    g.add(new THREE.Mesh(geoPlaca, mat));

    const geoEstrela = new THREE.ExtrudeGeometry(estrela(0.2, 0.09), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    geoEstrela.translate(0, 0.33, 0.055);
    g.add(new THREE.Mesh(geoEstrela, matDetalhe));

    if (comArgola) {
        const argola = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 16, 48), metal);
        argola.position.set(0, h - 0.11 + 0.09, 0);
        argola.rotation.y = Math.PI / 2;
        g.add(argola);
    }
    return g;
}

function modeloMiniatura(mat, pintado, corBase) {
    // pequeno "alquimista": base, manto, cabeça e chapéu de mago
    const g = new THREE.Group();
    const cores = pintado ? { base: 0x2b2f37, manto: corBase, pele: 0xf0d2ae, chapeu: corBase, faixa: 0xd4a24c } : null;
    const m = () => (pintado ? aplicarLinhasDeCamada(mat.clone()) : mat);
    const pintar = (material, hex) => { if (pintado) material.color.set(hex); return material; };

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.07, 48), pintar(m(), cores?.base));
    base.position.y = 0.035;
    g.add(base);

    const perfilManto = [[0.001, 0.07], [0.3, 0.07], [0.27, 0.2], [0.21, 0.36], [0.15, 0.5], [0.001, 0.52]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(perfilManto, 48), pintar(m(), cores?.manto)));

    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.19, 40, 28), pintar(m(), cores?.pele));
    cabeca.position.y = 0.66;
    cabeca.scale.set(1, 0.95, 1);
    g.add(cabeca);

    const aba = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 48), pintar(m(), cores?.chapeu));
    aba.position.y = 0.79;
    g.add(aba);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.36, 40), pintar(m(), cores?.chapeu));
    cone.position.y = 0.97;
    cone.rotation.z = -0.18;
    g.add(cone);
    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.176, 0.05, 40), pintar(m(), cores?.faixa));
    faixa.position.y = 0.83;
    g.add(faixa);

    if (pintado) {
        const olho = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.3 });
        [-0.065, 0.065].forEach((x) => {
            const o = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), olho);
            o.position.set(x, 0.67, 0.17);
            g.add(o);
        });
    }
    return g;
}

function modeloVaso(mat, pintado, corBase) {
    const perfil = [[0.001, 0], [0.3, 0], [0.35, 0.12], [0.39, 0.35], [0.33, 0.62], [0.23, 0.84], [0.27, 1.0], [0.25, 1.0], [0.21, 0.85], [0.001, 0.86]]
        .map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(perfil, 12);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const a = v.y * 1.4; // torção proporcional à altura
        pos.setXYZ(i, v.x * Math.cos(a) - v.z * Math.sin(a), v.y, v.x * Math.sin(a) + v.z * Math.cos(a));
    }
    geo.computeVertexNormals();

    let material = mat;
    if (pintado) {
        const base = new THREE.Color(corBase);
        const topo = base.clone().lerp(new THREE.Color(0xffffff), 0.55);
        const cores = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
            const c = base.clone().lerp(topo, Math.min(1, pos.getY(i)));
            cores.set([c.r, c.g, c.b], i * 3);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(cores, 3));
        material = aplicarLinhasDeCamada(mat.clone());
        material.vertexColors = true;
        material.color.set(0xffffff);
    }
    material.side = THREE.DoubleSide;
    return new THREE.Group().add(new THREE.Mesh(geo, material));
}

function modeloEngrenagem(mat, pintado) {
    const dentes = 16, rExt = 0.5, rRaiz = 0.42;
    const forma = new THREE.Shape();
    for (let i = 0; i < dentes; i++) {
        const a0 = (i / dentes) * Math.PI * 2;
        const passo = (Math.PI * 2) / dentes;
        [[rRaiz, a0], [rExt, a0 + passo * 0.18], [rExt, a0 + passo * 0.48], [rRaiz, a0 + passo * 0.66]].forEach(([r, a], j) => {
            const p = [Math.cos(a) * r, Math.sin(a) * r];
            i === 0 && j === 0 ? forma.moveTo(...p) : forma.lineTo(...p);
        });
    }
    forma.closePath();
    const furo = new THREE.Path();
    furo.absarc(0, 0, 0.13, 0, Math.PI * 2, true);
    forma.holes.push(furo);
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const janela = new THREE.Path();
        janela.absarc(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.065, 0, Math.PI * 2, true);
        forma.holes.push(janela);
    }
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    const g = new THREE.Group().add(new THREE.Mesh(geo, mat));
    const perfilCubo = [[0.13, 0], [0.2, 0], [0.2, 0.24], [0.13, 0.24], [0.13, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(perfilCubo, 48), pintado ? metal : mat));
    return g;
}

function construirModeloLoja(estado, material, materialDetalhe) {
    const pintado = estado.acabamento === "Pintado à mão";
    switch (estado.tipo) {
        case "miniatura": return modeloMiniatura(material, pintado, estado.cor);
        case "decoracao": return modeloVaso(material, pintado, estado.cor);
        case "tecnica": return modeloEngrenagem(material, pintado);
        default: return modeloChaveiro(material, materialDetalhe);
    }
}

/**
 * Junta um grupo de malhas numa única geometria (só posições), já com as transformações
 * aplicadas. Cada malha vira um grupo (userData.grupos: um número por triângulo).
 */
function achatarGrupo(objeto) {
    objeto.updateMatrixWorld(true);
    const partes = [];
    objeto.traverse((o) => {
        if (!o.isMesh || !o.geometry?.attributes?.position) return;
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        for (const nome of Object.keys(g.attributes)) if (nome !== "position") g.deleteAttribute(nome);
        g.morphAttributes = {};
        g.applyMatrix4(o.matrixWorld);
        partes.push(g);
    });
    if (!partes.length) throw new Error("O arquivo não contém nenhuma malha 3D.");
    // junta tudo, descartando triângulos sem área (cones e esferas do three.js têm vários na ponta)
    const total = partes.reduce((s, g) => s + g.attributes.position.count / 3, 0);
    const pos = new Float32Array(total * 9);
    const grupos = new Uint32Array(total);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let m = 0;
    partes.forEach((g, i) => {
        const src = g.attributes.position.array;
        for (let o = 0; o < src.length; o += 9) {
            a.fromArray(src, o); b.fromArray(src, o + 3); c.fromArray(src, o + 6);
            if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-12) continue;
            pos.set(src.subarray(o, o + 9), m * 9);
            grupos[m++] = i;
        }
        g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos.slice(0, m * 9), 3));
    geo.userData.grupos = grupos.slice(0, m);
    return geo;
}

/** Modelo de exemplo para quem não tem arquivo: a miniatura, sem argolas nem cores. */
export function geometriaExemplo() {
    const g = modeloMiniatura(new THREE.MeshStandardMaterial(), false, "#ffffff");
    const geo = achatarGrupo(g);
    geo.scale(10, 10, 10); // "arquivo" em cm → 10 cm de altura
    return geo;
}

// ─── Estrutura de pintura ────────────────────────────────────────────────────
// (solda, vizinhança e divisão em partes ficam em configurador-partes.js)

/**
 * Percorre vizinhos a partir de "semente"; aceitar(atual, vizinho) decide quem entra.
 * Só conta como vizinho quem divide uma aresta inteira (a tinta não "pula" por um canto)
 * e está no mesmo grupo do arquivo (não vaza de um objeto para outro).
 */
function inundar(p, semente, aceitar, marca) {
    const idx = p.idx, ini = p.inicioVert, tdv = p.trisDoVert, grupos = p.grupos;
    const fila = [semente];
    marca[semente] = 1;
    for (let i = 0; i < fila.length; i++) {
        const t = fila[i];
        for (let k = 0; k < 3; k++) {
            const va = idx[t * 3 + k];
            const vb = idx[t * 3 + ((k + 1) % 3)];
            for (let j = ini[va]; j < ini[va + 1]; j++) {
                const viz = tdv[j];
                if (marca[viz]) continue;
                if (idx[viz * 3] !== vb && idx[viz * 3 + 1] !== vb && idx[viz * 3 + 2] !== vb) continue;
                if (grupos && grupos[viz] !== grupos[t]) continue;
                if (!aceitar(t, viz)) continue;
                marca[viz] = 1;
                fila.push(viz);
            }
        }
    }
    for (const t of fila) marca[t] = 0;
    return fila;
}

// ─── Visualizador ────────────────────────────────────────────────────────────

export async function criarViewer(root, { aoMudarPintura, aoMudarPartes } = {}) {
    const canvas = root.querySelector("[data-cfg-canvas]");
    const viewerEl = root.querySelector("[data-cfg-viewer]");
    const medidaEl = root.querySelector("[data-cfg-measure]");
    // um rótulo por eixo; o do HTML fica com a altura e os outros dois são clonados dele
    const EIXOS = {
        x: { nome: "Largura", sigla: "L", cor: 0x60a5fa },
        z: { nome: "Comprimento", sigla: "C", cor: 0x34d399 },
        y: { nome: "Altura", sigla: "A", cor: 0xf47a20 }
    };
    const rotulos = { y: medidaEl };
    for (const eixo of ["x", "z"]) {
        rotulos[eixo] = medidaEl.cloneNode(false);
        medidaEl.after(rotulos[eixo]);
    }
    for (const [eixo, el] of Object.entries(rotulos)) {
        el.classList.add(`cfg-measure-${eixo}`);
        el.removeAttribute("data-cfg-measure");
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // sem tone mapping cinematográfico: ele desbota laranjas e vermelhos, e aqui a cor precisa ser fiel
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const cena = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 500);
    const controles = new OrbitControls(camera, canvas);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.screenSpacePanning = true;
    controles.maxPolarAngle = Math.PI * 0.49;
    controles.autoRotate = !reduzirMovimento;
    controles.autoRotateSpeed = 1.4;
    let retomarGiro;
    let apresentacao = false;
    controles.addEventListener("start", () => { controles.autoRotate = false; clearTimeout(retomarGiro); });
    controles.addEventListener("end", () => {
        if (reduzirMovimento || modo === "pintar") return;
        retomarGiro = setTimeout(() => { controles.autoRotate = modo !== "pintar"; }, apresentacao ? 2500 : 6000);
    });

    // Roda do mouse: o zoom padrão dá um passo fixo por evento, e mouses de alta precisão e
    // touchpads mandam dezenas de eventos por giro (ia de um extremo ao outro). Aqui o zoom
    // é proporcional ao quanto a roda girou, limitado por evento, e vai na direção do ponto
    // da peça sob o cursor. Ao afastar, o centro volta aos poucos para o meio da peça.
    // (Pinça no toque e botão do meio continuam com o OrbitControls.)
    const raioZoom = new THREE.Raycaster();
    raioZoom.firstHitOnly = true;
    const cursorZoom = new THREE.Vector2();
    viewerEl.addEventListener("wheel", (e) => {
        if (e.target !== canvas) return;
        e.preventDefault();
        e.stopPropagation(); // não deixa o OrbitControls aplicar o zoom dele
        const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
        const k0 = Math.exp(Math.max(-60, Math.min(60, px)) * 0.002); // no máximo ~11% por evento
        const dist = camera.position.distanceTo(controles.target);
        const novo = Math.min(controles.maxDistance, Math.max(controles.minDistance, dist * k0));
        const k = novo / dist;
        if (Math.abs(k - 1) < 1e-4) return;

        controles.autoRotate = false;
        clearTimeout(retomarGiro);
        if (!reduzirMovimento && modo !== "pintar") {
            retomarGiro = setTimeout(() => { controles.autoRotate = modo !== "pintar"; }, apresentacao ? 2500 : 6000);
        }

        let foco = controles.target.clone();
        if (k < 1 && modelo) {
            const r = canvas.getBoundingClientRect();
            cursorZoom.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
            raioZoom.setFromCamera(cursorZoom, camera);
            const hit = raioZoom.intersectObject(modelo, true)[0];
            if (hit) foco = hit.point;
        }
        camera.position.sub(foco).multiplyScalar(k).add(foco);
        controles.target.sub(foco).multiplyScalar(k).add(foco);
        if (k > 1) {
            // afastando: desliza câmera e centro juntos de volta para o meio da peça
            const volta = new THREE.Vector3(0, dimensoes.y * 0.5, 0).sub(controles.target).multiplyScalar(0.25);
            camera.position.add(volta);
            controles.target.add(volta);
        }
        controles.update();
    }, { capture: true, passive: false });

    const luz = new THREE.DirectionalLight(0xffffff, 1.25);
    luz.castShadow = true;
    luz.shadow.mapSize.set(1024, 1024);
    luz.shadow.radius = 6;
    luz.shadow.bias = -0.0005;
    cena.add(luz, luz.target);
    cena.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1208, 0.35));

    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.32 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.receiveShadow = true;
    cena.add(sombra);

    let grade = null;
    let gradeVisivel = true;
    let modelo = null;          // grupo "pivô" atualmente na cena
    const grupoMedidas = new THREE.Group(); // caixa + 3 cotas (largura, comprimento, altura)
    cena.add(grupoMedidas);
    let medidasVisiveis = true;
    let pontosRotulo = {};                  // eixo → ponto 3D onde fica o rótulo
    let dimensoes = new THREE.Vector3(1, 1, 1);
    let entrada = 1;            // animação de "surgir" ao trocar de modelo
    let fonte = "loja";         // "loja" | "arquivo"
    let modo = "girar";         // "girar" | "pintar"
    let ferramenta = "parte";   // "peca" | "parte" | "superficie" | "pincel"

    // estado do modelo da loja
    let chaveLoja = "";
    let tamanhoLoja = 0;
    let estadoLoja = null;

    // estado do modelo enviado
    const arq = {
        geo: null, malha: null, material: null, pintura: null,
        paleta: ["#e8eaee"], nomes: ["Cor base"], triCor: null,
        unidade: "mm", fatorUnidade: 0.1, alturaArquivo: 1, alvoCm: 10,
        impressao: "Filamento", corAtual: 1, raioPincelCm: 0.6, toleranciaGraus: 25, nivelDivisao: 35,
        desfazer: [], traco: null, previa: null, naPrevia: null, marca: null, rotacoes: [],
        // divisão em partes (calculada só quando a ferramenta "Parte" é usada)
        arestas: null, pecas: null, hierarquia: null, partes: null, linhas: null, linhasSujas: true
    };

    const refazerGrade = (lado) => {
        if (grade) { cena.remove(grade); grade.geometry.dispose(); grade.material.dispose(); }
        const n = Math.max(6, Math.ceil(lado / 2) * 2);
        grade = new THREE.GridHelper(n, n, 0x3a4a63, 0x223047);
        grade.material.transparent = true;
        grade.material.opacity = 0.55;
        grade.position.y = 0.001;
        grade.visible = gradeVisivel && !apresentacao;
        cena.add(grade);
        sombra.scale.set(n, n, 1);
    };

    /**
     * Desenha as medidas como num desenho técnico: caixa tracejada em volta da peça e uma
     * cota por eixo (largura na frente, comprimento na lateral, altura no canto), com
     * linhas de chamada, marcações a cada centímetro e o valor num rótulo da mesma cor.
     */
    const refazerMedidas = () => {
        for (const filho of [...grupoMedidas.children]) {
            grupoMedidas.remove(filho);
            filho.geometry.dispose();
            filho.material.dispose();
        }
        const w = dimensoes.x, h = dimensoes.y, d = dimensoes.z;
        const maior = Math.max(w, h, d);
        const afast = maior * 0.14;   // distância das cotas até a peça
        const tick = maior * 0.022;   // tamanho das marcações
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        // caixa tracejada (volume total ocupado)
        const caixa = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)).translate(0, h / 2, 0),
            new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: maior * 0.03, gapSize: maior * 0.02, transparent: true, opacity: 0.25 })
        );
        caixa.computeLineDistances();
        grupoMedidas.add(caixa);

        const cota = (eixo, a, b, perp, chamadas) => {
            const cm = a.distanceTo(b);
            const pts = [a, b];
            // marcações nas pontas e a cada centímetro (a cada 5 cm em peças grandes)
            pts.push(a.clone().addScaledVector(perp, -tick * 1.6), a.clone().addScaledVector(perp, tick * 1.6));
            pts.push(b.clone().addScaledVector(perp, -tick * 1.6), b.clone().addScaledVector(perp, tick * 1.6));
            const passo = cm > 40 ? 5 : 1;
            for (let c = passo; c < cm - 1e-6; c += passo) {
                const p = a.clone().lerp(b, c / cm);
                const tam = c % (passo * 5) === 0 ? tick : tick * 0.55;
                pts.push(p.clone().addScaledVector(perp, -tam), p.clone().addScaledVector(perp, tam));
            }
            const linhas = new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: EIXOS[eixo].cor })
            );
            grupoMedidas.add(linhas);
            // linhas de chamada (da peça até a cota), mais discretas
            const chamada = new THREE.LineSegments(
                new THREE.BufferGeometry().setFromPoints(chamadas),
                new THREE.LineBasicMaterial({ color: EIXOS[eixo].cor, transparent: true, opacity: 0.45 })
            );
            grupoMedidas.add(chamada);
            pontosRotulo[eixo] = a.clone().lerp(b, 0.5);
            rotulos[eixo].textContent = `${EIXOS[eixo].sigla} ${formatarCm(cm)} cm`;
        };

        // largura (X): na frente, no chão
        const zf = d / 2 + afast;
        cota("x", V(-w / 2, 0, zf), V(w / 2, 0, zf), V(0, 0, 1),
            [V(-w / 2, 0, d / 2), V(-w / 2, 0, zf + tick), V(w / 2, 0, d / 2), V(w / 2, 0, zf + tick)]);
        // comprimento (Z): na lateral direita, no chão
        const xd = w / 2 + afast;
        cota("z", V(xd, 0, d / 2), V(xd, 0, -d / 2), V(1, 0, 0),
            [V(w / 2, 0, d / 2), V(xd + tick, 0, d / 2), V(w / 2, 0, -d / 2), V(xd + tick, 0, -d / 2)]);
        // altura (Y): no canto frontal esquerdo
        const xe = -(w / 2 + afast);
        cota("y", V(xe, 0, d / 2), V(xe, h, d / 2), V(1, 0, 0),
            [V(-w / 2, 0, d / 2), V(xe - tick, 0, d / 2), V(-w / 2, h, d / 2), V(xe - tick, h, d / 2)]);

        atualizarVisibilidadeMedidas();
    };

    const atualizarVisibilidadeMedidas = () => {
        const mostrar = medidasVisiveis && !apresentacao;
        grupoMedidas.visible = mostrar;
        for (const el of Object.values(rotulos)) el.hidden = !mostrar;
    };

    const enquadrar = (horizontal) => {
        const maior = Math.max(dimensoes.x, dimensoes.y, dimensoes.z);
        const alvoY = dimensoes.y * 0.5;
        // enquadra a peça + as cotas em volta (afastadas 14% da maior medida, mais os rótulos)
        const margem = maior * 0.14 * 2 + maior * 0.12;
        const raio = 0.5 * Math.hypot(dimensoes.x + margem, dimensoes.y + margem * 0.5, dimensoes.z + margem);
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(camera.aspect, 0.1));
        const dist = (raio / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
        const direcao = camera.position.clone().sub(controles.target);
        if (direcao.lengthSq() < 1e-6) direcao.set(1, horizontal ? 1.1 : 0.45, 1.6);
        direcao.normalize();
        if (horizontal && direcao.y < 0.5) { direcao.y = 0.75; direcao.normalize(); }
        controles.target.set(0, alvoY, 0);
        camera.position.copy(controles.target).addScaledVector(direcao, dist);
        controles.minDistance = dist * 0.15;
        controles.maxDistance = dist * 1.8;
        camera.near = dist / 200;
        camera.far = dist * 30;
        camera.updateProjectionMatrix();

        luz.position.set(dist * 0.6, dist * 1.2, dist * 0.8);
        luz.target.position.set(0, 0, 0);
        const s = luz.shadow.camera;
        const alcance = maior * 1.4;
        s.left = -alcance; s.right = alcance; s.top = alcance; s.bottom = -alcance;
        s.near = dist * 0.01; s.far = dist * 4;
        s.updateProjectionMatrix();
    };

    const removerModelo = () => {
        if (!modelo) return;
        cena.remove(modelo);
        modelo.traverse((o) => {
            if (!o.isMesh || o === arq.malha) return; // a malha do arquivo é reaproveitada
            o.geometry.dispose();
            if (o.material !== metal) o.material.dispose();
        });
        modelo = null;
    };

    // ── Modelos da loja ─────────────────────────────────────────────────────
    const mostrarLoja = (estado) => {
        estadoLoja = estado;
        const chave = `${estado.tipo}|${estado.acabamento}|${estado.impressao}|${estado.cor}`;
        const trocouForma = fonte !== "loja" || !chaveLoja.startsWith(`${estado.tipo}|${estado.acabamento}`);

        if (fonte !== "loja" || chave !== chaveLoja) {
            removerModelo();
            fonte = "loja";
            controles.enablePan = false;
            const material = criarMaterial(estado);
            const materialDetalhe = estado.acabamento === "Pintado à mão"
                ? aplicarLinhasDeCamada(new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.5 }))
                : material;
            uniformsCamada.uForca.value = forcaCamadas(estado.impressao, estado.acabamento);

            const bruto = construirModeloLoja(estado, material, materialDetalhe);
            bruto.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

            // normaliza: dimensão principal = 1, base apoiada no chão e centralizada
            const caixa = new THREE.Box3().setFromObject(bruto);
            const tam = caixa.getSize(new THREE.Vector3());
            const principal = estado.tipo === "tecnica" ? Math.max(tam.x, tam.z) : tam.y;
            const miolo = caixa.getCenter(new THREE.Vector3());
            bruto.position.set(-miolo.x, -caixa.min.y, -miolo.z);
            modelo = new THREE.Group().add(bruto);
            modelo.userData.base = 1 / principal;
            cena.add(modelo);
            chaveLoja = chave;
            tamanhoLoja = 0;
            if (trocouForma && !reduzirMovimento) entrada = 0;
        }

        if (estado.tamanho !== tamanhoLoja) {
            tamanhoLoja = estado.tamanho;
            modelo.scale.setScalar(modelo.userData.base * tamanhoLoja);
            modelo.updateMatrixWorld(true);
            dimensoes = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
            uniformsCamada.uFreq.value = 60 / Math.max(dimensoes.y, 0.5);
            const horizontal = estado.tipo === "tecnica";
            refazerGrade(Math.max(dimensoes.x, dimensoes.z, dimensoes.y) * 2.2);
            refazerMedidas();
            enquadrar(horizontal);
        }
    };

    // ── Modelo enviado pelo cliente ─────────────────────────────────────────
    const corRGB = new THREE.Color();
    // faixa de triângulos alterados desde o último envio para a placa de vídeo
    let alterMin = Infinity, alterMax = -1;
    const enviarCores = () => {
        if (!arq.geo || alterMax < 0) return;
        const attr = arq.geo.attributes.color;
        attr.clearUpdateRanges?.();
        attr.addUpdateRange?.(alterMin * 9, (alterMax - alterMin + 1) * 9);
        attr.needsUpdate = true;
        alterMin = Infinity; alterMax = -1;
    };
    const escreverTri = (t, hex, clarear = 0) => {
        if (t < alterMin) alterMin = t;
        if (t > alterMax) alterMax = t;
        corRGB.set(hex);
        if (clarear) corRGB.lerp(BRANCO, clarear);
        const cores = arq.geo.attributes.color.array;
        for (let k = 0; k < 3; k++) {
            cores[t * 9 + k * 3] = corRGB.r;
            cores[t * 9 + k * 3 + 1] = corRGB.g;
            cores[t * 9 + k * 3 + 2] = corRGB.b;
        }
    };
    const BRANCO = new THREE.Color(0xffffff);

    const repintarTudo = () => {
        for (let t = 0; t < arq.pintura.n; t++) escreverTri(t, arq.paleta[arq.triCor[t]]);
        enviarCores();
    };

    const centralizarArquivo = () => {
        arq.geo.computeBoundingBox();
        const caixa = arq.geo.boundingBox;
        const miolo = caixa.getCenter(new THREE.Vector3());
        arq.geo.translate(-miolo.x, -caixa.min.y, -miolo.z);
        arq.geo.computeBoundingBox();
        arq.geo.computeBoundingSphere();
        arq.alturaArquivo = Math.max(arq.geo.boundingBox.max.y, 1e-6);
        arq.maiorArquivo = Math.max(...arq.geo.boundingBox.getSize(new THREE.Vector3()).toArray(), 1e-6);
    };

    const aplicarEscalaArquivo = () => {
        const escala = arq.alvoCm / arq.alturaArquivo;
        modelo.scale.setScalar(escala);
        modelo.updateMatrixWorld(true);
        dimensoes = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
        uniformsCamada.uFreq.value = 60 / Math.max(dimensoes.y, 0.5);
        refazerGrade(Math.max(dimensoes.x, dimensoes.z, dimensoes.y) * 2.2);
        refazerMedidas();
        enquadrar(false);
    };

    const reconstruirBVH = async () => {
        const bvh = await import("three-mesh-bvh");
        if (arq.geo.boundsTree) arq.geo.disposeBoundsTree();
        arq.geo.computeBoundsTree = bvh.computeBoundsTree;
        arq.geo.disposeBoundsTree = bvh.disposeBoundsTree;
        arq.geo.computeBoundsTree();
        arq.malha.raycast = bvh.acceleratedRaycast;
    };

    const tamanhoNativoCm = () => arq.alturaArquivo * arq.fatorUnidade;
    // a maior medida da peça fica entre 0,5 cm e 50 cm; devolve a altura correspondente
    const MENOR_CM = 0.5, MAIOR_CM = 50;
    const limitesAlturaCm = () => ({
        min: (MENOR_CM / arq.maiorArquivo) * arq.alturaArquivo,
        max: (MAIOR_CM / arq.maiorArquivo) * arq.alturaArquivo
    });
    const limitarCm = (cm) => {
        const { min, max } = limitesAlturaCm();
        return Math.min(max, Math.max(min, Math.round(cm * 100) / 100));
    };

    /** Carrega a geometria de um arquivo (ou do exemplo) e deixa pronta para pintar. */
    const carregarGeometria = async (geometria, { zParaCima = false, unidade = "mm", restaurar = null } = {}) => {
        removerModelo();
        arq.previa = null;
        if (arq.geo) { arq.geo.disposeBoundsTree?.(); arq.geo.dispose(); arq.material?.dispose(); }
        descartarPartes();

        arq.geo = geometria;
        arq.rotacoes = [];
        if (zParaCima) { arq.geo.rotateX(-Math.PI / 2); }
        for (const eixo of restaurar?.rotacoes || []) girarGeometria(eixo, false);
        arq.rotacoes = [...(restaurar?.rotacoes || [])];
        arq.geo.computeVertexNormals(); // não indexada → sombreamento facetado, bom para ver as faces
        centralizarArquivo();

        arq.pintura = prepararPintura(arq.geo.attributes.position.array, arq.geo.userData.grupos);
        const n = arq.pintura.n;
        arq.marca = new Uint8Array(n);
        arq.naPrevia = new Uint8Array(n);
        arq.triCor = restaurar?.triCor?.length === n ? restaurar.triCor : new Uint8Array(n);
        arq.paleta = restaurar?.paleta || ["#e8eaee"];
        arq.nomes = restaurar?.nomes || ["Cor base"];
        arq.geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 9), 3));
        repintarTudo();

        arq.material = criarMaterial({ impressao: arq.impressao, vertexColors: true });
        arq.material.side = THREE.DoubleSide; // arquivos nem sempre têm as normais bem orientadas
        arq.malha = new THREE.Mesh(arq.geo, arq.material);
        arq.malha.castShadow = true;
        arq.malha.receiveShadow = true;
        uniformsCamada.uForca.value = forcaCamadas(arq.impressao);

        modelo = new THREE.Group().add(arq.malha);
        cena.add(modelo);
        fonte = "arquivo";
        controles.enablePan = true;
        arq.desfazer = [];

        definirUnidade(unidade, restaurar?.alvoCm);
        await reconstruirBVH();
        if (!reduzirMovimento) entrada = 0;
        avisarPintura();
        // a divisão em partes pode levar um instante em malhas grandes: calcula depois de mostrar
        if (ferramenta === "parte") prepararPartesDepois();
        return { triangulos: n, ...dimensoesCm() };
    };

    const dimensoesCm = () => ({ larguraCm: dimensoes.x, profundidadeCm: dimensoes.z, alturaCm: dimensoes.y, nativoCm: tamanhoNativoCm(), nativoMaiorCm: (arq.maiorArquivo || 0) * arq.fatorUnidade });

    const definirUnidade = (unidade, alvoCm) => {
        arq.unidade = unidade;
        arq.fatorUnidade = { mm: 0.1, cm: 1, pol: 2.54, m: 100 }[unidade] ?? 0.1;
        arq.alvoCm = alvoCm ?? limitarCm(tamanhoNativoCm());
        aplicarEscalaArquivo();
    };

    const girarGeometria = (eixo, registrar = true) => {
        const m = new THREE.Matrix4();
        if (eixo === "x") m.makeRotationX(Math.PI / 2);
        else if (eixo === "z") m.makeRotationZ(Math.PI / 2);
        else m.makeRotationY(Math.PI / 2);
        arq.geo.applyMatrix4(m);
        if (registrar) arq.rotacoes.push(eixo);
    };

    const girarArquivo = async (eixo) => {
        if (fonte !== "arquivo") return;
        limparPrevia(true);
        const escala = arq.alvoCm / arq.alturaArquivo; // girar muda a posição, não o tamanho real
        girarGeometria(eixo);
        arq.geo.computeVertexNormals();
        centralizarArquivo();
        arq.pintura.recalcular();
        arq.linhasSujas = true; // os vértices mudaram de lugar
        atualizarLinhas();
        arq.alvoCm = limitarCm(escala * arq.alturaArquivo);
        aplicarEscalaArquivo();
        await reconstruirBVH();
        avisarPintura();
    };

    // ── Pintura ──────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = true;
    const ponteiro = new THREE.Vector2();
    const pontoLocal = new THREE.Vector3();
    const cursorPincel = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide })
    );
    cursorPincel.renderOrder = 10;
    cursorPincel.visible = false;
    cena.add(cursorPincel);

    const acertar = (evento) => {
        if (fonte !== "arquivo" || !arq.malha) return null;
        const r = canvas.getBoundingClientRect();
        ponteiro.set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ponteiro, camera);
        const hit = raycaster.intersectObject(arq.malha, false)[0];
        if (!hit) return null;
        // o BVH cria/reordena um índice; os vértices não mudam de lugar, então o triângulo
        // original é o dono do primeiro vértice da face encontrada
        const indice = arq.geo.index;
        const tri = indice ? Math.floor(indice.getX(hit.faceIndex * 3) / 3) : hit.faceIndex;
        return { tri, ponto: hit.point, normal: hit.face.normal };
    };

    // ── Divisão em partes ───────────────────────────────────────────────────
    const garantirArestas = () => (arq.arestas ??= calcularArestas(arq.pintura, arq.geo.attributes.position.array));

    /** Partes no nível de divisão atual (calcula na primeira vez; depois só refaz o corte). */
    const garantirPartes = () => {
        if (!arq.partes) {
            arq.hierarquia ??= prepararDivisao(arq.pintura, garantirArestas());
            arq.partes = cortar(arq.hierarquia, limiteDaDivisao(arq.nivelDivisao));
            arq.linhasSujas = true;
            aoMudarPartes?.(arq.partes.total);
            atualizarLinhas();
        }
        return arq.partes;
    };

    const descartarPartes = () => {
        if (arq.linhas) { arq.linhas.parent?.remove(arq.linhas); arq.linhas.geometry.dispose(); }
        arq.linhas = arq.arestas = arq.pecas = arq.hierarquia = arq.partes = null;
        arq.linhasSujas = true;
    };

    /** Prepara as partes sem travar o clique: avisa "analisando" e calcula no quadro seguinte. */
    const prepararPartesDepois = () => {
        if (fonte !== "arquivo" || !arq.pintura || arq.partes) return;
        aoMudarPartes?.(null);
        const geo = arq.geo;
        setTimeout(() => { if (arq.geo === geo && fonte === "arquivo") garantirPartes(); }, 30);
    };

    // contorno de cada parte, desenhado sobre a peça enquanto a ferramenta "Parte" está ativa
    const materialLinhas = new THREE.LineBasicMaterial({ color: 0xf47a20, transparent: true, opacity: 0.85 });
    const atualizarLinhas = () => {
        const mostrar = fonte === "arquivo" && modo === "pintar" && ferramenta === "parte" && !apresentacao && !!arq.partes;
        if (arq.linhas) arq.linhas.visible = mostrar;
        if (!mostrar || !arq.linhasSujas) return;
        arq.linhasSujas = false;
        if (arq.linhas) { arq.malha.remove(arq.linhas); arq.linhas.geometry.dispose(); arq.linhas = null; }
        const lista = arestasDeDivisao(arq.arestas, arq.partes.rotulo);
        if (!lista.length) return;
        const pos = arq.geo.attributes.position.array, nrm = arq.pintura.normais;
        const { tA, tB, lado } = arq.arestas;
        const afasta = arq.maiorArquivo * 0.0015; // levanta a linha da superfície para não sumir dentro dela
        const v = new Float32Array(lista.length * 6);
        lista.forEach((e, i) => {
            const t = tA[e], u = tB[e], k = lado[e];
            let nx = nrm[t * 3] + nrm[u * 3], ny = nrm[t * 3 + 1] + nrm[u * 3 + 1], nz = nrm[t * 3 + 2] + nrm[u * 3 + 2];
            const len = Math.hypot(nx, ny, nz);
            if (len > 1e-6) { nx /= len; ny /= len; nz /= len; } else { nx = nrm[t * 3]; ny = nrm[t * 3 + 1]; nz = nrm[t * 3 + 2]; }
            const o1 = t * 9 + k * 3, o2 = t * 9 + ((k + 1) % 3) * 3;
            v[i * 6] = pos[o1] + nx * afasta; v[i * 6 + 1] = pos[o1 + 1] + ny * afasta; v[i * 6 + 2] = pos[o1 + 2] + nz * afasta;
            v[i * 6 + 3] = pos[o2] + nx * afasta; v[i * 6 + 4] = pos[o2 + 1] + ny * afasta; v[i * 6 + 5] = pos[o2 + 2] + nz * afasta;
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(v, 3));
        arq.linhas = new THREE.LineSegments(g, materialLinhas);
        arq.linhas.renderOrder = 2;
        arq.linhas.raycast = () => {}; // só desenho: o zoom e a pintura miram na peça
        arq.malha.add(arq.linhas);
    };

    const regiao = (tri, pontoMundo) => {
        const p = arq.pintura;
        if (ferramenta === "peca") {
            if (!arq.pecas) arq.pecas = pecasSoltas(p.n, garantirArestas());
            return arq.pecas.lista(arq.pecas.rotulo[tri]);
        }
        if (ferramenta === "parte") {
            const partes = garantirPartes();
            return partes.lista(partes.rotulo[tri]);
        }
        if (ferramenta === "superficie") {
            const limite = Math.cos(THREE.MathUtils.degToRad(arq.toleranciaGraus));
            const nrm = p.normais;
            return inundar(p, tri, (a, b) => nrm[a * 3] * nrm[b * 3] + nrm[a * 3 + 1] * nrm[b * 3 + 1] + nrm[a * 3 + 2] * nrm[b * 3 + 2] >= limite, arq.marca);
        }
        // pincel: triângulos conectados (por aresta) que tocam o círculo do pincel e estão
        // virados para o mesmo lado da semente (não atravessa para o verso de paredes finas)
        arq.malha.worldToLocal(pontoLocal.copy(pontoMundo));
        const raio = arq.raioPincelCm / (arq.alvoCm / arq.alturaArquivo);
        const r2 = raio * raio, cs = p.centros, nrm = p.normais;
        const pos = arq.geo.attributes.position.array;
        const lx = pontoLocal.x, ly = pontoLocal.y, lz = pontoLocal.z;
        const sx = nrm[tri * 3], sy = nrm[tri * 3 + 1], sz = nrm[tri * 3 + 2];
        const dentro = (x, y, z) => { const dx = x - lx, dy = y - ly, dz = z - lz; return dx * dx + dy * dy + dz * dz <= r2; };
        return inundar(p, tri, (_, b) => {
            if (nrm[b * 3] * sx + nrm[b * 3 + 1] * sy + nrm[b * 3 + 2] * sz < -0.1) return false;
            if (dentro(cs[b * 3], cs[b * 3 + 1], cs[b * 3 + 2])) return true;
            const o = b * 9;
            return dentro(pos[o], pos[o + 1], pos[o + 2]) || dentro(pos[o + 3], pos[o + 4], pos[o + 5]) || dentro(pos[o + 6], pos[o + 7], pos[o + 8]);
        }, arq.marca);
    };

    // destaque de "o que vai ser pintado" ao passar o mouse
    const limparPrevia = (semAtualizar = false) => {
        if (!arq.previa) return;
        for (const t of arq.previa.tris) { escreverTri(t, arq.paleta[arq.triCor[t]]); arq.naPrevia[t] = 0; }
        arq.previa = null;
        if (!semAtualizar && arq.geo) enviarCores();
    };
    const mostrarPrevia = (tris) => {
        limparPrevia(true);
        const hex = arq.paleta[arq.corAtual] ?? "#ffffff";
        for (const t of tris) { escreverTri(t, hex, 0.35); arq.naPrevia[t] = 1; }
        arq.previa = { tris };
        enviarCores();
    };

    const pintarTris = (tris) => {
        const traco = arq.traco;
        const novo = arq.corAtual;
        let mudou = false;
        for (const t of tris) {
            const antigo = arq.triCor[t];
            if (antigo === novo) continue;
            if (traco && !traco.has(t)) traco.set(t, antigo);
            arq.triCor[t] = novo;
            escreverTri(t, arq.paleta[novo]);
            mudou = true;
        }
        if (mudou) enviarCores();
        return mudou;
    };

    let pintando = false;
    let ultimaPrevia = -1;
    let quadroPendente = null;
    let ultimoTraco = null; // último ponto pintado (tela + mundo), para o pincel não deixar falhas

    /** Pincela o caminho entre o último ponto e o atual, em passos de meio raio. */
    const pincelarAte = (evento, hit) => {
        if (ultimoTraco) {
            const passo = Math.max(arq.raioPincelCm * 0.5, 1e-4);
            const passos = Math.min(24, Math.ceil(hit.ponto.distanceTo(ultimoTraco.ponto) / passo));
            for (let s = 1; s < passos; s++) {
                const f = s / passos;
                const intermediario = acertar({
                    clientX: ultimoTraco.x + (evento.clientX - ultimoTraco.x) * f,
                    clientY: ultimoTraco.y + (evento.clientY - ultimoTraco.y) * f
                });
                if (intermediario) pintarTris(regiao(intermediario.tri, intermediario.ponto));
            }
        }
        pintarTris(regiao(hit.tri, hit.ponto));
        ultimoTraco = { x: evento.clientX, y: evento.clientY, ponto: hit.ponto.clone() };
        avisarPintura(false);
    };

    const aoMover = (evento) => {
        if (modo !== "pintar" || fonte !== "arquivo") { cursorPincel.visible = false; return; }
        if (quadroPendente) return; // no máximo um cálculo por quadro
        quadroPendente = requestAnimationFrame(() => {
            quadroPendente = null;
            const hit = acertar(evento);
            if (!hit) {
                cursorPincel.visible = false;
                if (arq.previa) { limparPrevia(); ultimaPrevia = -1; }
                return;
            }
            if (ferramenta === "pincel") {
                const raioMundo = arq.raioPincelCm;
                cursorPincel.visible = true;
                cursorPincel.scale.setScalar(raioMundo);
                const normalMundo = hit.normal.clone().transformDirection(arq.malha.matrixWorld);
                cursorPincel.position.copy(hit.ponto).addScaledVector(normalMundo, raioMundo * 0.02);
                cursorPincel.lookAt(hit.ponto.clone().add(normalMundo));
                if (pintando) pincelarAte(evento, hit);
                return;
            }
            cursorPincel.visible = false;
            if (pintando) return;
            // o cursor continua dentro da região já destacada? não recalcula
            if (arq.previa && arq.naPrevia[hit.tri]) return;
            mostrarPrevia(regiao(hit.tri, hit.ponto));
            ultimaPrevia = hit.tri;
        });
    };

    const aoPressionar = (evento) => {
        if (modo !== "pintar" || fonte !== "arquivo") return;
        if (evento.pointerType === "mouse" && evento.button !== 0) return; // botão direito gira
        const hit = acertar(evento);
        if (!hit) return;
        evento.preventDefault();
        canvas.setPointerCapture?.(evento.pointerId);
        limparPrevia(true);
        ultimaPrevia = -1;
        pintando = true;
        arq.traco = new Map();
        ultimoTraco = null;
        if (ferramenta === "pincel") pincelarAte(evento, hit);
        else { pintarTris(regiao(hit.tri, hit.ponto)); avisarPintura(false); }
    };

    const aoSoltar = () => {
        if (!pintando) return;
        pintando = false;
        ultimoTraco = null;
        if (arq.traco?.size) {
            arq.desfazer.push(arq.traco);
            if (arq.desfazer.length > 40) arq.desfazer.shift();
        }
        arq.traco = null;
        avisarPintura();
    };

    canvas.addEventListener("pointermove", aoMover);
    canvas.addEventListener("pointerdown", aoPressionar);
    window.addEventListener("pointerup", aoSoltar);
    canvas.addEventListener("pointerleave", () => {
        cursorPincel.visible = false;
        if (!pintando && arq.previa) { limparPrevia(); ultimaPrevia = -1; }
    });
    canvas.addEventListener("contextmenu", (e) => { if (modo === "pintar") e.preventDefault(); });

    const coresUsadas = () => {
        if (fonte !== "arquivo" || !arq.pintura) return [];
        const somas = new Float64Array(arq.paleta.length);
        let total = 0;
        for (let t = 0; t < arq.pintura.n; t++) {
            somas[arq.triCor[t]] += arq.pintura.areas[t];
            total += arq.pintura.areas[t];
        }
        return arq.paleta
            .map((hex, i) => ({ hex, nome: arq.nomes[i] || hex, pct: total ? (somas[i] / total) * 100 : 0, indice: i }))
            .filter((c) => c.pct > 0.05)
            .sort((a, b) => b.pct - a.pct);
    };

    function avisarPintura(completo = true) {
        aoMudarPintura?.({ completo, cores: completo ? coresUsadas() : null, podeDesfazer: arq.desfazer.length > 0 });
    }

    // ── Modo de interação ────────────────────────────────────────────────────
    const aplicarModo = () => {
        const pintar = modo === "pintar" && fonte === "arquivo";
        // pintando: botão esquerdo pinta, direito gira, roda aproxima; no toque, dois dedos giram/aproximam
        controles.mouseButtons = pintar
            ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
            : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
        controles.touches = pintar
            ? { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }
            : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
        if (pintar) { controles.autoRotate = false; clearTimeout(retomarGiro); }
        viewerEl.classList.toggle("is-painting", pintar);
        if (!pintar) { cursorPincel.visible = false; limparPrevia(); }
        atualizarLinhas();
    };
    aplicarModo();

    // ── Redimensionamento e laço de renderização ─────────────────────────────
    const redimensionar = () => {
        const { width, height } = viewerEl.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(redimensionar).observe(viewerEl);
    redimensionar();

    let visivel = true;
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(viewerEl);

    const projetado = new THREE.Vector3();
    const relogio = new THREE.Clock();
    const renderizar = () => {
        renderer.render(cena, camera);
        if (grupoMedidas.visible) {
            for (const [eixo, ponto] of Object.entries(pontosRotulo)) {
                projetado.copy(ponto).project(camera);
                const el = rotulos[eixo];
                el.style.visibility = projetado.z > 1 ? "hidden" : "visible"; // atrás da câmera
                el.style.transform = `translate(${(projetado.x * 0.5 + 0.5) * viewerEl.clientWidth}px, ${(-projetado.y * 0.5 + 0.5) * viewerEl.clientHeight}px) translate(-50%, -50%)`;
            }
        }
    };
    renderer.setAnimationLoop(() => {
        if (!visivel || document.hidden) return;
        const dt = Math.min(relogio.getDelta(), 0.05);
        if (entrada < 1 && modelo) {
            entrada = Math.min(1, entrada + dt * 3.2);
            const k = 1 - Math.pow(1 - entrada, 3);
            const escalaFinal = fonte === "arquivo" ? arq.alvoCm / arq.alturaArquivo : modelo.userData.base * tamanhoLoja;
            modelo.scale.setScalar(escalaFinal * (0.82 + 0.18 * k));
            modelo.rotation.y = (1 - k) * -0.6;
        }
        controles.update();
        renderizar();
    });

    // ── API pública ─────────────────────────────────────────────────────────
    return {
        mostrarLoja,
        get fonte() { return fonte; },

        async carregarArquivo(arquivo, opcoes = {}) {
            const { geometria, zParaCima } = await lerArquivo3D(arquivo, LIMITE_TRIANGULOS);
            return carregarGeometria(geometria, { zParaCima, unidade: opcoes.unidade || "mm", restaurar: opcoes.restaurar });
        },
        async carregarExemplo(opcoes = {}) {
            return carregarGeometria(geometriaExemplo(), { unidade: "cm", restaurar: opcoes.restaurar });
        },
        voltarParaLoja() {
            if (estadoLoja) { chaveLoja = ""; mostrarLoja(estadoLoja); }
        },
        /** Volta a mostrar o arquivo do cliente (mantido na memória) depois de ver um modelo da loja. */
        mostrarArquivo() {
            if (!arq.malha || fonte === "arquivo") return;
            removerModelo();
            modelo = new THREE.Group().add(arq.malha);
            cena.add(modelo);
            fonte = "arquivo";
            chaveLoja = "";
            controles.enablePan = true;
            uniformsCamada.uForca.value = forcaCamadas(arq.impressao);
            aplicarEscalaArquivo();
            aplicarModo();
        },

        setImpressao(impressao) {
            arq.impressao = impressao;
            if (fonte === "arquivo" && arq.malha) {
                const antigo = arq.material;
                arq.material = criarMaterial({ impressao, vertexColors: true });
                arq.material.side = THREE.DoubleSide;
                arq.malha.material = arq.material;
                antigo?.dispose();
                uniformsCamada.uForca.value = forcaCamadas(impressao);
            }
        },
        setUnidade(unidade) { if (fonte === "arquivo") { definirUnidade(unidade); avisarPintura(); } return dimensoesCm(); },
        setAlturaCm(cm) { if (fonte === "arquivo") { arq.alvoCm = limitarCm(cm); aplicarEscalaArquivo(); } return dimensoesCm(); },
        girar: async (eixo) => { await girarArquivo(eixo); return dimensoesCm(); },
        dimensoesCm,
        infoArquivo: () => ({ unidade: arq.unidade, alvoCm: arq.alvoCm, nativoCm: tamanhoNativoCm(), rotacoes: [...arq.rotacoes], limites: limitesAlturaCm() }),
        alternarMedidas() { medidasVisiveis = !medidasVisiveis; atualizarVisibilidadeMedidas(); return medidasVisiveis; },

        setModo(novo) { modo = novo; aplicarModo(); },
        setFerramenta(nova) {
            ferramenta = nova;
            limparPrevia(); ultimaPrevia = -1; cursorPincel.visible = false;
            if (nova === "parte") prepararPartesDepois();
            atualizarLinhas();
        },
        /** Nível de divisão (0 = poucas partes, 100 = muitas). */
        setDivisao(nivel) {
            arq.nivelDivisao = nivel;
            if (!arq.hierarquia) return;
            limparPrevia(); ultimaPrevia = -1;
            arq.partes = null;
            garantirPartes();
        },
        totalPartes: () => (fonte === "arquivo" ? arq.partes?.total ?? null : null),
        setRaioPincel(cm) { arq.raioPincelCm = cm; },
        setTolerancia(graus) { arq.toleranciaGraus = graus; limparPrevia(); ultimaPrevia = -1; },
        setCorAtual(hex, nome) {
            let i = arq.paleta.indexOf(hex);
            if (i === -1) {
                if (arq.paleta.length >= 255) i = arq.paleta.length - 1;
                else { arq.paleta.push(hex); arq.nomes.push(nome || hex); i = arq.paleta.length - 1; }
            }
            arq.corAtual = i;
        },
        setCorBase(hex, nome) {
            if (fonte !== "arquivo") return;
            arq.paleta[0] = hex;
            arq.nomes[0] = nome ? `${nome} (base)` : "Cor base";
            limparPrevia(true);
            repintarTudo();
            avisarPintura();
        },
        desfazer() {
            const traco = arq.desfazer.pop();
            if (!traco) return;
            limparPrevia(true);
            for (const [t, antigo] of traco) { arq.triCor[t] = antigo; escreverTri(t, arq.paleta[antigo]); }
            enviarCores();
            avisarPintura();
        },
        limparPintura() {
            if (fonte !== "arquivo") return;
            const traco = new Map();
            for (let t = 0; t < arq.pintura.n; t++) if (arq.triCor[t] !== 0) traco.set(t, arq.triCor[t]);
            if (!traco.size) return;
            arq.desfazer.push(traco);
            arq.triCor.fill(0);
            limparPrevia(true);
            repintarTudo();
            avisarPintura();
        },
        coresUsadas,
        estadoPintura: () => (fonte === "arquivo" ? { paleta: [...arq.paleta], nomes: [...arq.nomes], triCor: arq.triCor.slice() } : null),

        resetarVista() {
            const horizontal = fonte === "loja" && estadoLoja?.tipo === "tecnica";
            camera.position.set(0, 0, 0);
            controles.target.set(0, 0, 0);
            camera.position.set(1, horizontal ? 1.1 : 0.45, 1.6);
            enquadrar(horizontal);
        },
        alternarGrade() {
            gradeVisivel = !gradeVisivel;
            if (grade) grade.visible = gradeVisivel && !apresentacao;
            return gradeVisivel;
        },
        setApresentacao(ligado) {
            apresentacao = ligado;
            if (grade) grade.visible = gradeVisivel && !ligado;
            atualizarVisibilidadeMedidas();
            if (ligado) { modo = "girar"; aplicarModo(); }
            atualizarLinhas();
            controles.autoRotate = !reduzirMovimento && (ligado || modo !== "pintar");
        },
        /** Foto da peça para anexar ao pedido: sem grade, régua ou destaques. */
        async capturarImagem(largura = 1200, altura = 900) {
            const antes = { grade: grade?.visible, medidas: grupoMedidas.visible, linhas: arq.linhas?.visible, ratio: renderer.getPixelRatio() };
            limparPrevia();
            if (arq.linhas) arq.linhas.visible = false;
            if (grade) grade.visible = false;
            grupoMedidas.visible = false;
            cursorPincel.visible = false;
            renderer.setPixelRatio(1);
            renderer.setSize(largura, altura, false);
            camera.aspect = largura / altura;
            camera.updateProjectionMatrix();
            renderer.setClearColor(0x0d1420, 1);
            renderer.render(cena, camera);
            const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(antes.ratio);
            if (grade) grade.visible = antes.grade;
            grupoMedidas.visible = antes.medidas;
            if (arq.linhas) arq.linhas.visible = antes.linhas;
            redimensionar();
            return blob;
        }
    };
}

function formatarCm(cm) {
    return Number(cm).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
