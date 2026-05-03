const PRODUCTS = [
    {
        id: "keychain-01",
        name: "Chaveiro 01",
        category: "Chaveiros",
        price: 29.9,
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
        price: 29.9,
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
        price: 29.9,
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
        price: 29.9,
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
        price: 29.9,
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
        price: 29.9,
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
        ],
        variants: [
            {
                id: "black",
                label: "Preto",
                tone: "black",
                isDefault: true,
                price: 29.9,
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
                id: "white",
                label: "Branco",
                tone: "white",
                price: 29.9,
                images: [
                    {
                        src: "assets/chaveiros/chaveiro.06.jfif",
                        position: "center center"
                    }
                ]
            }
        ]
    },
    {
        id: "keychain-07",
        name: "Chaveiro 07",
        category: "Chaveiros",
        price: 29.9,
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
        price: 29.9,
        material: "PLA",
        size: "Sob demanda",
        shape: "K08",
        description: "Chaveiro com acabamento tecnico e proposta visual compacta, ideal para ampliar a vitrine da linha de pecas da loja.",
        accent: "Chaveiro",
        catalogImages: [
            {
                src: "assets/chaveiros/chaveiro 08.jfif",
                position: "center center",
                catalogScale: 0.96,
                catalogPadding: "10px",
                catalogBackdropScale: 1.22
            }
        ],
        images: [
            {
                src: "assets/chaveiros/chaveiro08.jfif",
                position: "center center"
            },
            {
                src: "assets/chaveiros/chaveiro 08.jfif",
                position: "center center"
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
const TESTIMONIAL_STORAGE_KEY = "alchemist-testimonials";
const CART_STORAGE_KEY = "alchemist-cart-items";
const CART_COUNT_STORAGE_KEY = "alchemist-cart-count";
const USER_STORAGE_KEY = "alchemist-users";
const SESSION_STORAGE_KEY = "alchemist-session";
const ORDER_STORAGE_KEY = "alchemist-orders";
const REQUEST_STORAGE_KEY = "alchemist-requests";
const FEEDBACK_PREVIEW_LIMIT = 3;
const CART_DEFAULT_SHIPPING = 18;
const SAO_PAULO_STATE_CODE = "SP";
const SAO_PAULO_PRIORITY_CITY = "Sao Paulo";
const SAO_PAULO_SERVICE_CITIES = [
    "Sao Paulo",
    "Santo Andre",
    "Sao Bernardo do Campo",
    "Sao Caetano do Sul",
    "Diadema",
    "Maua",
    "Ribeirao Pires",
    "Rio Grande da Serra",
    "Guarulhos",
    "Osasco",
    "Barueri",
    "Carapicuiba",
    "Santana de Parnaiba",
    "Cotia",
    "Taboao da Serra",
    "Embu das Artes",
    "Itapecerica da Serra",
    "Jandira",
    "Itapevi",
    "Cajamar",
    "Mogi das Cruzes",
    "Suzano",
    "Poa",
    "Ferraz de Vasconcelos",
    "Itaquaquecetuba",
    "Campinas",
    "Valinhos",
    "Vinhedo",
    "Louveira",
    "Jundiai",
    "Itupeva",
    "Paulinia",
    "Sumare",
    "Hortolandia",
    "Monte Mor",
    "Indaiatuba"
];
const PIX_PAYMENT_EXPIRATION_MS = 4 * 60 * 1000;
const PIX_RECEIVER_KEY = "contato.alchemist3d@gmail.com";
const PIX_RECEIVER_NAME = "ALCHEMIST3D";
const PIX_RECEIVER_CITY = "SAO PAULO";
const PICKUP_WHATSAPP_NUMBER = "5511997528629";
const BRAZIL_LOCATION_OPTIONS = {
    "AC": ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira"],
    "AL": ["Maceio", "Arapiraca", "Palmeira dos Indios"],
    "AP": ["Macapa", "Santana", "Laranjal do Jari"],
    "AM": ["Manaus", "Parintins", "Itacoatiara"],
    "BA": ["Salvador", "Feira de Santana", "Vitoria da Conquista", "Ilheus"],
    "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Sobral"],
    "DF": ["Brasilia", "Ceilandia", "Taguatinga"],
    "ES": ["Vitoria", "Vila Velha", "Serra", "Cariacica"],
    "GO": ["Goiania", "Aparecida de Goiania", "Anapolis"],
    "MA": ["Sao Luis", "Imperatriz", "Caxias"],
    "MT": ["Cuiaba", "Varzea Grande", "Rondonopolis"],
    "MS": ["Campo Grande", "Dourados", "Tres Lagoas"],
    "MG": ["Belo Horizonte", "Uberlandia", "Contagem", "Juiz de Fora", "Montes Claros"],
    "PA": ["Belem", "Ananindeua", "Santarem", "Maraba"],
    "PB": ["Joao Pessoa", "Campina Grande", "Santa Rita"],
    "PR": ["Curitiba", "Londrina", "Maringa", "Ponta Grossa"],
    "PE": ["Recife", "Jaboatao dos Guararapes", "Olinda", "Caruaru"],
    "PI": ["Teresina", "Parnaiba", "Picos"],
    "RJ": ["Rio de Janeiro", "Niteroi", "Nova Iguacu", "Duque de Caxias", "Petropolis"],
    "RN": ["Natal", "Mossoro", "Parnamirim"],
    "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Santa Maria"],
    "RO": ["Porto Velho", "Ji-Parana", "Ariquemes"],
    "RR": ["Boa Vista", "Rorainopolis", "Caracarai"],
    "SC": ["Florianopolis", "Joinville", "Blumenau", "Chapeco"],
    "SP": [...SAO_PAULO_SERVICE_CITIES],
    "SE": ["Aracaju", "Nossa Senhora do Socorro", "Itabaiana"],
    "TO": ["Palmas", "Araguaina", "Gurupi"]
};
const PASSWORD_REQUIREMENTS = [
    { test: (value) => value.length >= 8, message: "minimo de 8 caracteres" },
    { test: (value) => /[A-Z]/.test(value), message: "pelo menos 1 letra maiuscula" },
    { test: (value) => /[a-z]/.test(value), message: "pelo menos 1 letra minuscula" },
    { test: (value) => /[^A-Za-z0-9]/.test(value), message: "pelo menos 1 caractere especial" }
];
const ORDER_STATUS_FLOW = ["Pedido solicitado", "Pagamento feito", "Pedido aprovado pela loja", "Pedido em andamento", "Pedido finalizado"];
const LEGACY_ORDER_STATUS_MAP = {
    "Recebido": "Pagamento feito",
    "Em analise": "Pedido aprovado pela loja",
    "Em producao": "Pedido em andamento",
    "Enviado": "Pedido finalizado"
};
let saoPauloCitiesCache = null;

const DEFAULT_TESTIMONIALS = [
    {
        id: "testimonial-1",
        name: "Larissa M.",
        context: "Item personalizado para setup",
        rating: 5,
        message: "Pedi um item personalizado para meu setup e o resultado veio com acabamento muito acima do esperado.",
        createdAt: "2026-04-24T14:20:00.000Z"
    },
    {
        id: "testimonial-2",
        name: "Caio R.",
        context: "Modelagem e acabamento",
        rating: 5,
        message: "A modelagem ficou precisa, o prazo foi claro e o visual industrial da peca ficou impecavel.",
        createdAt: "2026-04-18T16:45:00.000Z"
    },
    {
        id: "testimonial-3",
        name: "Marina T.",
        context: "Presente geek",
        rating: 5,
        message: "Excelente para presentes geek. O processo de personalizacao foi simples e muito bem conduzido.",
        createdAt: "2026-04-11T11:10:00.000Z"
    }
];

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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function slugify(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function normalizeCpfDigits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value) {
    const digits = normalizePhoneDigits(value).slice(0, 11);

    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatZip(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatCpf(value) {
    const digits = normalizeCpfDigits(value);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateBrazilPhone(value) {
    return /^\d{10,11}$/.test(normalizePhoneDigits(value));
}

function validateCpf(value) {
    const cpf = normalizeCpfDigits(value);
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (length) => {
        let total = 0;
        for (let index = 0; index < length; index += 1) {
            total += Number(cpf[index]) * ((length + 1) - index);
        }
        const remainder = (total * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const firstDigit = calculateDigit(9);
    const secondDigit = calculateDigit(10);
    return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

function validatePassword(value) {
    const failedRequirements = PASSWORD_REQUIREMENTS.filter((rule) => !rule.test(String(value || ""))).map((rule) => rule.message);

    return {
        isValid: failedRequirements.length === 0,
        failedRequirements
    };
}

function buildPasswordErrorMessage(password) {
    const validation = validatePassword(password);
    if (validation.isValid) return "";
    return `Senha invalida: ${validation.failedRequirements.join(", ")}.`;
}

function syncPasswordHints(input, hintList) {
    if (!input || !hintList) return;

    const value = String(input.value || "");
    const validation = validatePassword(value);
    const shouldShow = value.length > 0 && !validation.isValid;

    hintList.hidden = !shouldShow;
    hintList.querySelectorAll("[data-password-rule]").forEach((item) => {
        const rule = item.dataset.passwordRule || "";
        const isMet = !validation.failedRequirements.includes(rule);
        item.classList.toggle("is-met", isMet);
    });
}

function setFormFeedback(node, message, type = "error") {
    if (!node) return;

    if (!message) {
        node.hidden = true;
        node.textContent = "";
        node.classList.remove("is-error", "is-success");
        return;
    }

    node.hidden = false;
    node.textContent = message;
    node.classList.toggle("is-error", type === "error");
    node.classList.toggle("is-success", type === "success");
}

async function fetchSaoPauloCities() {
    if (Array.isArray(saoPauloCitiesCache) && saoPauloCitiesCache.length) {
        return saoPauloCitiesCache;
    }

    saoPauloCitiesCache = [...SAO_PAULO_SERVICE_CITIES];

    return saoPauloCitiesCache;
}

async function populateSaoPauloCitySelect(select, selectedCity = "") {
    if (!select) return [];

    select.disabled = true;
    select.innerHTML = '<option value="">Carregando cidades de Sao Paulo...</option>';
    const cities = await fetchSaoPauloCities();

    const preferredCity = cities.includes(selectedCity) ? selectedCity : SAO_PAULO_PRIORITY_CITY;
    select.innerHTML = cities.map((city) => `<option value="${escapeHtml(city)}" ${city === preferredCity ? "selected" : ""}>${escapeHtml(city)}${city === SAO_PAULO_PRIORITY_CITY ? " - Capital" : ""}</option>`).join("");
    select.disabled = false;
    return cities;
}

async function initSaoPauloCityFields(root = document) {
    const selects = Array.from(root.querySelectorAll("[data-sp-city]"));
    await Promise.all(selects.map((select) => populateSaoPauloCitySelect(select, select.dataset.initialValue || select.value || "")));
}

function normalizeUser(user) {
    if (!user || typeof user !== "object") {
        return null;
    }

    const firstName = String(user.firstName || "").trim();
    const lastName = String(user.lastName || "").trim();
    const email = normalizeEmail(user.email);
    const phoneDigits = normalizePhoneDigits(user.phone);
    const cpfDigits = normalizeCpfDigits(user.cpf);
    const state = String(user.state || SAO_PAULO_STATE_CODE).trim().toUpperCase() || SAO_PAULO_STATE_CODE;
    const city = String(user.city || "").trim();
    const password = String(user.password || "");

    if (!firstName || !lastName || !email || !phoneDigits || !state || !city || !password) {
        return null;
    }

    return {
        id: String(user.id || `user-${slugify(email)}`),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        phone: formatPhone(phoneDigits),
        phoneDigits,
        cpf: cpfDigits ? formatCpf(cpfDigits) : "",
        cpfDigits,
        state,
        city,
        password,
        createdAt: user.createdAt || new Date().toISOString()
    };
}

function readUsers() {
    try {
        const rawValue = localStorage.getItem(USER_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];
        return (Array.isArray(parsedValue) ? parsedValue : []).map(normalizeUser).filter(Boolean);
    } catch {
        return [];
    }
}

function writeUsers(users) {
    const normalizedUsers = users.map(normalizeUser).filter(Boolean);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUsers));
}

function findUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return readUsers().find((user) => user.email === normalizedEmail) || null;
}

function createUser(payload) {
    const normalizedUser = normalizeUser(payload);
    if (!normalizedUser) {
        return { ok: false, message: "Preencha todos os campos obrigatorios do cadastro." };
    }

    if (!validateCpf(payload.cpf)) {
        return { ok: false, message: "Informe um CPF valido para concluir o cadastro." };
    }

    if (findUserByEmail(normalizedUser.email)) {
        return { ok: false, message: "Ja existe uma conta cadastrada com esse email." };
    }

    if (normalizedUser.cpfDigits && readUsers().some((user) => user.cpfDigits && user.cpfDigits === normalizedUser.cpfDigits)) {
        return { ok: false, message: "Ja existe uma conta cadastrada com esse CPF." };
    }

    const users = readUsers();
    users.push(normalizedUser);
    writeUsers(users);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email: normalizedUser.email }));

    return { ok: true, user: normalizedUser };
}

function updateUserPassword(email, phone, password) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhoneDigits(phone);
    const users = readUsers();
    const userIndex = users.findIndex((user) => user.email === normalizedEmail && user.phoneDigits === normalizedPhone);

    if (userIndex === -1) {
        return { ok: false, message: "Nao encontramos um cadastro com esse email e telefone." };
    }

    users[userIndex] = normalizeUser({ ...users[userIndex], password });
    writeUsers(users);
    return { ok: true, user: users[userIndex] };
}

function updateUserProfile(email, payload) {
    const normalizedEmail = normalizeEmail(email);
    const users = readUsers();
    const userIndex = users.findIndex((user) => user.email === normalizedEmail);

    if (userIndex === -1) {
        return { ok: false, message: "Nao encontramos o perfil para atualizar." };
    }

    const currentUser = users[userIndex];
    const fullName = String(payload.fullName || "").trim();
    const phone = String(payload.phone || "");
    const city = String(payload.city || "").trim();

    if (!fullName || fullName.split(/\s+/).length < 2) {
        return { ok: false, message: "Informe nome e sobrenome para atualizar o perfil." };
    }

    if (!validateBrazilPhone(phone)) {
        return { ok: false, message: "Informe um telefone brasileiro valido com DDD." };
    }

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.shift() || currentUser.firstName;
    const lastName = nameParts.join(" ") || currentUser.lastName;

    users[userIndex] = normalizeUser({
        ...currentUser,
        firstName,
        lastName,
        phone,
        city,
        state: SAO_PAULO_STATE_CODE
    });

    writeUsers(users);
    return { ok: true, user: users[userIndex] };
}

function authenticateUser(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.password !== String(password || "")) {
        return { ok: false, message: "Email ou senha invalidos." };
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email: user.email }));
    return { ok: true, user };
}

function getCurrentSession() {
    try {
        const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : null;
        if (!parsedValue?.email) return null;
        return { email: normalizeEmail(parsedValue.email) };
    } catch {
        return null;
    }
}

function getCurrentUser() {
    const session = getCurrentSession();
    if (!session) return null;
    return findUserByEmail(session.email);
}

function logoutCurrentUser() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeOrder(order) {
    if (!order || typeof order !== "object" || !order.id || !order.userEmail || !Array.isArray(order.items)) {
        return null;
    }

    const normalizedStatus = LEGACY_ORDER_STATUS_MAP[String(order.status || "").trim()] || String(order.status || "").trim();

    return {
        id: String(order.id),
        userEmail: normalizeEmail(order.userEmail),
        fullName: String(order.fullName || "").trim(),
        phone: formatPhone(order.phone || ""),
        state: String(order.state || "").trim().toUpperCase(),
        city: String(order.city || "").trim(),
        street: String(order.street || "").trim(),
        zip: formatZip(order.zip || ""),
        paymentMethod: String(order.paymentMethod || "Pix").trim(),
        deliveryMethod: String(order.deliveryMethod || "delivery").trim(),
        subtotal: Number(order.subtotal) || 0,
        shipping: Number(order.shipping) || 0,
        total: Number(order.total) || 0,
        status: ORDER_STATUS_FLOW.includes(normalizedStatus) ? normalizedStatus : ORDER_STATUS_FLOW[0],
        items: order.items.map((item) => ({
            productId: String(item.productId || ""),
            variantId: String(item.variantId || ""),
            productName: String(item.productName || ""),
            variantLabel: String(item.variantLabel || ""),
            quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
            unitPrice: Number(item.unitPrice) || 0
        })).filter((item) => item.productId && item.productName),
        createdAt: order.createdAt || new Date().toISOString()
    };
}

function normalizeRequest(request) {
    if (!request || typeof request !== "object" || !request.id || !request.userEmail || !request.type || !request.title || !request.message) {
        return null;
    }

    return {
        id: String(request.id),
        userEmail: normalizeEmail(request.userEmail),
        type: String(request.type),
        title: String(request.title),
        message: String(request.message),
        status: String(request.status || "Recebida"),
        storeResponse: String(request.storeResponse || "Recebemos sua solicitacao e retornaremos em breve."),
        createdAt: request.createdAt || new Date().toISOString(),
        respondedAt: request.respondedAt || new Date().toISOString()
    };
}

function readRequests() {
    try {
        const rawValue = localStorage.getItem(REQUEST_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];
        return (Array.isArray(parsedValue) ? parsedValue : []).map(normalizeRequest).filter(Boolean).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    } catch {
        return [];
    }
}

function writeRequests(requests) {
    localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(requests.map(normalizeRequest).filter(Boolean)));
}

function getRequestsByUser(email) {
    return readRequests().filter((request) => request.userEmail === normalizeEmail(email));
}

function buildStoreResponse(type) {
    if (type === "custom") {
        return "Recebemos sua solicitacao de projeto personalizado. A equipe vai analisar briefing, material e escala antes de responder com orientacao tecnica.";
    }

    return "Recebemos sua mensagem e ela ja entrou na fila do atendimento. O retorno medio acontece em ate 48 horas uteis.";
}

function createTrackedRequest(payload) {
    const normalizedRequest = normalizeRequest(payload);
    if (!normalizedRequest) {
        return { ok: false, message: "Nao foi possivel registrar a solicitacao." };
    }

    const requests = readRequests();
    requests.unshift(normalizedRequest);
    writeRequests(requests);
    return { ok: true, request: normalizedRequest };
}

function readOrders() {
    try {
        const rawValue = localStorage.getItem(ORDER_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];
        return (Array.isArray(parsedValue) ? parsedValue : []).map(normalizeOrder).filter(Boolean).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    } catch {
        return [];
    }
}

function writeOrders(orders) {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders.map(normalizeOrder).filter(Boolean)));
}

function getOrdersByUser(email) {
    const normalizedEmail = normalizeEmail(email);
    return readOrders().filter((order) => order.userEmail === normalizedEmail);
}

function getOrderById(orderId) {
    return readOrders().find((order) => order.id === String(orderId || "")) || null;
}

function resolveOrderItemSelection(item) {
    const baseProduct = PRODUCTS.find((entry) => entry.id === item.productId);
    if (!baseProduct) {
        return null;
    }

    let variantId = String(item.variantId || "");
    if (!variantId && Array.isArray(baseProduct.variants) && item.variantLabel) {
        const matchedVariant = baseProduct.variants.find((variant) => String(variant.label || "").toLowerCase() === String(item.variantLabel || "").toLowerCase());
        variantId = String(matchedVariant?.id || "");
    }

    return getProductSelection(baseProduct, variantId);
}

function populateBrazilStateSelect(select, selectedState = "") {
    if (!select) return;

    const options = Object.keys(BRAZIL_LOCATION_OPTIONS).map((state) => `<option value="${state}" ${state === selectedState ? "selected" : ""}>${state}</option>`).join("");
    select.innerHTML = `<option value="">Selecione o estado</option>${options}`;
}

function populateBrazilCitySelect(select, state, selectedCity = "") {
    if (!select) return;

    const cities = BRAZIL_LOCATION_OPTIONS[state] || [];
    select.disabled = cities.length === 0;
    if (!cities.length) {
        select.innerHTML = '<option value="">Selecione primeiro o estado</option>';
        return;
    }

    select.innerHTML = `<option value="">Selecione a cidade</option>${cities.map((city) => `<option value="${escapeHtml(city)}" ${city === selectedCity ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}`;
}

function initBrazilLocationFields(root = document) {
    root.querySelectorAll("[data-brazil-state]").forEach((stateSelect) => {
        const cityTarget = stateSelect.dataset.targetCity;
        const citySelect = cityTarget ? root.querySelector(`#${cityTarget}`) : null;
        const initialState = stateSelect.dataset.initialValue || stateSelect.value || "";
        const initialCity = citySelect?.dataset.initialValue || citySelect?.value || "";

        populateBrazilStateSelect(stateSelect, initialState);
        populateBrazilCitySelect(citySelect, initialState, initialCity);

        stateSelect.addEventListener("change", () => {
            populateBrazilCitySelect(citySelect, stateSelect.value, "");
        });
    });
}

function initMaskedInputs(root = document) {
    root.querySelectorAll('input[type="tel"]').forEach((input) => {
        input.addEventListener("input", () => {
            input.value = formatPhone(input.value);
        });
    });

    root.querySelectorAll('input[name="zip"]').forEach((input) => {
        input.addEventListener("input", () => {
            input.value = formatZip(input.value);
        });
    });

    root.querySelectorAll('input[name="cpf"]').forEach((input) => {
        input.addEventListener("input", () => {
            input.value = formatCpf(input.value);
        });
    });
}

function normalizeRating(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return 5;
    }

    return Math.min(5, Math.max(1, Math.round(numericValue)));
}

function normalizeTestimonial(item, index) {
    if (!item || typeof item !== "object") {
        return null;
    }

    const name = String(item.name || "Cliente ALCHEMIST").trim();
    const message = String(item.message || "").trim();

    if (!message) {
        return null;
    }

    const createdAt = item.createdAt || new Date(Date.now() - index * 1000).toISOString();

    return {
        id: String(item.id || `testimonial-${index}-${createdAt}`),
        name,
        context: String(item.context || "Cliente ALCHEMIST 3D").trim(),
        rating: normalizeRating(item.rating),
        message,
        createdAt
    };
}

function readTestimonials() {
    try {
        const rawValue = localStorage.getItem(TESTIMONIAL_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : DEFAULT_TESTIMONIALS;
        const normalizedItems = (Array.isArray(parsedValue) ? parsedValue : DEFAULT_TESTIMONIALS)
            .map(normalizeTestimonial)
            .filter(Boolean)
            .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

        return normalizedItems.length ? normalizedItems : DEFAULT_TESTIMONIALS.map(normalizeTestimonial).filter(Boolean);
    } catch {
        return DEFAULT_TESTIMONIALS.map(normalizeTestimonial).filter(Boolean);
    }
}

function writeTestimonials(testimonials) {
    try {
        localStorage.setItem(TESTIMONIAL_STORAGE_KEY, JSON.stringify(testimonials));
    } catch {
        return;
    }
}

function ensureTestimonialsSeeded() {
    const testimonials = readTestimonials();
    writeTestimonials(testimonials);
    return testimonials;
}

function formatTestimonialDate(value) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

function formatOrderDate(value) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(value));
}

function formatOrderDateTime(value) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function buildOrderTimelineMarkup(status) {
    const currentStageIndex = Math.max(0, ORDER_STATUS_FLOW.indexOf(status));

    return ORDER_STATUS_FLOW.map((stage, index) => {
        const stateClass = index < currentStageIndex ? "is-completed" : (index === currentStageIndex ? "is-current" : "is-pending");
        return `
            <li class="order-stage ${stateClass}">
                <span class="order-stage-bullet" aria-hidden="true"></span>
                <span>${escapeHtml(stage)}</span>
            </li>
        `;
    }).join("");
}

function buildOrderLeadMedia(order) {
    const selectedItems = order.items.map(resolveOrderItemSelection).filter(Boolean);
    const primarySelection = selectedItems[0] || null;

    if (!primarySelection) {
        return '<div class="order-media-empty"><strong>Sem imagem disponivel</strong><p>Assim que o item tiver uma referencia visual cadastrada, ela aparecera aqui.</p></div>';
    }

    const primaryImage = getProductPrimaryImage(primarySelection);

    return `
        <div class="order-media-stage">
            <div class="order-media-main">
                <img src="${primaryImage}" alt="${escapeHtml(primarySelection.name)}" loading="lazy">
            </div>
        </div>
    `;
}

function buildPixTlv(id, value) {
    const stringValue = String(value || "");
    return `${id}${String(stringValue.length).padStart(2, "0")}${stringValue}`;
}

function computePixCrc16(payload) {
    let crc = 0xFFFF;

    for (let index = 0; index < payload.length; index += 1) {
        crc ^= payload.charCodeAt(index) << 8;

        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitizePixText(value, maxLength = 25) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9 ]/g, "")
        .trim()
        .slice(0, maxLength)
        .toUpperCase();
}

function buildPixPayload({ amount, orderId, customerName }) {
    const merchantAccount = buildPixTlv("00", "BR.GOV.BCB.PIX")
        + buildPixTlv("01", PIX_RECEIVER_KEY)
        + buildPixTlv("02", `Pedido ${sanitizePixText(orderId, 20)}`);
    const txid = sanitizePixText(orderId.replace(/^ALC-/, ""), 25) || `${Date.now()}`.slice(-25);
    const merchantName = sanitizePixText(PIX_RECEIVER_NAME, 25) || "ALCHEMIST3D";
    const merchantCity = sanitizePixText(PIX_RECEIVER_CITY, 15) || "SAO PAULO";
    const additionalData = buildPixTlv("05", txid);
    const amountValue = Number(amount || 0).toFixed(2);

    const payloadWithoutCrc = [
        buildPixTlv("00", "01"),
        buildPixTlv("26", merchantAccount),
        buildPixTlv("52", "0000"),
        buildPixTlv("53", "986"),
        buildPixTlv("54", amountValue),
        buildPixTlv("58", "BR"),
        buildPixTlv("59", merchantName),
        buildPixTlv("60", merchantCity),
        buildPixTlv("62", additionalData)
    ].join("") + "6304";

    return {
        txid,
        customerName: sanitizePixText(customerName, 25),
        payload: `${payloadWithoutCrc}${computePixCrc16(payloadWithoutCrc)}`
    };
}

function buildPickupWhatsAppUrl({ fullName, city, total }) {
    const customerName = String(fullName || "Cliente").trim() || "Cliente";
    const customerCity = String(city || "Sao Paulo").trim() || "Sao Paulo";
    const totalLabel = formatCurrency(Number(total) || 0);
    const message = `Ola, aqui e ${customerName}. Escolhi retirar meu pedido com o vendedor na ALCHEMIST 3D. Cidade de referencia: ${customerCity}. Valor atual do pedido: ${totalLabel}. Gostaria de combinar a retirada.`;
    return `https://wa.me/${PICKUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function createPixPaymentSession({ total, orderId, customerName }) {
    const expiresAt = new Date(Date.now() + PIX_PAYMENT_EXPIRATION_MS).toISOString();
    const pixPayload = buildPixPayload({ amount: total, orderId, customerName });

    return {
        orderId,
        total,
        expiresAt,
        pixCode: pixPayload.payload,
        txid: pixPayload.txid,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(pixPayload.payload)}`
    };
}

function buildStarsMarkup(rating) {
    return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function buildTestimonialCard(testimonial) {
    return `
        <article class="testimonial-card glass-panel reveal">
            <div class="testimonial-card-head">
                <div class="stars" aria-label="${testimonial.rating} de 5 estrelas">${buildStarsMarkup(testimonial.rating)}</div>
                <span class="testimonial-card-date">${formatTestimonialDate(testimonial.createdAt)}</span>
            </div>
            <p>"${escapeHtml(testimonial.message)}"</p>
            <div class="testimonial-card-footer">
                <strong>${escapeHtml(testimonial.name)}</strong>
                <span class="testimonial-card-context">${escapeHtml(testimonial.context)}</span>
            </div>
        </article>
    `;
}

function buildTestimonialsEmptyState(title, message) {
    return `
        <div class="empty-state testimonial-empty-state">
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
}

function buildFeedbackConfirmCard(testimonial) {
    return `
        <article class="testimonial-card feedback-confirm-card glass-panel">
            <div class="testimonial-card-head">
                <div class="stars" aria-label="${testimonial.rating} de 5 estrelas">${buildStarsMarkup(testimonial.rating)}</div>
                <span class="testimonial-card-date">${formatTestimonialDate(testimonial.createdAt)}</span>
            </div>
            <p>"${escapeHtml(testimonial.message)}"</p>
            <div class="testimonial-card-footer">
                <strong>${escapeHtml(testimonial.name)}</strong>
                <span class="testimonial-card-context">${escapeHtml(testimonial.context)}</span>
            </div>
        </article>
    `;
}

function renderHomeTestimonials() {
    const container = document.querySelector("[data-testimonials-preview]");
    if (!container) return;

    const testimonials = ensureTestimonialsSeeded().slice(0, FEEDBACK_PREVIEW_LIMIT);
    container.innerHTML = testimonials.length
        ? testimonials.map(buildTestimonialCard).join("")
        : buildTestimonialsEmptyState("Ainda nao recebemos comentarios", "Seja o primeiro cliente a deixar um feedback sobre a experiencia com a loja.");
}

function renderFeedbackHub() {
    const recentContainer = document.querySelector("[data-feedback-preview]");
    const allContainer = document.querySelector("[data-feedback-all]");
    const countNode = document.querySelector("[data-feedback-count]");

    if (!recentContainer && !allContainer && !countNode) return;

    const testimonials = ensureTestimonialsSeeded();
    const recentTestimonials = testimonials.slice(0, FEEDBACK_PREVIEW_LIMIT);

    if (recentContainer) {
        recentContainer.innerHTML = recentTestimonials.length
            ? recentTestimonials.map(buildTestimonialCard).join("")
            : buildTestimonialsEmptyState("Nenhum comentario enviado ainda", "Use o formulario acima para inaugurar essa vitrine de feedback da loja.");
    }

    if (allContainer) {
        allContainer.innerHTML = testimonials.length
            ? testimonials.map(buildTestimonialCard).join("")
            : buildTestimonialsEmptyState("Nenhum comentario registrado", "Assim que a loja receber feedbacks, todos eles aparecerao aqui em ordem cronologica.");
    }

    if (countNode) {
        countNode.textContent = String(testimonials.length);
    }
}

function openFeedbackConfirmModal(testimonial) {
    const modal = document.querySelector("[data-feedback-confirm-modal]");
    const preview = document.querySelector("[data-feedback-confirm-preview]");
    if (!modal || !preview) return;

    preview.innerHTML = buildFeedbackConfirmCard(testimonial);
    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeFeedbackConfirmModal() {
    const modal = document.querySelector("[data-feedback-confirm-modal]");
    const preview = document.querySelector("[data-feedback-confirm-preview]");
    if (!modal) return;

    modal.hidden = true;
    if (preview) {
        preview.innerHTML = "";
    }
    document.body.classList.remove("modal-open");
}

function publishFeedback(testimonial, form, successMessage, ratingField) {
    const testimonials = ensureTestimonialsSeeded();

    testimonials.unshift(testimonial);
    writeTestimonials(testimonials);
    form.reset();

    if (ratingField) {
        ratingField.value = "5";
    }

    if (successMessage) {
        successMessage.hidden = false;
        successMessage.classList.remove("is-error");
        successMessage.textContent = "Comentario publicado. Os cards abaixo ja foram atualizados com o novo feedback.";
    }

    renderHomeTestimonials();
    renderFeedbackHub();
    initRevealAnimations();
    document.querySelector("[data-feedback-preview]")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initFeedbackForm() {
    const form = document.querySelector("[data-feedback-form]");
    if (!form) return;

    const successMessage = document.querySelector("[data-feedback-success]");
    const ratingField = form.querySelector("[name='rating']");
    const modal = document.querySelector("[data-feedback-confirm-modal]");
    const confirmButton = document.querySelector("[data-feedback-confirm-submit]");
    const cancelButtons = document.querySelectorAll("[data-feedback-confirm-cancel]");
    let pendingFeedback = null;

    cancelButtons.forEach((button) => {
        button.addEventListener("click", () => {
            pendingFeedback = null;
            closeFeedbackConfirmModal();
        });
    });

    confirmButton?.addEventListener("click", () => {
        if (!pendingFeedback) return;

        publishFeedback(pendingFeedback, form, successMessage, ratingField);
        pendingFeedback = null;
        closeFeedbackConfirmModal();
    });

    if (modal && !window.__alchemistFeedbackModalBound) {
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !modal.hidden) {
                pendingFeedback = null;
                closeFeedbackConfirmModal();
            }
        });
        window.__alchemistFeedbackModalBound = true;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const name = String(formData.get("name") || "").trim();
        const context = String(formData.get("context") || "Cliente ALCHEMIST 3D").trim();
        const message = String(formData.get("message") || "").trim();

        if (!name || !message) {
            if (successMessage) {
                successMessage.hidden = false;
                successMessage.classList.add("is-error");
                successMessage.textContent = "Preencha pelo menos seu nome e o comentario para publicar o feedback.";
            }
            return;
        }

        pendingFeedback = {
            id: `testimonial-${Date.now()}`,
            name,
            context,
            rating: normalizeRating(formData.get("rating")),
            message,
            createdAt: new Date().toISOString()
        };

        if (successMessage) {
            successMessage.hidden = true;
        }

        if (modal) {
            openFeedbackConfirmModal(pendingFeedback);
            return;
        }

        publishFeedback(pendingFeedback, form, successMessage, ratingField);
        pendingFeedback = null;
    });
}

function initTestimonialsRealtime() {
    if (window.__alchemistTestimonialsRealtimeBound) return;

    window.addEventListener("storage", (event) => {
        if (event.key !== TESTIMONIAL_STORAGE_KEY) return;

        renderHomeTestimonials();
        renderFeedbackHub();
        initRevealAnimations();
    });

    window.__alchemistTestimonialsRealtimeBound = true;
}

function isKeychainProduct(product) {
    return product.category === "Chaveiros";
}

function getDefaultVariantId(product) {
    if (!Array.isArray(product.variants) || !product.variants.length) {
        return "";
    }

    const defaultVariant = product.variants.find((variant) => variant.isDefault) || product.variants[0];
    return String(defaultVariant?.id || "");
}

function getProductVariant(product, variantId) {
    if (!Array.isArray(product.variants) || !product.variants.length) {
        return null;
    }

    const resolvedVariantId = variantId || getDefaultVariantId(product);
    return product.variants.find((variant) => String(variant.id) === String(resolvedVariantId)) || null;
}

function getProductSelection(product, variantId) {
    const variant = getProductVariant(product, variantId);

    if (!variant) {
        return {
            ...product,
            variantId: "",
            variantLabel: "",
            variantTone: ""
        };
    }

    return {
        ...product,
        ...variant,
        id: product.id,
        name: product.name,
        category: product.category,
        accent: variant.accent || product.accent,
        material: variant.material || product.material,
        size: variant.size || product.size,
        description: variant.description || product.description,
        images: Array.isArray(variant.images) && variant.images.length ? variant.images : product.images,
        variantId: String(variant.id || ""),
        variantLabel: variant.label || "",
        variantTone: variant.tone || ""
    };
}

function buildDetailVariantPicker(product, activeVariantId) {
    if (!Array.isArray(product.variants) || !product.variants.length) {
        return "";
    }

    return `
        <div class="detail-option-group">
            <span class="detail-option-label">Cor</span>
            <div class="detail-option-list" role="group" aria-label="Selecione a cor do produto">
                ${product.variants.map((variant) => {
                    const variantId = String(variant.id || "");
                    const isActive = variantId === activeVariantId;

                    return `
                        <button
                            class="chip detail-option-chip ${isActive ? "active" : ""}"
                            type="button"
                            data-detail-variant="${escapeHtml(variantId)}"
                            data-variant-tone="${escapeHtml(variant.tone || "")}" 
                            aria-pressed="${String(isActive)}"
                        >
                            ${escapeHtml(variant.label || variantId)}
                        </button>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function getCartItemKey(item) {
    return `${String(item.productId)}::${String(item.variantId || "")}`;
}

function normalizeCartItem(item) {
    if (!item || typeof item !== "object" || !item.productId) {
        return null;
    }

    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));

    return {
        productId: String(item.productId),
        variantId: item.variantId ? String(item.variantId) : "",
        quantity
    };
}

function readCartItems() {
    try {
        const rawValue = localStorage.getItem(CART_STORAGE_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) : [];
        return (Array.isArray(parsedValue) ? parsedValue : []).map(normalizeCartItem).filter(Boolean);
    } catch {
        return [];
    }
}

function writeCartItems(items) {
    const normalizedItems = items.map(normalizeCartItem).filter(Boolean);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedItems));
    localStorage.setItem(CART_COUNT_STORAGE_KEY, String(normalizedItems.reduce((total, item) => total + item.quantity, 0)));
}

function getCartEntries() {
    return readCartItems().map((item) => {
        const baseProduct = PRODUCTS.find((entry) => entry.id === item.productId);
        if (!baseProduct) {
            return null;
        }

        const product = getProductSelection(baseProduct, item.variantId);

        return {
            ...item,
            variantId: product.variantId || "",
            product,
            baseProduct
        };
    }).filter(Boolean);
}

function getCartItemCount() {
    return getCartEntries().reduce((total, entry) => total + entry.quantity, 0);
}

function getProductPrimaryImage(product) {
    const firstImage = product.images?.[0];
    return typeof firstImage === "string" ? firstImage : firstImage?.src;
}

function buildCartSummary(entries, options = {}) {
    const isPickup = Boolean(options.isPickup);
    const subtotal = entries.reduce((total, entry) => total + (entry.product.price > 0 ? entry.product.price * entry.quantity : 0), 0);
    const shipping = entries.length ? (isPickup ? 0 : CART_DEFAULT_SHIPPING) : 0;
    const total = subtotal + shipping;
    const hasConsultationItems = entries.some((entry) => entry.product.price <= 0 || entry.product.priceLabel);

    return {
        subtotal,
        shipping,
        total,
        hasConsultationItems
    };
}

function buildCartItemMarkup(entry) {
    const { product, quantity, variantId } = entry;
    const image = getProductPrimaryImage(product);
    const backgroundStyle = image ? ` style="background-image: url('${image}');"` : "";
    const priceLabel = product.price > 0 ? formatCurrency(product.price * quantity) : (product.priceLabel || "Projeto realizado");
    const variantMeta = product.variantLabel ? ` · Cor: ${escapeHtml(product.variantLabel)}` : "";

    return `
        <div class="cart-item" data-cart-item>
            <div class="cart-thumb cart-thumb-image"${backgroundStyle}></div>
            <div class="cart-item-copy">
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(product.material)} · ${escapeHtml(product.size)}</span>
                <span class="cart-item-meta">${escapeHtml(product.category)}${variantMeta}</span>
            </div>
            <div class="cart-item-controls">
                <div class="cart-qty-controls" aria-label="Quantidade de ${escapeHtml(product.name)}">
                    <button class="cart-qty-button" type="button" data-cart-action="decrease" data-product-id="${product.id}" data-variant-id="${escapeHtml(variantId || "")}" aria-label="Diminuir quantidade de ${escapeHtml(product.name)}">-</button>
                    <span class="cart-qty-value">${quantity}</span>
                    <button class="cart-qty-button" type="button" data-cart-action="increase" data-product-id="${product.id}" data-variant-id="${escapeHtml(variantId || "")}" aria-label="Aumentar quantidade de ${escapeHtml(product.name)}">+</button>
                </div>
                <strong class="cart-item-price">${priceLabel}</strong>
                <button class="cart-remove-button" type="button" data-cart-action="remove" data-product-id="${product.id}" data-variant-id="${escapeHtml(variantId || "")}">Remover</button>
            </div>
        </div>
    `;
}

function syncCartItemCount() {
    localStorage.setItem(CART_COUNT_STORAGE_KEY, String(getCartItemCount()));
}

function injectHeader() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    const currentUser = getCurrentUser();
    const initials = currentUser ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase() : "";
    const authMarkup = currentUser
        ? `
            <a class="profile-shell" href="account.html" aria-label="Abrir area do usuario de ${escapeHtml(currentUser.fullName)}">
                <span class="profile-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
                <span class="profile-copy">
                    <strong>${escapeHtml(currentUser.firstName)}</strong>
                    <small>Area do usuario</small>
                </span>
            </a>
        `
        : '<a class="button button-secondary" href="auth.html">Login / Cadastro</a>';

    header.innerHTML = `
        <nav class="nav-shell" aria-label="Principal">
            <a class="brand-wordmark" href="index.html" aria-label="ALCHEMIST 3D home">
                ALCHEMIST 3D
            </a>
            <div class="nav-links" data-nav-links>
                ${NAV_LINKS.map((link) => `<a href="${link.href}" class="${pageKey === link.key ? "active" : ""}">${link.label}</a>`).join("")}
            </div>
            <div class="nav-actions">
                ${authMarkup}
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
                ${renderCatalogSlides(getCatalogImages(product), product.name)}
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

function getCatalogImages(product) {
    return product.catalogImages?.length ? product.catalogImages : product.images;
}

function buildCatalogMedia(product) {
    if (product.images?.length) {
        return `
            <div class="catalog-media product-showcase ${isKeychainProduct(product) ? "keychain-showcase" : ""}" data-project-showcase>
                ${renderCatalogSlides(getCatalogImages(product), product.name)}
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
    const resetButton = document.querySelector("[data-reset-filters]");
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

    const resetFilters = () => {
        if (searchInput) {
            searchInput.value = "";
        }

        categoryInputs.forEach((input) => {
            input.checked = false;
        });

        const defaultPriceButton = priceButtons.find((button) => (button.dataset.priceFilter || "all") === "all") || priceButtons[0];
        if (defaultPriceButton) {
            activePriceFilter = defaultPriceButton.dataset.priceFilter || "all";

            priceButtons.forEach((chip) => {
                const isActive = chip === defaultPriceButton;
                chip.classList.toggle("active", isActive);
                chip.setAttribute("aria-pressed", String(isActive));
            });
        }

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
    resetButton?.addEventListener("click", resetFilters);
    filterProducts();
}

function renderProductDetail() {
    const container = document.querySelector("[data-product-detail]");
    if (!container) return;

    const productId = new URLSearchParams(window.location.search).get("id");
    const product = PRODUCTS.find((item) => item.id === productId) || PRODUCTS[0];
    const initialVariantId = getDefaultVariantId(product);

    document.title = `${product.name} | ALCHEMIST 3D`;

    const renderView = (activeVariantId = initialVariantId) => {
        const selectedProduct = getProductSelection(product, activeVariantId);

        container.innerHTML = `
            ${buildDetailMedia(selectedProduct)}
            <div class="detail-panel reveal">
                <span class="eyebrow">DETALHE DO PRODUTO</span>
                <h1>${selectedProduct.name}</h1>
                <p>${selectedProduct.description} O design combina estetica futurista, producao sob demanda e acabamento alinhado ao DNA industrial da marca.</p>
                <div class="detail-meta">
                    <span class="price-tag">${buildProjectStatusTag(selectedProduct)}</span>
                    <span class="badge">${selectedProduct.category}</span>
                </div>
                ${buildDetailVariantPicker(product, selectedProduct.variantId || initialVariantId)}
                <div class="rating-row">
                    <span class="stars">★★★★★</span>
                    <span>4.9 de 5 com base em 128 avaliacoes</span>
                </div>
                <ul class="detail-list">
                    <li><strong>Material:</strong> ${selectedProduct.material}</li>
                    <li><strong>Tamanho:</strong> ${selectedProduct.size}</li>
                    <li><strong>Cor:</strong> ${selectedProduct.variantLabel || "Conforme imagem"}</li>
                    <li><strong>Acabamento:</strong> Fosco tecnico com detalhes de textura controlada</li>
                    <li><strong>Producao:</strong> Sob demanda com prazo medio de 4 a 7 dias uteis</li>
                </ul>
                <button class="button button-primary" type="button" data-add-cart data-product-id="${product.id}" data-variant-id="${escapeHtml(selectedProduct.variantId || "")}">Adicionar ao carrinho</button>
                <a class="link-inline" href="custom.html">Precisa desse modelo em outra escala ou cor? Solicite personalizacao.</a>
            </div>
        `;

        container.querySelectorAll("[data-detail-variant]").forEach((button) => {
            button.addEventListener("click", () => {
                renderView(button.dataset.detailVariant || initialVariantId);
            });
        });

        initProjectShowcases();
        initAddToCartButtons();
        initMediaZoom();
        initRevealAnimations();
    };

    renderView();
}

function initHeroSlider() {
    const slider = document.querySelector("[data-hero-slider]");
    const dotsContainer = document.querySelector("[data-hero-dots]");
    if (!slider || !dotsContainer) return;

    const slides = Array.from(slider.querySelectorAll(".hero-slide"));
    const heroSection = slider.closest(".hero-section");
    const mobileMediaQuery = window.matchMedia("(max-width: 640px)");
    let activeIndex = 0;

    function placeDots(index) {
        const activeSlide = slides[index];
        const activeCopy = activeSlide?.querySelector(".hero-copy");
        const activeEyebrow = activeSlide?.querySelector(".eyebrow");

        if (mobileMediaQuery.matches && activeCopy) {
            if (activeEyebrow && activeEyebrow.parentElement === activeCopy) {
                activeEyebrow.insertAdjacentElement("afterend", dotsContainer);
            } else {
                activeCopy.append(dotsContainer);
            }
            return;
        }

        heroSection?.append(dotsContainer);
    }

    function updateSlides(index) {
        activeIndex = index;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("active", slideIndex === activeIndex);
        });
        Array.from(dotsContainer.children).forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === activeIndex);
        });
        placeDots(activeIndex);
    }

    dotsContainer.innerHTML = slides.map((_, index) => `<button class="hero-dot ${index === 0 ? "active" : ""}" type="button" aria-label="Ir para slide ${index + 1}"></button>`).join("");
    Array.from(dotsContainer.children).forEach((dot, index) => {
        dot.addEventListener("click", () => updateSlides(index));
    });

    placeDots(activeIndex);
    mobileMediaQuery.addEventListener("change", () => placeDots(activeIndex));

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
    const cartCounts = document.querySelectorAll("[data-cart-count]");
    if (!cartCounts.length) return;

    const count = getCartItemCount();
    localStorage.setItem(CART_COUNT_STORAGE_KEY, String(count));
    cartCounts.forEach((cartCount) => {
        cartCount.textContent = String(count);
    });
}

function addProductToCart(productId, quantity = 1, variantId = "") {
    const cartItems = readCartItems();
    const normalizedVariantId = String(variantId || "");
    const existingItem = cartItems.find((item) => item.productId === productId && String(item.variantId || "") === normalizedVariantId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cartItems.push({ productId, variantId: normalizedVariantId, quantity });
    }

    writeCartItems(cartItems);
    updateCartCount();
}

function updateCartItemQuantity(productId, nextQuantity, variantId = "") {
    const normalizedVariantId = String(variantId || "");
    const nextItems = readCartItems()
        .map((item) => item.productId === productId && String(item.variantId || "") === normalizedVariantId ? { ...item, quantity: nextQuantity } : item)
        .filter((item) => item.quantity > 0);

    writeCartItems(nextItems);
    updateCartCount();
}

function removeCartItem(productId, variantId = "") {
    const normalizedVariantId = String(variantId || "");
    writeCartItems(readCartItems().filter((item) => !(item.productId === productId && String(item.variantId || "") === normalizedVariantId)));
    updateCartCount();
}

function renderCartPage() {
    const itemsContainer = document.querySelector("[data-cart-items]");
    if (!itemsContainer) return;

    const subtotalNode = document.querySelector("[data-cart-subtotal]");
    const shippingNode = document.querySelector("[data-cart-shipping]");
    const totalNode = document.querySelector("[data-cart-total]");
    const noteNode = document.querySelector("[data-cart-note]");
    const checkoutButton = document.querySelector("[data-cart-checkout]");
    const entries = getCartEntries();
    const summary = buildCartSummary(entries);

    itemsContainer.innerHTML = entries.length
        ? entries.map(buildCartItemMarkup).join("")
        : buildTestimonialsEmptyState("Seu carrinho esta vazio", "Adicione itens na pagina do produto para montar o pedido antes de seguir para o checkout.");

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.subtotal);
    if (shippingNode) shippingNode.textContent = formatCurrency(summary.shipping);
    if (totalNode) totalNode.textContent = formatCurrency(summary.total);

    if (noteNode) {
        noteNode.hidden = !summary.hasConsultationItems;
        noteNode.textContent = summary.hasConsultationItems ? "Itens sob consulta entram no carrinho, mas nao participam do total automatico ate a confirmacao do valor final." : "";
    }

    if (checkoutButton) {
        const isDisabled = !entries.length;
        checkoutButton.classList.toggle("is-disabled", isDisabled);
        checkoutButton.setAttribute("aria-disabled", String(isDisabled));
        if (isDisabled) {
            checkoutButton.addEventListener("click", preventDefaultLink);
        } else {
            checkoutButton.removeEventListener("click", preventDefaultLink);
        }
    }

    itemsContainer.querySelectorAll("[data-cart-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const productId = button.dataset.productId;
            const variantId = button.dataset.variantId || "";
            const action = button.dataset.cartAction;
            const currentItem = readCartItems().find((item) => item.productId === productId && String(item.variantId || "") === variantId);
            if (!productId || !action || !currentItem) return;

            if (action === "increase") {
                updateCartItemQuantity(productId, currentItem.quantity + 1, variantId);
            }

            if (action === "decrease") {
                updateCartItemQuantity(productId, currentItem.quantity - 1, variantId);
            }

            if (action === "remove") {
                removeCartItem(productId, variantId);
            }

            renderCartPage();
        });
    });
}

function renderCheckoutSummary() {
    const subtotalNode = document.querySelector("[data-checkout-subtotal]");
    const shippingNode = document.querySelector("[data-checkout-shipping]");
    const totalNode = document.querySelector("[data-checkout-total]");
    const noteNode = document.querySelector("[data-checkout-note]");
    if (!subtotalNode && !shippingNode && !totalNode && !noteNode) return;

    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || "delivery";
    const summary = buildCartSummary(getCartEntries(), { isPickup: deliveryMethod === "pickup" });

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.subtotal);
    if (shippingNode) shippingNode.textContent = formatCurrency(summary.shipping);
    if (totalNode) totalNode.textContent = formatCurrency(summary.total);
    if (noteNode) {
        noteNode.hidden = !summary.hasConsultationItems;
        noteNode.textContent = summary.hasConsultationItems ? "Itens sob consulta serao confirmados manualmente antes da cobranca final." : "";
    }
}

function initAuthPage() {
    const registerForm = document.querySelector("[data-auth-register-form]");
    const loginForm = document.querySelector("[data-auth-login-form]");
    const forgotForm = document.querySelector("[data-auth-forgot-form]");
    const tabButtons = document.querySelectorAll("[data-auth-tab]");
    const panels = document.querySelectorAll("[data-auth-panel]");
    if (!registerForm && !loginForm && !forgotForm) return;

    const registerPasswordInput = registerForm?.querySelector('#register-password');
    const registerPasswordHints = registerForm?.querySelector('[data-password-hints="register"]');
    const forgotPasswordInput = forgotForm?.querySelector('#forgot-password');
    const forgotPasswordHints = forgotForm?.querySelector('[data-password-hints="forgot"]');

    initSaoPauloCityFields(registerForm || document);

    if (registerPasswordInput && registerPasswordHints) {
        const syncRegisterHints = () => syncPasswordHints(registerPasswordInput, registerPasswordHints);
        registerPasswordInput.addEventListener("input", syncRegisterHints);
        registerPasswordInput.addEventListener("blur", syncRegisterHints);
        syncRegisterHints();
    }

    if (forgotPasswordInput && forgotPasswordHints) {
        const syncForgotHints = () => syncPasswordHints(forgotPasswordInput, forgotPasswordHints);
        forgotPasswordInput.addEventListener("input", syncForgotHints);
        forgotPasswordInput.addEventListener("blur", syncForgotHints);
        syncForgotHints();
    }

    const switchToPanel = (panelKey) => {
        tabButtons.forEach((button) => {
            const isActive = button.dataset.authTab === panelKey;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });

        panels.forEach((panel) => {
            const isActive = panel.dataset.authPanel === panelKey;
            panel.classList.toggle("active", isActive);
            panel.hidden = !isActive;
        });
    };

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => switchToPanel(button.dataset.authTab || "register"));
    });

    document.querySelectorAll("[data-auth-tab-trigger]").forEach((button) => {
        button.addEventListener("click", () => {
            switchToPanel(button.dataset.authTabTrigger || "login");
        });
    });

    registerForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const feedbackNode = registerForm.querySelector("[data-register-feedback]");
        const formData = new FormData(registerForm);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");
        const state = SAO_PAULO_STATE_CODE;
        const city = String(formData.get("city") || "").trim();
        const passwordErrorMessage = buildPasswordErrorMessage(password);

        if (!validateBrazilPhone(formData.get("phone"))) {
            setFormFeedback(feedbackNode, "Informe um telefone brasileiro valido com DDD.");
            return;
        }

        const saoPauloCities = await fetchSaoPauloCities();

        if (!validateCpf(formData.get("cpf"))) {
            setFormFeedback(feedbackNode, "Informe um CPF valido para concluir o cadastro.");
            return;
        }

        if (!saoPauloCities.includes(city)) {
            setFormFeedback(feedbackNode, "Selecione uma cidade valida do estado de Sao Paulo.");
            return;
        }

        if (passwordErrorMessage) {
            setFormFeedback(feedbackNode, passwordErrorMessage);
            return;
        }

        if (password !== confirmPassword) {
            setFormFeedback(feedbackNode, "Senha invalida: a confirmacao nao confere com a senha informada.");
            return;
        }

        const result = createUser({
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            cpf: formData.get("cpf"),
            state,
            city,
            password
        });

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        setFormFeedback(feedbackNode, "Cadastro concluido. Redirecionando para sua area do usuario.", "success");
        window.setTimeout(() => {
            window.location.href = "account.html";
        }, 700);
    });

    loginForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedbackNode = loginForm.querySelector("[data-login-feedback]");
        const formData = new FormData(loginForm);
        const result = authenticateUser(formData.get("email"), formData.get("password"));

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        setFormFeedback(feedbackNode, "Login realizado com sucesso. Abrindo sua area do usuario.", "success");
        window.setTimeout(() => {
            window.location.href = "account.html";
        }, 500);
    });

    forgotForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedbackNode = forgotForm.querySelector("[data-forgot-feedback]");
        const formData = new FormData(forgotForm);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");
        const passwordErrorMessage = buildPasswordErrorMessage(password);

        if (!validateBrazilPhone(formData.get("phone"))) {
            setFormFeedback(feedbackNode, "Informe o telefone cadastrado com DDD valido.");
            return;
        }

        if (passwordErrorMessage) {
            setFormFeedback(feedbackNode, passwordErrorMessage);
            return;
        }

        if (password !== confirmPassword) {
            setFormFeedback(feedbackNode, "Senha invalida: a confirmacao nao confere com a nova senha.");
            return;
        }

        const result = updateUserPassword(formData.get("email"), formData.get("phone"), password);
        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        setFormFeedback(feedbackNode, "Senha atualizada com sucesso. Agora voce ja pode entrar.", "success");
        window.setTimeout(() => {
            switchToPanel("login");
        }, 600);
    });
}

function renderAccountPage() {
    const shell = document.querySelector("[data-account-shell]");
    if (!shell) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        shell.innerHTML = `
            <div class="empty-state">
                <strong>Voce ainda nao entrou</strong>
                <p>Faca login ou crie uma conta para visualizar seus pedidos feitos e informacoes do perfil.</p>
                <a class="button button-primary" href="auth.html">Ir para entrar</a>
            </div>
        `;
        return;
    }

    const userOrders = getOrdersByUser(currentUser.email);
    const userRequests = getRequestsByUser(currentUser.email);
    const latestOrder = userOrders[0] || null;
    const ordersMarkup = latestOrder
        ? `
            <article class="order-card">
                <div class="order-card-summary">
                    <div class="order-copy">
                        <strong>Pedido ${escapeHtml(latestOrder.id)}</strong>
                        <span>Pedido feito em ${escapeHtml(formatOrderDateTime(latestOrder.createdAt))}</span>
                        <span>${escapeHtml(String(latestOrder.items.length))} item${latestOrder.items.length > 1 ? "s" : ""} nesta leva</span>
                    </div>
                    <div class="order-meta">
                        <span class="order-status-text">${escapeHtml(latestOrder.status)}</span>
                        <strong>${formatCurrency(latestOrder.total)}</strong>
                    </div>
                </div>
                <div class="order-card-actions">
                    <a class="button button-secondary order-details-button" href="order.html?id=${encodeURIComponent(latestOrder.id)}">Ver detalhes</a>
                </div>
            </article>
            <div class="orders-summary-actions">
                <a class="button button-primary orders-all-button" href="orders.html" target="_blank" rel="noreferrer">Ver todos os pedidos</a>
            </div>
        `
        : '<div class="empty-state"><strong>Nenhum pedido finalizado</strong><p>Assim que voce concluir um checkout, o pedido aparecera aqui automaticamente.</p></div>';

    const requestsMarkup = userRequests.length
        ? userRequests.map((request) => `
            <article class="request-card">
                <div class="request-card-head">
                    <div>
                        <strong>${escapeHtml(request.title)}</strong>
                        <p class="microcopy">${escapeHtml(new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(request.createdAt)))} · ${escapeHtml(request.type === "custom" ? "Solicitacao personalizada" : "Mensagem de contato")}</p>
                    </div>
                    <span class="pill">${escapeHtml(request.status)}</span>
                </div>
                <div class="request-card-body">
                    <div>
                        <span class="request-label">Solicitacao enviada</span>
                        <p>${escapeHtml(request.message)}</p>
                    </div>
                    <div>
                        <span class="request-label">Resposta da loja</span>
                        <p>${escapeHtml(request.storeResponse)}</p>
                    </div>
                </div>
            </article>
        `).join("")
        : '<div class="empty-state"><strong>Nenhuma solicitacao registrada</strong><p>As solicitacoes enviadas pelas paginas de personalizados e contato aparecerao aqui com a resposta da loja.</p></div>';

    shell.innerHTML = `
        <div class="account-hero">
            <div class="account-hero-copy">
                <span class="eyebrow">PERFIL</span>
                <h1>Perfil de ${escapeHtml(currentUser.firstName)}</h1>
                <p>Edite seus dados principais, acompanhe pedidos e veja as respostas da loja para todas as suas solicitacoes em um unico painel.</p>
            </div>
            <button class="button button-secondary" type="button" data-account-logout>Sair</button>
        </div>
        <div class="account-metrics-grid">
            <article class="account-metric-card">
                <span>Pedidos feitos</span>
                <strong>${String(userOrders.length)}</strong>
            </article>
            <article class="account-metric-card">
                <span>Ultima atualizacao</span>
                <strong>${latestOrder ? formatOrderDate(latestOrder.createdAt) : "Sem pedidos"}</strong>
            </article>
            <article class="account-metric-card">
                <span>Status mais recente</span>
                <strong>${escapeHtml(latestOrder?.status || "Conta ativa")}</strong>
            </article>
            <article class="account-metric-card">
                <span>Solicitacoes</span>
                <strong>${String(userRequests.length)}</strong>
            </article>
        </div>
        <div class="account-sections-grid">
            <section class="account-section-card">
                <div class="account-section-head">
                    <h3>Dados do perfil</h3>
                    <p class="microcopy">Email e CPF ficam fixos apos o cadastro. Nome, telefone e cidade podem ser atualizados.</p>
                </div>
                <form class="form-grid two-columns" data-account-profile-form>
                    <div class="field">
                        <label for="account-full-name">Nome completo</label>
                        <input id="account-full-name" name="fullName" type="text" value="${escapeHtml(currentUser.fullName)}" required>
                    </div>
                    <div class="field">
                        <label for="account-phone">Telefone</label>
                        <input id="account-phone" name="phone" type="tel" value="${escapeHtml(currentUser.phone)}" required>
                    </div>
                    <div class="field">
                        <label for="account-email">Email</label>
                        <input id="account-email" type="email" value="${escapeHtml(currentUser.email)}" readonly>
                    </div>
                    <div class="field">
                        <label for="account-cpf">CPF</label>
                        <input id="account-cpf" type="text" value="${escapeHtml(currentUser.cpf || "Nao informado")}" readonly>
                    </div>
                    <div class="field">
                        <label for="account-state">Estado</label>
                        <input id="account-state" type="text" value="Sao Paulo" readonly>
                    </div>
                    <div class="field">
                        <label for="account-city">Cidade</label>
                        <select id="account-city" name="city" data-sp-city data-initial-value="${escapeHtml(currentUser.city)}" required>
                            <option value="">Carregando cidades de Sao Paulo...</option>
                        </select>
                    </div>
                    <div class="form-feedback" data-account-feedback hidden></div>
                    <div class="auth-actions" style="grid-column: 1 / -1;">
                        <button class="button button-primary" type="submit">Salvar alteracoes</button>
                    </div>
                </form>
            </section>
            <section class="account-section-card">
                <div class="account-section-head">
                    <h3>Seus pedidos</h3>
                    <p class="microcopy">Acompanhe aqui os pedidos finalizados no checkout.</p>
                </div>
                <div class="status-list">${ordersMarkup}</div>
            </section>
            <section class="account-section-card account-section-card-wide">
                <div class="account-section-head">
                    <h3>Suas solicitacoes</h3>
                    <p class="microcopy">Veja o que voce enviou para a loja e a resposta mais recente da equipe.</p>
                </div>
                <div class="request-list">${requestsMarkup}</div>
            </section>
        </div>
    `;

    initSaoPauloCityFields(shell);
    initMaskedInputs(shell);

    shell.querySelector("[data-account-profile-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const feedbackNode = form.querySelector("[data-account-feedback]");
        const formData = new FormData(form);
        const city = String(formData.get("city") || "").trim();
        const saoPauloCities = await fetchSaoPauloCities();

        if (!saoPauloCities.includes(city)) {
            setFormFeedback(feedbackNode, "Selecione uma cidade valida do estado de Sao Paulo.");
            return;
        }

        const result = updateUserProfile(currentUser.email, {
            fullName: formData.get("fullName"),
            phone: formData.get("phone"),
            city
        });

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        injectHeader();
        renderAccountPage();
    });

    shell.querySelector("[data-account-logout]")?.addEventListener("click", () => {
        logoutCurrentUser();
        window.location.href = "auth.html";
    });
}

function renderOrdersPage() {
    const shell = document.querySelector("[data-orders-shell]");
    if (!shell) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        shell.innerHTML = `
            <div class="empty-state">
                <strong>Entre para ver seus pedidos</strong>
                <p>Faca login para abrir a listagem completa dos seus pedidos.</p>
                <a class="button button-primary" href="auth.html">Ir para entrar</a>
            </div>
        `;
        return;
    }

    const userOrders = getOrdersByUser(currentUser.email);
    const ordersMarkup = userOrders.length
        ? userOrders.map((order) => `
            <article class="order-card">
                <div class="order-card-summary">
                    <div class="order-copy">
                        <strong>Pedido ${escapeHtml(order.id)}</strong>
                        <span>Pedido feito em ${escapeHtml(formatOrderDateTime(order.createdAt))}</span>
                        <span>${escapeHtml(String(order.items.length))} item${order.items.length > 1 ? "s" : ""} nesta leva</span>
                    </div>
                    <div class="order-meta">
                        <span class="order-status-text">${escapeHtml(order.status)}</span>
                        <strong>${formatCurrency(order.total)}</strong>
                    </div>
                </div>
                <div class="order-card-actions">
                    <a class="button button-secondary order-details-button" href="order.html?id=${encodeURIComponent(order.id)}">Ver detalhes</a>
                </div>
            </article>
        `).join("")
        : '<div class="empty-state"><strong>Nenhum pedido finalizado</strong><p>Assim que voce concluir um checkout, o pedido aparecera aqui automaticamente.</p></div>';

    shell.innerHTML = `
        <div class="orders-page-shell">
            <div class="order-page-hero">
                <div class="order-page-copy">
                    <span class="eyebrow">PEDIDOS</span>
                    <h1>Todos os seus pedidos</h1>
                    <p>Aqui ficam listadas todas as compras feitas na sua conta, sem acumular a visualizacao dentro do perfil principal.</p>
                </div>
                <div class="order-page-actions">
                    <a class="button button-secondary" href="account.html">Voltar para o perfil</a>
                </div>
            </div>
            <section class="account-section-card">
                <div class="account-section-head">
                    <h3>Historico completo</h3>
                    <p class="microcopy">Todos os pedidos feitos aparecem separados, do mais recente ao mais antigo.</p>
                </div>
                <div class="status-list">${ordersMarkup}</div>
            </section>
        </div>
    `;
}

function initCheckoutPage() {
    const form = document.querySelector("[data-checkout-form]");
    const submitButton = document.querySelector("[data-checkout-submit]");
    const feedbackNode = document.querySelector("[data-checkout-feedback]");
    if (!form || !submitButton) return;

    const pixPanel = document.querySelector("[data-pix-panel]");
    const pixQrImage = document.querySelector("[data-pix-qr]");
    const pixCodeNode = document.querySelector("[data-pix-code]");
    const pixExpiryNode = document.querySelector("[data-pix-expiry]");
    const pixAmountNode = document.querySelector("[data-pix-amount]");
    const pixCopyButton = document.querySelector("[data-pix-copy]");
    const pixConfirmButton = document.querySelector("[data-pix-confirm]");
    const pixCloseButtons = document.querySelectorAll("[data-pix-close]");
    const pickupCard = document.querySelector("[data-pickup-card]");
    const pickupWhatsappLink = document.querySelector("[data-pickup-whatsapp]");
    const deliveryInputs = form.querySelectorAll('input[name="deliveryMethod"]');
    const addressFields = form.querySelectorAll("[data-address-field]");

    const currentUser = getCurrentUser();
    const citySelect = form.querySelector("[data-sp-city]");
    let pixSession = null;
    let pixCountdownTimer = null;

    const getDeliveryMethod = () => form.querySelector('input[name="deliveryMethod"]:checked')?.value || "delivery";

    const getCheckoutSummary = () => buildCartSummary(getCartEntries(), { isPickup: getDeliveryMethod() === "pickup" });

    const syncPickupContactLink = () => {
        if (!pickupWhatsappLink) return;

        const formData = new FormData(form);
        const summary = getCheckoutSummary();
        pickupWhatsappLink.href = buildPickupWhatsAppUrl({
            fullName: formData.get("fullName"),
            city: formData.get("city"),
            total: summary.total
        });
    };

    const syncDeliveryMode = () => {
        const isPickup = getDeliveryMethod() === "pickup";

        addressFields.forEach((field) => {
            field.hidden = isPickup;
            field.querySelectorAll("input, select").forEach((input) => {
                if (input.name === "city") {
                    input.required = !isPickup;
                }
            });
        });

        if (pickupCard) {
            pickupCard.hidden = !isPickup;
        }

        syncPickupContactLink();
        renderCheckoutSummary();
    };

    const stopPixCountdown = () => {
        if (pixCountdownTimer) {
            window.clearInterval(pixCountdownTimer);
            pixCountdownTimer = null;
        }
    };

    const formatPixCountdown = (expiresAt) => {
        const remainingMs = new Date(expiresAt).getTime() - Date.now();
        if (remainingMs <= 0) {
            return "Expirado";
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
        const seconds = String(remainingSeconds % 60).padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    const syncPixCountdown = () => {
        if (!pixSession || !pixExpiryNode || !pixConfirmButton || !submitButton) return;

        const countdownLabel = formatPixCountdown(pixSession.expiresAt);
        const isExpired = countdownLabel === "Expirado";

        pixExpiryNode.textContent = countdownLabel;
        pixPanel?.classList.toggle("is-expired", isExpired);
        pixConfirmButton.disabled = isExpired;
        pixConfirmButton.textContent = isExpired ? "Pix expirado" : "Confirmar pagamento Pix";
        submitButton.textContent = isExpired ? "Gerar novo QR Code Pix" : "Regenerar QR Code Pix";

        if (isExpired) {
            stopPixCountdown();
            setFormFeedback(feedbackNode, "O QR Code Pix expirou. Gere um novo pagamento para concluir o pedido.");
        }
    };

    const showPixPayment = (session) => {
        pixSession = session;
        if (pixQrImage) {
            pixQrImage.src = session.qrCodeUrl;
            pixQrImage.alt = `QR Code Pix do pedido ${session.orderId}`;
        }
        if (pixCodeNode) {
            pixCodeNode.textContent = session.pixCode;
        }
        if (pixAmountNode) {
            pixAmountNode.textContent = formatCurrency(session.total);
        }
        if (pixPanel) {
            pixPanel.hidden = false;
        }
        document.body.classList.add("has-pix-screen");

        stopPixCountdown();
        syncPixCountdown();
        pixCountdownTimer = window.setInterval(syncPixCountdown, 1000);
    };

    const hidePixPayment = () => {
        if (pixPanel) {
            pixPanel.hidden = true;
        }
        document.body.classList.remove("has-pix-screen");
    };

    const buildCheckoutPayload = (loggedUser) => {
        const entries = getCartEntries();
        const deliveryMethod = getDeliveryMethod();
        const isPickup = deliveryMethod === "pickup";
        const summary = buildCartSummary(entries, { isPickup });

        if (!loggedUser) {
            return { ok: false, message: "Entre na sua conta antes de finalizar o pedido." };
        }

        if (!entries.length) {
            return { ok: false, message: "Seu carrinho esta vazio. Adicione produtos antes de finalizar o pedido." };
        }

        const formData = new FormData(form);
        const state = SAO_PAULO_STATE_CODE;
        const city = String(formData.get("city") || (currentUser?.city || SAO_PAULO_PRIORITY_CITY)).trim();

        if (!String(formData.get("fullName") || "").trim()) {
            return { ok: false, message: "Preencha nome completo para gerar o pagamento Pix." };
        }

        if (!validateBrazilPhone(formData.get("phone"))) {
            return { ok: false, message: "Informe um telefone brasileiro valido com DDD." };
        }

        if (!isPickup && !String(formData.get("street") || "").trim()) {
            return { ok: false, message: "Preencha o endereco para entrega ou selecione retirada com o vendedor." };
        }

        if (!SAO_PAULO_SERVICE_CITIES.includes(city)) {
            return { ok: false, message: "Selecione uma cidade atendida na regiao de Sao Paulo ou Campinas." };
        }

        return {
            ok: true,
            payload: {
                entries,
                summary,
                formData,
                deliveryMethod,
                state,
                city,
                orderId: `ALC-${Date.now()}`
            }
        };
    };

    if (currentUser) {
        form.elements.fullName.value = currentUser.fullName;
        form.elements.phone.value = currentUser.phone;
        if (citySelect) {
            citySelect.dataset.initialValue = currentUser.city;
        }
    }
    initSaoPauloCityFields(form);
    deliveryInputs.forEach((input) => input.addEventListener("change", syncDeliveryMode));
    form.querySelectorAll('input[name="fullName"], input[name="phone"], select[name="city"]').forEach((input) => {
        input.addEventListener("input", syncPickupContactLink);
        input.addEventListener("change", syncPickupContactLink);
    });
    syncDeliveryMode();

    submitButton.addEventListener("click", () => {
        const loggedUser = getCurrentUser();
        const result = buildCheckoutPayload(loggedUser);

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            if (!loggedUser) {
                window.setTimeout(() => {
                    window.location.href = "auth.html";
                }, 900);
            }
            return;
        }

        const { payload } = result;
        const paymentSession = createPixPaymentSession({
            total: payload.summary.total,
            orderId: payload.orderId,
            customerName: payload.formData.get("fullName")
        });

        showPixPayment(paymentSession);
        setFormFeedback(feedbackNode, `Pagamento Pix gerado para o pedido ${paymentSession.orderId}. Conclua em ate 4 minutos.`, "success");
    });

    pixCopyButton?.addEventListener("click", async () => {
        if (!pixSession?.pixCode) return;

        try {
            await navigator.clipboard.writeText(pixSession.pixCode);
            setFormFeedback(feedbackNode, "Codigo Pix copiado. Cole no app do seu banco para pagar.", "success");
        } catch {
            setFormFeedback(feedbackNode, "Nao foi possivel copiar automaticamente. Copie o codigo Pix manualmente.");
        }
    });

    pixConfirmButton?.addEventListener("click", () => {
        const loggedUser = getCurrentUser();
        const result = buildCheckoutPayload(loggedUser);

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        if (!pixSession) {
            setFormFeedback(feedbackNode, "Gere primeiro o QR Code Pix para concluir o pagamento.");
            window.setTimeout(() => {
                submitButton.focus();
            }, 80);
            return;
        }

        if (new Date(pixSession.expiresAt).getTime() <= Date.now()) {
            syncPixCountdown();
            return;
        }

        const { payload } = result;
        const nextOrder = normalizeOrder({
            id: pixSession.orderId,
            userEmail: loggedUser.email,
            fullName: payload.formData.get("fullName"),
            phone: payload.formData.get("phone"),
            state: payload.state,
            city: payload.city,
            street: payload.deliveryMethod === "pickup" ? "Retirada com o vendedor" : payload.formData.get("street"),
            zip: payload.deliveryMethod === "pickup" ? "" : payload.formData.get("zip"),
            paymentMethod: "Pix",
            deliveryMethod: payload.deliveryMethod,
            subtotal: payload.summary.subtotal,
            shipping: payload.summary.shipping,
            total: payload.summary.total,
            status: ORDER_STATUS_FLOW[1],
            items: payload.entries.map((entry) => ({
                productId: entry.product.id,
                variantId: entry.variantId || entry.product.variantId || "",
                productName: entry.product.name,
                variantLabel: entry.product.variantLabel,
                quantity: entry.quantity,
                unitPrice: entry.product.price
            })),
            createdAt: new Date().toISOString()
        });

        const orders = readOrders();
        orders.unshift(nextOrder);
        writeOrders(orders);
        writeCartItems([]);
        updateCartCount();
        renderCheckoutSummary();
        stopPixCountdown();
        hidePixPayment();
        setFormFeedback(feedbackNode, `Pedido ${nextOrder.id} criado com sucesso. Redirecionando para sua area do usuario.`, "success");
        window.setTimeout(() => {
            window.location.href = "account.html";
        }, 900);
    });

    pixCloseButtons.forEach((button) => {
        button.addEventListener("click", () => {
            hidePixPayment();
        });
    });
}

function renderOrderDetailPage() {
    const shell = document.querySelector("[data-order-shell]");
    if (!shell) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
        shell.innerHTML = `
            <div class="empty-state">
                <strong>Entre para ver o pedido</strong>
                <p>Faca login para acessar os detalhes completos do pedido.</p>
                <a class="button button-primary" href="auth.html">Ir para entrar</a>
            </div>
        `;
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("id") || "";
    const order = getOrderById(orderId);

    if (!order || order.userEmail !== currentUser.email) {
        shell.innerHTML = `
            <div class="empty-state">
                <strong>Pedido nao encontrado</strong>
                <p>Esse pedido nao existe ou nao pertence a conta atual.</p>
                <a class="button button-primary" href="account.html">Voltar para seus pedidos</a>
            </div>
        `;
        return;
    }

    const itemsMarkup = order.items.map((item) => {
        const product = resolveOrderItemSelection(item);
        const image = product ? getProductPrimaryImage(product) : "";

        return `
            <article class="order-line-card">
                ${image ? `<div class="order-line-thumb"><img src="${image}" alt="${escapeHtml(item.productName)}" loading="lazy"></div>` : ""}
                <div class="order-line-copy">
                    <strong>${escapeHtml(item.variantLabel ? `${item.productName} (${item.variantLabel})` : item.productName)}</strong>
                    <p class="microcopy">${escapeHtml(item.quantity)} unidade${item.quantity > 1 ? "s" : ""} · ${formatCurrency(item.unitPrice)} por unidade</p>
                </div>
                <strong>${formatCurrency(item.unitPrice * item.quantity)}</strong>
            </article>
        `;
    }).join("");

    shell.innerHTML = `
        <div class="order-page-shell">
            <div class="order-page-hero">
                <div class="order-page-copy">
                    <span class="eyebrow">PEDIDO</span>
                    <h1>${escapeHtml(order.id)}</h1>
                    <p>Pedido realizado em ${escapeHtml(formatOrderDateTime(order.createdAt))}. Aqui voce acompanha essa leva sem alterar o restante da sua area de perfil.</p>
                </div>
                <div class="order-page-actions">
                    <span class="pill">${escapeHtml(order.status)}</span>
                    <a class="button button-secondary" href="account.html">Voltar para meus pedidos</a>
                </div>
            </div>
            <div class="order-page-grid">
                <section class="account-section-card order-page-media-card">
                    <div class="account-section-head">
                        <h3>Imagem do pedido</h3>
                        <p class="microcopy">Quando o item tem imagem cadastrada, ela aparece aqui como referencia visual da sua compra.</p>
                    </div>
                    ${buildOrderLeadMedia(order)}
                </section>
                <section class="account-section-card order-page-summary-card">
                    <div class="account-section-head">
                        <h3>Resumo do pedido</h3>
                        <p class="microcopy">Detalhes desta compra e da entrega informada no checkout.</p>
                    </div>
                    <div class="order-info-list">
                        <p><strong>Data do pedido:</strong> ${escapeHtml(formatOrderDate(order.createdAt))}</p>
                        <p><strong>Horario:</strong> ${escapeHtml(formatOrderDateTime(order.createdAt).split(" ").pop() || "")}</p>
                        <p><strong>Pagamento:</strong> ${escapeHtml(order.paymentMethod)}</p>
                        <p><strong>Total:</strong> ${formatCurrency(order.total)}</p>
                        <p><strong>Entrega:</strong> ${escapeHtml(order.street)}, ${escapeHtml(order.city)} - ${escapeHtml(order.state)}</p>
                    </div>
                </section>
                <section class="account-section-card account-section-card-wide">
                    <div class="account-section-head">
                        <h3>Itens da leva</h3>
                        <p class="microcopy">Cada item comprado neste pedido aparece separado aqui.</p>
                    </div>
                    <div class="order-line-list">${itemsMarkup}</div>
                </section>
                <section class="account-section-card account-section-card-wide">
                    <div class="account-section-head">
                        <h3>Etapas do pedido</h3>
                        <p class="microcopy">Fluxo completo do pedido, do envio ate a finalizacao.</p>
                    </div>
                    <ol class="order-timeline order-timeline-detailed">${buildOrderTimelineMarkup(order.status)}</ol>
                </section>
            </div>
        </div>
    `;
}

function preventDefaultLink(event) {
    event.preventDefault();
}

function initAddToCartButtons() {
    const buttons = document.querySelectorAll("[data-add-cart]");
    if (!buttons.length) return;

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const productId = button.dataset.productId;
            const variantId = button.dataset.variantId || "";
            if (!productId) return;

            addProductToCart(productId, 1, variantId);
            button.textContent = "Adicionado ao carrinho";
            window.setTimeout(() => {
                button.textContent = "Adicionar ao carrinho";
            }, 1800);
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

function initCustomRequestForm() {
    const form = document.querySelector("[data-custom-request-form]");
    const feedbackNode = document.querySelector("[data-custom-feedback]");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentUser = getCurrentUser();
        if (!currentUser) {
            setFormFeedback(feedbackNode, "Entre na sua conta para enviar solicitacoes e acompanhar a resposta da loja no perfil.");
            return;
        }

        const formData = new FormData(form);
        const description = String(formData.get("description") || "").trim();
        const sizeReference = String(formData.get("sizeReference") || "").trim();

        if (!description) {
            setFormFeedback(feedbackNode, "Descreva o projeto para enviar a solicitacao.");
            return;
        }

        const result = createTrackedRequest({
            id: `REQ-${Date.now()}`,
            userEmail: currentUser.email,
            type: "custom",
            title: "Solicitacao de projeto personalizado",
            message: sizeReference ? `${description} Tamanho informado: ${sizeReference}` : description,
            status: "Recebida",
            storeResponse: buildStoreResponse("custom"),
            createdAt: new Date().toISOString(),
            respondedAt: new Date().toISOString()
        });

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        form.reset();
        document.querySelector("[data-upload-label]") && (document.querySelector("[data-upload-label]").textContent = "Arraste o arquivo aqui ou clique para selecionar");
        setFormFeedback(feedbackNode, "Solicitacao enviada. A resposta da loja ja esta disponivel na sua area de perfil.", "success");
    });
}

function initContactRequestForm() {
    const form = document.querySelector("[data-contact-request-form]");
    const feedbackNode = document.querySelector("[data-contact-feedback]");
    if (!form) return;

    const currentUser = getCurrentUser();
    if (currentUser) {
        const nameInput = form.querySelector('[name="name"]');
        const emailInput = form.querySelector('[name="email"]');
        if (nameInput) nameInput.value = currentUser.fullName;
        if (emailInput) emailInput.value = currentUser.email;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const linkedUser = getCurrentUser() || findUserByEmail(formData.get("email"));
        const subject = String(formData.get("subject") || "").trim();
        const message = String(formData.get("message") || "").trim();

        if (!linkedUser) {
            setFormFeedback(feedbackNode, "Use um email cadastrado ou entre na conta para que a solicitacao apareca no seu perfil.");
            return;
        }

        if (!subject || !message) {
            setFormFeedback(feedbackNode, "Preencha assunto e mensagem para enviar a solicitacao.");
            return;
        }

        const result = createTrackedRequest({
            id: `REQ-${Date.now()}`,
            userEmail: linkedUser.email,
            type: "contact",
            title: subject,
            message,
            status: "Respondida",
            storeResponse: buildStoreResponse("contact"),
            createdAt: new Date().toISOString(),
            respondedAt: new Date().toISOString()
        });

        if (!result.ok) {
            setFormFeedback(feedbackNode, result.message);
            return;
        }

        form.reset();
        if (linkedUser) {
            const nameInput = form.querySelector('[name="name"]');
            const emailInput = form.querySelector('[name="email"]');
            if (nameInput) nameInput.value = linkedUser.fullName;
            if (emailInput) emailInput.value = linkedUser.email;
        }
        setFormFeedback(feedbackNode, "Mensagem enviada. A resposta da loja foi vinculada a sua area de perfil.", "success");
    });
}

injectHeader();
injectFooter();
renderFeaturedProducts();
renderHomeKeychains();
renderHomeTestimonials();
renderCatalogPage();
renderProductDetail();
renderAccountPage();
renderOrdersPage();
renderOrderDetailPage();
renderFeedbackHub();
renderCartPage();
renderCheckoutSummary();
initProjectShowcases();
initHeroSlider();
initRevealAnimations();
initBackToTop();
initPreviewCube();
initBrazilLocationFields();
initSaoPauloCityFields();
syncCartItemCount();
updateCartCount();
initAddToCartButtons();
initMediaZoom();
initAuthPage();
initCheckoutPage();
initPreviewControls();
initMaskedInputs();
initUploadField();
initCustomRequestForm();
initContactRequestForm();
initFeedbackForm();
initTestimonialsRealtime();

window.ALCHEMIST_PRODUCTS = PRODUCTS;
window.ALCHEMIST_UTILS = { formatCurrency, getCurrentUser, readOrders, readRequests };