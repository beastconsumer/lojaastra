import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";

console.log("[admin:app.js] Script loaded, imports completed");

window.onerror = function(msg, url, line, col, error) {
  console.error("[admin:app.js] Global error:", msg, url, line, col);
  const root = document.getElementById("root");
  if (root) root.innerHTML = `<div style="color: red; padding: 20px; background: #1a0505;">
    <h2>Erro JavaScript</h2>
    <p>${msg}</p>
    <p>Linha: ${line}, Coluna: ${col}</p>
    <pre>${error?.stack || ""}</pre>
  </div>`;
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('[admin:app.js] Unhandled rejection:', event.reason);
  const root = document.getElementById("root");
  if (root) root.innerHTML = `<div style="color: red; padding: 20px; background: #1a0505;">
    <h2>Erro Promise</h2>
    <pre>${event.reason?.stack || event.reason}</pre>
  </div>`;
});

const html = htm.bind(React.createElement);

const emptyProduct = () => ({
  id: "",
  name: "",
  shortLabel: "",
  description: "",
  pixInstructions: "",
  deliveryDmTitle: "",
  deliveryDmMessage: "",
  deliveryDmMessagePix: "",
  deliveryDmMessageAdmin: "",
  demoUrl: "",
  disableThumbnail: false,
  bannerImage: "",
  previewImage: "",
  thumbnail: "",
  footerImage: "",
  prePostGif: ""
});

const emptyConfig = () => ({
  staffRoleId: "",
  adminUserIds: "",
  cartCategoryId: "",
  trackerChannelId: "",
  staffLogChannelId: "",
  postChannelId: "",
  systemBanner: "",
  pixInstructions: "",
  paymentCheckIntervalMs: "",
  maxAttachmentBytes: "",
  couponCode: "",
  couponPercent: "",
  couponActive: true
});

const sectionLinks = [
  { id: "dashboard-panel", label: "Resumo" },
  { id: "business-panel", label: "Operacao" },
  { id: "requests-panel", label: "Solicitacoes" },
  { id: "accounts-panel", label: "Contas" },
  { id: "timeline-panel", label: "Auditoria" },
  { id: "orders-panel", label: "Pedidos" },
  { id: "carts-panel", label: "Carrinhos" },
  { id: "deliveries-panel", label: "Entregas" },
  { id: "customers-panel", label: "Clientes" },
  { id: "product-panel", label: "Produto", editOnly: true },
  { id: "media-panel", label: "Midias", editOnly: true },
  { id: "sections-panel", label: "Secoes", editOnly: true },
  { id: "variants-panel", label: "Variacoes", editOnly: true },
  { id: "stock-panel", label: "Estoque", editOnly: true },
  { id: "actions-panel", label: "Acoes", editOnly: true },
  { id: "config-panel", label: "Config", editOnly: true },
  { id: "coupons-panel", label: "Cupons", editOnly: true },
  { id: "posts-panel", label: "Posts", editOnly: true }
];

const emptyBusinessOverview = () => ({
  generatedAt: "",
  summary: {
    usersTotal: 0,
    usersActivePlan: 0,
    usersTrialUsed: 0,
    instancesTotal: 0,
    instancesWithToken: 0,
    instancesOnline: 0,
    instancesSuspended: 0,
    customersTotal: 0,
    cartsTotal: 0,
    cartsOpen: 0,
    cartsPending: 0,
    ordersTotal: 0,
    ordersDelivered: 0,
    ordersPending: 0,
    ordersWaitingStock: 0,
    deliveriesTotal: 0,
    salesGrossCents: 0,
    salesGrossFormatted: "R$ 0,00",
    salesNetCents: 0,
    salesNetFormatted: "R$ 0,00",
    walletOutstandingCents: 0,
    walletOutstandingFormatted: "R$ 0,00",
    planRevenuePaidCents: 0,
    planRevenuePaidFormatted: "R$ 0,00",
    planRevenuePendingCents: 0,
    planRevenuePendingFormatted: "R$ 0,00",
    salesCreditCents: 0,
    salesCreditFormatted: "R$ 0,00",
    withdrawalsRequestedCount: 0,
    withdrawalsRequestedCents: 0,
    withdrawalsRequestedFormatted: "R$ 0,00",
    withdrawalsCompletedCount: 0,
    withdrawalsCompletedCents: 0,
    withdrawalsCompletedFormatted: "R$ 0,00",
    withdrawalsRevertedCount: 0,
    withdrawalsRevertedCents: 0,
    withdrawalsRevertedFormatted: "R$ 0,00"
  },
  recent: {
    users: [],
    instances: [],
    payments: [],
    orders: []
  }
});

const emptyTimeline = () => ({
  generatedAt: "",
  summary: {
    domainTotal: 0,
    domainReturned: 0,
    rawOutTotal: 0,
    rawErrTotal: 0,
    totalReturned: 0
  },
  events: [],
  rawLogs: {
    out: [],
    err: []
  }
});

const emptyMonitoringRequests = () => ({
  generatedAt: "",
  summary: {
    ordersPending: 0,
    ordersWaitingStock: 0,
    cartsOpen: 0,
    cartsPending: 0,
    withdrawalsRequested: 0,
    runtimeAlerts: 0,
    totalActionable: 0
  },
  queues: {
    ordersPending: [],
    ordersWaitingStock: [],
    cartsOpen: [],
    cartsPending: [],
    withdrawalsRequested: [],
    runtimeAlerts: []
  }
});

const emptyAdminUsersOverview = () => ({
  generatedAt: "",
  summary: {
    usersTotal: 0,
    usersBlocked: 0,
    usersActive: 0,
    usersWithActivePlan: 0,
    usersTrialUsed: 0,
    usersWithPendingItems: 0
  },
  users: []
});

const DM_PLACEHOLDERS = [
  "productName",
  "variantLabel",
  "orderValue",
  "couponCode",
  "discountPercent",
  "key",
  "sourceLabel",
  "orderId",
  "paymentId",
  "userId",
  "channelId"
];

const DM_PREVIEW_VALUES = {
  productName: "Astra Full",
  variantLabel: "30 dias",
  orderValue: "R$ 39,90",
  couponCode: "OFF10",
  discountPercent: "10",
  key: "XXXX-YYYY-ZZZZ-1234",
  sourceLabel: "Pagamento Pix confirmado",
  orderId: "ord_123456",
  paymentId: "pay_123456",
  userId: "123456789012345678",
  channelId: "123456789012345678"
};

const DM_SOURCE_META = {
  pix: {
    label: "PIX confirmado",
    templateField: "deliveryDmMessagePix",
    sourceLabel: "Pagamento Pix confirmado"
  },
  admin_button: {
    label: "Confirmacao botao ADM",
    templateField: "deliveryDmMessageAdmin",
    sourceLabel: "Compra confirmada manualmente pela equipe"
  },
  admin_manual_delivery: {
    label: "Entrega manual ADM",
    templateField: "deliveryDmMessageAdmin",
    sourceLabel: "Entrega manual realizada pela equipe"
  }
};

const DM_FALLBACK_TEMPLATE = [
  "{{sourceLabel}}.",
  "Produto: **{{productName}}**",
  "Variacao: **{{variantLabel}}**",
  "Valor: **{{orderValue}}**",
  "",
  "Sua key:",
  "```",
  "{{key}}",
  "```",
  "",
  "Obrigado pela compra. Qualquer duvida, fale com a equipe."
].join("\n");

function renderTemplate(template, variables = {}) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const value = variables[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function extractTemplateTokens(template) {
  const matches = String(template || "").match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  return matches
    .map((match) => match.replace(/\{|\}|\s/g, ""))
    .filter(Boolean);
}

function buildDmPreview(product, source) {
  const meta = DM_SOURCE_META[source] || DM_SOURCE_META.pix;
  const sourceTemplate = product?.[meta.templateField];
  const template = sourceTemplate || product?.deliveryDmMessage || DM_FALLBACK_TEMPLATE;
  const sourceLabel = meta.sourceLabel;
  const variables = { ...DM_PREVIEW_VALUES, sourceLabel };
  const hasKeyPlaceholder = String(template || "").includes("{{key}}");
  let description = renderTemplate(template, variables).trim();
  if (!description) {
    description = `${sourceLabel}\nProduto: **${variables.productName}**\nVariacao: **${variables.variantLabel}**`;
  }
  if (!hasKeyPlaceholder) {
    description = `${description}\n\nSua key:\n\`\`\`\n${variables.key}\n\`\`\``;
  }
  return {
    title: product?.deliveryDmTitle || "Compra confirmada",
    description,
    template
  };
}

function formatSourceLabel(source) {
  const key = String(source || "").toLowerCase();
  if (key === "pix") return "pix";
  if (key === "admin_button") return "admin_button";
  if (key === "admin_manual_delivery") return "admin_manual_delivery";
  return key || "-";
}

function parseLines(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR");
}

function formatCurrencyCents(value, currency = "BRL") {
  const cents = Number(value || 0);
  const amount = Number.isFinite(cents) ? cents / 100 : 0;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

function truncateText(value, max = 120) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
}

function shortId(value) {
  const text = String(value || "");
  return text.length > 8 ? `${text.slice(0, 8)}...` : text;
}

function humanizeCode(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "-";
  const normalized = text.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function personLabel(username, email, id, fallback = "-") {
  const primary = [username, email, id]
    .map((item) => String(item || "").trim())
    .find(Boolean);
  return primary || fallback;
}

function personSubLabel(email, id) {
  const cleanEmail = String(email || "").trim();
  if (cleanEmail) return cleanEmail;
  const cleanId = String(id || "").trim();
  return cleanId ? `ID: ${cleanId}` : "-";
}

function statusLabel(status) {
  const map = {
    pending: "pendente",
    waiting_stock: "aguardando estoque",
    delivered: "entregue",
    failed: "falhou",
    open: "aberto",
    requested: "solicitado",
    completed: "concluido",
    rejected: "rejeitado",
    cancelled: "cancelado",
    expired: "expirado",
    paid: "pago",
    active: "ativo",
    inactive: "inativo",
    blocked: "bloqueado",
    suspenso: "suspenso",
    unknown: "desconhecido"
  };
  const key = String(status || "").toLowerCase();
  return map[key] || key || "-";
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (["delivered", "paid", "active", "completed"].includes(key)) return "emerald";
  if (["pending", "waiting_stock", "open", "inactive", "requested"].includes(key)) return "amber";
  if (["failed", "cancelled", "expired", "blocked", "suspenso", "rejected"].includes(key)) return "rose";
  return "slate";
}

function severityLabel(level) {
  const key = String(level || "").toLowerCase();
  if (key === "error") return "erro";
  if (key === "warn" || key === "warning") return "alerta";
  if (key === "debug") return "debug";
  return "info";
}

function severityTone(level) {
  const key = String(level || "").toLowerCase();
  if (key === "error") return "rose";
  if (key === "warn" || key === "warning") return "amber";
  if (key === "debug") return "slate";
  return "emerald";
}

function detailsPreview(details) {
  if (!details || typeof details !== "object") return "-";
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!entries.length) return "-";
  const text = entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" | ");
  return truncateText(text, 170);
}

function normalizeVariantRow(entry) {
  const id = String(entry?.id || "").trim();
  const label = String(entry?.label || "").trim();
  const emoji = String(entry?.emoji || "").trim();
  const duration = String(entry?.duration || "").trim();
  const priceRaw = String(entry?.price ?? "").replace(",", ".").trim();
  const price = Number(priceRaw);
  const hasAnyValue = Boolean(id || label || emoji || duration || priceRaw);
  return {
    id,
    label,
    emoji,
    duration,
    price,
    hasAnyValue,
    isPriceValid: Number.isFinite(price) && price > 0
  };
}

function normalizeVariantsForm(variantsForm) {
  const errors = [];
  const variants = [];
  const seen = new Set();

  (variantsForm || []).forEach((entry, index) => {
    const variant = normalizeVariantRow(entry);
    if (!variant.hasAnyValue) return;

    if (!variant.id) errors.push(`Variacao ${index + 1}: informe o ID.`);
    if (!variant.label) errors.push(`Variacao ${index + 1}: informe o label.`);
    if (!variant.duration) errors.push(`Variacao ${index + 1}: informe a duracao.`);
    if (!variant.isPriceValid) errors.push(`Variacao ${index + 1}: preco invalido.`);
    if (variant.id && seen.has(variant.id)) errors.push(`Variacao duplicada: ${variant.id}.`);
    if (variant.id) seen.add(variant.id);

    if (variant.id && variant.label && variant.duration && variant.isPriceValid) {
      variants.push({
        id: variant.id,
        label: variant.label,
        emoji: variant.emoji,
        duration: variant.duration,
        price: Number(variant.price.toFixed(2))
      });
    }
  });

  return { variants, errors };
}

function normalizeSectionsForm(sectionsForm) {
  return (sectionsForm || [])
    .map((section) => ({
      name: String(section?.name || "").trim(),
      value: String(section?.value || "").trim(),
      inline: section?.inline === true
    }))
    .filter((section) => section.name || section.value);
}

function extractVariantIds(variantsForm) {
  const ids = [];
  const seen = new Set();
  (variantsForm || []).forEach((entry) => {
    const id = String(entry?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

function buildStockForm(product, stockData) {
  if (!product) return {};
  const raw = stockData?.[product.id] || {};
  const stock = Array.isArray(raw) ? { default: raw } : raw || {};
  const variantIds = extractVariantIds(product.variants || []);
  const result = {
    default: (stock.default || []).join("\n"),
    shared: (stock.shared || []).join("\n")
  };
  variantIds.forEach((variantId) => {
    result[variantId] = (stock[variantId] || []).join("\n");
  });
  return result;
}

function syncStockFormToVariants(stockForm, variantsForm, options = {}) {
  const { preserveOrphans = false } = options;
  const variantIds = extractVariantIds(variantsForm);
  const next = { ...(stockForm || {}) };
  if (next.default === undefined) next.default = "";
  if (next.shared === undefined) next.shared = "";
  const allowedKeys = new Set(["default", "shared", ...variantIds]);
  variantIds.forEach((variantId) => {
    if (next[variantId] === undefined) next[variantId] = "";
  });
  if (!preserveOrphans) {
    Object.keys(next).forEach((key) => {
      if (!allowedKeys.has(key)) delete next[key];
    });
  }
  return next;
}

function buildStockPayload(stockForm, variantsForm) {
  const variantIds = extractVariantIds(variantsForm);
  const payload = {};
  const allowedKeys = new Set(["default", "shared", ...variantIds]);
  Object.entries(stockForm || {}).forEach(([key, value]) => {
    if (!allowedKeys.has(key)) return;
    payload[key] = parseLines(value);
  });
  if (payload.default === undefined) payload.default = [];
  if (payload.shared === undefined) payload.shared = [];
  variantIds.forEach((variantId) => {
    if (payload[variantId] === undefined) payload[variantId] = [];
  });
  return payload;
}

function findDuplicateStockKeys(payload) {
  const seen = new Map();
  const duplicates = [];
  Object.entries(payload || {}).forEach(([bucket, values]) => {
    if (!Array.isArray(values)) return;
    values.forEach((key) => {
      const normalized = String(key || "").trim();
      if (!normalized) return;
      if (seen.has(normalized)) {
        duplicates.push({
          key: normalized,
          firstBucket: seen.get(normalized),
          duplicateBucket: bucket
        });
      } else {
        seen.set(normalized, bucket);
      }
    });
  });
  return duplicates;
}

function computeVariantCoverage(payload, variantsForm) {
  const variantIds = extractVariantIds(variantsForm);
  const fallbackCount = (payload?.default?.length || 0) + (payload?.shared?.length || 0);
  return variantIds.map((variantId) => {
    const ownCount = payload?.[variantId]?.length || 0;
    const available = ownCount > 0 ? ownCount : fallbackCount;
    return {
      variantId,
      ownCount,
      fallbackCount,
      available,
      covered: available > 0
    };
  });
}

function countStockEntries(payload) {
  return Object.values(payload || {}).reduce((sum, list) => {
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

function orderedStockEntries(stockForm, variantsForm) {
  const source = stockForm || {};
  const variantIds = extractVariantIds(variantsForm || []);
  const preferred = ["default", "shared", ...variantIds];
  const extras = Object.keys(source).filter((key) => !preferred.includes(key));
  const keys = [...preferred, ...extras].filter((key, index, arr) => arr.indexOf(key) === index && key in source);
  return keys.map((key) => [key, source[key]]);
}

function sumStockKeys(stock) {
  if (!stock || typeof stock !== "object") return 0;
  let total = 0;
  Object.values(stock).forEach((entry) => {
    if (Array.isArray(entry)) {
      total += entry.length;
      return;
    }
    if (entry && typeof entry === "object") {
      Object.values(entry).forEach((list) => {
        if (Array.isArray(list)) total += list.length;
      });
    }
  });
  return total;
}

function Button({ variant = "primary", onClick, disabled, children, className }) {
  const variants = {
    primary: "primary",
    ghost: "ghost",
    danger: "danger"
  };
  return html`
    <button
      type="button"
      className=${`btn ${variants[variant] || variants.primary} ${className || ""}`}
      onClick=${onClick}
      disabled=${disabled}
    >
      ${children}
    </button>
  `;
}

function Badge({ status }) {
  const tone = statusTone(status);
  const mod = { emerald: "ok", amber: "warn", rose: "danger", slate: "muted" };
  return html`<span className=${`badge ${mod[tone] || "muted"}`}>${statusLabel(status)}</span>`;
}

function SeverityBadge({ level }) {
  const tone = severityTone(level);
  const mod = { emerald: "ok", amber: "warn", rose: "danger", slate: "muted" };
  return html`<span className=${`badge ${mod[tone] || "muted"}`}>${severityLabel(level)}</span>`;
}

function Card({ id, title, subtitle, actions, children }) {
  return html`
    <section id=${id} className="card section-anchor p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">${title}</h2>
          ${subtitle ? html`<p className="text-sm text-slate-500">${subtitle}</p>` : null}
        </div>
        ${actions ? html`<div className="flex flex-wrap gap-2">${actions}</div>` : null}
      </div>
      ${children}
    </section>
  `;
}
function App() {
  console.log("[admin:App] Component function called");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("ukr4in");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  console.log("[admin:App] useState completed");
  const [statusInfo, setStatusInfo] = useState({
    ok: false,
    text: "Aguardando conexao",
    authRequired: false,
    monitoringOnly: true
  });
  const [data, setData] = useState({
    products: [],
    coupons: [],
    orders: [],
    carts: [],
    posts: [],
    deliveries: [],
    customers: [],
    stock: {},
    config: {}
  });
  const [business, setBusiness] = useState(emptyBusinessOverview());
  const [timeline, setTimeline] = useState(emptyTimeline());
  const [monitorRequests, setMonitorRequests] = useState(emptyMonitoringRequests());
  const [adminUsers, setAdminUsers] = useState(emptyAdminUsersOverview());
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineSeverity, setTimelineSeverity] = useState("all");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [accountActionUserId, setAccountActionUserId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct());
  const [sectionsForm, setSectionsForm] = useState([]);
  const [variantsForm, setVariantsForm] = useState([]);
  const [gifImages, setGifImages] = useState("");
  const [stockForm, setStockForm] = useState({});
  const [configForm, setConfigForm] = useState(emptyConfig());
  const [actionChannelId, setActionChannelId] = useState("");
  const [actionPurge, setActionPurge] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [ordersFilter, setOrdersFilter] = useState("all");
  const [ordersSourceFilter, setOrdersSourceFilter] = useState("all");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [dmPreviewSource, setDmPreviewSource] = useState("pix");
  const [activeDmField, setActiveDmField] = useState("deliveryDmMessagePix");
  const [adminTab, setAdminTab] = useState("painel");
  const [productSubTab, setProductSubTab] = useState("info");
  const [postsHealth, setPostsHealth] = useState({ summary: null, byMessageId: {}, checkedAt: "" });
  const [diagnostics, setDiagnostics] = useState({ loading: false, report: null });
  const [activeSection, setActiveSection] = useState(sectionLinks[0].id);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const variantIdsRef = useRef([]);
  const monitoringOnly = statusInfo.monitoringOnly !== false;

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  };

  const api = async (path, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    headers["Content-Type"] = "application/json";
    const res = await fetch(path, { credentials: "same-origin", ...options, headers });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};

    if (!res.ok) {
      const message = data?.error || `Erro ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    return data;
  };

  const fetchAuthStatus = async () => {
    const res = await fetch("/api/auth/status", {
      method: "GET",
      credentials: "same-origin"
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
    if (!res.ok) {
      const err = new Error(data?.error || `Erro ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  };

  const loadDiagnostics = async () => {
    setDiagnostics((prev) => ({ ...prev, loading: true }));
    try {
      const report = await api("/api/diagnostics");
      setDiagnostics({ loading: false, report });
    } catch (err) {
      setDiagnostics((prev) => ({ ...prev, loading: false }));
      showToast(err.message || "Falha no diagnostico", "error");
    }
  };

  const loadAll = async () => {
    try {
      setStatusInfo((prev) => ({
        ...prev,
        ok: false,
        text: "Carregando dados..."
      }));
      const [status, orders, carts, deliveries, customers, businessOverview, logsTimeline, requestsData, usersData, productsRes, stockRes, configRes, couponsRes, postsRes] =
        await Promise.all([
          api("/api/status"),
          api("/api/orders"),
          api("/api/carts"),
          api("/api/deliveries"),
          api("/api/customers"),
          api("/api/business/overview"),
          api("/api/logs/recent?limit=260&rawLimit=140"),
          api("/api/monitor/requests?limit=80"),
          api("/api/admin/users"),
          api("/api/products").catch(() => ({ products: [] })),
          api("/api/stock").catch(() => ({ stock: {} })),
          api("/api/config").catch(() => ({ config: {} })),
          api("/api/coupons").catch(() => ({ coupons: [] })),
          api("/api/posts").catch(() => ({ posts: [] }))
        ]);

      const nextData = {
        products: productsRes.products || [],
        stock: stockRes.stock || {},
        config: configRes.config || {},
        coupons: couponsRes.coupons || [],
        orders: orders.orders || [],
        carts: carts.carts || [],
        posts: postsRes.posts || [],
        deliveries: deliveries.deliveries || [],
        customers: customers.customers || []
      };

      setData(nextData);
      setBusiness(businessOverview || emptyBusinessOverview());
      setTimeline(logsTimeline || emptyTimeline());
      setMonitorRequests(requestsData || emptyMonitoringRequests());
      setAdminUsers(usersData || emptyAdminUsersOverview());
      setPostsHealth({ summary: null, byMessageId: {}, checkedAt: "" });
      const cfg = configRes.config || {};
      setConfigForm({
        staffRoleId: cfg.staffRoleId || "",
        adminUserIds: cfg.adminUserIds || "",
        cartCategoryId: cfg.cartCategoryId || "",
        trackerChannelId: cfg.trackerChannelId || "",
        staffLogChannelId: cfg.staffLogChannelId || "",
        postChannelId: cfg.postChannelId || "",
        systemBanner: cfg.systemBanner || "",
        pixInstructions: cfg.pixInstructions || "",
        paymentCheckIntervalMs: cfg.paymentCheckIntervalMs || "",
        maxAttachmentBytes: cfg.maxAttachmentBytes || "",
        couponCode: "",
        couponPercent: "",
        couponActive: true
      });
      setSelectedId("");
      setStatusInfo({
        ok: true,
        text: status.botReady ? "Central de monitoramento online" : "Bot iniciando",
        authRequired: status.authRequired,
        monitoringOnly: status.monitoringOnly !== false
      });
      setIsAuthenticated(true);
      setLoginError("");
      loadDiagnostics();
    } catch (err) {
      if (err?.status === 401) {
        setIsAuthenticated(false);
        setStatusInfo((prev) => ({
          ...prev,
          ok: false,
          authRequired: true,
          text: "Autenticacao obrigatoria"
        }));
        return;
      }
      setDiagnostics((prev) => ({ ...prev, loading: false }));
      setStatusInfo((prev) => ({
        ...prev,
        ok: false,
        text: err.message || "Falha ao carregar"
      }));
      showToast(err.message || "Falha ao carregar", "error");
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await fetchAuthStatus();
        if (!mounted) return;
        const authRequired = auth?.authRequired === true;
        const authenticated = auth?.authenticated === true;
        const monitorMode = auth?.monitoringOnly !== false;

        setStatusInfo((prev) => ({
          ...prev,
          authRequired,
          monitoringOnly: monitorMode,
          text: authRequired && !authenticated ? "Autenticacao obrigatoria" : prev.text
        }));
        setIsAuthenticated(authenticated || !authRequired);

        if (authRequired && !authenticated) return;
        await loadAll();
      } catch (err) {
        if (!mounted) return;
        setStatusInfo((prev) => ({
          ...prev,
          ok: false,
          text: err.message || "Falha ao verificar autenticacao"
        }));
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (monitoringOnly) return;
    if (!selectedId) {
      variantIdsRef.current = [];
      setProductForm(emptyProduct());
      setSectionsForm([]);
      setVariantsForm([]);
      setGifImages("");
      setStockForm({ default: "", shared: "" });
      return;
    }
    const product = data.products.find((p) => p.id === selectedId);
    if (!product) return;
    const normalizedVariants = normalizeVariantsForm(product.variants || []).variants;
    setProductForm({
      id: product.id || "",
      name: product.name || "",
      shortLabel: product.shortLabel || "",
      description: product.description || "",
      pixInstructions: product.pixInstructions || "",
      deliveryDmTitle: product.deliveryDmTitle || "",
      deliveryDmMessage: product.deliveryDmMessage || "",
      deliveryDmMessagePix: product.deliveryDmMessagePix || "",
      deliveryDmMessageAdmin: product.deliveryDmMessageAdmin || "",
      demoUrl: product.demoUrl || "",
      disableThumbnail: product.disableThumbnail === true,
      bannerImage: product.bannerImage || "",
      previewImage: product.previewImage || "",
      thumbnail: product.thumbnail || "",
      footerImage: product.footerImage || "",
      prePostGif: product.prePostGif || ""
    });
    setSectionsForm(product.sections || []);
    variantIdsRef.current = normalizedVariants.map((variant) => variant.id);
    setVariantsForm(normalizedVariants);
    setGifImages((product.gifImages || []).join("\n"));
    setStockForm(syncStockFormToVariants(buildStockForm(product, data.stock), normalizedVariants));
    setActionChannelId((prev) => prev || data.config?.postChannelId || "");
  }, [monitoringOnly, selectedId, data.products, data.stock, data.config]);

  useEffect(() => {
    if (monitoringOnly) return;
    if (!selectedId) return;
    setStockForm((prev) => {
      const previousIds = variantIdsRef.current || [];
      const nextIds = extractVariantIds(variantsForm || []);
      let next = syncStockFormToVariants(prev, variantsForm || [], { preserveOrphans: true });

      nextIds.forEach((variantId, index) => {
        if (next[variantId] !== "") return;
        const previousId = previousIds[index];
        if (previousId && previousId !== variantId && prev[previousId] !== undefined) {
          next = { ...next, [variantId]: prev[previousId] };
        }
      });

      variantIdsRef.current = nextIds;
      return next;
    });
  }, [monitoringOnly, variantsForm, selectedId]);

  useEffect(() => {
    if (!sectionLinks.length || !("IntersectionObserver" in window)) return;
    const sections = sectionLinks.map((section) => document.getElementById(section.id)).filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0.05 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const stats = useMemo(() => {
    const pendingOrders = data.orders.filter((o) => o.status === "pending").length;
    const waitingStock = data.orders.filter((o) => o.status === "waiting_stock").length;
    const deliveredOrders = data.orders.filter((o) => o.status === "delivered").length;
    const openCarts = data.carts.filter((c) => c.status === "open").length;
    const pendingCarts = data.carts.filter((c) => c.status === "pending").length;
    const blockedUsers = adminUsers?.summary?.usersBlocked || 0;
    const activeUsers = adminUsers?.summary?.usersActive || 0;
    const requestsTotal = monitorRequests?.summary?.totalActionable || 0;
    const withdrawalsRequested = monitorRequests?.summary?.withdrawalsRequested || 0;
    const runtimeAlerts = monitorRequests?.summary?.runtimeAlerts || 0;
    const gmv = business?.summary?.salesGrossFormatted || "R$ 0,00";
    const net = business?.summary?.salesNetFormatted || "R$ 0,00";

    return [
      {
        label: "Solicitacoes abertas",
        value: requestsTotal,
        hint: `${pendingOrders + waitingStock} pedidos e ${openCarts + pendingCarts} carrinhos`
      },
      { label: "Contas bloqueadas", value: blockedUsers, hint: `${activeUsers} contas ativas` },
      { label: "Saques pendentes", value: withdrawalsRequested, hint: "aguardando revisao financeira" },
      { label: "Alertas de runtime", value: runtimeAlerts, hint: "bots com erro ou suspensao" },
      { label: "Pedidos entregues", value: deliveredOrders, hint: `GMV: ${gmv}` },
      { label: "Receita liquida", value: net, hint: `Planos pagos: ${business?.summary?.planRevenuePaidFormatted || "R$ 0,00"}` }
    ];
  }, [data, adminUsers, monitorRequests, business]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.toLowerCase();
    if (!query) return data.products;
    return data.products.filter((product) =>
      `${product.name || ""} ${product.id || ""}`.toLowerCase().includes(query)
    );
  }, [data.products, productQuery]);

  const filteredOrders = useMemo(() => {
    const query = ordersSearch.toLowerCase();
    return data.orders.filter((order) => {
      if (ordersFilter !== "all" && order.status !== ordersFilter) return false;
      if (ordersSourceFilter !== "all" && (order.confirmedSource || "") !== ordersSourceFilter) return false;
      if (!query) return true;
      const haystack = [
        order.id,
        order.userId,
        order.paymentId,
        order.productId,
        order.variantId,
        order.confirmedByUserId,
        order.confirmedSource
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data.orders, ordersFilter, ordersSourceFilter, ordersSearch]);

  const filteredTimelineEvents = useMemo(() => {
    const query = timelineSearch.toLowerCase().trim();
    const severityFilter = String(timelineSeverity || "all").toLowerCase();
    const sourceEvents = Array.isArray(timeline?.events) ? timeline.events : [];
    return sourceEvents.filter((event) => {
      const severity = String(event?.severity || "info").toLowerCase();
      if (severityFilter !== "all" && severity !== severityFilter) return false;
      if (!query) return true;
      const haystack = [
        event?.type,
        event?.source,
        event?.summary,
        JSON.stringify(event?.details || {})
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [timeline, timelineSearch, timelineSeverity]);

  const filteredAdminUsers = useMemo(() => {
    const query = String(accountSearch || "").toLowerCase().trim();
    const statusFilter = String(accountStatusFilter || "all").toLowerCase();
    const users = Array.isArray(adminUsers?.users) ? adminUsers.users : [];
    return users.filter((user) => {
      const status = String(user?.accountStatus || "active").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        user?.discordUserId,
        user?.discordUsername,
        user?.email,
        user?.planTier,
        user?.planStatus,
        user?.blockedReason
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [adminUsers, accountSearch, accountStatusFilter]);

  const dmPreview = useMemo(() => {
    return buildDmPreview(productForm || {}, dmPreviewSource);
  }, [productForm, dmPreviewSource]);

  const dmTemplateWarnings = useMemo(() => {
    const allowed = new Set(DM_PLACEHOLDERS);
    const templates = [
      { field: "deliveryDmMessage", label: "Template padrao", value: productForm.deliveryDmMessage },
      { field: "deliveryDmMessagePix", label: "Template PIX", value: productForm.deliveryDmMessagePix },
      { field: "deliveryDmMessageAdmin", label: "Template ADMIN", value: productForm.deliveryDmMessageAdmin }
    ];
    const warnings = [];
    templates.forEach((template) => {
      const tokens = extractTemplateTokens(template.value);
      const invalid = tokens.filter((token) => !allowed.has(token));
      if (invalid.length) {
        warnings.push(`${template.label} possui placeholders invalidos: ${invalid.join(", ")}`);
      }
    });
    return warnings;
  }, [productForm.deliveryDmMessage, productForm.deliveryDmMessagePix, productForm.deliveryDmMessageAdmin]);

  const stockPayloadPreview = useMemo(() => {
    const { variants } = normalizeVariantsForm(variantsForm || []);
    const synced = syncStockFormToVariants(stockForm || {}, variants || [], { preserveOrphans: true });
    return buildStockPayload(synced, variants || []);
  }, [stockForm, variantsForm]);

  const stockDuplicateKeys = useMemo(() => {
    return findDuplicateStockKeys(stockPayloadPreview);
  }, [stockPayloadPreview]);

  const stockCoverage = useMemo(() => {
    return computeVariantCoverage(stockPayloadPreview, variantsForm || []);
  }, [stockPayloadPreview, variantsForm]);

  const stockEntries = useMemo(() => {
    return orderedStockEntries(stockForm || {}, variantsForm || []);
  }, [stockForm, variantsForm]);

  const formatCurrency = (value) => {
    const currency = data.config?.currency || "BRL";
    const numberValue = Number(value || 0);
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(numberValue);
    } catch {
      return `R$ ${numberValue.toFixed(2)}`;
    }
  };

  const handleLogin = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    const username = String(loginUsername || "").trim();
    const password = String(loginPassword || "").trim();
    if (!username || !password) {
      setLoginError("Informe usuario e senha.");
      return;
    }

    setLoginBusy(true);
    setLoginError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setLoginPassword("");
      setIsAuthenticated(true);
      await loadAll();
      showToast("Login realizado com sucesso.");
    } catch (err) {
      if (err?.status === 429) {
        setLoginError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (err?.status === 401) {
        setLoginError("Credenciais invalidas.");
      } else {
        setLoginError(err.message || "Falha ao autenticar.");
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    setIsAuthenticated(false);
    setStatusInfo((prev) => ({
      ...prev,
      ok: false,
      authRequired: true,
      text: "Sessao encerrada"
    }));
    showToast("Sessao encerrada.");
  };

  const updateProductField = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const insertPlaceholder = (token) => {
    if (!DM_PLACEHOLDERS.includes(token)) return;
    const field = activeDmField || "deliveryDmMessagePix";
    const nextChunk = `{{${token}}}`;
    setProductForm((prev) => ({
      ...prev,
      [field]: `${prev[field] || ""}${prev[field] ? " " : ""}${nextChunk}`
    }));
  };

  const updateSectionField = (index, field, value) => {
    setSectionsForm((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const updateVariantField = (index, field, value) => {
    setVariantsForm((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addSection = () => setSectionsForm((prev) => [...prev, { name: "", value: "", inline: false }]);
  const removeSection = (index) => setSectionsForm((prev) => prev.filter((_, idx) => idx !== index));
  const addVariant = () =>
    setVariantsForm((prev) => [...prev, { id: "", label: "", emoji: "", duration: "", price: "" }]);
  const removeVariant = (index) => setVariantsForm((prev) => prev.filter((_, idx) => idx !== index));
  const handleSaveProduct = async () => {
    if (!selectedId) return;
    const productName = String(productForm.name || "").trim();
    if (!productName) {
      showToast("Informe o nome do produto.", "error");
      return;
    }
    const { variants, errors } = normalizeVariantsForm(variantsForm);
    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }
    if (!variants.length) {
      showToast("Adicione pelo menos 1 variacao valida.", "error");
      return;
    }

    try {
      const syncedStockForm = syncStockFormToVariants(stockForm, variants);
      const payload = {
        id: selectedId,
        ...productForm,
        name: productName,
        gifImages: parseLines(gifImages),
        sections: normalizeSectionsForm(sectionsForm),
        variants
      };

      const result = await api(`/api/products/${encodeURIComponent(selectedId)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setData((prev) => ({
        ...prev,
        products: prev.products.map((product) => (product.id === selectedId ? result.product : product))
      }));
      setVariantsForm(variants);
      setStockForm(syncedStockForm);
      showToast("Produto salvo");
    } catch (err) {
      showToast(err.message || "Erro ao salvar", "error");
    }
  };

  const handleSaveStock = async () => {
    if (!selectedId) return;
    const { variants, errors } = normalizeVariantsForm(variantsForm);
    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }
    if (!variants.length) {
      showToast("Salve o produto com variacoes validas antes do estoque.", "error");
      return;
    }
    try {
      const syncedStockForm = syncStockFormToVariants(stockForm, variants);
      const payload = buildStockPayload(syncedStockForm, variants);
      const duplicates = findDuplicateStockKeys(payload);
      if (duplicates.length) {
        const first = duplicates[0];
        showToast(
          `Key duplicada no estoque: ${first.key} (${first.firstBucket} e ${first.duplicateBucket})`,
          "error"
        );
        return;
      }
      const result = await api(`/api/stock/${encodeURIComponent(selectedId)}`, {
        method: "PUT",
        body: JSON.stringify({ stock: payload })
      });
      const resolvedStock = result.stock || payload;
      setData((prev) => ({
        ...prev,
        stock: { ...prev.stock, [selectedId]: resolvedStock }
      }));
      setStockForm(
        buildStockForm(
          {
            id: selectedId,
            variants
          },
          { [selectedId]: resolvedStock }
        )
      );
      showToast("Estoque salvo");
    } catch (err) {
      showToast(err.message || "Erro ao salvar", "error");
    }
  };

  const handleSaveConfig = async () => {
    try {
      const payload = {
        staffRoleId: configForm.staffRoleId || "",
        adminUserIds: configForm.adminUserIds || "",
        cartCategoryId: configForm.cartCategoryId || "",
        trackerChannelId: configForm.trackerChannelId || "",
        staffLogChannelId: configForm.staffLogChannelId || "",
        postChannelId: configForm.postChannelId || "",
        systemBanner: configForm.systemBanner || "",
        pixInstructions: configForm.pixInstructions || "",
        paymentCheckIntervalMs: Number(configForm.paymentCheckIntervalMs || 0),
        maxAttachmentBytes: Number(configForm.maxAttachmentBytes || 0)
      };

      const result = await api("/api/config", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setData((prev) => ({ ...prev, config: result.config || payload }));
      showToast("Configuracao salva");
    } catch (err) {
      showToast(err.message || "Erro ao salvar", "error");
    }
  };

  const handlePostProduct = async () => {
    if (!selectedId) return;
    const channelId = String(actionChannelId || "").trim();
    if (!channelId) {
      showToast("Informe o channel ID", "error");
      return;
    }
    const { variants, errors } = normalizeVariantsForm(variantsForm);
    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }
    if (!variants.length) {
      showToast("Produto sem variacoes validas.", "error");
      return;
    }
    const payloadStock = buildStockPayload(syncStockFormToVariants(stockForm, variants), variants);
    const duplicates = findDuplicateStockKeys(payloadStock);
    if (duplicates.length) {
      const first = duplicates[0];
      showToast(
        `Remova key duplicada antes de postar: ${first.key} (${first.firstBucket} e ${first.duplicateBucket})`,
        "error"
      );
      return;
    }
    if (countStockEntries(payloadStock) === 0) {
      showToast("Estoque vazio. Adicione keys antes de postar para entrega automatica.", "error");
      return;
    }
    const coverage = computeVariantCoverage(payloadStock, variants);
    const uncovered = coverage.find((entry) => !entry.covered);
    if (uncovered) {
      showToast(
        `Sem key para variacao ${uncovered.variantId}. Adicione key da variacao ou fallback em default/shared.`,
        "error"
      );
      return;
    }
    try {
      await api("/api/discord/post-product", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedId,
          channelId,
          purge: actionPurge
        })
      });
      showToast("Produto postado e pronto para vendas");
    } catch (err) {
      showToast(err.message || "Erro ao postar", "error");
    }
  };

  const handleNewProduct = async () => {
    const id = prompt("ID do novo produto (ex: produto2)");
    if (!id) return;
    const normalizedId = id.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedId)) {
      showToast("Use somente letras, numeros, _ ou - no ID.", "error");
      return;
    }
    try {
      const draft = {
        ...emptyProduct(),
        id: normalizedId,
        name: normalizedId,
        variants: [],
        sections: [],
        gifImages: []
      };
      const result = await api("/api/products", {
        method: "POST",
        body: JSON.stringify(draft)
      });
      setData((prev) => ({
        ...prev,
        products: [...prev.products, result.product],
        stock: { ...prev.stock, [result.product.id]: result.stock || { default: [] } }
      }));
      setSelectedId(result.product.id);
      showToast("Produto criado. Configure variacoes e estoque para habilitar a postagem.");
    } catch (err) {
      showToast(err.message || "Erro ao criar", "error");
    }
  };

  const handleDuplicateProduct = async () => {
    const current = data.products.find((product) => product.id === selectedId);
    if (!current) return;
    const id = prompt("ID do produto duplicado");
    if (!id) return;
    const normalizedId = id.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedId)) {
      showToast("Use somente letras, numeros, _ ou - no ID.", "error");
      return;
    }
    try {
      const copy = JSON.parse(JSON.stringify(current));
      copy.id = normalizedId;
      copy.name = `${current.name} (copia)`;
      const result = await api("/api/products", {
        method: "POST",
        body: JSON.stringify(copy)
      });
      setData((prev) => ({
        ...prev,
        products: [...prev.products, result.product],
        stock: { ...prev.stock, [result.product.id]: result.stock || { default: [] } }
      }));
      setSelectedId(result.product.id);
      showToast("Produto duplicado");
    } catch (err) {
      showToast(err.message || "Erro ao duplicar", "error");
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedId) return;
    const ok = confirm("Excluir este produto?");
    if (!ok) return;
    try {
      await api(`/api/products/${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      setData((prev) => ({
        ...prev,
        products: prev.products.filter((product) => product.id !== selectedId),
        stock: Object.fromEntries(Object.entries(prev.stock || {}).filter(([key]) => key !== selectedId))
      }));
      setSelectedId("");
      showToast("Produto excluido");
    } catch (err) {
      showToast(err.message || "Erro ao excluir", "error");
    }
  };
  const handleCreateCoupon = async () => {
    const code = (configForm.couponCode || "").trim().toUpperCase();
    const percent = Number(configForm.couponPercent || 0);
    const active = configForm.couponActive !== false;
    if (!code || !percent) {
      showToast("Informe codigo e percentual", "error");
      return;
    }
    try {
      const result = await api("/api/coupons", {
        method: "POST",
        body: JSON.stringify({ code, percent, active })
      });
      setData((prev) => ({ ...prev, coupons: [result.coupon, ...prev.coupons] }));
      setConfigForm((prev) => ({ ...prev, couponCode: "", couponPercent: "", couponActive: true }));
      showToast("Cupom criado");
    } catch (err) {
      showToast(err.message || "Erro ao criar cupom", "error");
    }
  };

  const handleToggleCoupon = async (code) => {
    try {
      const result = await api(`/api/coupons/${encodeURIComponent(code)}/toggle`, { method: "POST" });
      setData((prev) => ({
        ...prev,
        coupons: prev.coupons.map((coupon) => (coupon.code === code ? result.coupon : coupon))
      }));
    } catch (err) {
      showToast(err.message || "Erro ao atualizar cupom", "error");
    }
  };

  const handleDeleteCoupon = async (code) => {
    const ok = confirm(`Excluir o cupom ${code}?`);
    if (!ok) return;
    try {
      await api(`/api/coupons/${encodeURIComponent(code)}`, { method: "DELETE" });
      setData((prev) => ({ ...prev, coupons: prev.coupons.filter((coupon) => coupon.code !== code) }));
      showToast("Cupom removido");
    } catch (err) {
      showToast(err.message || "Erro ao remover cupom", "error");
    }
  };

  const handleResyncOrder = async (orderId) => {
    try {
      const result = await api(`/api/orders/${encodeURIComponent(orderId)}/resync`, { method: "POST" });
      setData((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => (order.id === orderId ? result.order : order))
      }));
      showToast("Pedido sincronizado");
    } catch (err) {
      showToast(err.message || "Erro ao sincronizar pedido", "error");
    }
  };

  const handleManualDeliver = async (orderId) => {
    const key = prompt("Informe a key para entrega manual");
    if (!key) return;
    try {
      const result = await api(`/api/orders/${encodeURIComponent(orderId)}/manual-deliver`, {
        method: "POST",
        body: JSON.stringify({ key })
      });
      setData((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => (order.id === orderId ? result.order : order))
      }));
      showToast("Entrega manual concluida");
    } catch (err) {
      showToast(err.message || "Erro na entrega manual", "error");
    }
  };

  const handleRetryWaitingStock = async () => {
    try {
      const result = await api("/api/orders/retry-waiting-stock", {
        method: "POST",
        body: JSON.stringify({ adminUserId: "admin-panel" })
      });
      await loadAll();
      showToast(
        `Retry concluido: ${result.delivered || 0} entregue(s), ${result.stillWaiting || 0} ainda aguardando.`,
        "info"
      );
    } catch (err) {
      showToast(err.message || "Erro ao reprocessar pedidos waiting_stock", "error");
    }
  };

  const handleManualConfirmCart = async (cartId) => {
    const ok = confirm("Confirmar compra manualmente para este carrinho?");
    if (!ok) return;
    try {
      const result = await api(`/api/carts/${encodeURIComponent(cartId)}/confirm-manual`, {
        method: "POST",
        body: JSON.stringify({ adminUserId: "admin-panel" })
      });
      setData((prev) => ({
        ...prev,
        carts: prev.carts.map((cart) => (cart.id === cartId ? result.cart || cart : cart)),
        orders: result.order
          ? [result.order, ...prev.orders.filter((order) => order.id !== result.order.id)]
          : prev.orders
      }));
      if (result.ok) {
        showToast("Compra confirmada e entrega processada");
      } else if (result.reason === "waiting_stock") {
        showToast("Compra confirmada, mas sem estoque (pedido em waiting_stock)", "info");
      } else if (result.reason === "pedido ja entregue") {
        showToast("Este pedido ja estava entregue", "info");
      } else {
        showToast(result.reason || "Nao foi possivel confirmar compra", "error");
      }
    } catch (err) {
      showToast(err.message || "Erro ao confirmar compra manual", "error");
    }
  };

  const handleCheckPostsHealth = async () => {
    try {
      const result = await api("/api/posts/health?limit=120");
      const byMessageId = {};
      (result.health || []).forEach((entry) => {
        byMessageId[entry.messageId] = entry;
      });
      setPostsHealth({
        summary: result.summary || null,
        byMessageId,
        checkedAt: new Date().toISOString()
      });
      showToast("Saude dos posts atualizada");
    } catch (err) {
      showToast(err.message || "Erro ao verificar saude dos posts", "error");
    }
  };

  const handleRepostFromPanel = async (post) => {
    if (!post?.productId) return;
    const force = true;
    try {
      await api("/api/discord/repost-product", {
        method: "POST",
        body: JSON.stringify({
          productId: post.productId,
          channelId: post.channelId || "",
          force,
          purge: false
        })
      });
      showToast(`Produto ${post.productId} repostado.`);
      await loadAll();
      await handleCheckPostsHealth();
    } catch (err) {
      showToast(err.message || "Erro ao repostar produto", "error");
    }
  };

  const handleCancelCart = async (cartId) => {
    const ok = confirm("Cancelar este carrinho?");
    if (!ok) return;
    try {
      const result = await api(`/api/carts/${encodeURIComponent(cartId)}/cancel`, { method: "POST" });
      setData((prev) => ({
        ...prev,
        carts: prev.carts.map((cart) => (cart.id === cartId ? result.cart : cart))
      }));
      showToast("Carrinho cancelado");
    } catch (err) {
      showToast(err.message || "Erro ao cancelar carrinho", "error");
    }
  };

  const handleSetAccountBlockStatus = async (discordUserId, shouldBlock) => {
    const userId = String(discordUserId || "").trim();
    if (!userId) return;
    let reason = "";
    if (shouldBlock) {
      const input = prompt("Informe o motivo do bloqueio da conta:");
      if (!input) return;
      reason = String(input).trim();
      if (!reason) {
        showToast("Motivo do bloqueio obrigatorio.", "error");
        return;
      }
    }
    setAccountActionUserId(userId);
    try {
      await api(`/api/admin/users/${encodeURIComponent(userId)}/${shouldBlock ? "block" : "unblock"}`, {
        method: "POST",
        body: JSON.stringify({
          byUserId: "admin-panel",
          reason
        })
      });
      showToast(shouldBlock ? "Conta bloqueada com sucesso." : "Conta desbloqueada com sucesso.");
      await loadAll();
    } catch (err) {
      showToast(err.message || "Falha ao atualizar status da conta.", "error");
    } finally {
      setAccountActionUserId("");
    }
  };

  if (!authChecked) {
    return html`
      <div>
        <div className="app-bg" aria-hidden="true"></div>
        <div style=${{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <div className="card" style=${{ width: "min(420px, 100%)", padding: "22px", textAlign: "center" }}>
            <h1 className="font-display" style=${{ margin: "0 0 8px", fontSize: "22px" }}>Astra Admin</h1>
            <p style=${{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>Verificando autenticacao...</p>
          </div>
        </div>
      </div>
    `;
  }

  if (statusInfo.authRequired && !isAuthenticated) {
    return html`
      <div>
        <div className="app-bg" aria-hidden="true"></div>
        <div style=${{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <div className="card" style=${{ width: "min(460px, 100%)", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style=${{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <h1 className="font-display" style=${{ margin: 0, fontSize: "24px" }}>Login Admin</h1>
              <span className="badge warn">Acesso restrito</span>
            </div>
            <p style=${{ margin: 0, color: "var(--muted)", fontSize: "13px", lineHeight: 1.6 }}>
              Entre com suas credenciais para acessar o painel administrativo.
            </p>
            <form onSubmit=${handleLogin} style=${{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field">
                <label>Usuario</label>
                <input
                  type="text"
                  value=${loginUsername}
                  autoComplete="username"
                  onInput=${(e) => setLoginUsername(e.target.value)}
                  placeholder="Digite o usuario"
                />
              </div>
              <div className="field">
                <label>Senha</label>
                <input
                  type="password"
                  value=${loginPassword}
                  autoComplete="current-password"
                  onInput=${(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite a senha"
                />
              </div>
              ${loginError ? html`<div className="badge danger" style=${{ justifyContent: "center" }}>${loginError}</div>` : null}
              <button type="submit" className="btn primary" disabled=${loginBusy}>
                ${loginBusy ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  const adminTabs = [
    { id: "painel", label: "Painel" },
    { id: "solicitacoes", label: "Solicitacoes" },
    { id: "contas", label: "Contas" },
    { id: "operacao", label: "Operacao" },
    { id: "auditoria", label: "Auditoria" },
    ...(!monitoringOnly ? [{ id: "produtos", label: "Produtos" }, { id: "config", label: "Config" }] : [])
  ];
  console.log("[admin:App] About to return JSX");
  return html`
    <div>
      <div className="app-bg" aria-hidden="true"></div>
      <div style=${{ maxWidth: "1400px", margin: "0 auto", padding: "18px 22px 60px" }}>
        <header style=${{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))", border: "1px solid var(--stroke)", borderRadius: "18px", padding: "13px 20px", backdropFilter: "blur(16px)", boxShadow: "var(--shadow)", marginBottom: "13px" }}>
          <div style=${{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="font-display" style=${{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Astra Admin</h1>
            <span className=${`badge ${monitoringOnly ? "muted" : "warn"}`} style=${{ fontSize: "10px" }}>
              ${monitoringOnly ? "monitoramento" : "edicao completa"}
            </span>
            <span className=${`badge ${statusInfo.ok ? "ok" : "danger"}`}>
              ${statusInfo.ok ? "online" : "offline"}
            </span>
          </div>
          <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge ok">sessao ativa</span>
            <${Button} variant="ghost" onClick=${handleLogout}>Sair</${Button}>
          </div>
        </header>

        <nav style=${{ display: "flex", flexWrap: "wrap", gap: "5px", padding: "9px 13px", background: "rgba(8,8,14,0.9)", borderRadius: "13px", border: "1px solid var(--stroke)", backdropFilter: "blur(14px)", marginBottom: "18px", position: "sticky", top: "10px", zIndex: 20, boxShadow: "var(--shadow-soft)" }}>
          ${adminTabs.map(tab => html`
            <button
              key=${tab.id}
              type="button"
              onClick=${() => setAdminTab(tab.id)}
              style=${{
                padding: "7px 16px", borderRadius: "999px", border: "1px solid",
                borderColor: adminTab === tab.id ? "rgba(230,33,42,0.55)" : "rgba(255,255,255,0.1)",
                background: adminTab === tab.id ? "rgba(230,33,42,0.18)" : "rgba(255,255,255,0.04)",
                color: adminTab === tab.id ? "rgba(255,228,230,0.98)" : "var(--ink)",
                fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.16s", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: "5px"
              }}
            >
              ${tab.label}
              ${tab.id === "solicitacoes" && (monitorRequests?.summary?.totalActionable ?? 0) > 0 ? html`
                <span style=${{ padding: "1px 6px", borderRadius: "999px", background: "rgba(230,33,42,0.55)", fontSize: "10px", fontWeight: 800 }}>
                  ${monitorRequests.summary.totalActionable}
                </span>
              ` : null}
            </button>
          `)}
        </nav>

        <main style=${{ display: "flex", flexDirection: "column", gap: "0" }}>

            ${adminTab === "painel" ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style=${{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: "12px" }}>
                  ${stats.map(stat => html`
                    <div key=${stat.label} className="stat-card">
                      <div style=${{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "8px" }}>${stat.label}</div>
                      <div className="font-display" style=${{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>${stat.value}</div>
                      <div style=${{ fontSize: "12px", color: "var(--muted)" }}>${stat.hint}</div>
                    </div>
                  `)}
                </div>
                <div style=${{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                      <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>Diagnostico</span>
                      <div style=${{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <span className=${`badge ${(diagnostics.report?.summary?.high ?? 0) > 0 ? "danger" : "muted"}`}>Alta: ${diagnostics.report?.summary?.high ?? 0}</span>
                        <span className=${`badge ${(diagnostics.report?.summary?.medium ?? 0) > 0 ? "warn" : "muted"}`}>Media: ${diagnostics.report?.summary?.medium ?? 0}</span>
                        <span className="badge muted">Baixa: ${diagnostics.report?.summary?.low ?? 0}</span>
                        <${Button} variant="ghost" onClick=${loadDiagnostics}>${diagnostics.loading ? "..." : "Rodar"}</${Button}>
                      </div>
                    </div>
                    ${diagnostics.report?.issues?.length
                      ? html`<ul style=${{ display: "flex", flexDirection: "column", gap: "6px", listStyle: "none", padding: 0, margin: 0 }}>
                          ${diagnostics.report.issues.slice(0, 8).map(issue => html`
                            <li key=${issue.code} style=${{ fontSize: "12px", color: "var(--ink)", padding: "5px 9px", background: "rgba(255,255,255,0.04)", borderRadius: "7px", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className=${`badge ${issue.severity === "high" ? "danger" : issue.severity === "medium" ? "warn" : "muted"}`}>${issue.severity}</span>
                              ${issue.message}
                            </li>
                          `)}
                        </ul>`
                      : html`<p style=${{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Nenhum problema encontrado.</p>`}
                  </div>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Status do sistema</div>
                    <div style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style=${{ fontSize: "13px" }}>Bot</span>
                        <span className=${`badge ${statusInfo.ok ? "ok" : "danger"}`}>${statusInfo.text}</span>
                      </div>
                      <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style=${{ fontSize: "13px" }}>Modo</span>
                        <span className=${`badge ${monitoringOnly ? "muted" : "warn"}`}>${monitoringOnly ? "Monitoramento" : "Edicao completa"}</span>
                      </div>
                      <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style=${{ fontSize: "13px" }}>Produtos</span>
                        <span className="badge muted">${data.products.length} cadastrados</span>
                      </div>
                      <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style=${{ fontSize: "13px" }}>Usuarios</span>
                        <span className="badge muted">${adminUsers?.summary?.usersTotal ?? 0} total</span>
                      </div>
                      <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style=${{ fontSize: "13px" }}>Saques pend.</span>
                        <span className=${`badge ${(monitorRequests?.summary?.withdrawalsRequested ?? 0) > 0 ? "warn" : "muted"}`}>${monitorRequests?.summary?.withdrawalsRequested ?? 0} solicitados</span>
                      </div>
                    </div>
                    <div style=${{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--stroke)" }}>
                      <${Button} variant="ghost" onClick=${loadAll} style=${{ width: "100%", textAlign: "center" }}>Atualizar tudo</${Button}>
                    </div>
                  </div>
                </div>
              </div>
            ` : null}

            ${adminTab === "solicitacoes" ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <span className=${`badge ${(monitorRequests?.summary?.totalActionable ?? 0) > 0 ? "danger" : "muted"}`}>Abertas: ${monitorRequests?.summary?.totalActionable ?? 0}</span>
                  <span className=${`badge ${(monitorRequests?.summary?.withdrawalsRequested ?? 0) > 0 ? "warn" : "muted"}`}>Saques: ${monitorRequests?.summary?.withdrawalsRequested ?? 0}</span>
                  <span className=${`badge ${(monitorRequests?.summary?.runtimeAlerts ?? 0) > 0 ? "warn" : "muted"}`}>Runtime: ${monitorRequests?.summary?.runtimeAlerts ?? 0}</span>
                  <${Button} variant="ghost" onClick=${loadAll}>Atualizar</${Button}>
                </div>
                <div style=${{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Pedidos pendentes</div>
                    ${(monitorRequests?.queues?.ordersPending || []).concat(monitorRequests?.queues?.ordersWaitingStock || []).slice(0, 10).map(order => html`
                      <div key=${order.id} style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--stroke)", gap: "8px" }}>
                        <div style=${{ flex: 1, minWidth: 0 }}>
                          <div style=${{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${order.id}</div>
                          <div style=${{ fontSize: "11px", color: "var(--muted)" }}>${order.productId || "-"} · ${order.status}</div>
                        </div>
                        <div style=${{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <${Button} variant="ghost" onClick=${() => handleResyncOrder(order.id)}>Sync</${Button}>
                          <${Button} variant="ghost" onClick=${() => handleManualDeliver(order.id)}>Entregar</${Button}>
                        </div>
                      </div>
                    `)}
                    ${(monitorRequests?.queues?.ordersPending?.length || 0) + (monitorRequests?.queues?.ordersWaitingStock?.length || 0) === 0
                      ? html`<p style=${{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Nenhum pedido pendente.</p>`
                      : null}
                    ${(monitorRequests?.queues?.ordersWaitingStock?.length || 0) > 0
                      ? html`<div style=${{ marginTop: "12px" }}><${Button} variant="ghost" onClick=${handleRetryWaitingStock}>Reprocessar waiting_stock</${Button}></div>`
                      : null}
                  </div>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Carrinhos ativos</div>
                    ${(monitorRequests?.queues?.cartsOpen || []).concat(monitorRequests?.queues?.cartsPending || []).slice(0, 10).map(cart => html`
                      <div key=${cart.id} style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--stroke)", gap: "8px" }}>
                        <div style=${{ flex: 1, minWidth: 0 }}>
                          <div style=${{ fontSize: "12px", fontWeight: 600, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${cart.id}</div>
                          <div style=${{ fontSize: "11px", color: "var(--muted)" }}>${cart.productId || "-"} · ${cart.status}</div>
                        </div>
                        <div style=${{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <${Button} variant="ghost" onClick=${() => handleManualConfirmCart(cart.id)}>Confirmar</${Button}>
                          <${Button} variant="ghost" onClick=${() => handleCancelCart(cart.id)}>Cancelar</${Button}>
                        </div>
                      </div>
                    `)}
                    ${(monitorRequests?.queues?.cartsOpen?.length || 0) + (monitorRequests?.queues?.cartsPending?.length || 0) === 0
                      ? html`<p style=${{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Nenhum carrinho ativo.</p>`
                      : null}
                  </div>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Saques solicitados</div>
                    ${(monitorRequests?.queues?.withdrawalsRequested || []).slice(0, 8).map((w) => {
                      const owner =
                        personLabel(w.ownerDiscordUsername, w.ownerEmail, w.ownerDiscordUserId, "-");
                      const badgeTone = statusTone(w.status);
                      const badgeClass =
                        badgeTone === "emerald" ? "ok" : badgeTone === "amber" ? "warn" : badgeTone === "rose" ? "danger" : "muted";
                      return html`
                        <div key=${w.id || w.ownerDiscordUserId} style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--stroke)", gap: "8px" }}>
                          <div style=${{ minWidth: 0 }}>
                            <div style=${{ fontSize: "12px", fontWeight: 600 }}>${owner}</div>
                            <div style=${{ fontSize: "11px", color: "var(--muted)" }}>
                              ${w.amountFormatted || "-"} · ${statusLabel(w.status)}
                            </div>
                          </div>
                          <span className=${`badge ${badgeClass}`}>${statusLabel(w.status)}</span>
                        </div>
                      `;
                    })}
                    ${!(monitorRequests?.queues?.withdrawalsRequested?.length) ? html`<p style=${{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Nenhum saque pendente.</p>` : null}
                  </div>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Alertas de runtime</div>
                    ${(monitorRequests?.queues?.runtimeAlerts || []).slice(0, 8).map((alert, i) => html`
                      <div key=${i} style=${{ padding: "8px 0", borderBottom: "1px solid var(--stroke)" }}>
                        <div style=${{ fontSize: "12px", fontWeight: 600 }}>${alert.instanceId || alert.userId || "-"}</div>
                        <div style=${{ fontSize: "11px", color: "var(--muted)" }}>${alert.message || alert.reason || "-"}</div>
                      </div>
                    `)}
                    ${!(monitorRequests?.queues?.runtimeAlerts?.length) ? html`<p style=${{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>Nenhum alerta de runtime.</p>` : null}
                  </div>
                </div>
              </div>
            ` : null}

            ${adminTab === "contas" ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <span className="badge muted">Total: ${adminUsers?.summary?.usersTotal ?? 0}</span>
                  <span className="badge ok">Ativos: ${adminUsers?.summary?.usersActive ?? 0}</span>
                  <span className=${`badge ${(adminUsers?.summary?.usersBlocked ?? 0) > 0 ? "danger" : "muted"}`}>Bloqueados: ${adminUsers?.summary?.usersBlocked ?? 0}</span>
                  <span className="badge muted">Trial: ${adminUsers?.summary?.usersTrialUsed ?? 0}</span>
                  <span className="badge muted">Plano ativo: ${adminUsers?.summary?.usersWithActivePlan ?? 0}</span>
                </div>
                <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Buscar por discord, email, plano..."
                    value=${accountSearch}
                    onInput=${e => setAccountSearch(e.target.value)}
                    style=${{ flex: 1, minWidth: "220px", padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "13px", outline: "none" }}
                  />
                  <select
                    value=${accountStatusFilter}
                    onChange=${e => setAccountStatusFilter(e.target.value)}
                    style=${{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.55)", color: "var(--ink)", fontSize: "13px", outline: "none" }}
                  >
                    <option value="all">Todos status</option>
                    <option value="active">Ativos</option>
                    <option value="blocked">Bloqueados</option>
                    <option value="suspended">Suspensos</option>
                  </select>
                </div>
                <div style=${{ overflowX: "auto" }}>
                  <table className="table" style=${{ minWidth: "700px" }}>
                    <thead>
                      <tr>
                        <th>Discord</th>
                        <th>Email</th>
                        <th>Plano</th>
                        <th>Status</th>
                        <th>Bloqueio</th>
                        <th>Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredAdminUsers.slice(0, 50).map(user => html`
                        <tr key=${user.discordUserId}>
                          <td>
                            <div style=${{ fontWeight: 600, fontSize: "12px" }}>${user.discordUsername || user.discordUserId || "-"}</div>
                            <div style=${{ fontSize: "10px", color: "var(--muted)", fontFamily: "monospace" }}>${user.discordUserId}</div>
                          </td>
                          <td style=${{ fontSize: "12px" }}>${user.email || "-"}</td>
                          <td>
                            <span className="badge muted">${user.planTier || "-"}</span>
                            ${user.planStatus ? html` <span className="badge muted">${user.planStatus}</span>` : null}
                          </td>
                          <td><span className=${`badge ${user.accountStatus === "blocked" ? "danger" : user.accountStatus === "suspended" ? "warn" : "ok"}`}>${user.accountStatus || "active"}</span></td>
                          <td style=${{ fontSize: "11px", color: "var(--muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${user.blockedReason || "-"}</td>
                          <td>
                            ${user.accountStatus === "blocked"
                              ? html`<${Button} variant="ghost" onClick=${() => handleSetAccountBlockStatus(user.discordUserId, false)} disabled=${accountActionUserId === user.discordUserId}>Desbloquear</${Button}>`
                              : html`<${Button} variant="danger" onClick=${() => handleSetAccountBlockStatus(user.discordUserId, true)} disabled=${accountActionUserId === user.discordUserId}>Bloquear</${Button}>`}
                          </td>
                        </tr>
                      `)}
                      ${filteredAdminUsers.length === 0 ? html`
                        <tr><td colSpan="6" style=${{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Nenhum usuario encontrado.</td></tr>
                      ` : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : null}

            ${adminTab === "operacao" ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style=${{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "12px" }}>
                  ${[
                    { label: "GMV bruto", value: business?.summary?.salesGrossFormatted || "R$ 0,00" },
                    { label: "Receita liquida", value: business?.summary?.salesNetFormatted || "R$ 0,00" },
                    { label: "Planos pagos", value: business?.summary?.planRevenuePaidFormatted || "R$ 0,00" },
                    { label: "Pedidos", value: data.orders.length },
                    { label: "Entregas", value: data.deliveries.length },
                    { label: "Clientes", value: data.customers.length }
                  ].map(kpi => html`
                    <div key=${kpi.label} className="stat-card">
                      <div style=${{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "8px" }}>${kpi.label}</div>
                      <div className="font-display" style=${{ fontSize: "24px", fontWeight: 700 }}>${kpi.value}</div>
                    </div>
                  `)}
                </div>
                <div className="card" style=${{ padding: "18px" }}>
                  <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
                    <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>Pedidos</span>
                    <select value=${ordersFilter} onChange=${e => setOrdersFilter(e.target.value)} style=${{ padding: "5px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.55)", color: "var(--ink)", fontSize: "12px", outline: "none" }}>
                      <option value="all">Todos</option>
                      <option value="pending">Pendente</option>
                      <option value="waiting_stock">Aguard. estoque</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                    <select value=${ordersSourceFilter} onChange=${e => setOrdersSourceFilter(e.target.value)} style=${{ padding: "5px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.55)", color: "var(--ink)", fontSize: "12px", outline: "none" }}>
                      <option value="all">Todas origens</option>
                      <option value="pix">PIX</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input type="text" placeholder="Buscar ID, usuario..." value=${ordersSearch} onInput=${e => setOrdersSearch(e.target.value)} style=${{ padding: "5px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none", flex: 1, minWidth: "160px" }} />
                    <${Button} variant="ghost" onClick=${handleRetryWaitingStock}>Retry waiting_stock</${Button}>
                  </div>
                  <div style=${{ overflowX: "auto" }}>
                    <table className="table" style=${{ minWidth: "720px" }}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Produto</th>
                          <th>Variacao</th>
                          <th>Status</th>
                          <th>Origem</th>
                          <th>Acao</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredOrders.slice(0, 60).map(order => html`
                          <tr key=${order.id}>
                            <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${order.id}</td>
                            <td style=${{ fontSize: "12px" }}>${order.productId || "-"}</td>
                            <td style=${{ fontSize: "12px" }}>${order.variantId || "-"}</td>
                            <td><span className=${`badge ${order.status === "delivered" ? "ok" : order.status === "pending" || order.status === "waiting_stock" ? "warn" : "muted"}`}>${order.status}</span></td>
                            <td><span className="badge muted">${order.confirmedSource || "-"}</span></td>
                            <td style=${{ display: "flex", gap: "4px" }}>
                              <${Button} variant="ghost" onClick=${() => handleResyncOrder(order.id)}>Sync</${Button}>
                              ${order.status !== "delivered" ? html`<${Button} variant="ghost" onClick=${() => handleManualDeliver(order.id)}>Entregar</${Button}>` : null}
                            </td>
                          </tr>
                        `)}
                        ${filteredOrders.length === 0 ? html`
                          <tr><td colSpan="6" style=${{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Nenhum pedido encontrado.</td></tr>
                        ` : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card" style=${{ padding: "18px" }}>
                  <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Carrinhos</div>
                  <div style=${{ overflowX: "auto" }}>
                    <table className="table" style=${{ minWidth: "620px" }}>
                      <thead><tr><th>ID</th><th>Produto</th><th>Status</th><th>Acao</th></tr></thead>
                      <tbody>
                        ${data.carts.slice(0, 40).map(cart => html`
                          <tr key=${cart.id}>
                            <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${cart.id}</td>
                            <td style=${{ fontSize: "12px" }}>${cart.productId || "-"}</td>
                            <td><span className=${`badge ${cart.status === "open" || cart.status === "pending" ? "warn" : cart.status === "paid" ? "ok" : "muted"}`}>${cart.status}</span></td>
                            <td style=${{ display: "flex", gap: "4px" }}>
                              ${cart.status !== "paid" && cart.status !== "cancelled" ? html`<${Button} variant="ghost" onClick=${() => handleManualConfirmCart(cart.id)}>Confirmar</${Button}>` : null}
                              ${cart.status !== "cancelled" ? html`<${Button} variant="ghost" onClick=${() => handleCancelCart(cart.id)}>Cancelar</${Button}>` : null}
                            </td>
                          </tr>
                        `)}
                        ${data.carts.length === 0 ? html`<tr><td colSpan="4" style=${{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Nenhum carrinho.</td></tr>` : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style=${{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Entregas recentes</div>
                    <div style=${{ overflowX: "auto" }}>
                      <table className="table">
                        <thead><tr><th>ID pedido</th><th>Produto</th><th>Status</th></tr></thead>
                        <tbody>
                          ${data.deliveries.slice(0, 20).map(d => html`
                            <tr key=${d.orderId || d.id}>
                              <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${d.orderId || d.id || "-"}</td>
                              <td style=${{ fontSize: "12px" }}>${d.productId || "-"}</td>
                              <td><span className=${`badge ${d.status === "delivered" ? "ok" : "muted"}`}>${d.status || "-"}</span></td>
                            </tr>
                          `)}
                          ${data.deliveries.length === 0 ? html`<tr><td colSpan="3" style=${{ textAlign: "center", color: "var(--muted)", padding: "16px" }}>Nenhuma entrega.</td></tr>` : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Clientes</div>
                    <div style=${{ overflowX: "auto" }}>
                      <table className="table">
                        <thead><tr><th>ID</th><th>Produto</th><th>Data</th></tr></thead>
                        <tbody>
                          ${data.customers.slice(0, 20).map(c => html`
                            <tr key=${c.userId || c.id}>
                              <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${c.userId || c.discordUserId || c.id || "-"}</td>
                              <td style=${{ fontSize: "12px" }}>${c.productId || "-"}</td>
                              <td style=${{ fontSize: "11px", color: "var(--muted)" }}>${c.purchasedAt ? new Date(c.purchasedAt).toLocaleDateString("pt-BR") : "-"}</td>
                            </tr>
                          `)}
                          ${data.customers.length === 0 ? html`<tr><td colSpan="3" style=${{ textAlign: "center", color: "var(--muted)", padding: "16px" }}>Nenhum cliente.</td></tr>` : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ` : null}

            ${adminTab === "auditoria" ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <input type="text" placeholder="Buscar eventos..." value=${timelineSearch} onInput=${e => setTimelineSearch(e.target.value)} style=${{ flex: 1, minWidth: "220px", padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "13px", outline: "none" }} />
                  <select value=${timelineSeverity} onChange=${e => setTimelineSeverity(e.target.value)} style=${{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.55)", color: "var(--ink)", fontSize: "13px", outline: "none" }}>
                    <option value="all">Todas severidades</option>
                    <option value="critical">Critica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="info">Info</option>
                  </select>
                  <${Button} variant="ghost" onClick=${loadAll}>Atualizar</${Button}>
                </div>
                <div className="card" style=${{ padding: "18px" }}>
                  <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "14px" }}>Eventos (${filteredTimelineEvents.length})</div>
                  <div style=${{ overflowX: "auto" }}>
                    <table className="table" style=${{ minWidth: "600px" }}>
                      <thead><tr><th>Hora</th><th>Tipo</th><th>Origem</th><th>Resumo</th><th>Severidade</th></tr></thead>
                      <tbody>
                        ${filteredTimelineEvents.slice(0, 60).map((event, i) => html`
                          <tr key=${i}>
                            <td style=${{ fontFamily: "monospace", fontSize: "11px", whiteSpace: "nowrap" }}>${event.ts ? new Date(event.ts).toLocaleTimeString("pt-BR") : "-"}</td>
                            <td style=${{ fontSize: "12px" }}>${event.type || "-"}</td>
                            <td style=${{ fontSize: "12px" }}>${event.source || "-"}</td>
                            <td style=${{ fontSize: "12px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>${event.summary || "-"}</td>
                            <td><span className=${`badge ${event.severity === "critical" || event.severity === "high" ? "danger" : event.severity === "medium" ? "warn" : "muted"}`}>${event.severity || "info"}</span></td>
                          </tr>
                        `)}
                        ${filteredTimelineEvents.length === 0 ? html`<tr><td colSpan="5" style=${{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>Nenhum evento encontrado.</td></tr>` : null}
                      </tbody>
                    </table>
                  </div>
                </div>
                ${(timeline?.rawLogs?.out || []).length > 0 ? html`
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "10px" }}>Log stdout (recente)</div>
                    <pre style=${{ fontSize: "11px", color: "rgba(200,240,200,0.85)", background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "12px", overflowX: "auto", maxHeight: "220px", overflowY: "auto", margin: 0, lineHeight: 1.5 }}>${(timeline.rawLogs.out || []).join("\n")}</pre>
                  </div>
                ` : null}
                ${(timeline?.rawLogs?.err || []).length > 0 ? html`
                  <div className="card" style=${{ padding: "18px" }}>
                    <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: "10px" }}>Log stderr (recente)</div>
                    <pre style=${{ fontSize: "11px", color: "rgba(255,200,180,0.85)", background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "12px", overflowX: "auto", maxHeight: "220px", overflowY: "auto", margin: 0, lineHeight: 1.5 }}>${(timeline.rawLogs.err || []).join("\n")}</pre>
                  </div>
                ` : null}
              </div>
            ` : null}

            ${adminTab === "produtos" && !monitoringOnly ? html`
              <div style=${{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style=${{ width: "260px", flexShrink: 0 }}>
                  <div className="card" style=${{ padding: "14px", position: "sticky", top: "80px" }}>
                    <div style=${{ display: "flex", gap: "5px", marginBottom: "10px" }}>
                      <input type="text" placeholder="Filtrar produto..." value=${productQuery} onInput=${e => setProductQuery(e.target.value)} style=${{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                    </div>
                    <div style=${{ display: "flex", gap: "5px", marginBottom: "12px" }}>
                      <${Button} variant="primary" onClick=${handleNewProduct} style=${{ flex: 1 }}>+ Novo</${Button}>
                      ${selectedId ? html`<${Button} variant="ghost" onClick=${handleDuplicateProduct}>Dup</${Button}>` : null}
                      ${selectedId ? html`<${Button} variant="danger" onClick=${handleDeleteProduct}>Del</${Button}>` : null}
                    </div>
                    <div style=${{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "420px", overflowY: "auto" }}>
                      ${filteredProducts.map(product => html`
                        <button
                          key=${product.id}
                          type="button"
                          onClick=${() => setSelectedId(product.id)}
                          style=${{
                            padding: "8px 10px", borderRadius: "8px", border: "1px solid",
                            borderColor: selectedId === product.id ? "rgba(230,33,42,0.5)" : "transparent",
                            background: selectedId === product.id ? "rgba(230,33,42,0.12)" : "rgba(255,255,255,0.03)",
                            color: "var(--ink)", textAlign: "left", cursor: "pointer", fontSize: "12px"
                          }}
                        >
                          <div style=${{ fontWeight: 600 }}>${product.name || product.id}</div>
                          <div style=${{ fontSize: "10px", color: "var(--muted)", fontFamily: "monospace" }}>${product.id}</div>
                        </button>
                      `)}
                      ${filteredProducts.length === 0 ? html`<p style=${{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Nenhum produto.</p>` : null}
                    </div>
                  </div>
                </div>
                <div style=${{ flex: 1, minWidth: 0 }}>
                  ${!selectedId ? html`
                    <div className="card" style=${{ padding: "40px 24px", textAlign: "center" }}>
                      <div style=${{ fontSize: "32px", marginBottom: "10px" }}>📦</div>
                      <div style=${{ fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>Selecione um produto</div>
                      <div style=${{ fontSize: "13px", color: "var(--muted)" }}>Escolha um produto na lista ao lado ou crie um novo.</div>
                    </div>
                  ` : html`
                    <div style=${{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      <div style=${{ display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
                        ${["info","mensagens","estoque","midia","publicar"].map(tab => html`
                          <button
                            key=${tab}
                            type="button"
                            onClick=${() => setProductSubTab(tab)}
                            style=${{
                              padding: "7px 16px", borderRadius: "999px", border: "1px solid",
                              borderColor: productSubTab === tab ? "rgba(230,33,42,0.55)" : "rgba(255,255,255,0.1)",
                              background: productSubTab === tab ? "rgba(230,33,42,0.18)" : "rgba(255,255,255,0.04)",
                              color: productSubTab === tab ? "rgba(255,228,230,0.98)" : "var(--ink)",
                              fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.16s", whiteSpace: "nowrap", textTransform: "capitalize"
                            }}
                          >${tab}</button>
                        `)}
                        <${Button} variant="primary" onClick=${handleSaveProduct} style=${{ marginLeft: "auto" }}>Salvar produto</${Button}>
                      </div>

                      ${productSubTab === "info" ? html`
                        <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div className="field">
                            <label>Nome do produto</label>
                            <input type="text" value=${productForm.name} onInput=${e => updateProductField("name", e.target.value)} />
                          </div>
                          <div className="field">
                            <label>Label curto (ex: "Bot Premium")</label>
                            <input type="text" value=${productForm.shortLabel} onInput=${e => updateProductField("shortLabel", e.target.value)} />
                          </div>
                          <div className="field">
                            <label>Descricao (embed do Discord)</label>
                            <textarea rows="4" value=${productForm.description} onInput=${e => updateProductField("description", e.target.value)}></textarea>
                          </div>
                          <div className="field">
                            <label>Instrucoes PIX (embed)</label>
                            <textarea rows="3" value=${productForm.pixInstructions} onInput=${e => updateProductField("pixInstructions", e.target.value)}></textarea>
                          </div>
                          <div className="field">
                            <label>URL demo (botao no embed)</label>
                            <input type="text" value=${productForm.demoUrl} onInput=${e => updateProductField("demoUrl", e.target.value)} />
                          </div>
                          <div>
                            <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Secoes do embed</span>
                              <${Button} variant="ghost" onClick=${addSection}>+ Secao</${Button}>
                            </div>
                            ${sectionsForm.map((section, i) => html`
                              <div key=${i} style=${{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                                <input type="text" placeholder="Nome" value=${section.name} onInput=${e => updateSectionField(i, "name", e.target.value)} style=${{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <input type="text" placeholder="Valor" value=${section.value} onInput=${e => updateSectionField(i, "value", e.target.value)} style=${{ flex: 2, padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <label className="checkbox"><input type="checkbox" checked=${section.inline} onChange=${e => updateSectionField(i, "inline", e.target.checked)} /> inline</label>
                                <${Button} variant="danger" onClick=${() => removeSection(i)}>✕</${Button}>
                              </div>
                            `)}
                          </div>
                          <div>
                            <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                              <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Variacoes</span>
                              <${Button} variant="ghost" onClick=${addVariant}>+ Variacao</${Button}>
                            </div>
                            ${variantsForm.map((variant, i) => html`
                              <div key=${i} style=${{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                                <input type="text" placeholder="ID (ex: mensal)" value=${variant.id} onInput=${e => updateVariantField(i, "id", e.target.value)} style=${{ width: "110px", padding: "5px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <input type="text" placeholder="Label" value=${variant.label} onInput=${e => updateVariantField(i, "label", e.target.value)} style=${{ width: "110px", padding: "5px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <input type="text" placeholder="Emoji" value=${variant.emoji} onInput=${e => updateVariantField(i, "emoji", e.target.value)} style=${{ width: "60px", padding: "5px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <input type="text" placeholder="Duracao" value=${variant.duration} onInput=${e => updateVariantField(i, "duration", e.target.value)} style=${{ width: "90px", padding: "5px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <input type="text" placeholder="Preco (R$)" value=${variant.price} onInput=${e => updateVariantField(i, "price", e.target.value)} style=${{ width: "80px", padding: "5px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "12px", outline: "none" }} />
                                <${Button} variant="danger" onClick=${() => removeVariant(i)}>✕</${Button}>
                              </div>
                            `)}
                          </div>
                        </div>
                      ` : null}

                      ${productSubTab === "mensagens" ? html`
                        <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
                          <div style=${{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px" }}>
                            <span style=${{ fontSize: "11px", color: "var(--muted)", width: "100%", marginBottom: "4px" }}>Placeholders — clique para inserir no campo ativo:</span>
                            ${DM_PLACEHOLDERS.map(token => html`
                              <button key=${token} type="button" onClick=${() => insertPlaceholder(token)} style=${{ padding: "3px 8px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.06)", color: "var(--ink)", cursor: "pointer" }}>${"{{" + token + "}}"}</button>
                            `)}
                          </div>
                          ${dmTemplateWarnings.length > 0 ? html`
                            <div style=${{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              ${dmTemplateWarnings.map((w, i) => html`<div key=${i} style=${{ fontSize: "12px", color: "#ff9060", background: "rgba(255,100,0,0.1)", borderRadius: "7px", padding: "7px 10px" }}>${w}</div>`)}
                            </div>
                          ` : null}
                          <div className="field">
                            <label>Titulo da DM de entrega</label>
                            <input type="text" value=${productForm.deliveryDmTitle} onInput=${e => updateProductField("deliveryDmTitle", e.target.value)} onFocus=${() => setActiveDmField("deliveryDmTitle")} />
                          </div>
                          <div className="field">
                            <label>Mensagem padrao</label>
                            <textarea rows="4" value=${productForm.deliveryDmMessage} onInput=${e => updateProductField("deliveryDmMessage", e.target.value)} onFocus=${() => setActiveDmField("deliveryDmMessage")} style=${{ fontFamily: "monospace" }}></textarea>
                          </div>
                          <div className="field">
                            <label>Mensagem PIX (confirmacao automatica)</label>
                            <textarea rows="4" value=${productForm.deliveryDmMessagePix} onInput=${e => updateProductField("deliveryDmMessagePix", e.target.value)} onFocus=${() => setActiveDmField("deliveryDmMessagePix")} style=${{ fontFamily: "monospace" }}></textarea>
                          </div>
                          <div className="field">
                            <label>Mensagem Admin (confirmacao manual)</label>
                            <textarea rows="4" value=${productForm.deliveryDmMessageAdmin} onInput=${e => updateProductField("deliveryDmMessageAdmin", e.target.value)} onFocus=${() => setActiveDmField("deliveryDmMessageAdmin")} style=${{ fontFamily: "monospace" }}></textarea>
                          </div>
                          <div className="card" style=${{ padding: "14px", background: "rgba(255,255,255,0.03)" }}>
                            <div style=${{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                              <span style=${{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>Preview DM:</span>
                              <select value=${dmPreviewSource} onChange=${e => setDmPreviewSource(e.target.value)} style=${{ padding: "4px 8px", borderRadius: "7px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.55)", color: "var(--ink)", fontSize: "12px", outline: "none" }}>
                                <option value="pix">PIX</option>
                                <option value="admin">Admin</option>
                                <option value="default">Padrao</option>
                              </select>
                            </div>
                            <pre style=${{ fontSize: "12px", color: "rgba(220,240,220,0.9)", background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "10px", overflowX: "auto", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>${dmPreview}</pre>
                          </div>
                        </div>
                      ` : null}

                      ${productSubTab === "estoque" ? html`
                        <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                            <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Estoque — ${selectedId}</span>
                            ${stockDuplicateKeys.length > 0 ? html`<span className="badge danger">Keys duplicadas!</span>` : null}
                            <${Button} variant="primary" onClick=${handleSaveStock} style=${{ marginLeft: "auto" }}>Salvar estoque</${Button}>
                          </div>
                          ${stockCoverage.length > 0 ? html`
                            <div style=${{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              ${stockCoverage.map(entry => html`
                                <span key=${entry.variantId} className=${`badge ${entry.covered ? "ok" : "danger"}`}>${entry.variantId}: ${entry.count} keys</span>
                              `)}
                            </div>
                          ` : null}
                          ${stockEntries.map(entry => html`
                            <div key=${entry.bucket} style=${{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
                              <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <span style=${{ fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>${entry.bucket}</span>
                                <span className="badge muted">${(stockForm[entry.bucket] || "").split("\n").filter(k => k.trim()).length} keys</span>
                              </div>
                              <textarea
                                rows="5"
                                value=${stockForm[entry.bucket] || ""}
                                onInput=${e => setStockForm(prev => ({ ...prev, [entry.bucket]: e.target.value }))}
                                placeholder="Uma key por linha..."
                                style=${{ fontFamily: "monospace", fontSize: "11px", width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.3)", color: "var(--ink)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                              ></textarea>
                            </div>
                          `)}
                          ${stockEntries.length === 0 ? html`<p style=${{ fontSize: "13px", color: "var(--muted)" }}>Configure variacoes primeiro (aba Info) e salve.</p>` : null}
                        </div>
                      ` : null}

                      ${productSubTab === "midia" ? html`
                        <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div className="field">
                            <label>Banner (imagem grande no topo do embed)</label>
                            <input type="text" value=${productForm.bannerImage} onInput=${e => updateProductField("bannerImage", e.target.value)} placeholder="https://..." />
                            ${productForm.bannerImage ? html`<img src=${productForm.bannerImage} alt="banner" style=${{ marginTop: "8px", maxHeight: "120px", borderRadius: "8px", objectFit: "cover", maxWidth: "100%" }} />` : null}
                          </div>
                          <div className="field">
                            <label>Preview (imagem media)</label>
                            <input type="text" value=${productForm.previewImage} onInput=${e => updateProductField("previewImage", e.target.value)} placeholder="https://..." />
                          </div>
                          <div className="field">
                            <label>Thumbnail (icone pequeno no embed)</label>
                            <input type="text" value=${productForm.thumbnail} onInput=${e => updateProductField("thumbnail", e.target.value)} placeholder="https://..." />
                            ${productForm.thumbnail ? html`<img src=${productForm.thumbnail} alt="thumbnail" style=${{ marginTop: "8px", maxHeight: "60px", borderRadius: "6px" }} />` : null}
                          </div>
                          <div className="field">
                            <label>Footer (imagem no rodape do embed)</label>
                            <input type="text" value=${productForm.footerImage} onInput=${e => updateProductField("footerImage", e.target.value)} placeholder="https://..." />
                          </div>
                          <div className="field">
                            <label>GIF pre-post (enviado antes do embed principal)</label>
                            <input type="text" value=${productForm.prePostGif} onInput=${e => updateProductField("prePostGif", e.target.value)} placeholder="https://..." />
                          </div>
                          <div className="field">
                            <label>GIFs de carousel (uma URL por linha)</label>
                            <textarea rows="5" value=${gifImages} onInput=${e => setGifImages(e.target.value)} placeholder="https://exemplo.com/gif1.gif&#10;https://exemplo.com/gif2.gif" style=${{ fontFamily: "monospace" }}></textarea>
                          </div>
                          <label className="checkbox" style=${{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><input type="checkbox" checked=${productForm.disableThumbnail} onChange=${e => updateProductField("disableThumbnail", e.target.checked)} /> Desabilitar thumbnail no embed</label>
                        </div>
                      ` : null}

                      ${productSubTab === "publicar" ? html`
                        <div style=${{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Postar produto no Discord</div>
                            <div className="field">
                              <label>Channel ID</label>
                              <input type="text" value=${actionChannelId} onInput=${e => setActionChannelId(e.target.value)} placeholder="ID do canal Discord..." />
                            </div>
                            <label className="checkbox" style=${{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}><input type="checkbox" checked=${actionPurge} onChange=${e => setActionPurge(e.target.checked)} /> Apagar mensagens antigas antes de postar (purge)</label>
                            <${Button} variant="primary" onClick=${handlePostProduct}>Postar no Discord</${Button}>
                          </div>
                          <div className="card" style=${{ padding: "18px" }}>
                            <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                              <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Posts publicados</span>
                              <div style=${{ display: "flex", gap: "6px", alignItems: "center" }}>
                                ${postsHealth.summary ? html`
                                  <span className=${`badge ${postsHealth.summary.healthy < postsHealth.summary.total ? "warn" : "ok"}`}>${postsHealth.summary.healthy}/${postsHealth.summary.total} ok</span>
                                ` : null}
                                <${Button} variant="ghost" onClick=${handleCheckPostsHealth}>Verificar saude</${Button}>
                              </div>
                            </div>
                            <div style=${{ overflowX: "auto" }}>
                              <table className="table">
                                <thead><tr><th>Produto</th><th>Canal</th><th>Mensagem</th><th>Saude</th><th>Acao</th></tr></thead>
                                <tbody>
                                  ${data.posts.filter(p => p.productId === selectedId).map(post => html`
                                    <tr key=${post.messageId || post.id}>
                                      <td style=${{ fontSize: "12px" }}>${post.productId}</td>
                                      <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${post.channelId || "-"}</td>
                                      <td style=${{ fontFamily: "monospace", fontSize: "11px" }}>${post.messageId || "-"}</td>
                                      <td>
                                        ${postsHealth.byMessageId[post.messageId]
                                          ? html`<span className=${`badge ${postsHealth.byMessageId[post.messageId].ok ? "ok" : "danger"}`}>${postsHealth.byMessageId[post.messageId].ok ? "ok" : "falhou"}</span>`
                                          : html`<span className="badge muted">-</span>`}
                                      </td>
                                      <td><${Button} variant="ghost" onClick=${() => handleRepostFromPanel(post)}>Repostar</${Button}></td>
                                    </tr>
                                  `)}
                                  ${data.posts.filter(p => p.productId === selectedId).length === 0
                                    ? html`<tr><td colSpan="5" style=${{ textAlign: "center", color: "var(--muted)", padding: "20px" }}>Nenhum post para este produto.</td></tr>`
                                    : null}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ` : null}
                    </div>
                  `}
                </div>
              </div>
            ` : null}

            ${adminTab === "config" && !monitoringOnly ? html`
              <div style=${{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style=${{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>Configuracoes do bot</span>
                    <${Button} variant="primary" onClick=${handleSaveConfig}>Salvar</${Button}>
                  </div>
                  <div style=${{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="field">
                      <label>Staff Role ID</label>
                      <input type="text" value=${configForm.staffRoleId} onInput=${e => setConfigForm(prev => ({ ...prev, staffRoleId: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Admin User IDs (virgula)</label>
                      <input type="text" value=${configForm.adminUserIds} onInput=${e => setConfigForm(prev => ({ ...prev, adminUserIds: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Cart Category ID</label>
                      <input type="text" value=${configForm.cartCategoryId} onInput=${e => setConfigForm(prev => ({ ...prev, cartCategoryId: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Tracker Channel ID</label>
                      <input type="text" value=${configForm.trackerChannelId} onInput=${e => setConfigForm(prev => ({ ...prev, trackerChannelId: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Staff Log Channel ID</label>
                      <input type="text" value=${configForm.staffLogChannelId} onInput=${e => setConfigForm(prev => ({ ...prev, staffLogChannelId: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Post Channel ID (padrao)</label>
                      <input type="text" value=${configForm.postChannelId} onInput=${e => setConfigForm(prev => ({ ...prev, postChannelId: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Intervalo checagem pag. (ms)</label>
                      <input type="number" value=${configForm.paymentCheckIntervalMs} onInput=${e => setConfigForm(prev => ({ ...prev, paymentCheckIntervalMs: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Max attachment (bytes)</label>
                      <input type="number" value=${configForm.maxAttachmentBytes} onInput=${e => setConfigForm(prev => ({ ...prev, maxAttachmentBytes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Banner do sistema (mensagem global)</label>
                    <textarea rows="2" value=${configForm.systemBanner} onInput=${e => setConfigForm(prev => ({ ...prev, systemBanner: e.target.value }))}></textarea>
                  </div>
                  <div className="field">
                    <label>Instrucoes PIX (padrao global)</label>
                    <textarea rows="3" value=${configForm.pixInstructions} onInput=${e => setConfigForm(prev => ({ ...prev, pixInstructions: e.target.value }))}></textarea>
                  </div>
                </div>
                <div className="card" style=${{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style=${{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>Cupons de desconto</div>
                  <div style=${{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                    <input type="text" placeholder="CODIGO" value=${configForm.couponCode} onInput=${e => setConfigForm(prev => ({ ...prev, couponCode: e.target.value }))} style=${{ width: "120px", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "13px", outline: "none" }} />
                    <input type="number" placeholder="% desconto" value=${configForm.couponPercent} onInput=${e => setConfigForm(prev => ({ ...prev, couponPercent: e.target.value }))} style=${{ width: "110px", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--stroke)", background: "rgba(0,0,0,0.22)", color: "var(--ink)", fontSize: "13px", outline: "none" }} />
                    <label className="checkbox" style=${{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}><input type="checkbox" checked=${configForm.couponActive} onChange=${e => setConfigForm(prev => ({ ...prev, couponActive: e.target.checked }))} /> Ativo</label>
                    <${Button} variant="primary" onClick=${handleCreateCoupon}>Criar cupom</${Button}>
                  </div>
                  <div style=${{ overflowX: "auto" }}>
                    <table className="table">
                      <thead><tr><th>Codigo</th><th>Desconto</th><th>Status</th><th>Acao</th></tr></thead>
                      <tbody>
                        ${data.coupons.map(coupon => html`
                          <tr key=${coupon.code}>
                            <td style=${{ fontWeight: 700, fontFamily: "monospace" }}>${coupon.code}</td>
                            <td>${coupon.percent}%</td>
                            <td><span className=${`badge ${coupon.active ? "ok" : "muted"}`}>${coupon.active ? "ativo" : "inativo"}</span></td>
                            <td style=${{ display: "flex", gap: "4px" }}>
                              <${Button} variant="ghost" onClick=${() => handleToggleCoupon(coupon.code)}>${coupon.active ? "Desativar" : "Ativar"}</${Button}>
                              <${Button} variant="danger" onClick=${() => handleDeleteCoupon(coupon.code)}>Excluir</${Button}>
                            </td>
                          </tr>
                        `)}
                        ${data.coupons.length === 0 ? html`<tr><td colSpan="4" style=${{ textAlign: "center", color: "var(--muted)", padding: "20px" }}>Nenhum cupom cadastrado.</td></tr>` : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ` : null}
          </main>
        </div>

      <div className=${`toast ${toast ? "show" : ""}`} data-type=${toast?.type === "error" ? "error" : "info"}>
        ${toast?.message || ""}
      </div>
    </div>
  `;
}

console.log("[admin:app.js] About to render App component...");

// Error boundary component
function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (hasError) {
    return html`<div style=${{ color: "red", padding: "20px", background: "#1a0505" }}>
      <h2>Erro no Admin Panel</h2>
      <pre>${errorMsg}</pre>
    </div>`;
  }

  return children;
}

try {
  const rootEl = document.getElementById("root");
  console.log("[admin:app.js] Root element found:", rootEl);
  const root = createRoot(rootEl);
  root.render(html`<${App} />`);
  console.log("[admin:app.js] Render called successfully");
} catch (err) {
  console.error("[admin:app.js] Render error:", err);
  document.getElementById("root").innerHTML = `<div style="color: red; padding: 20px; background: #1a0505;">
    <h2>Erro no Admin Panel</h2>
    <pre>${err.stack || err.message}</pre>
  </div>`;
}
