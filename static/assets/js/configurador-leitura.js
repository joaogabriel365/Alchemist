// Leitura de arquivos 3D do configurador (STL, OBJ, 3MF), feita para aceitar o que os
// programas reais exportam:
//  • STL binário e de texto (maiúsculas/minúsculas, CRLF, faces com mais de 3 vértices,
//    bytes sobrando no fim, cabeçalho binário que começa com "solid");
//  • OBJ (leitor próprio: polígonos, índices negativos, v/vt/vn; ignora linhas e pontos);
//  • 3MF do Cura, PrusaSlicer, Bambu Studio/Orca, Windows 3D Builder etc.: vários objetos,
//    componentes, peças em arquivos separados (extensão "production"), transformações,
//    unidades (mícron, mm, cm, pol, pé, m) e exclusão de modificadores/volumes negativos.
// Todas as posições saem em milímetros quando o formato informa a unidade.
import * as THREE from "three";

export class ErroLeitura extends Error {}

const UNIDADES_3MF = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

// ─── STL ─────────────────────────────────────────────────────────────────────

function lerSTL(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 15) throw new ErroLeitura("O arquivo STL está vazio ou incompleto.");
    const inicio = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
    const pareceTexto = /^\s*solid/i.test(inicio) && /facet|endsolid/i.test(inicio);

    if (bytes.length >= 84) {
        const n = new DataView(buffer).getUint32(80, true);
        const exato = 84 + n * 50 === bytes.length;
        const cabem = Math.floor((bytes.length - 84) / 50);
        // binário: tamanho bate com o número de triângulos, ou não parece texto (arquivos com bytes sobrando)
        if (exato || (!pareceTexto && cabem > 0)) return stlBinario(buffer, exato ? n : Math.min(n || cabem, cabem));
    }
    return stlTexto(new TextDecoder("latin1").decode(bytes));
}

function stlBinario(buffer, n) {
    const dv = new DataView(buffer);
    const pos = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
        const base = 84 + i * 50 + 12;
        for (let k = 0; k < 9; k++) pos[i * 9 + k] = dv.getFloat32(base + k * 4, true);
    }
    return pos;
}

function stlTexto(texto) {
    const numeros = [];
    const reLoop = /outer\s+loop([\s\S]*?)endloop/gi;
    const reVert = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/gi;
    let loop;
    while ((loop = reLoop.exec(texto))) {
        const vs = [];
        let v;
        reVert.lastIndex = 0;
        while ((v = reVert.exec(loop[1]))) vs.push([+v[1], +v[2], +v[3]]);
        // faces com mais de 3 vértices viram um "leque" de triângulos
        for (let k = 1; k + 1 < vs.length; k++) numeros.push(...vs[0], ...vs[k], ...vs[k + 1]);
    }
    if (!numeros.length) throw new ErroLeitura("Não encontramos triângulos nesse STL. Ele pode estar corrompido.");
    return new Float32Array(numeros);
}

// ─── OBJ ─────────────────────────────────────────────────────────────────────

/**
 * OBJ próprio: lê só vértices ("v") e faces ("f"), ignorando linhas, pontos, materiais e
 * texturas. (O OBJLoader do three.js descarta as faces de um objeto inteiro se ele tiver
 * uma linha "l", o que vários programas exportam.) Aceita polígonos, índices negativos,
 * "v/vt/vn", continuação de linha com "\" e BOM.
 */
function lerOBJ(buffer) {
    const texto = new TextDecoder().decode(buffer).replace(/^﻿/, "").replace(/\\\r?\n/g, " ");
    const vertices = [];
    const saida = [];
    const indice = (token) => {
        const n = parseInt(token, 10);
        if (!Number.isFinite(n) || n === 0) return -1;
        const i = n < 0 ? vertices.length / 3 + n : n - 1;
        return i >= 0 && i < vertices.length / 3 ? i : -1;
    };
    for (const bruta of texto.split(/\r?\n/)) {
        const linha = bruta.trim();
        if (linha.startsWith("v ") || linha.startsWith("v\t")) {
            const p = linha.slice(2).trim().split(/\s+/);
            vertices.push(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]));
        } else if (linha.startsWith("f ") || linha.startsWith("f\t")) {
            const ids = linha.slice(2).trim().split(/\s+/).map((t) => indice(t.split("/")[0]));
            if (ids.some((i) => i < 0)) continue;
            for (let k = 1; k + 1 < ids.length; k++) {
                for (const i of [ids[0], ids[k], ids[k + 1]]) saida.push(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);
            }
        }
    }
    if (!saida.length) throw new ErroLeitura("Esse OBJ não tem faces (só pontos ou linhas).");
    return new Float32Array(saida);
}

// ─── 3MF ─────────────────────────────────────────────────────────────────────

const filhos = (el, nome) => [...el.children].filter((c) => c.localName === nome);
const filho = (el, nome) => filhos(el, nome)[0] || null;
const atributoPath = (el) => el.getAttribute("p:path") || [...el.attributes].find((a) => a.localName === "path")?.value || null;
const normalizar = (p) => (p || "").replace(/\\/g, "/").replace(/^\/+/, "");

function matriz3MF(texto) {
    const m = new THREE.Matrix4();
    if (!texto) return m;
    const v = texto.trim().split(/\s+/).map(Number);
    if (v.length !== 12 || v.some((n) => !Number.isFinite(n))) return m;
    // 3MF: vetor-linha × matriz 4×3 (a última linha é a translação)
    m.set(v[0], v[3], v[6], v[9], v[1], v[4], v[7], v[10], v[2], v[5], v[8], v[11], 0, 0, 0, 1);
    return m;
}

async function ler3MF(buffer) {
    const { unzipSync, strFromU8 } = await import("three/addons/libs/fflate.module.js");
    let arquivos;
    try {
        arquivos = unzipSync(new Uint8Array(buffer), {
            filter: (f) => /\.model$/i.test(f.name) || /\.config$/i.test(f.name) || /\.rels$/i.test(f.name)
        });
    } catch {
        throw new ErroLeitura("Não conseguimos abrir esse 3MF. Ele pode estar corrompido; tente exportar de novo.");
    }
    const nomes = Object.keys(arquivos);
    const porCaminho = new Map(nomes.map((n) => [normalizar(n).toLowerCase(), n]));
    const texto = (caminho) => {
        const nome = porCaminho.get(normalizar(caminho).toLowerCase());
        return nome ? strFromU8(arquivos[nome]) : null;
    };
    const parser = new DOMParser();
    const xml = (t) => {
        const doc = parser.parseFromString(t, "application/xml");
        if (doc.getElementsByTagName("parsererror").length) throw new ErroLeitura("O conteúdo do 3MF está corrompido (XML inválido).");
        return doc;
    };

    // arquivo principal: indicado em _rels/.rels, senão o padrão
    let principal = "3D/3dmodel.model";
    const rels = texto("_rels/.rels");
    if (rels) {
        const alvo = [...xml(rels).getElementsByTagNameNS("*", "Relationship")]
            .find((r) => /3dmodel$/i.test(r.getAttribute("Type") || ""))?.getAttribute("Target");
        if (alvo && texto(alvo)) principal = normalizar(alvo);
    }
    if (!texto(principal)) {
        principal = normalizar(nomes.find((n) => /\.model$/i.test(n)) || "");
        if (!principal) throw new ErroLeitura("Esse 3MF não tem nenhum modelo 3D dentro (pode ser só um projeto do fatiador).");
    }

    // modificadores e volumes negativos (não fazem parte da peça impressa)
    const excluirObjetos = new Set();          // Bambu/Orca: ids de peças auxiliares
    const excluirFaixas = new Map();           // PrusaSlicer: id do objeto → [[primeiro, último], ...]
    const configBambu = texto("Metadata/model_settings.config");
    if (configBambu) {
        for (const parte of xml(configBambu).getElementsByTagNameNS("*", "part")) {
            const subtipo = parte.getAttribute("subtype") || [...parte.getElementsByTagNameNS("*", "metadata")].find((m) => m.getAttribute("key") === "subtype")?.getAttribute("value");
            if (subtipo && subtipo !== "normal_part") excluirObjetos.add(parte.getAttribute("id"));
        }
    }
    const configPrusa = texto("Metadata/Slic3r_PE_model.config") || texto("Metadata/Prusa_Slicer_model.config");
    if (configPrusa) {
        for (const obj of xml(configPrusa).getElementsByTagNameNS("*", "object")) {
            for (const vol of obj.getElementsByTagNameNS("*", "volume")) {
                const metas = [...vol.getElementsByTagNameNS("*", "metadata")];
                const tipo = metas.find((m) => m.getAttribute("key") === "volume_type")?.getAttribute("value");
                const modificador = metas.find((m) => m.getAttribute("key") === "modifier")?.getAttribute("value") === "1";
                if (modificador || (tipo && tipo !== "ModelPart")) {
                    const lista = excluirFaixas.get(obj.getAttribute("id")) || [];
                    lista.push([+vol.getAttribute("firstid"), +vol.getAttribute("lastid")]);
                    excluirFaixas.set(obj.getAttribute("id"), lista);
                }
            }
        }
    }

    // lê os objetos de cada arquivo .model (sob demanda)
    const modelos = new Map();
    const carregarModelo = (caminho) => {
        caminho = normalizar(caminho);
        if (modelos.has(caminho)) return modelos.get(caminho);
        const t = texto(caminho);
        if (!t) { modelos.set(caminho, null); return null; }
        const doc = xml(t);
        const raiz = doc.documentElement;
        const objetos = new Map();
        for (const obj of doc.getElementsByTagNameNS("*", "object")) objetos.set(obj.getAttribute("id"), obj);
        const info = { raiz, objetos, unidade: UNIDADES_3MF[raiz.getAttribute("unit")] ?? 1 };
        modelos.set(caminho, info);
        return info;
    };

    const partes = [];
    let total = 0;
    const v = new THREE.Vector3();

    const emitirMalha = (malha, objId, caminho, matriz) => {
        const els = filho(malha, "vertices");
        const tris = filho(malha, "triangles");
        if (!els || !tris) return;
        const vertEls = filhos(els, "vertex");
        const vert = new Float32Array(vertEls.length * 3);
        vertEls.forEach((el, i) => {
            vert[i * 3] = parseFloat(el.getAttribute("x"));
            vert[i * 3 + 1] = parseFloat(el.getAttribute("y"));
            vert[i * 3 + 2] = parseFloat(el.getAttribute("z"));
        });
        const faixas = caminho === principal ? excluirFaixas.get(objId) : null;
        const triEls = filhos(tris, "triangle");
        const saida = new Float32Array(triEls.length * 9);
        let n = 0;
        triEls.forEach((el, t) => {
            if (faixas && faixas.some(([a, b]) => t >= a && t <= b)) return;
            const ids = [+el.getAttribute("v1"), +el.getAttribute("v2"), +el.getAttribute("v3")];
            if (ids.some((i) => !(i >= 0 && i < vertEls.length))) return;
            for (let k = 0; k < 3; k++) {
                v.fromArray(vert, ids[k] * 3).applyMatrix4(matriz);
                saida[n++] = v.x; saida[n++] = v.y; saida[n++] = v.z;
            }
        });
        partes.push(saida.subarray(0, n));
        total += n;
    };

    const emitir = (caminho, objId, matriz, profundidade = 0) => {
        if (profundidade > 32) return; // evita referência circular
        const modelo = carregarModelo(caminho);
        const obj = modelo?.objetos.get(objId);
        if (!obj) return;
        if (caminho !== principal && excluirObjetos.has(objId)) return;
        if (obj.getAttribute("type") === "other") return;
        const malha = filho(obj, "mesh");
        if (malha) emitirMalha(malha, objId, caminho, matriz);
        const componentes = filho(obj, "components");
        if (componentes) {
            for (const c of filhos(componentes, "component")) {
                const destino = atributoPath(c) ? normalizar(atributoPath(c)) : caminho;
                if (caminho === principal && destino === principal && excluirObjetos.has(c.getAttribute("objectid"))) continue;
                emitir(destino, c.getAttribute("objectid"), matriz.clone().multiply(matriz3MF(c.getAttribute("transform"))), profundidade + 1);
            }
        }
    };

    const raiz = carregarModelo(principal);
    const itens = raiz.raiz.getElementsByTagNameNS("*", "item");
    if (itens.length) {
        for (const item of itens) {
            const destino = atributoPath(item) ? normalizar(atributoPath(item)) : principal;
            emitir(destino, item.getAttribute("objectid"), matriz3MF(item.getAttribute("transform")));
        }
    } else {
        // sem "build": mostra os objetos que não são componentes de outros
        const referenciados = new Set([...raiz.raiz.getElementsByTagNameNS("*", "component")].map((c) => c.getAttribute("objectid")));
        for (const id of raiz.objetos.keys()) if (!referenciados.has(id)) emitir(principal, id, new THREE.Matrix4());
    }

    if (!total) throw new ErroLeitura("Esse 3MF não tem nenhuma peça com malha 3D (pode ser só um projeto do fatiador ou usar um formato de malha que não suportamos).");
    const pos = new Float32Array(total);
    let off = 0;
    for (const p of partes) { pos.set(p, off); off += p.length; }
    const escala = raiz.unidade;
    if (escala !== 1) for (let i = 0; i < pos.length; i++) pos[i] *= escala;
    return pos;
}

// ─── Limpeza e montagem ──────────────────────────────────────────────────────

/** Remove triângulos com números inválidos ou sem área (atrapalham normais, pintura e BVH). */
function limparTriangulos(pos) {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < pos.length; i++) {
        const x = pos[i];
        if (Number.isFinite(x)) { if (x < min) min = x; if (x > max) max = x; }
    }
    const escala = Math.max(Math.abs(min), Math.abs(max), 1e-9);
    const areaMin = (escala * 1e-9) ** 2;
    const n = pos.length / 9;
    const saida = new Float32Array(pos.length);
    let m = 0;
    for (let t = 0; t < n; t++) {
        const o = t * 9;
        let valido = true;
        for (let k = 0; k < 9; k++) if (!Number.isFinite(pos[o + k])) { valido = false; break; }
        if (!valido) continue;
        const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
        const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
        const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
        if (cx * cx + cy * cy + cz * cz <= areaMin) continue;
        saida.set(pos.subarray(o, o + 9), m * 9);
        m++;
    }
    return { posicoes: saida.subarray(0, m * 9), removidos: n - m };
}

/**
 * Lê um arquivo 3D e devolve uma geometria não indexada (só posições), já limpa.
 * zParaCima: STL e 3MF usam Z para cima; o three.js usa Y.
 */
export async function lerArquivo3D(arquivo, limiteTriangulos) {
    const ext = arquivo.name.split(".").pop().toLowerCase();
    const buffer = await arquivo.arrayBuffer();
    let bruto;
    try {
        if (ext === "stl") bruto = lerSTL(buffer);
        else if (ext === "obj") bruto = lerOBJ(buffer);
        else if (ext === "3mf") bruto = await ler3MF(buffer);
        else throw new ErroLeitura("Formato não suportado. Envie um arquivo STL, OBJ ou 3MF.");
    } catch (erro) {
        if (erro instanceof ErroLeitura) throw erro;
        console.warn(`Falha ao ler ${arquivo.name}:`, erro);
        throw new ErroLeitura(`Não conseguimos ler esse ${ext.toUpperCase()}. Ele pode estar corrompido ou ter sido exportado de um jeito incomum; tente exportar de novo.`);
    }

    const { posicoes, removidos } = limparTriangulos(bruto);
    const triangulos = posicoes.length / 9;
    if (!triangulos) throw new ErroLeitura("Não encontramos nenhuma superfície válida nesse arquivo.");
    if (triangulos > limiteTriangulos) {
        throw new ErroLeitura(`O modelo tem ${triangulos.toLocaleString("pt-BR")} triângulos; o limite para visualizar no navegador é ${limiteTriangulos.toLocaleString("pt-BR")}. Envie uma versão simplificada.`);
    }
    if (removidos) console.info(`${arquivo.name}: ${removidos} triângulos inválidos ou sem área foram ignorados.`);

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posicoes), 3));
    return { geometria, zParaCima: ext !== "obj", removidos };
}
