const PRODUCTS = [
    {
        id: "keychain-01",
        name: "Chaveiro 01",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K01",
        description: "Chaveiro impresso em 3D com leitura marcante, formato compacto e acabamento limpo para uso diario ou colecao.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 01.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro01.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-02",
        name: "Chaveiro 02",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K02",
        description: "Modelo de chaveiro com presenca visual forte, pensado para destacar detalhes da impressao e acabamento tecnico.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 02.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro02.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-03",
        name: "Chaveiro 03",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K03",
        description: "Chaveiro exclusivo com proposta visual autoral e proporcao equilibrada para presente, colecao ou uso diario.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 03.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro03.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-04",
        name: "Chaveiro 04",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K04",
        description: "Peca compacta com identidade geek e acabamento controlado, desenvolvida para manter boa leitura visual em pequena escala.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 04.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro04.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-05",
        name: "Chaveiro 05",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K05",
        description: "Modelo de chaveiro com foco em silhueta limpa, presenca visual e boa resistencia para acompanhar o dia a dia.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 05.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro05.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-06",
        name: "Chaveiro 06",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K06",
        description: "Chaveiro 3D com linguagem visual forte e acabamento limpo, pensado para funcionar bem em colecoes e kits personalizados.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 06.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro06.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-07",
        name: "Chaveiro 07",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K07",
        description: "Peca impressa em 3D com visual autoral e boa presenca para compor uma linha de chaveiros com identidade consistente.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 07.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro07.jfif",
                position: "center center"
            }
        ]
    },
    {
        id: "keychain-08",
        name: "Chaveiro 08",
        category: "Chaveiros",
        price: 0,
        priceLabel: "Sob consulta",
        material: "PLA",
        size: "Sob demanda",
        shape: "K08",
        description: "Chaveiro com acabamento tecnico e proposta visual compacta, ideal para ampliar a vitrine da linha de pecas da loja.",
        accent: "Chaveiro",
        images: [
            {
                src: "assets/chaveiros/chaveiro 08.jfif",
                position: "center center",
                catalogScale: 1.16,
                catalogPadding: "8px"
            },
            {
                src: "assets/chaveiros/chaveiro08.jfif",
                position: "center center",
                catalogScale: 1.12,
                catalogPadding: "8px"
            }
        ]
    },
    {
        id: "hex-core",
        name: "Buster Sword",
        category: "Projetos Feitos",
        price: 0,
        material: "PLA",
        size: "Sob demanda",
        shape: "BUSTER",
        description: "Replica impressa em 3D com acabamento inspirado no universo de Final Fantasy e foco em presenca visual.",
        accent: "Projeto feito",
        images: [
            {
                src: "assets/projects/Buster-Sword-The-Price-of-Freedom-01.jpg",
                position: "center 58%",
                catalogScale: 1.24,
                catalogPadding: "4px",
                catalogBackdropScale: 1.24
            },
            {
                src: "assets/projects/Buster-Sword-The-Price-of-Freedom-02.jpg",
                position: "center 52%",
                catalogScale: 1.18,
                catalogPadding: "6px",
                catalogBackdropScale: 1.22
            }
        ]
    },
    {
        id: "mecha-forge",
        name: "Yoko Kitsune",
        category: "Projetos Feitos",
        price: 0,
        material: "ABS",
        size: "Sob demanda",
        shape: "YOKO",
        description: "Projeto artistico com forte leitura de personagem, detalhes de roupa e acabamento para exibicao.",
        accent: "Projeto feito",
        images: [
            {
                src: "assets/projects/Yoko-Kitsune-01.jpg",
                position: "center 42%",
                catalogScale: 1.18,
                catalogPadding: "6px",
                catalogBackdropScale: 1.22
            },
            {
                src: "assets/projects/Yoko-Kitsune-02.jpg",
                position: "center 44%",
                catalogScale: 1.18,
                catalogPadding: "6px",
                catalogBackdropScale: 1.22
            }
        ]
    },
    {
        id: "dock-grid",
        name: "Yuta Okkotsu",
        category: "Projetos Feitos",
        price: 0,
        material: "PLA",
        size: "Sob demanda",
        shape: "YUTA",
        description: "Personagem produzido em 3D com composicao dramatica, volumetria forte e acabamento para colecionador.",
        accent: "Projeto feito",
        images: [
            {
                src: "assets/projects/Yuta-Okkotsu-_-Rika-01.jpg",
                position: "center 34%",
                catalogScale: 1.16,
                catalogPadding: "5px",
                catalogBackdropScale: 1.22
            },
            {
                src: "assets/projects/Yuta-Okkotsu-_-Rika-02.jpg",
                position: "center 34%",
                catalogScale: 1.16,
                catalogPadding: "5px",
                catalogBackdropScale: 1.22
            }
        ]
    },
    {
        id: "voxel-vase",
        name: "Vaso Voxel Prism",
        category: "Decoracao",
        price: 119.9,
        material: "PLA",
        size: "24 cm",
        shape: "VASE",
        description: "Peca decorativa com volume facetado e textura inspirada em geometrias 3D.",
        accent: "Decor"
    },
    {
        id: "custom-lab",
        name: "Projeto Custom Lab",
        category: "Personalizados",
        price: 199.9,
        material: "PLA / ABS",
        size: "Sob medida",
        shape: "LAB",
        description: "Servico de modelagem e producao para pecas exclusivas com briefing personalizado.",
        accent: "Sob demanda"
    },
    {
        id: "cyber-mask",
        name: "Mascara Cyber Relic",
        category: "Geek",
        price: 229.9,
        material: "ABS",
        size: "28 cm",
        shape: "MASK",
        description: "Mascara cenografica com visual futurista e acabamento de laboratorio industrial.",
        accent: "Edicao limitada"
    }
];

const NAV_LINKS = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "products.html", label: "Produtos", key: "products" },
    { href: "products.html#categories", label: "Categorias", key: "categories" },
    { href: "custom.html", label: "Personalizados", key: "custom" },
    { href: "about.html", label: "Sobre", key: "about" },
    { href: "contact.html", label: "Contato", key: "contact" }
];

const PROJECT_SHOWCASE_INTERVAL = 3600;

const pageKey = document.body.dataset.page || "home";

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);
}

function getHomeKeychainProducts() {
    return PRODUCTS.filter((product) => product.category === "Chaveiros").slice(0, 8);
}

function isKeychainProduct(product) {
    return product.category === "Chaveiros";
}

function injectHeader() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    header.innerHTML = `
        <nav class="nav-shell" aria-label="Principal">
            <a class="brand-wordmark" href="index.html" aria-label="ALCHEMIST 3D home">
                ALCHEMIST 3D
            </a>
            <div class="nav-links" data-nav-links>
                ${NAV_LINKS.map((link) => `<a href="${link.href}" class="${pageKey === link.key ? "active" : ""}">${link.label}</a>`).join("")}
            </div>
            <div class="nav-actions">
                <a class="button button-secondary" href="auth.html">Login / Cadastro</a>
                <a class="cart-shell cart-button" href="cart.html" aria-label="Carrinho">
                    <span aria-hidden="true">🛒</span>
                    <span class="cart-count" data-cart-count>2</span>
                </a>
                <button class="menu-button" type="button" aria-label="Abrir menu" data-menu-button>☰</button>
            </div>
        </nav>
    `;

    const menuButton = header.querySelector("[data-menu-button]");
    const navLinks = header.querySelector("[data-nav-links]");

    if (menuButton && navLinks) {
        menuButton.addEventListener("click", () => {
            navLinks.classList.toggle("mobile-open");
            document.body.classList.toggle("menu-open");
        });
    }
}

function injectFooter() {
    const footer = document.querySelector("[data-footer]");
    if (!footer) return;

    footer.innerHTML = `
        <div class="footer-shell">
            <div class="footer-top footer-grid">
                <section class="footer-column footer-intro">
                    <h3 class="footer-title">ALCHEMIST 3D</h3>
                    <p class="footer-copy">Loja de impressao 3D com foco em chaveiros, personagens, itens geek, decoracao e projetos personalizados sob demanda.</p>
                    <p class="footer-copy">Transformamos conceito em peca final com linguagem visual industrial, acabamento limpo e producao orientada por detalhe.</p>
                    <div class="footer-contact-buttons">
                        <a class="footer-action footer-action-whatsapp" href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                            <img class="footer-action-icon" src="assets/icons/whatsapp.png" alt="" loading="lazy" decoding="async">
                        </a>
                        <a class="footer-action footer-action-instagram" href="https://instagram.com/alchemist_3.d" target="_blank" rel="noreferrer" aria-label="Instagram">
                            <img class="footer-action-icon" src="assets/icons/instagram.png" alt="" loading="lazy" decoding="async">
                        </a>
                        <a class="footer-action footer-action-gmail" href="https://mail.google.com/mail/?view=cm&fs=1&to=contato.alchemist3d@gmail.com" target="_blank" rel="noreferrer" aria-label="Gmail">
                            <img class="footer-action-icon" src="assets/icons/gmail.png" alt="" loading="lazy" decoding="async">
                        </a>
                    </div>
                </section>

                <nav class="footer-column" aria-label="Links rapidos">
                    <h3 class="footer-title">Navegacao</h3>
                    <div class="footer-links footer-links-column">
                        ${NAV_LINKS.map((link) => `<a class="footer-link" href="${link.href}">${link.label}</a>`).join("")}
                    </div>
                </nav>

                <section class="footer-column">
                    <h3 class="footer-title">Categorias</h3>
                    <div class="footer-links footer-links-column">
                        <a class="footer-link" href="products.html#categories">Chaveiros</a>
                        <a class="footer-link" href="products.html#categories">Personagens</a>
                        <a class="footer-link" href="products.html#categories">Geek</a>
                        <a class="footer-link" href="products.html#categories">Decoracao</a>
                        <a class="footer-link" href="custom.html">Personalizados</a>
                    </div>
                </section>

                <section class="footer-column">
                    <h3 class="footer-title">Atendimento</h3>
                    <div class="footer-info-list">
                        <p class="footer-copy"><strong>Horario:</strong> Seg a Sex, 9h as 18h</p>
                        <p class="footer-copy"><strong>Orcamentos:</strong> resposta media em ate 48h</p>
                        <p class="footer-copy"><strong>Materiais:</strong> PLA, ABS e producao sob demanda</p>
                        <p class="footer-copy"><strong>Email:</strong> contato.alchemist3d@gmail.com</p>
                    </div>
                </section>
            </div>
            <div class="footer-bottom">
                <p class="footer-copy">Atalhos diretos para atendimento, redes sociais e contato comercial em um unico lugar.</p>
                <p class="footer-copy">© 2026 ALCHEMIST 3D. Todos os direitos reservados.</p>
            </div>
        </div>
    `;
}

function renderProjectSlides(images, productName) {
    return images.map((image, index) => {
        const source = typeof image === "string" ? image : image.src;
        const position = typeof image === "string" ? "center center" : (image.position || "center center");
        return `
            <img
                class="project-slide ${index === 0 ? "is-active" : ""}"
                src="${source}"
                alt="${productName} - imagem ${index + 1}"
                loading="lazy"
                style="object-position: ${position};"
            >
        `;
    }).join("");
}

function renderCatalogSlides(images, productName) {
    return images.map((image, index) => {
        const source = typeof image === "string" ? image : image.src;
        const position = typeof image === "string" ? "center center" : (image.position || "center center");
        const catalogScale = typeof image === "string" ? 1 : (image.catalogScale || 1);
        const catalogPadding = typeof image === "string" ? "12px" : (image.catalogPadding || "12px");
        const catalogBackdropScale = typeof image === "string" ? 1.18 : (image.catalogBackdropScale || 1.18);

        return `
            <div
                class="project-slide project-slide-frame ${index === 0 ? "is-active" : ""}"
                style="--catalog-slide-scale: ${catalogScale}; --catalog-slide-padding: ${catalogPadding}; --catalog-backdrop-scale: ${catalogBackdropScale};"
            >
                <div class="catalog-slide-backdrop" style="background-image: url('${source}'); background-position: ${position};"></div>
                <img
                    class="catalog-slide-image"
                    src="${source}"
                    alt="${productName} - imagem ${index + 1}"
                    loading="lazy"
                    style="object-position: ${position};"
                >
            </div>
        `;
    }).join("");
}

function initProjectShowcases() {
    const showcases = document.querySelectorAll("[data-project-showcase]");
    if (!showcases.length) return;

    const syncedShowcases = Array.from(showcases).map((showcase) => ({
        node: showcase,
        slides: Array.from(showcase.querySelectorAll(".project-slide")),
        activeIndex: 0
    })).filter((entry) => entry.slides.length > 1);

    syncedShowcases.forEach((entry) => {
        entry.slides.forEach((slide, index) => {
            slide.classList.toggle("is-active", index === 0);
        });
    });

    if (window.__alchemistProjectShowcaseTimer) {
        window.clearInterval(window.__alchemistProjectShowcaseTimer);
    }

    if (!syncedShowcases.length) return;

    window.__alchemistProjectShowcaseTimer = window.setInterval(() => {
        syncedShowcases.forEach((entry) => {
            entry.activeIndex = (entry.activeIndex + 1) % entry.slides.length;
            entry.slides.forEach((slide, index) => {
                slide.classList.toggle("is-active", index === entry.activeIndex);
            });
        });
    }, PROJECT_SHOWCASE_INTERVAL);
}

function buildProjectStatusTag(product) {
    if (product.priceLabel) {
        return product.priceLabel;
    }

    return product.price > 0 ? formatCurrency(product.price) : "Projeto realizado";
}

function buildHomeKeychainCard(product) {
    return `
        <a class="gallery-item keychain-card reveal" href="product.html?id=${product.id}" aria-label="Abrir detalhes de ${product.name}">
            <div class="keychain-card-media keychain-showcase product-showcase" data-project-showcase>
                ${renderProjectSlides(product.images, product.name)}
                <div class="project-showcase-overlay"></div>
            </div>
            <div class="keychain-card-footer">
                <div class="keychain-card-copy">
                    <h3 class="keychain-card-title">${product.name}</h3>
                    <p class="keychain-card-subtitle">Clique para ver detalhes</p>
                </div>
                <div class="keychain-card-arrow" aria-hidden="true">↗</div>
            </div>
        </a>
    `;
}

function renderHomeKeychains() {
    const container = document.querySelector("[data-home-keychains]");
    if (!container) return;

    container.innerHTML = getHomeKeychainProducts().map(buildHomeKeychainCard).join("");
}

function buildCatalogMedia(product) {
    if (product.images?.length) {
        return `
            <div class="catalog-media product-showcase ${isKeychainProduct(product) ? "keychain-showcase" : ""}" data-project-showcase>
                ${renderCatalogSlides(product.images, product.name)}
                <div class="project-showcase-overlay"></div>
                <span class="project-showcase-label">${product.name}</span>
            </div>
        `;
    }

    return `<div class="catalog-media" data-shape="${product.shape}"></div>`;
}

function buildDetailMedia(product) {
    if (product.images?.length) {
        return `
            <div class="detail-media product-showcase detail-showcase reveal" data-project-showcase data-detail-media>
                ${renderProjectSlides(product.images, product.name)}
                <div class="project-showcase-overlay"></div>
                <span class="project-showcase-label">${product.name}</span>
            </div>
        `;
    }

    return `<div class="detail-media reveal" data-shape="${product.shape}" data-detail-media></div>`;
}

function renderFeaturedProducts() {
    const container = document.querySelector("[data-featured-products]");
    if (!container) return;

    const featuredProjects = PRODUCTS.filter((product) => product.category === "Projetos Feitos").slice(0, 3);

    container.innerHTML = featuredProjects.map((product) => `
        <article class="product-card reveal">
            <div class="product-media product-showcase featured-project-showcase" data-project-showcase>
                ${renderProjectSlides(product.images, product.name)}
                <div class="project-showcase-overlay"></div>
                <span class="project-showcase-label">${product.name}</span>
            </div>
            <div class="product-content">
                <span class="badge">${product.accent}</span>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="product-meta">
                    <span class="price-tag">Projeto realizado</span>
                    <a class="button button-primary" href="product.html?id=${product.id}">Ver Produto</a>
                </div>
            </div>
        </article>
    `).join("");
}

function buildCatalogCard(product) {
    return `
        <article class="catalog-card reveal">
            ${buildCatalogMedia(product)}
            <div class="catalog-content">
                <div class="product-meta">
                    <span class="badge">${product.category}</span>
                    <span class="price-tag">${buildProjectStatusTag(product)}</span>
                </div>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="catalog-meta">
                    <span>${product.material}</span>
                    <span>${product.size}</span>
                </div>
                <a class="button button-primary" href="product.html?id=${product.id}">Abrir detalhe</a>
            </div>
        </article>
    `;
}

const CATALOG_GROUP_ORDER = [
    "Projetos Feitos",
    "Chaveiros",
    "Personagens",
    "Geek",
    "Decoracao",
    "Personalizados"
];

function buildCatalogGroup(category, products) {
    return `
        <section class="catalog-group reveal">
            <div class="catalog-group-header">
                <h2>${category}</h2>
                <span class="catalog-group-count">${products.length} item${products.length === 1 ? "" : "s"}</span>
            </div>
            <div class="product-grid catalog-group-grid">
                ${products.map(buildCatalogCard).join("")}
            </div>
        </section>
    `;
}

function renderCatalogPage() {
    const grid = document.querySelector("[data-products-grid]");
    if (!grid) return;

    const searchInput = document.querySelector("[data-product-search]");
    const categoryInputs = Array.from(document.querySelectorAll("[data-filter-category]"));
    const priceButtons = Array.from(document.querySelectorAll("[data-price-filter]"));
    const countNode = document.querySelector("[data-results-count]");
    let activePriceFilter = priceButtons.find((button) => button.classList.contains("active"))?.dataset.priceFilter || "all";

    const matchesPriceFilter = (product, priceFilter) => {
        const hasExplicitPriceLabel = Boolean(product.priceLabel);

        switch (priceFilter) {
            case "projects":
                return product.price === 0 && !hasExplicitPriceLabel;
            case "up-to-150":
                return !hasExplicitPriceLabel && product.price > 0 && product.price <= 150;
            case "150-to-220":
                return !hasExplicitPriceLabel && product.price > 150 && product.price <= 220;
            case "220-plus":
                return !hasExplicitPriceLabel && product.price > 220;
            case "all":
            default:
                return true;
        }
    };

    const setActivePriceFilter = (button) => {
        activePriceFilter = button.dataset.priceFilter || "all";

        priceButtons.forEach((chip) => {
            const isActive = chip === button;
            chip.classList.toggle("active", isActive);
            chip.setAttribute("aria-pressed", String(isActive));
        });

        filterProducts();
    };

    const filterProducts = () => {
        const query = (searchInput?.value || "").trim().toLowerCase();
        const selectedCategories = categoryInputs.filter((input) => input.checked).map((input) => input.value);
        const priceFilter = activePriceFilter;

        const filtered = PRODUCTS.filter((product) => {
            const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
            const matchesCategory = !selectedCategories.length || selectedCategories.includes(product.category);
            const matchesPrice = matchesPriceFilter(product, priceFilter);

            return matchesQuery && matchesCategory && matchesPrice;
        });

        const shouldGroupByCategory = !selectedCategories.length && priceFilter === "all";

        const groupedMarkup = CATALOG_GROUP_ORDER.map((category) => {
            const productsInCategory = filtered.filter((product) => product.category === category);
            if (!productsInCategory.length) {
                return "";
            }

            return buildCatalogGroup(category, productsInCategory);
        }).join("");

        grid.classList.toggle("grouped-results", shouldGroupByCategory && Boolean(filtered.length));

        grid.innerHTML = (shouldGroupByCategory ? groupedMarkup : filtered.map(buildCatalogCard).join("")) || `
            <div class="empty-state">
                <strong>Nenhum produto encontrado</strong>
                <p>Tente ajustar a busca ou remover alguns filtros para ver mais resultados.</p>
            </div>
        `;

        if (countNode) {
            countNode.textContent = `${filtered.length} produto${filtered.length === 1 ? "" : "s"} encontrado${filtered.length === 1 ? "" : "s"}`;
        }

        initProjectShowcases();
        initRevealAnimations();
    };

    searchInput?.addEventListener("input", filterProducts);
    priceButtons.forEach((button) => {
        button.addEventListener("click", () => setActivePriceFilter(button));
    });
    categoryInputs.forEach((input) => input.addEventListener("change", filterProducts));
    filterProducts();
}

function renderProductDetail() {
    const container = document.querySelector("[data-product-detail]");
    if (!container) return;

    const productId = new URLSearchParams(window.location.search).get("id");
    const product = PRODUCTS.find((item) => item.id === productId) || PRODUCTS[0];

    document.title = `${product.name} | ALCHEMIST 3D`;
    container.innerHTML = `
        ${buildDetailMedia(product)}
        <div class="detail-panel reveal">
            <span class="eyebrow">DETALHE DO PRODUTO</span>
            <h1>${product.name}</h1>
            <p>${product.description} O design combina estetica futurista, producao sob demanda e acabamento alinhado ao DNA industrial da marca.</p>
            <div class="detail-meta">
                <span class="price-tag">${buildProjectStatusTag(product)}</span>
                <span class="badge">${product.category}</span>
            </div>
            <div class="rating-row">
                <span class="stars">★★★★★</span>
                <span>4.9 de 5 com base em 128 avaliacoes</span>
            </div>
            <ul class="detail-list">
                <li><strong>Material:</strong> ${product.material}</li>
                <li><strong>Tamanho:</strong> ${product.size}</li>
                <li><strong>Acabamento:</strong> Fosco tecnico com detalhes de textura controlada</li>
                <li><strong>Producao:</strong> Sob demanda com prazo medio de 4 a 7 dias uteis</li>
            </ul>
            <a class="button button-primary" href="cart.html" data-add-cart>Adicionar ao carrinho</a>
            <a class="link-inline" href="custom.html">Precisa desse modelo em outra escala ou cor? Solicite personalizacao.</a>
        </div>
    `;
    initProjectShowcases();
}

function initHeroSlider() {
    const slider = document.querySelector("[data-hero-slider]");
    const dotsContainer = document.querySelector("[data-hero-dots]");
    if (!slider || !dotsContainer) return;

    const slides = Array.from(slider.querySelectorAll(".hero-slide"));
    let activeIndex = 0;

    function updateSlides(index) {
        activeIndex = index;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("active", slideIndex === activeIndex);
        });
        Array.from(dotsContainer.children).forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === activeIndex);
        });
    }

    dotsContainer.innerHTML = slides.map((_, index) => `<button class="hero-dot ${index === 0 ? "active" : ""}" type="button" aria-label="Ir para slide ${index + 1}"></button>`).join("");
    Array.from(dotsContainer.children).forEach((dot, index) => {
        dot.addEventListener("click", () => updateSlides(index));
    });

    window.setInterval(() => {
        updateSlides((activeIndex + 1) % slides.length);
    }, 8000);
}

function initRevealAnimations() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    items.forEach((item) => observer.observe(item));
}

function initBackToTop() {
    const button = document.querySelector("[data-back-to-top]");
    if (!button) return;

    const toggleVisibility = () => {
        button.classList.toggle("visible", window.scrollY > 360);
    };

    window.addEventListener("scroll", toggleVisibility);
    toggleVisibility();

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function initPreviewCube() {
    const cube = document.querySelector("[data-preview-cube]");
    const buttons = document.querySelectorAll("[data-preview-color]");
    if (!cube || !buttons.length) return;

    const getPreviewCubeColor = (button) => {
        if (button.dataset.previewColor === "#FFFFFF") {
            return "#d7dce4";
        }

        return button.dataset.previewColor;
    };

    const setActiveColor = (button) => {
        buttons.forEach((chip) => {
            const isActive = chip === button;
            chip.classList.toggle("active", isActive);
            chip.setAttribute("aria-pressed", String(isActive));
        });

        const previewCubeColor = getPreviewCubeColor(button);
        cube.style.color = previewCubeColor;
        cube.style.setProperty("--preview-color", previewCubeColor);
    };

    const initiallyActive = Array.from(buttons).find((button) => button.classList.contains("active")) || buttons[0];
    setActiveColor(initiallyActive);

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            setActiveColor(button);
        });
    });
}

function updateCartCount() {
    const cartCount = document.querySelector("[data-cart-count]");
    if (!cartCount) return;

    const storedCount = Number(localStorage.getItem("alchemist-cart-count") || 2);
    cartCount.textContent = String(storedCount);
}

function initAddToCartButtons() {
    const buttons = document.querySelectorAll("[data-add-cart]");
    if (!buttons.length) return;

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const current = Number(localStorage.getItem("alchemist-cart-count") || 2);
            localStorage.setItem("alchemist-cart-count", String(current + 1));
            updateCartCount();
            button.textContent = "Adicionado";
        });
    });
}

function initMediaZoom() {
    const detailMedia = document.querySelector("[data-detail-media]");
    if (!detailMedia) return;

    detailMedia.addEventListener("mousemove", () => {
        detailMedia.classList.add("zoomed");
    });

    detailMedia.addEventListener("mouseleave", () => {
        detailMedia.classList.remove("zoomed");
    });
}

function initPreviewControls() {
    const previewStage = document.querySelector("[data-custom-preview]");
    const previewScale = document.querySelector("[data-custom-scale]");
    if (!previewStage) return;

    const colorButtons = document.querySelectorAll("[data-tone]");
    const sizeButtons = document.querySelectorAll("[data-scale]");

    colorButtons.forEach((button) => {
        button.addEventListener("click", () => {
            colorButtons.forEach((chip) => chip.classList.remove("active"));
            button.classList.add("active");
            previewStage.style.color = button.dataset.tone;
        });
    });

    sizeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            sizeButtons.forEach((chip) => chip.classList.remove("active"));
            button.classList.add("active");
            if (previewScale) {
                previewScale.style.transform = `scale(${button.dataset.scale})`;
            }
        });
    });
}

function initUploadField() {
    const input = document.querySelector("[data-upload-input]");
    const label = document.querySelector("[data-upload-label]");
    const dropzone = document.querySelector("[data-upload-dropzone]");
    if (!input || !label) return;

    dropzone?.addEventListener("click", () => input.click());
    dropzone?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            input.click();
        }
    });

    input.addEventListener("change", () => {
        label.textContent = input.files?.[0]?.name || "Arraste o arquivo aqui ou clique para selecionar";
    });
}

injectHeader();
injectFooter();
renderFeaturedProducts();
renderHomeKeychains();
renderCatalogPage();
renderProductDetail();
initProjectShowcases();
initHeroSlider();
initRevealAnimations();
initBackToTop();
initPreviewCube();
updateCartCount();
initAddToCartButtons();
initMediaZoom();
initPreviewControls();
initUploadField();

window.ALCHEMIST_PRODUCTS = PRODUCTS;
window.ALCHEMIST_UTILS = { formatCurrency };