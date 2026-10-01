// Divisão automática do modelo do cliente em partes, para pintar cada uma separada.
//
// Um modelo costuma chegar como uma malha só, com tudo grudado (o cadarço "derretido" no
// sapato). Para separar as partes usamos o que a própria geometria mostra:
//  • grupos do arquivo (objetos, grupos e materiais do OBJ/3MF) são divisões rígidas;
//  • dobras côncavas (vales) marcam onde uma peça encosta na outra; dobras convexas pesam
//    pouco, porque costumam ser só a quina da própria peça (a ponta de um cilindro);
//  • as regiões são unidas da borda mais suave para a mais marcada, medindo a borda INTEIRA
//    (média ponderada pelo comprimento): um trecho liso isolado na dobra não faz a tinta vazar.
// A ordem das uniões fica gravada, então mudar o nível de divisão só repete as primeiras.
//
// Nada aqui depende do three.js: tudo trabalha com arrays tipados.

const PESO_CONVEXO = 0.25;
const RIGIDA = Infinity;      // aresta que nunca une (grupos diferentes, malha não manifold)
const GRAU = 180 / Math.PI;

// ─── Estrutura de pintura ────────────────────────────────────────────────────

/**
 * "Solda" vértices iguais (dentro de uma tolerância proporcional ao tamanho da peça),
 * para saber quais triângulos se tocam. Tabela de espalhamento com arrays tipados:
 * rápido e com pouca memória mesmo com milhões de vértices.
 */
function soldarVertices(pos) {
    const nVert = pos.length / 3;
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const diagonal = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const q = 1 / Math.max(diagonal * 1e-6, 1e-9);

    let tamanho = 1;
    while (tamanho < nVert * 2) tamanho <<= 1;
    const mascara = tamanho - 1;
    const tabela = new Int32Array(tamanho).fill(-1);
    const unicos = new Float64Array(nVert * 3); // coordenadas quantizadas de cada vértice único
    const idx = new Uint32Array(nVert);
    let total = 0;
    for (let v = 0; v < nVert; v++) {
        const qx = Math.round(pos[v * 3] * q), qy = Math.round(pos[v * 3 + 1] * q), qz = Math.round(pos[v * 3 + 2] * q);
        let h = (Math.imul(qx | 0, 73856093) ^ Math.imul(qy | 0, 19349663) ^ Math.imul(qz | 0, 83492791)) & mascara;
        for (;;) {
            const u = tabela[h];
            if (u === -1) {
                tabela[h] = total;
                unicos[total * 3] = qx; unicos[total * 3 + 1] = qy; unicos[total * 3 + 2] = qz;
                idx[v] = total++;
                break;
            }
            if (unicos[u * 3] === qx && unicos[u * 3 + 1] === qy && unicos[u * 3 + 2] === qz) { idx[v] = u; break; }
            h = (h + 1) & mascara;
        }
    }
    return { idx, nVert: total };
}

/**
 * Pré-calcula normais, centros, áreas e a vizinhança entre triângulos de uma geometria
 * não indexada. grupos (opcional): um número por triângulo vindo do arquivo; triângulos
 * de grupos diferentes nunca são pintados juntos pelas ferramentas de região.
 */
export function prepararPintura(pos, grupos = null) {
    const n = pos.length / 9;
    const { idx, nVert } = soldarVertices(pos);

    const contagem = new Uint32Array(nVert + 1);
    for (let i = 0; i < idx.length; i++) contagem[idx[i] + 1]++;
    for (let v = 0; v < nVert; v++) contagem[v + 1] += contagem[v];
    const inicioVert = contagem; // CSR: triângulos do vértice v em trisDoVert[inicioVert[v] .. inicioVert[v+1])
    const trisDoVert = new Uint32Array(idx.length);
    const cursor = inicioVert.slice(0, nVert);
    for (let t = 0; t < n; t++) {
        for (let k = 0; k < 3; k++) trisDoVert[cursor[idx[t * 3 + k]]++] = t;
    }

    const normais = new Float32Array(n * 3);
    const centros = new Float32Array(n * 3);
    const areas = new Float32Array(n);
    const recalcular = () => {
        for (let t = 0; t < n; t++) {
            const o = t * 9;
            const abx = pos[o + 3] - pos[o], aby = pos[o + 4] - pos[o + 1], abz = pos[o + 5] - pos[o + 2];
            const acx = pos[o + 6] - pos[o], acy = pos[o + 7] - pos[o + 1], acz = pos[o + 8] - pos[o + 2];
            let nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
            const len = Math.hypot(nx, ny, nz);
            areas[t] = len / 2;
            if (len > 0) { nx /= len; ny /= len; nz /= len; }
            normais[t * 3] = nx; normais[t * 3 + 1] = ny; normais[t * 3 + 2] = nz;
            centros[t * 3] = (pos[o] + pos[o + 3] + pos[o + 6]) / 3;
            centros[t * 3 + 1] = (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3;
            centros[t * 3 + 2] = (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3;
        }
    };
    recalcular();

    const g = grupos?.length === n ? grupos : null;
    return { n, idx, inicioVert, trisDoVert, normais, centros, areas, recalcular, grupos: g };
}

/**
 * Lista as arestas compartilhadas por dois triângulos, com a "força" da dobra em graus
 * (côncava = ângulo cheio, convexa = PESO_CONVEXO × ângulo) e o comprimento.
 * tri/lado guardam de onde tirar os dois vértices da aresta (para desenhar a divisão).
 */
export function calcularArestas(p, pos) {
    const { n, idx, inicioVert: ini, trisDoVert: tdv, normais: nrm, centros: cs, grupos } = p;
    let cap = Math.ceil(n * 1.6) + 16;
    let tA = new Uint32Array(cap), tB = new Uint32Array(cap), lado = new Uint8Array(cap);
    let comp = new Float32Array(cap), forca = new Float32Array(cap);
    let m = 0;
    const adicionar = (t, u, k, f, len) => {
        if (m === cap) {
            cap *= 2;
            const cresce = (a, T) => { const b = new T(cap); b.set(a); return b; };
            tA = cresce(tA, Uint32Array); tB = cresce(tB, Uint32Array); lado = cresce(lado, Uint8Array);
            comp = cresce(comp, Float32Array); forca = cresce(forca, Float32Array);
        }
        tA[m] = t; tB[m] = u; lado[m] = k; forca[m] = f; comp[m] = len; m++;
    };

    const vizinhos = [];
    for (let t = 0; t < n; t++) {
        for (let k = 0; k < 3; k++) {
            const va = idx[t * 3 + k], vb = idx[t * 3 + ((k + 1) % 3)];
            if (va === vb) continue;
            vizinhos.length = 0;
            let anterior = -1;
            for (let j = ini[va]; j < ini[va + 1]; j++) {
                const u = tdv[j];
                if (u === t || u === anterior) continue;
                anterior = u;
                if (idx[u * 3] === vb || idx[u * 3 + 1] === vb || idx[u * 3 + 2] === vb) vizinhos.push(u);
            }
            if (!vizinhos.length) continue; // borda aberta
            const o = t * 9 + k * 3, o2 = t * 9 + ((k + 1) % 3) * 3;
            const len = Math.hypot(pos[o2] - pos[o], pos[o2 + 1] - pos[o + 1], pos[o2 + 2] - pos[o + 2]);
            const manifold = vizinhos.length === 1;
            for (const u of vizinhos) {
                if (u < t) continue; // cada aresta uma vez só
                let f = RIGIDA;
                if (manifold && (!grupos || grupos[t] === grupos[u]) && (p.areas[t] === 0 || p.areas[u] === 0)) f = 0; // sem normal: não divide
                else if (manifold && (!grupos || grupos[t] === grupos[u])) {
                    const ax = nrm[t * 3], ay = nrm[t * 3 + 1], az = nrm[t * 3 + 2];
                    const bx = nrm[u * 3], by = nrm[u * 3 + 1], bz = nrm[u * 3 + 2];
                    const cos = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
                    const angulo = Math.acos(cos) * GRAU;
                    // côncava: as normais "se olham" (o centro do vizinho fica do lado para onde a normal aponta)
                    const dx = cs[u * 3] - cs[t * 3], dy = cs[u * 3 + 1] - cs[t * 3 + 1], dz = cs[u * 3 + 2] - cs[t * 3 + 2];
                    const concava = dx * (ax - bx) + dy * (ay - by) + dz * (az - bz) > 0;
                    f = concava ? angulo : angulo * PESO_CONVEXO;
                }
                adicionar(t, u, k, f, len);
            }
        }
    }
    return { m, tA, tB, lado, comp, forca };
}

// ─── União de conjuntos ──────────────────────────────────────────────────────

function novoConjunto(n) {
    const pai = new Int32Array(n);
    for (let i = 0; i < n; i++) pai[i] = i;
    return pai;
}

function raiz(pai, x) {
    while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; }
    return x;
}

function unir(pai, a, b) {
    a = raiz(pai, a); b = raiz(pai, b);
    if (a === b) return false;
    if (a < b) pai[b] = a; else pai[a] = b;
    return true;
}

/** Numera as raízes de 0 a k-1 e monta a lista de triângulos de cada grupo (formato CSR). */
function compactar(pai, n) {
    const id = new Int32Array(n).fill(-1);
    const rotulo = new Int32Array(n);
    let k = 0;
    for (let t = 0; t < n; t++) {
        const r = raiz(pai, t);
        if (id[r] === -1) id[r] = k++;
        rotulo[t] = id[r];
    }
    const inicio = new Uint32Array(k + 1);
    for (let t = 0; t < n; t++) inicio[rotulo[t] + 1]++;
    for (let i = 0; i < k; i++) inicio[i + 1] += inicio[i];
    const tris = new Uint32Array(n);
    const cursor = inicio.slice(0, k);
    for (let t = 0; t < n; t++) tris[cursor[rotulo[t]]++] = t;
    return { rotulo, total: k, inicio, tris, lista: (i) => tris.subarray(inicio[i], inicio[i + 1]) };
}

/** Peças soltas: triângulos ligados por aresta, sem atravessar grupos do arquivo. */
export function pecasSoltas(n, arestas) {
    const pai = novoConjunto(n);
    for (let e = 0; e < arestas.m; e++) if (arestas.forca[e] !== RIGIDA) unir(pai, arestas.tA[e], arestas.tB[e]);
    return compactar(pai, n);
}

// ─── Fila de prioridade (menor média primeiro) ───────────────────────────────

class Fila {
    constructor() { this.h = []; }
    get tamanho() { return this.h.length; }
    por(x) {
        const h = this.h;
        h.push(x);
        let i = h.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (h[p].m <= x.m) break;
            h[i] = h[p]; i = p;
        }
        h[i] = x;
    }
    tirar() {
        const h = this.h, topo = h[0], ultimo = h.pop();
        if (h.length) {
            let i = 0;
            for (;;) {
                const e = 2 * i + 1, d = e + 1;
                let menor = e;
                if (e >= h.length) break;
                if (d < h.length && h[d].m < h[e].m) menor = d;
                if (h[menor].m >= ultimo.m) break;
                h[i] = h[menor]; i = menor;
            }
            h[i] = ultimo;
        }
        return topo;
    }
}

// ─── Divisão hierárquica ─────────────────────────────────────────────────────

/**
 * Pré-calcula toda a sequência de uniões. Depois, cortar(T) devolve as partes cujas
 * bordas têm média de dobra acima de T graus.
 */
export function prepararDivisao(p, arestas) {
    const n = p.n, { m, tA, tB, comp, forca } = arestas;

    // 1) regiões iniciais: une as arestas praticamente lisas (ordenação por contagem, 0,25°)
    const BINS = 721;
    const contagem = new Uint32Array(BINS + 1);
    for (let e = 0; e < m; e++) if (forca[e] !== RIGIDA) contagem[Math.min(BINS - 1, Math.floor(forca[e] * 4)) + 1]++;
    for (let i = 0; i < BINS; i++) contagem[i + 1] += contagem[i];
    const ordem = new Uint32Array(contagem[BINS]);
    const cur = contagem.slice(0, BINS);
    for (let e = 0; e < m; e++) if (forca[e] !== RIGIDA) ordem[cur[Math.min(BINS - 1, Math.floor(forca[e] * 4))]++] = e;

    const LISO = 1, TETO = 6, MAX_REGIOES = 40000;
    const pai = novoConjunto(n);
    let regioes = n;
    for (let i = 0; i < ordem.length; i++) {
        const e = ordem[i], f = forca[e];
        if (f > TETO || (f > LISO && regioes <= MAX_REGIOES)) break;
        if (unir(pai, tA[e], tB[e])) regioes--;
    }
    const inicial = compactar(pai, n);
    const R = inicial.total, reg = inicial.rotulo;

    // 2) grafo de vizinhança entre regiões: comprimento e soma (força × comprimento) da borda
    const viz = Array.from({ length: R }, () => new Map());
    for (let e = 0; e < m; e++) {
        if (forca[e] === RIGIDA) continue;
        const a = reg[tA[e]], b = reg[tB[e]];
        if (a === b) continue;
        let rec = viz[a].get(b);
        if (!rec) { rec = { L: 0, S: 0, v: 0 }; viz[a].set(b, rec); viz[b].set(a, rec); }
        rec.L += comp[e];
        rec.S += comp[e] * forca[e];
    }

    // 3) une sempre o par com a borda mais suave. Regiões pequenas (rebarbas, degraus de malha
    //    serrilhada) pagam menos para se unir: o custo cai com a raiz da menor área.
    //    Cada registro tem versão para invalidar entradas velhas da fila; como as áreas só
    //    crescem, o custo só sobe, e basta reavaliar na hora de tirar da fila.
    let areaTotal = 0;
    for (let t = 0; t < n; t++) areaTotal += p.areas[t];
    const areaR = new Float64Array(R);
    for (let t = 0; t < n; t++) areaR[reg[t]] += p.areas[t];
    const areaRef = areaTotal * 0.004;
    const custo = (a, b, rec) => (rec.L > 0 ? rec.S / rec.L : 0) * Math.min(1, Math.sqrt(Math.min(areaR[a], areaR[b]) / areaRef));
    const fila = new Fila();
    for (let a = 0; a < R; a++) for (const [b, rec] of viz[a]) if (a < b) fila.por({ m: custo(a, b, rec), a, b, rec, v: rec.v });
    const vivo = new Uint8Array(R).fill(1);
    const unA = [], unB = [], unM = [];
    while (fila.tamanho) {
        const x = fila.tirar();
        if (!vivo[x.a] || !vivo[x.b] || x.rec.v !== x.v) continue;
        const atual = custo(x.a, x.b, x.rec);
        if (atual > x.m + 1e-9) { x.m = atual; fila.por(x); continue; }
        let a = x.a, b = x.b;
        if (viz[a].size < viz[b].size) [a, b] = [b, a]; // a menor lista entra na maior
        unA.push(a); unB.push(b); unM.push(x.m);
        vivo[b] = 0;
        areaR[a] += areaR[b];
        viz[a].delete(b);
        for (const [c, rec] of viz[b]) {
            if (c === a) continue;
            viz[c].delete(b);
            const existente = viz[a].get(c);
            let alvo = rec;
            if (existente) { existente.L += rec.L; existente.S += rec.S; alvo = existente; }
            else { viz[a].set(c, rec); viz[c].set(a, rec); }
            alvo.v++;
            fila.por({ m: custo(a, c, alvo), a, b: c, rec: alvo, v: alvo.v });
        }
        viz[b] = null;
    }

    return {
        n, R, reg, arestas, areaTotal, areas: p.areas,
        unA: Int32Array.from(unA), unB: Int32Array.from(unB), unM: Float32Array.from(unM)
    };
}

/**
 * Partes com bordas de dobra média acima de T graus. Partes minúsculas (rebarbas da
 * malha) são absorvidas pela vizinha com quem dividem a maior borda.
 */
export function cortar(div, T) {
    const { n, R, reg, unA, unB, unM, arestas, areas, areaTotal } = div;
    const paiR = novoConjunto(R);
    for (let i = 0; i < unM.length && unM[i] <= T; i++) unir(paiR, unA[i], unB[i]);

    const pai = new Int32Array(n);
    for (let t = 0; t < n; t++) pai[t] = raiz(paiR, reg[t]);
    // pai[t] aponta para uma região; transforma em um representante triângulo por região
    const rep = new Int32Array(R).fill(-1);
    for (let t = 0; t < n; t++) { const r = pai[t]; if (rep[r] === -1) rep[r] = t; pai[t] = rep[r]; }

    // rebarbas: área menor que 0,02% da peça
    const areaMin = areaTotal * 2e-4;
    const areaDe = new Float64Array(n);
    for (let t = 0; t < n; t++) areaDe[pai[t]] += areas[t];
    const { m, tA, tB, comp, forca } = arestas;
    const melhor = new Map(); // região pequena → { viz, L } da maior borda
    const bordas = new Map();
    for (let e = 0; e < m; e++) {
        if (forca[e] === RIGIDA) continue;
        const a = pai[tA[e]], b = pai[tB[e]];
        if (a === b) continue;
        for (const [x, y] of [[a, b], [b, a]]) {
            if (areaDe[x] >= areaMin) continue;
            const chave = x * n + y;
            const L = (bordas.get(chave) || 0) + comp[e];
            bordas.set(chave, L);
            const atual = melhor.get(x);
            if (!atual || L > atual.L) melhor.set(x, { viz: y, L });
        }
    }
    for (const [x, { viz }] of melhor) unir(pai, x, viz);
    return compactar(pai, n);
}

/** Índices das arestas que separam partes diferentes (para desenhar as divisões). */
export function arestasDeDivisao(arestas, rotulo) {
    const saida = [];
    for (let e = 0; e < arestas.m; e++) if (rotulo[arestas.tA[e]] !== rotulo[arestas.tB[e]]) saida.push(e);
    return saida;
}

/** Converte o controle "divisão" (0 = poucas partes, 100 = muitas) no limite em graus. */
export function limiteDaDivisao(d) {
    const f = Math.min(100, Math.max(0, d)) / 100;
    return 60 * Math.pow(4 / 60, f); // escala logarítmica: 60° … 4°
}
