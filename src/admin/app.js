
import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";

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
  { id: "dashboard-panel", label: "Visao geral" },
  { id: "product-panel", label: "Produto" },
  { id: "media-panel", label: "Midias" },
  { id: "sections-panel", label: "Secoes" },
  { id: "variants-panel", label: "Variacoes" },
  { id: "stock-panel", label: "Estoque" },
  { id: "actions-panel", label: "Acoes" },
  { id: "config-panel", label: "Configuracao" },
  { id: "coupons-panel", label: "Cupons" },
  { id: "orders-panel", label: "Pedidos" },
  { id: "carts-panel", label: "Carrinhos" },
  { id: "posts-panel", label: "Posts" },
  { id: "deliveries-panel", label: "Entregas" },
  { id: "customers-panel", label: "Clientes" }
];

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

function shortId(value) {
  const text = String(value || "");
  return text.length > 8 ? `${text.slice(0, 8)}...` : text;
}

function statusLabel(status) {
  const map = {
    pending: "pendente",
    waiting_stock: "aguardando estoque",
    delivered: "entregue",
    failed: "falhou",
    open: "aberto",
    cancelled: "cancelado",
    expired: "expirado",
    paid: "pago",
    active: "ativo",
    inactive: "inativo"
  };
  const key = String(status || "").toLowerCase();
  return map[key] || key || "-";
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (["delivered", "paid", "active"].includes(key)) return "emerald";
  if (["pending", "waiting_stock", "open", "inactive"].includes(key)) return "amber";
  if (["failed", "cancelled", "expired"].includes(key)) return "rose";
  return "slate";
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
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition";
  const variants = {
    primary: "bg-[var(--accent)] text-white shadow-md hover:-translate-y-0.5",
    ghost: "border border-[var(--stroke)] bg-white/70 text-slate-900 hover:bg-white",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
  };
  return html`
    <button
      className=${`${base} ${variants[variant] || variants.primary} ${className || ""}`}
      onClick=${onClick}
      disabled=${disabled}
    >
      ${children}
    </button>
  `;
}

function Badge({ status }) {
  const tone = statusTone(status);
  const classes = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200"
  };
  return html`
    <span
      className=${`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
        classes[tone]
      }`}
    >
      ${statusLabel(status)}
    </span>
  `;
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
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [statusInfo, setStatusInfo] = useState({ ok: false, text: "Aguardando conexao", authRequired: false });
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
  const [postsHealth, setPostsHealth] = useState({ summary: null, byMessageId: {}, checkedAt: "" });
  const [diagnostics, setDiagnostics] = useState({ loading: false, report: null });
  const [activeSection, setActiveSection] = useState(sectionLinks[0].id);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const variantIdsRef = useRef([]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  };

  const api = async (path, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, { ...options, headers });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};

    if (!res.ok) {
      const message = data?.error || `Erro ${res.status}`;
      throw new Error(message);
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
      setStatusInfo({ ok: false, text: "Carregando dados...", authRequired: statusInfo.authRequired });
      const [status, products, stock, config, coupons, orders, carts, posts, deliveries, customers] =
        await Promise.all([
          api("/api/status"),
          api("/api/products"),
          api("/api/stock"),
          api("/api/config"),
          api("/api/coupons"),
          api("/api/orders"),
          api("/api/carts"),
          api("/api/posts"),
          api("/api/deliveries"),
          api("/api/customers")
        ]);

      const nextData = {
        products: products.products || [],
        stock: stock.stock || {},
        config: config.config || {},
        coupons: coupons.coupons || [],
        orders: orders.orders || [],
        carts: carts.carts || [],
        posts: posts.posts || [],
        deliveries: deliveries.deliveries || [],
        customers: customers.customers || []
      };

      setData(nextData);
      setPostsHealth({ summary: null, byMessageId: {}, checkedAt: "" });
      setConfigForm((prev) => ({ ...prev, ...nextData.config }));
      const nextSelected =
        selectedId && nextData.products.find((p) => p.id === selectedId)
          ? selectedId
          : nextData.products[0]?.id || "";
      setSelectedId(nextSelected);
      setStatusInfo({
        ok: true,
        text: status.botReady ? "Bot pronto" : "Bot iniciando",
        authRequired: status.authRequired
      });
      loadDiagnostics();
    } catch (err) {
      setDiagnostics((prev) => ({ ...prev, loading: false }));
      setStatusInfo({ ok: false, text: err.message || "Falha ao carregar", authRequired: statusInfo.authRequired });
      showToast(err.message || "Falha ao carregar", "error");
    }
  };

  useEffect(() => {
    if (token) {
      loadAll();
    }
  }, []);

  useEffect(() => {
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
  }, [selectedId, data.products, data.stock, data.config]);

  useEffect(() => {
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
  }, [variantsForm, selectedId]);

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
    const variantsCount = data.products.reduce((sum, product) => sum + (product.variants?.length || 0), 0);
    const activeCoupons = data.coupons.filter((c) => c.active !== false).length;
    const pendingOrders = data.orders.filter((o) => o.status === "pending").length;
    const waitingStock = data.orders.filter((o) => o.status === "waiting_stock").length;
    const deliveredOrders = data.orders.filter((o) => o.status === "delivered").length;
    const openCarts = data.carts.filter((c) => c.status === "open").length;
    const pendingCarts = data.carts.filter((c) => c.status === "pending").length;
    const totalKeys = sumStockKeys(data.stock);

    return [
      { label: "Produtos", value: data.products.length, hint: `${variantsCount} variacoes` },
      { label: "Cupons ativos", value: activeCoupons, hint: `${data.coupons.length} no total` },
      { label: "Pedidos pendentes", value: pendingOrders, hint: `${waitingStock} aguardando estoque` },
      { label: "Entregas", value: deliveredOrders, hint: `${data.deliveries.length} entregas` },
      { label: "Carrinhos abertos", value: openCarts, hint: `${pendingCarts} pendentes` },
      { label: "Estoque", value: totalKeys, hint: "keys disponiveis" }
    ];
  }, [data]);

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

  const handleConnect = async () => {
    localStorage.setItem("adminToken", token || "");
    await loadAll();
  };

  const handleClearToken = () => {
    localStorage.removeItem("adminToken");
    setToken("");
    showToast("Token limpo");
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
  return html`
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8">
        <header className="glass flex flex-wrap items-center justify-between gap-4 rounded-[22px] px-6 py-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900">Astra Admin</h1>
            <p className="text-sm text-slate-500">Controle completo da loja e do bot.</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className=${`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                statusInfo.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              ${statusInfo.ok ? "online" : "offline"}
            </span>
            <span className="text-sm text-slate-500">${statusInfo.text}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value=${token}
              placeholder="ADMIN_PANEL_TOKEN"
              onInput=${(event) => setToken(event.target.value)}
              className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
            />
            ${html`<${Button} variant="primary" onClick=${handleConnect}>Conectar</${Button}>`}
            ${html`<${Button} variant="ghost" onClick=${handleClearToken}>Limpar</${Button}>`}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass sticky top-6 flex max-h-[calc(100vh-120px)] flex-col gap-4 overflow-y-auto rounded-[22px] p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Produtos</h3>
              <p className="text-xs text-slate-500">Escolha um produto para editar.</p>
            </div>
            <input
              type="text"
              placeholder="Buscar produto..."
              value=${productQuery}
              onInput=${(event) => setProductQuery(event.target.value)}
              className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
            />
            <div className="flex flex-col gap-2">
              ${filteredProducts.length
                ? filteredProducts.map(
                    (product) => html`
                      <button
                        key=${product.id}
                        onClick=${() => setSelectedId(product.id)}
                        className=${`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          product.id === selectedId
                            ? "border-[var(--accent)] bg-[rgba(233,90,43,0.12)] text-[var(--accent-strong)]"
                            : "border-[var(--stroke)] bg-white/80 hover:border-[var(--accent)]"
                        }`}
                      >
                        <div>${product.name || product.id}</div>
                        <div className="text-xs text-slate-500">${product.id}</div>
                      </button>
                    `
                  )
                : html`<p className="text-xs text-slate-500">Nenhum produto encontrado.</p>`}
            </div>
            <div className="space-y-2 pt-2">
              ${html`<${Button} variant="primary" onClick=${handleNewProduct}>Novo produto</${Button}>`}
              ${html`<${Button} variant="ghost" onClick=${handleDuplicateProduct}>Duplicar</${Button}>`}
              ${html`<${Button} variant="danger" onClick=${handleDeleteProduct}>Excluir</${Button}>`}
            </div>
          </aside>

          <main className="flex flex-col gap-6">
            <nav className="glass sticky top-6 z-20 flex flex-wrap items-center gap-2 rounded-[22px] px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Navegacao</span>
              <div className="flex flex-wrap gap-2">
                ${sectionLinks.map(
                  (link) => html`
                    <a
                      key=${link.id}
                      href=${`#${link.id}`}
                      className=${`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                        activeSection === link.id
                          ? "border-[var(--accent)] bg-[rgba(233,90,43,0.12)] text-[var(--accent-strong)]"
                          : "border-transparent bg-white/70 text-slate-600 hover:border-[var(--accent)]"
                      }`}
                    >
                      ${link.label}
                    </a>
                  `
                )}
              </div>
            </nav>

            ${html`<${Card}
              id="dashboard-panel"
              title="Visao geral"
              subtitle="Resumo rapido das operacoes."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Atualizar</${Button}>
                <${Button} variant="ghost" onClick=${loadDiagnostics}>
                  ${diagnostics.loading ? "Diagnostico..." : "Rodar diagnostico"}
                </${Button}>`}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                ${stats.map(
                  (stat) => html`
                    <div className="card flex flex-col gap-2 p-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">${stat.label}</div>
                      <div className="font-display text-2xl font-semibold">${stat.value}</div>
                      <div className="text-xs text-slate-500">${stat.hint}</div>
                    </div>
                  `
                )}
              </div>
              <div className="card p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Diagnostico</span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    High: ${diagnostics.report?.summary?.high ?? 0}
                  </span>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                    Medium: ${diagnostics.report?.summary?.medium ?? 0}
                  </span>
                  <span className="rounded-full border border-slate-500/40 bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-300">
                    Low: ${diagnostics.report?.summary?.low ?? 0}
                  </span>
                </div>
                ${diagnostics.report?.issues?.length
                  ? html`<ul className="space-y-2 text-sm text-slate-300">
                      ${diagnostics.report.issues.slice(0, 8).map(
                        (issue) => html`<li key=${`${issue.code}-${issue.message}`}>[${issue.severity}] ${issue.message}</li>`
                      )}
                    </ul>`
                  : html`<p className="text-sm text-slate-400">Nenhum problema de consistencia encontrado.</p>`}
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="product-panel"
              title="Produto"
              subtitle="Atualize os dados e salve para refletir no bot."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>
                <${Button} variant="primary" onClick=${handleSaveProduct}>Salvar produto</${Button}>`}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">ID</label>
                  <input
                    disabled
                    value=${productForm.id}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-slate-100 px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Nome</label>
                  <input
                    value=${productForm.name}
                    onInput=${(event) => updateProductField("name", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Short label</label>
                  <input
                    value=${productForm.shortLabel}
                    onInput=${(event) => updateProductField("shortLabel", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Demo URL</label>
                  <input
                    value=${productForm.demoUrl}
                    onInput=${(event) => updateProductField("demoUrl", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Descricao</label>
                  <textarea
                    rows="4"
                    value=${productForm.description}
                    onInput=${(event) => updateProductField("description", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  ></textarea>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Pix instructions</label>
                  <textarea
                    rows="4"
                    value=${productForm.pixInstructions}
                    onInput=${(event) => updateProductField("pixInstructions", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  ></textarea>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">DM title (entrega)</label>
                  <input
                    value=${productForm.deliveryDmTitle || ""}
                    onInput=${(event) => updateProductField("deliveryDmTitle", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                    placeholder="Compra confirmada"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">DM template padrao (fallback)</label>
                  <textarea
                    rows="5"
                    value=${productForm.deliveryDmMessage || ""}
                    onInput=${(event) => updateProductField("deliveryDmMessage", event.target.value)}
                    onFocus=${() => setActiveDmField("deliveryDmMessage")}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                    placeholder="Mensagem usada se os templates de PIX/ADMIN estiverem vazios."
                  ></textarea>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">DM template PIX confirmado</label>
                  <textarea
                    rows="5"
                    value=${productForm.deliveryDmMessagePix || ""}
                    onInput=${(event) => updateProductField("deliveryDmMessagePix", event.target.value)}
                    onFocus=${() => setActiveDmField("deliveryDmMessagePix")}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                    placeholder="Template enviado quando o pagamento PIX confirma automaticamente."
                  ></textarea>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">DM template confirmacao ADMIN</label>
                  <textarea
                    rows="5"
                    value=${productForm.deliveryDmMessageAdmin || ""}
                    onInput=${(event) => updateProductField("deliveryDmMessageAdmin", event.target.value)}
                    onFocus=${() => setActiveDmField("deliveryDmMessageAdmin")}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                    placeholder="Template enviado quando admin confirma compra manualmente."
                  ></textarea>
                </div>
                <div className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Placeholders (campo ativo: ${activeDmField || "-"})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    ${DM_PLACEHOLDERS.map(
                      (token) => html`
                        <button
                          key=${token}
                          type="button"
                          onClick=${() => insertPlaceholder(token)}
                          className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300"
                        >
                          ${`{{${token}}}`}
                        </button>
                      `
                    )}
                  </div>
                  ${dmTemplateWarnings.length
                    ? html`<div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
                        ${dmTemplateWarnings.join(" | ")}
                      </div>`
                    : null}
                </div>
                <div className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Preview em tempo real
                    </span>
                    <select
                      value=${dmPreviewSource}
                      onChange=${(event) => setDmPreviewSource(event.target.value)}
                      className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
                    >
                      ${Object.entries(DM_SOURCE_META).map(
                        ([value, meta]) => html`<option key=${value} value=${value}>${meta.label}</option>`
                      )}
                    </select>
                  </div>
                  <div className="rounded-2xl border border-[var(--stroke)] bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="text-sm font-semibold text-slate-200">${dmPreview.title}</div>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
${dmPreview.description}
                    </pre>
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-500">
                <input
                  type="checkbox"
                  checked=${productForm.disableThumbnail}
                  onChange=${(event) => updateProductField("disableThumbnail", event.target.checked)}
                />
                Desativar thumbnail no embed
              </label>
            </${Card}>`}

            ${html`<${Card} id="media-panel" title="Midias" subtitle="Use caminhos relativos a pasta do projeto.">
              <div className="grid gap-4 md:grid-cols-2">
                ${[
                  { label: "Banner image", field: "bannerImage" },
                  { label: "Preview image", field: "previewImage" },
                  { label: "Thumbnail", field: "thumbnail" },
                  { label: "Footer image", field: "footerImage" },
                  { label: "Pre post gif", field: "prePostGif" }
                ].map(
                  (item) => html`
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-400">${item.label}</label>
                      <input
                        value=${productForm[item.field]}
                        onInput=${(event) => updateProductField(item.field, event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                      />
                    </div>
                  `
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-400">Gif images (1 por linha)</label>
                <textarea
                  rows="4"
                  value=${gifImages}
                  onInput=${(event) => setGifImages(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                ></textarea>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="sections-panel"
              title="Secoes do embed"
              subtitle="Adicione blocos com titulo e texto."
              actions=${html`<${Button} variant="ghost" onClick=${addSection}>Adicionar secao</${Button}>`}
            >
              <div className="space-y-3">
                ${sectionsForm.length
                  ? sectionsForm.map(
                      (section, index) => html`
                        <div className="card grid gap-3 p-4 md:grid-cols-[1fr_2fr_120px_100px]">
                          <div>
                            <label className="text-xs font-semibold uppercase text-slate-400">Titulo</label>
                            <input
                              value=${section.name || ""}
                              onInput=${(event) => updateSectionField(index, "name", event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase text-slate-400">Texto</label>
                            <textarea
                              rows="2"
                              value=${section.value || ""}
                              onInput=${(event) => updateSectionField(index, "value", event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                            ></textarea>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-500">
                            <input
                              type="checkbox"
                              checked=${section.inline || false}
                              onChange=${(event) => updateSectionField(index, "inline", event.target.checked)}
                            />
                            Inline
                          </label>
                          ${html`<${Button} variant="danger" onClick=${() => removeSection(index)}>Remover</${Button}>`}
                        </div>
                      `
                    )
                  : html`<p className="text-sm text-slate-500">Nenhuma secao criada.</p>`}
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="variants-panel"
              title="Variacoes"
              subtitle="Cada variacao vira opcao no select (maximo 25)."
              actions=${html`<${Button} variant="ghost" onClick=${addVariant}>Adicionar variacao</${Button}>`}
            >
              <div className="space-y-3">
                ${variantsForm.length
                  ? variantsForm.map(
                      (variant, index) => html`
                        <div className="card grid gap-3 p-4 md:grid-cols-[1fr_1.3fr_0.6fr_0.8fr_0.7fr_100px]">
                          ${[
                            { label: "ID", field: "id" },
                            { label: "Label", field: "label" },
                            { label: "Emoji", field: "emoji" },
                            { label: "Duracao", field: "duration" }
                          ].map(
                            (item) => html`
                              <div>
                                <label className="text-xs font-semibold uppercase text-slate-400">${item.label}</label>
                                <input
                                  value=${variant[item.field] || ""}
                                  onInput=${(event) => updateVariantField(index, item.field, event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                                />
                              </div>
                            `
                          )}
                          <div>
                            <label className="text-xs font-semibold uppercase text-slate-400">Preco</label>
                            <input
                              type="number"
                              step="0.01"
                              value=${variant.price ?? ""}
                              onInput=${(event) => updateVariantField(index, "price", event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                            />
                          </div>
                          ${html`<${Button} variant="danger" onClick=${() => removeVariant(index)}>Remover</${Button}>`}
                        </div>
                      `
                    )
                  : html`<p className="text-sm text-slate-500">Nenhuma variacao criada.</p>`}
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="stock-panel"
              title="Estoque"
              subtitle="Keys separadas por produto e por variacao. Uma key por linha."
              actions=${html`<${Button} variant="primary" onClick=${handleSaveStock}>Salvar estoque</${Button}>`}
            >
              <div className="card space-y-3 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumo de cobertura</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                    default: ${(stockPayloadPreview.default || []).length}
                  </span>
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sky-300">
                    shared: ${(stockPayloadPreview.shared || []).length}
                  </span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                    total: ${countStockEntries(stockPayloadPreview)}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  ${stockCoverage.length
                    ? stockCoverage.map((item) => html`
                        <div
                          key=${item.variantId}
                          className=${`rounded-xl border px-3 py-2 text-xs ${
                            item.covered
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          ${item.variantId}: proprio ${item.ownCount} | fallback ${item.fallbackCount} | disponivel ${item.available}
                        </div>
                      `)
                    : html`<div className="text-xs text-slate-500">Configure variacoes para calcular cobertura.</div>`}
                </div>
                ${stockDuplicateKeys.length
                  ? html`<div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                      Key duplicada detectada: ${stockDuplicateKeys[0].key} (${stockDuplicateKeys[0].firstBucket} e ${stockDuplicateKeys[0].duplicateBucket}).
                    </div>`
                  : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                ${stockEntries.map(
                  ([key, value]) => html`
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-400">${key}</label>
                      <textarea
                        rows="5"
                        value=${value}
                        onInput=${(event) => setStockForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                      ></textarea>
                    </div>
                  `
                )}
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="actions-panel"
              title="Acoes"
              subtitle="Poste o produto em um canal do Discord (requer variacoes e estoque)."
              actions=${html`<${Button} variant="primary" onClick=${handlePostProduct}>Postar produto</${Button}>`}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Channel ID</label>
                  <input
                    value=${actionChannelId}
                    onInput=${(event) => setActionChannelId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked=${actionPurge}
                    onChange=${(event) => setActionPurge(event.target.checked)}
                  />
                  Limpar canal antes de postar
                </label>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="config-panel"
              title="Configuracao"
              subtitle="Campos gerais usados pelo bot."
              actions=${html`<${Button} variant="primary" onClick=${handleSaveConfig}>Salvar configuracao</${Button}>`}
            >
              <div className="grid gap-4 md:grid-cols-2">
                ${[
                  { label: "Staff role ID", field: "staffRoleId" },
                  { label: "Admin user IDs (comma)", field: "adminUserIds" },
                  { label: "Cart category ID", field: "cartCategoryId" },
                  { label: "Tracker channel ID", field: "trackerChannelId" },
                  { label: "Staff log channel ID", field: "staffLogChannelId" },
                  { label: "Post channel ID", field: "postChannelId" },
                  { label: "System banner", field: "systemBanner" },
                  { label: "Pix instructions", field: "pixInstructions" },
                  { label: "Payment check interval (ms)", field: "paymentCheckIntervalMs" },
                  { label: "Max attachment bytes", field: "maxAttachmentBytes" }
                ].map(
                  (item) => html`
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-400">${item.label}</label>
                      <input
                        value=${configForm[item.field] || ""}
                        onInput=${(event) => setConfigForm((prev) => ({ ...prev, [item.field]: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                      />
                    </div>
                  `
                )}
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="coupons-panel"
              title="Cupons"
              subtitle="Crie, ative ou remova cupons rapidamente."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>`}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Codigo</label>
                  <input
                    value=${configForm.couponCode || ""}
                    onInput=${(event) => setConfigForm((prev) => ({ ...prev, couponCode: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Percentual</label>
                  <input
                    type="number"
                    step="1"
                    value=${configForm.couponPercent || ""}
                    onInput=${(event) => setConfigForm((prev) => ({ ...prev, couponPercent: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-white px-4 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked=${configForm.couponActive !== false}
                    onChange=${(event) => setConfigForm((prev) => ({ ...prev, couponActive: event.target.checked }))}
                  />
                  Ativo
                </label>
              </div>
              <div className="flex justify-start">
                ${html`<${Button} variant="primary" onClick=${handleCreateCoupon}>Criar cupom</${Button}>`}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Codigo</th>
                      <th className="px-4 py-3">Percentual</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.coupons.length
                      ? data.coupons.map(
                          (coupon) => html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${coupon.code}</td>
                              <td className="px-4 py-3">${coupon.percent}%</td>
                              <td className="px-4 py-3">${html`<${Badge} status=${coupon.active === false ? "inactive" : "active"} />`}</td>
                              <td className="px-4 py-3">${formatDate(coupon.createdAt)}</td>
                              <td className="px-4 py-3">
                                ${html`<${Button} variant="ghost" onClick=${() => handleToggleCoupon(coupon.code)}>
                                  ${coupon.active === false ? "Ativar" : "Desativar"}
                                </${Button}>`}
                                ${html`<${Button} variant="danger" onClick=${() => handleDeleteCoupon(coupon.code)}>
                                  Excluir
                                </${Button}>`}
                              </td>
                            </tr>
                          `
                        )
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="5">
                              Nenhum cupom cadastrado.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="orders-panel"
              title="Pedidos"
              subtitle="Acompanhe pagamentos, entregas, confirmacoes e re-sincronize."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>
                <${Button} variant="ghost" onClick=${handleRetryWaitingStock}>Retry waiting_stock</${Button}>`}
            >
              <div className="flex flex-wrap gap-3">
                <select
                  value=${ordersFilter}
                  onChange=${(event) => setOrdersFilter(event.target.value)}
                  className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="waiting_stock">Aguardando estoque</option>
                  <option value="delivered">Entregues</option>
                  <option value="failed">Falhados</option>
                </select>
                <select
                  value=${ordersSourceFilter}
                  onChange=${(event) => setOrdersSourceFilter(event.target.value)}
                  className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
                >
                  <option value="all">Fonte: todas</option>
                  <option value="pix">pix</option>
                  <option value="admin_button">admin_button</option>
                  <option value="admin_manual_delivery">admin_manual_delivery</option>
                </select>
                <input
                  value=${ordersSearch}
                  onInput=${(event) => setOrdersSearch(event.target.value)}
                  placeholder="Buscar por user, payment, confirmador ou id"
                  className="rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-sm"
                />
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Confirmacao</th>
                      <th className="px-4 py-3">Historico</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredOrders.length
                      ? filteredOrders.map(
                          (order) => html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${shortId(order.id)}</td>
                              <td className="px-4 py-3">${order.userId || "-"}</td>
                              <td className="px-4 py-3">${order.productId || "-"} / ${order.variantId || "-"}</td>
                              <td className="px-4 py-3">${formatCurrency(order.value)}</td>
                              <td className="px-4 py-3">${html`<${Badge} status=${order.status} />`}</td>
                              <td className="px-4 py-3">${order.paymentId ? shortId(order.paymentId) : "-"}</td>
                              <td className="px-4 py-3">${formatDate(order.createdAt)}</td>
                              <td className="px-4 py-3">
                                <div className="space-y-1 text-xs">
                                  <div>Fonte: ${formatSourceLabel(order.confirmedSource)}</div>
                                  <div>Por: ${order.confirmedByUserId || order.manualConfirmedByUserId || "-"}</div>
                                  <div>Em: ${formatDate(order.confirmedAt || order.manualConfirmedAt)}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-[280px] space-y-1 text-xs text-slate-300">
                                  ${(order.confirmations || []).length
                                    ? (order.confirmations || [])
                                        .slice(-3)
                                        .reverse()
                                        .map(
                                          (entry) => html`
                                            <div key=${entry.id || `${entry.source}-${entry.at}`}>
                                              ${formatDate(entry.at)} | ${formatSourceLabel(entry.source)} | ${entry.byUserId || "-"}
                                            </div>
                                          `
                                        )
                                    : html`<span className="text-slate-500">Sem historico</span>`}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                ${html`<${Button} variant="ghost" onClick=${() => handleResyncOrder(order.id)}>
                                  Resync
                                </${Button}>`}
                                ${order.status === "waiting_stock"
                                  ? html`<${Button}
                                      variant="ghost"
                                      onClick=${() => handleManualDeliver(order.id)}
                                    >
                                      Entrega manual
                                    </${Button}>`
                                  : null}
                              </td>
                            </tr>
                          `
                        )
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="10">
                              Nenhum pedido encontrado.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="carts-panel"
              title="Carrinhos"
              subtitle="Acompanhe carrinhos e cancele quando necessario."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>`}
            >
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Canal</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.carts.length
                      ? data.carts.map(
                          (cart) => html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${shortId(cart.id)}</td>
                              <td className="px-4 py-3">${cart.userId || "-"}</td>
                              <td className="px-4 py-3">${cart.productId || "-"} / ${cart.variantId || "-"}</td>
                              <td className="px-4 py-3">${html`<${Badge} status=${cart.status} />`}</td>
                              <td className="px-4 py-3">${cart.channelId || "-"}</td>
                              <td className="px-4 py-3">${formatDate(cart.createdAt || cart.updatedAt)}</td>
                              <td className="px-4 py-3">
                                ${(cart.status === "open" || cart.status === "pending")
                                  ? html`<${Button} variant="ghost" onClick=${() => handleManualConfirmCart(cart.id)}>
                                      Confirmar compra
                                    </${Button}>
                                    <${Button} variant="danger" onClick=${() => handleCancelCart(cart.id)}>
                                      Cancelar
                                    </${Button}>`
                                  : null}
                              </td>
                            </tr>
                          `
                        )
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="7">
                              Nenhum carrinho registrado.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="posts-panel"
              title="Posts"
              subtitle="Historico dos posts de produtos e monitoramento de mensagem."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>
                <${Button} variant="ghost" onClick=${handleCheckPostsHealth}>Checar saude</${Button}>`}
            >
              ${postsHealth.summary
                ? html`<div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                      OK: ${postsHealth.summary.ok || 0}
                    </span>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-300">
                      Missing: ${postsHealth.summary.missing || 0}
                    </span>
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-rose-300">
                      Channel/fetch: ${(postsHealth.summary.channelMissing || 0) + (postsHealth.summary.fetchError || 0)}
                    </span>
                    <span className="text-slate-500">Ultima checagem: ${formatDate(postsHealth.checkedAt)}</span>
                  </div>`
                : null}
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Canal</th>
                      <th className="px-4 py-3">Mensagem</th>
                      <th className="px-4 py-3">Saude</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.posts.length
                      ? data.posts.map(
                          (post) => {
                            const health = postsHealth.byMessageId?.[post.messageId];
                            const status = health?.status || "nao checado";
                            return html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${post.productId || "-"}</td>
                              <td className="px-4 py-3">${post.channelId || "-"}</td>
                              <td className="px-4 py-3">${post.messageId || "-"}</td>
                              <td className="px-4 py-3">${status}</td>
                              <td className="px-4 py-3">${formatDate(post.createdAt)}</td>
                              <td className="px-4 py-3">
                                <${Button} variant="ghost" onClick=${() => handleRepostFromPanel(post)}>
                                  Repostar
                                </${Button}>
                              </td>
                            </tr>
                          `;
                          }
                        )
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="6">
                              Nenhum post registrado.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="deliveries-panel"
              title="Entregas"
              subtitle="Keys entregues e status final."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>`}
            >
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Produto</th>
                      <th className="px-4 py-3">Key</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.deliveries.length
                      ? data.deliveries.map((delivery) => {
                          const key = delivery.key || "-";
                          const masked = key.length > 10 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
                          return html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${shortId(delivery.orderId)}</td>
                              <td className="px-4 py-3">${delivery.userId || "-"}</td>
                              <td className="px-4 py-3">${delivery.productId || "-"} / ${delivery.variantId || "-"}</td>
                              <td className="px-4 py-3">${masked}</td>
                              <td className="px-4 py-3">${formatDate(delivery.deliveredAt)}</td>
                            </tr>
                          `;
                        })
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="5">
                              Nenhuma entrega registrada.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}

            ${html`<${Card}
              id="customers-panel"
              title="Clientes"
              subtitle="Registros vinculados ao Discord."
              actions=${html`<${Button} variant="ghost" onClick=${loadAll}>Recarregar</${Button}>`}
            >
              <div className="overflow-x-auto rounded-2xl border border-[var(--stroke)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#f4efe6] text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Customer ID</th>
                      <th className="px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.customers.length
                      ? data.customers.map(
                          (customer) => html`
                            <tr className="border-t border-[var(--stroke)]">
                              <td className="px-4 py-3 font-semibold">${customer.userId || "-"}</td>
                              <td className="px-4 py-3">${customer.customerId || "-"}</td>
                              <td className="px-4 py-3">${formatDate(customer.createdAt)}</td>
                            </tr>
                          `
                        )
                      : html`
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan="3">
                              Nenhum cliente registrado.
                            </td>
                          </tr>
                        `}
                  </tbody>
                </table>
              </div>
            </${Card}>`}
          </main>
        </div>
      </div>

      ${toast
        ? html`
            <div
              className=${`fixed bottom-6 right-6 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                toast.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              ${toast.message}
            </div>
          `
        : null}
    </div>
  `;
}

const root = createRoot(document.getElementById("root"));
root.render(html`<${App} />`);
