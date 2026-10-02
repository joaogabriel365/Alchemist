// Exporta o modelo pintado pelo cliente, no tamanho escolhido (milímetros, Z para cima):
//  • 3MF com cores: cada cor vira um filamento. Leva a pintura em três formas, para cada
//    programa ler a sua: paint_color (Bambu Studio/OrcaSlicer), slic3rpe:mmu_segmentation
//    (PrusaSlicer) e o grupo de cores padrão do 3MF (Windows 3D Builder e outros);
//  • OBJ com a cor em cada vértice (o Bambu Studio pergunta como ligar cada cor a um filamento);
//  • STL: só a forma (o formato não guarda cores).

/** Código de pintura por filamento do Bambu/Prusa: 1 → "4", 2 → "8", 3 → "0C", 4 → "1C"… */
function codigoFilamento(f) {
    if (f === 1) return "4";
    if (f === 2) return "8";
    return `${(f - 3).toString(16).toUpperCase()}C`;
}

const num = (x) => {
    const r = Math.round(x * 10000) / 10000;
    return Object.is(r, -0) ? "0" : String(r);
};

/**
 * dados: { pos (Float32Array, 9 por triângulo, Y para cima), idx (vértice soldado de cada
 * canto), triCor (índice na paleta por triângulo), paleta (hex), nomes, mmPorUnidade, nome }
 */
export async function exportarModelo(formato, dados) {
    const { pos, triCor, paleta, nomes, mmPorUnidade: s } = dados;
    const n = pos.length / 9;

    // filamentos: a cor base é sempre o 1; as outras, na ordem da paleta, só as usadas
    const usada = new Uint8Array(paleta.length);
    for (let t = 0; t < n; t++) usada[triCor[t]] = 1;
    const filamentoDe = new Int32Array(paleta.length).fill(1);
    const filamentos = [{ numero: 1, hex: paleta[0], nome: nomes[0] || "Cor base" }];
    for (let i = 1; i < paleta.length; i++) {
        if (!usada[i]) continue;
        filamentoDe[i] = filamentos.length + 1;
        filamentos.push({ numero: filamentos.length + 1, hex: paleta[i], nome: nomes[i] || paleta[i] });
    }

    // Y para cima (three.js) → Z para cima (fatiadores), em milímetros
    const X = (o) => pos[o] * s, Y = (o) => -pos[o + 2] * s, Z = (o) => pos[o + 1] * s;

    if (formato === "stl") {
        const buf = new ArrayBuffer(84 + n * 50);
        const dv = new DataView(buf);
        const cab = "Alchemist 3D - modelo exportado (mm)";
        for (let i = 0; i < cab.length; i++) dv.setUint8(i, cab.charCodeAt(i));
        dv.setUint32(80, n, true);
        for (let t = 0; t < n; t++) {
            const o = t * 9, b = 84 + t * 50;
            const ax = X(o + 3) - X(o), ay = Y(o + 3) - Y(o), az = Z(o + 3) - Z(o);
            const bx = X(o + 6) - X(o), by = Y(o + 6) - Y(o), bz = Z(o + 6) - Z(o);
            let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
            const l = Math.hypot(nx, ny, nz) || 1;
            dv.setFloat32(b, nx / l, true); dv.setFloat32(b + 4, ny / l, true); dv.setFloat32(b + 8, nz / l, true);
            for (let k = 0; k < 3; k++) {
                const ok = o + k * 3;
                dv.setFloat32(b + 12 + k * 12, X(ok), true);
                dv.setFloat32(b + 16 + k * 12, Y(ok), true);
                dv.setFloat32(b + 20 + k * 12, Z(ok), true);
            }
        }
        return { blob: new Blob([buf], { type: "model/stl" }), extensao: "stl", filamentos };
    }

    if (formato === "obj") {
        const partes = [`# Alchemist 3D - modelo pintado (mm, Z para cima)\n# cor por vértice (r g b de 0 a 1)\n`];
        for (const f of filamentos) partes.push(`# filamento ${f.numero}: ${f.nome} ${f.hex}\n`);
        let linhas = [];
        const rgb = paleta.map((hex) => [1, 3, 5].map((i) => num(parseInt(hex.slice(i, i + 2), 16) / 255)).join(" "));
        for (let t = 0; t < n; t++) {
            const o = t * 9, c = rgb[triCor[t]];
            for (let k = 0; k < 3; k++) linhas.push(`v ${num(X(o + k * 3))} ${num(Y(o + k * 3))} ${num(Z(o + k * 3))} ${c}`);
            if (linhas.length > 30000) { partes.push(linhas.join("\n") + "\n"); linhas = []; }
        }
        if (linhas.length) partes.push(linhas.join("\n") + "\n");
        linhas = [];
        for (let t = 0; t < n; t++) {
            const v = t * 3 + 1;
            linhas.push(`f ${v} ${v + 1} ${v + 2}`);
            if (linhas.length > 30000) { partes.push(linhas.join("\n") + "\n"); linhas = []; }
        }
        if (linhas.length) partes.push(linhas.join("\n") + "\n");
        return { blob: new Blob(partes, { type: "model/obj" }), extensao: "obj", filamentos };
    }

    // 3MF: vértices soldados (cada canto aponta para um vértice único)
    const { idx } = dados;
    let nVert = 0;
    for (let i = 0; i < idx.length; i++) if (idx[i] + 1 > nVert) nVert = idx[i] + 1;
    const origem = new Int32Array(nVert).fill(-1);
    for (let i = 0; i < idx.length; i++) if (origem[idx[i]] === -1) origem[idx[i]] = i;

    const xml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const partes = [];
    partes.push(`<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06">
 <metadata name="Application">Alchemist 3D</metadata>
 <metadata name="Title">${xml(dados.nome || "Modelo pintado")}</metadata>
 <metadata name="Description">${xml(filamentos.map((f) => `Filamento ${f.numero}: ${f.nome} (${f.hex})`).join("; "))}</metadata>
 <resources>
  <m:colorgroup id="1">
${filamentos.map((f) => `   <m:color color="${f.hex.toUpperCase()}FF"/>`).join("\n")}
  </m:colorgroup>
  <object id="2" type="model" pid="1" pindex="0" name="${xml(dados.nome || "Modelo")}">
   <mesh>
    <vertices>
`);
    let linhas = [];
    const despejar = () => { if (linhas.length) { partes.push(linhas.join("\n") + "\n"); linhas = []; } };
    for (let v = 0; v < nVert; v++) {
        const o = origem[v] * 3;
        if (o < 0) { linhas.push(`     <vertex x="0" y="0" z="0"/>`); continue; }
        linhas.push(`     <vertex x="${num(X(o))}" y="${num(Y(o))}" z="${num(Z(o))}"/>`);
        if (linhas.length > 30000) despejar();
    }
    despejar();
    partes.push(`    </vertices>\n    <triangles>\n`);
    for (let t = 0; t < n; t++) {
        const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
        if (a === b || b === c || a === c) continue; // degenerado depois da solda
        const f = filamentoDe[triCor[t]];
        const pintura = f > 1 ? ` paint_color="${codigoFilamento(f)}" slic3rpe:mmu_segmentation="${codigoFilamento(f)}"` : "";
        linhas.push(`     <triangle v1="${a}" v2="${b}" v3="${c}" p1="${f - 1}"${pintura}/>`);
        if (linhas.length > 30000) despejar();
    }
    despejar();
    partes.push(`    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build>\n  <item objectid="2"/>\n </build>\n</model>\n`);

    const modelo = new Uint8Array(await new Blob(partes).arrayBuffer());
    const enc = new TextEncoder();
    const { zipSync } = await import("three/addons/libs/fflate.module.js");
    const zip = zipSync({
        "[Content_Types].xml": enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`),
        "_rels/.rels": enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`),
        "3D/3dmodel.model": modelo
    }, { level: 6 });
    return { blob: new Blob([zip], { type: "model/3mf" }), extensao: "3mf", filamentos };
}
