// Prévia WebGL do configurador. Unidades da cena = centímetros.
// As peças são modeladas por código (sem arquivos externos) e normalizadas para
// medir 1 unidade na dimensão principal; depois são escaladas pelo tamanho escolhido.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Linhas de camada: faixas horizontais sutis calculadas pela altura no mundo.
// Mantemos ~60 linhas na altura da peça (a camada real de 0,2 mm seria densa demais para a tela).
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

function criarMaterial({ cor, material, acabamento }) {
    const pintado = acabamento === "Pintado à mão";
    const params = { color: new THREE.Color(cor) };
    const m = material === "ABS"
        ? new THREE.MeshPhysicalMaterial({ ...params, roughness: pintado ? 0.45 : 0.36, clearcoat: pintado ? 0.15 : 0.35, clearcoatRoughness: 0.35 })
        : new THREE.MeshStandardMaterial({ ...params, roughness: pintado ? 0.55 : 0.72 });
    m.envMapIntensity = 0.55;
    return aplicarLinhasDeCamada(m);
}

const metal = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.28 });

// ─── Modelos ──────────────────────────────────────────────────────────────────

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

function modeloChaveiro(mat, matDetalhe) {
    const g = new THREE.Group();
    // placa com cantos arredondados e furo para a argola
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

    // estrela em relevo na frente
    const geoEstrela = new THREE.ExtrudeGeometry(estrela(0.2, 0.09), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    geoEstrela.translate(0, 0.33, 0.055);
    g.add(new THREE.Mesh(geoEstrela, matDetalhe));

    // argola metálica passando pelo furo
    const argola = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 16, 48), metal);
    argola.position.set(0, h - 0.11 + 0.09, 0);
    argola.rotation.y = Math.PI / 2;
    g.add(argola);
    return g;
}

function modeloMiniatura(mat, pintado, corBase) {
    // pequeno "alquimista": base, manto, cabeça e chapéu de mago
    const g = new THREE.Group();
    const cores = pintado
        ? { base: 0x2b2f37, manto: corBase, pele: 0xf0d2ae, chapeu: corBase, faixa: 0xd4a24c }
        : null;
    const m = (hex) => (pintado ? aplicarLinhasDeCamada(mat.clone()) : mat);
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
    // vaso facetado e torcido, um clássico da impressão 3D
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
        // pintura em degradê: da cor escolhida (base) até um tom mais claro (topo)
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
        const pts = [
            [rRaiz, a0], [rExt, a0 + passo * 0.18], [rExt, a0 + passo * 0.48], [rRaiz, a0 + passo * 0.66]
        ];
        pts.forEach(([r, a], j) => {
            const p = [Math.cos(a) * r, Math.sin(a) * r];
            i === 0 && j === 0 ? forma.moveTo(...p) : forma.lineTo(...p);
        });
    }
    forma.closePath();
    const furo = new THREE.Path();
    furo.absarc(0, 0, 0.13, 0, Math.PI * 2, true);
    forma.holes.push(furo);
    // janelas de alívio de material
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const janela = new THREE.Path();
        janela.absarc(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.065, 0, Math.PI * 2, true);
        forma.holes.push(janela);
    }
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    const g = new THREE.Group().add(new THREE.Mesh(geo, mat));

    // cubo central (anel) um pouco mais alto
    const perfilCubo = [[0.13, 0], [0.2, 0], [0.2, 0.24], [0.13, 0.24], [0.13, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const cubo = new THREE.Mesh(new THREE.LatheGeometry(perfilCubo, 48), pintado ? metal : mat);
    g.add(cubo);
    return g;
}

function construirModelo(estado, material, materialDetalhe) {
    const pintado = estado.acabamento === "Pintado à mão";
    switch (estado.tipo) {
        case "miniatura": return modeloMiniatura(material, pintado, estado.cor);
        case "decoracao": return modeloVaso(material, pintado, estado.cor);
        case "tecnica": return modeloEngrenagem(material, pintado);
        default: return modeloChaveiro(material, materialDetalhe);
    }
}

// ─── Cena ─────────────────────────────────────────────────────────────────────

export async function criarViewer(root) {
    const canvas = root.querySelector("[data-cfg-canvas]");
    const viewerEl = root.querySelector("[data-cfg-viewer]");
    const medidaEl = root.querySelector("[data-cfg-measure]");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // sem tone mapping cinematográfico: ele desbota laranjas e vermelhos, e aqui a cor precisa ser fiel ao filamento
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
    controles.maxPolarAngle = Math.PI * 0.49;
    controles.autoRotate = !reduzirMovimento;
    controles.autoRotateSpeed = 1.4;
    let retomarGiro;
    controles.addEventListener("start", () => { controles.autoRotate = false; clearTimeout(retomarGiro); });
    controles.addEventListener("end", () => {
        if (reduzirMovimento) return;
        retomarGiro = setTimeout(() => { controles.autoRotate = true; }, 5000);
    });

    const luz = new THREE.DirectionalLight(0xffffff, 1.25);
    luz.castShadow = true;
    luz.shadow.mapSize.set(1024, 1024);
    luz.shadow.radius = 6;
    cena.add(luz, luz.target);
    cena.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1208, 0.35));

    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.32 }));
    sombra.rotation.x = -Math.PI / 2;
    sombra.receiveShadow = true;
    cena.add(sombra);

    let grade = null;
    let modelo = null;
    let linhaMedida = null;
    let material = null;
    let materialDetalhe = null;
    let chaveModelo = "";
    let tamanhoAtual = 0;
    let dimensoes = new THREE.Vector3(1, 1, 1);
    let entrada = 1; // animação de "surgir" ao trocar de modelo

    const refazerGrade = (cm) => {
        if (grade) { cena.remove(grade); grade.geometry.dispose(); grade.material.dispose(); }
        const lado = Math.max(6, Math.ceil(cm * 2.2 / 2) * 2);
        grade = new THREE.GridHelper(lado, lado, 0x3a4a63, 0x223047);
        grade.material.transparent = true;
        grade.material.opacity = 0.55;
        grade.position.y = 0.001;
        cena.add(grade);
        sombra.scale.set(lado, lado, 1);
    };

    const refazerMedida = (estado) => {
        if (linhaMedida) { cena.remove(linhaMedida); linhaMedida.geometry.dispose(); }
        const tecnica = estado.tipo === "tecnica";
        const t = tamanhoAtual * 0.06; // tamanho das marcações nas pontas
        let pontos;
        if (tecnica) {
            // diâmetro: linha horizontal na frente da peça
            const z = dimensoes.z / 2 + tamanhoAtual * 0.18, y = 0.02, x = dimensoes.x / 2;
            pontos = [[-x, y, z], [x, y, z], [-x, y, z - t], [-x, y, z + t], [x, y, z - t], [x, y, z + t]];
        } else {
            // altura: linha vertical ao lado da peça
            const x = -(dimensoes.x / 2 + tamanhoAtual * 0.16), h = dimensoes.y;
            pontos = [[x, 0, 0], [x, h, 0], [x - t, 0, 0], [x + t, 0, 0], [x - t, h, 0], [x + t, h, 0]];
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pontos.map((p) => new THREE.Vector3(...p)));
        linhaMedida = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xf47a20 }));
        // LineSegments liga pares: (0-1) linha principal, (2-3) e (4-5) marcações
        cena.add(linhaMedida);
        medidaEl.textContent = `${tamanhoAtual} cm`;
        medidaEl.hidden = false;
    };

    const enquadrar = (estado) => {
        const tecnica = estado.tipo === "tecnica";
        const alvoY = tecnica ? dimensoes.y * 0.5 : dimensoes.y * 0.46;
        const dist = Math.max(dimensoes.x, dimensoes.y, dimensoes.z) * 2.9;
        const direcao = camera.position.clone().sub(controles.target);
        if (direcao.lengthSq() < 1e-6) direcao.set(1, tecnica ? 1.1 : 0.45, 1.6);
        direcao.normalize();
        if (tecnica && direcao.y < 0.5) { direcao.y = 0.75; direcao.normalize(); }
        controles.target.set(0, alvoY, 0);
        camera.position.copy(controles.target).addScaledVector(direcao, dist);
        controles.minDistance = dist * 0.45;
        controles.maxDistance = dist * 2.2;
        camera.near = dist / 100;
        camera.far = dist * 20;
        camera.updateProjectionMatrix();

        luz.position.set(dist * 0.6, dist * 1.2, dist * 0.8);
        luz.target.position.set(0, 0, 0);
        const s = luz.shadow.camera;
        const alcance = Math.max(dimensoes.x, dimensoes.z, dimensoes.y) * 1.4;
        s.left = -alcance; s.right = alcance; s.top = alcance; s.bottom = -alcance;
        s.near = 0.1; s.far = dist * 4;
        s.updateProjectionMatrix();
    };

    const atualizar = (estado) => {
        const chave = `${estado.tipo}|${estado.acabamento}|${estado.material}|${estado.cor}`;
        const trocouForma = !modelo || !chaveModelo.startsWith(`${estado.tipo}|${estado.acabamento}`);

        if (chave !== chaveModelo) {
            if (modelo) {
                cena.remove(modelo);
                modelo.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== metal) o.material.dispose(); } });
            }
            material = criarMaterial(estado);
            materialDetalhe = estado.acabamento === "Pintado à mão"
                ? aplicarLinhasDeCamada(new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 0.5 }))
                : material;
            uniformsCamada.uForca.value = estado.acabamento === "Pintado à mão" ? 0.035 : estado.material === "ABS" ? 0.06 : 0.09;

            modelo = construirModelo(estado, material, materialDetalhe);
            modelo.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

            // normaliza: dimensão principal = 1, base apoiada no chão e centralizada
            const caixa = new THREE.Box3().setFromObject(modelo);
            const tam = caixa.getSize(new THREE.Vector3());
            const principal = estado.tipo === "tecnica" ? Math.max(tam.x, tam.z) : tam.y;
            const miolo = caixa.getCenter(new THREE.Vector3());
            const pivo = new THREE.Group();
            modelo.position.set(-miolo.x, -caixa.min.y, -miolo.z);
            pivo.add(modelo);
            pivo.userData.base = 1 / principal;
            modelo = pivo;
            cena.add(modelo);
            chaveModelo = chave;
            tamanhoAtual = 0; // força reescala abaixo
            if (trocouForma && !reduzirMovimento) entrada = 0;
        }

        if (estado.tamanho !== tamanhoAtual) {
            tamanhoAtual = estado.tamanho;
            modelo.scale.setScalar(modelo.userData.base * tamanhoAtual);
            modelo.updateMatrixWorld(true);
            dimensoes = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
            uniformsCamada.uFreq.value = 60 / Math.max(dimensoes.y, 0.5);
            refazerGrade(tamanhoAtual);
            refazerMedida(estado);
            enquadrar(estado);
        }
    };

    // redimensiona o canvas junto com o card
    const redimensionar = () => {
        const { width, height } = viewerEl.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(redimensionar).observe(viewerEl);
    redimensionar();

    // só renderiza quando a seção está visível (economiza bateria)
    let visivel = true;
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(viewerEl);

    const projetado = new THREE.Vector3();
    const relogio = new THREE.Clock();
    renderer.setAnimationLoop(() => {
        if (!visivel || document.hidden) return;
        const dt = Math.min(relogio.getDelta(), 0.05);
        if (entrada < 1 && modelo) {
            entrada = Math.min(1, entrada + dt * 3.2);
            const k = 1 - Math.pow(1 - entrada, 3);
            modelo.scale.setScalar(modelo.userData.base * tamanhoAtual * (0.82 + 0.18 * k));
            modelo.rotation.y = (1 - k) * -0.6;
        }
        controles.update();
        renderer.render(cena, camera);

        // rótulo "X cm" acompanha o meio da régua na tela
        if (linhaMedida) {
            const p = linhaMedida.geometry.attributes.position;
            projetado.set((p.getX(0) + p.getX(1)) / 2, (p.getY(0) + p.getY(1)) / 2, (p.getZ(0) + p.getZ(1)) / 2).project(camera);
            medidaEl.style.transform = `translate(${(projetado.x * 0.5 + 0.5) * viewerEl.clientWidth}px, ${(-projetado.y * 0.5 + 0.5) * viewerEl.clientHeight}px) translate(-50%, -50%)`;
        }
    });

    return { atualizar };
}
