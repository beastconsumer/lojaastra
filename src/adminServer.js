import express from "express";
import path from "path";
import { randomUUID } from "crypto";

function asString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function toBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseNumber(value) {
  const raw = asString(value).replace(",", ".");
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => asString(item)).filter(Boolean);
}

function normalizeSections(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const name = asString(entry?.name);
      const value = asString(entry?.value);
      if (!name && !value) return null;
      return {
        name,
        value,
        inline: toBool(entry?.inline)
      };
    })
    .filter(Boolean);
}

function normalizeVariants(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      const id = asString(entry?.id);
      if (!id) return null;
      return {
        id,
        label: asString(entry?.label),
        emoji: asString(entry?.emoji),
        duration: asString(entry?.duration),
        price: parseNumber(entry?.price)
      };
    })
    .filter(Boolean);
}

function normalizeProduct(input) {
  return {
    id: asString(input?.id),
    name: asString(input?.name),
    shortLabel: asString(input?.shortLabel),
    description: asString(input?.description),
    pixInstructions: asString(input?.pixInstructions),
    deliveryDmTitle: asString(input?.deliveryDmTitle),
    deliveryDmMessage: asString(input?.deliveryDmMessage),
    deliveryDmMessagePix: asString(input?.deliveryDmMessagePix),
    deliveryDmMessageAdmin: asString(input?.deliveryDmMessageAdmin),
    thumbnail: asString(input?.thumbnail),
    bannerImage: asString(input?.bannerImage),
    footerImage: asString(input?.footerImage),
    previewImage: asString(input?.previewImage),
    prePostGif: asString(input?.prePostGif),
    demoUrl: asString(input?.demoUrl),
    disableThumbnail: toBool(input?.disableThumbnail),
    gifImages: normalizeList(input?.gifImages),
    sections: normalizeSections(input?.sections),
    variants: normalizeVariants(input?.variants)
  };
}

function validateProductDraft(product, options = {}) {
  const { allowEmptyVariants = true } = options;
  const issues = [];
  if (!product?.id) issues.push("id obrigatorio");
  if (!product?.name) issues.push("nome obrigatorio");

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!allowEmptyVariants && variants.length === 0) {
    issues.push("adicione ao menos 1 variacao");
  }

  const seen = new Set();
  for (const variant of variants) {
    const id = asString(variant?.id);
    if (!id) continue;
    if (seen.has(id)) {
      issues.push(`variacao duplicada: ${id}`);
      continue;
    }
    seen.add(id);
    if (!asString(variant?.label)) issues.push(`variacao ${id} sem label`);
    if (!asString(variant?.duration)) issues.push(`variacao ${id} sem duracao`);
    if (!Number.isFinite(Number(variant?.price)) || Number(variant?.price) <= 0) {
      issues.push(`variacao ${id} com preco invalido`);
    }
  }
  return issues;
}

function getStockAllowedKeys(product) {
  const allowed = new Set(["default", "shared"]);
  if (!product || !Array.isArray(product.variants)) return allowed;
  for (const variant of product.variants) {
    const id = asString(variant?.id);
    if (id) allowed.add(id);
  }
  return allowed;
}

function normalizeStock(input, allowedKeys = null) {
  const allowed = allowedKeys instanceof Set ? allowedKeys : null;
  const canUseKey = (key) => !allowed || allowed.has(key);
  const normalizeList = (value, globalSeen) => {
    if (!Array.isArray(value)) return [];
    const localSeen = new Set();
    const result = [];
    for (const item of value) {
      const key = asString(item);
      if (!key) continue;
      if (localSeen.has(key)) continue;
      if (globalSeen?.has(key)) continue;
      localSeen.add(key);
      if (globalSeen) globalSeen.add(key);
      result.push(key);
    }
    return result;
  };

  if (Array.isArray(input)) {
    const list = normalizeList(input, new Set());
    if (!canUseKey("default")) return {};
    return { default: list };
  }
  if (!input || typeof input !== "object") return {};
  const output = {};
  const seenAcrossBuckets = new Set();
  const keys = allowed ? [...allowed] : Object.keys(input);

  for (const key of keys) {
    const stockKey = asString(key);
    if (!stockKey || !canUseKey(stockKey)) continue;
    output[stockKey] = normalizeList(input[stockKey], seenAcrossBuckets);
  }

  if (!allowed) {
    for (const [key, value] of Object.entries(input)) {
      const stockKey = asString(key);
      if (!stockKey || output[stockKey] !== undefined || !canUseKey(stockKey)) continue;
      output[stockKey] = normalizeList(value, seenAcrossBuckets);
    }
  }

  if (allowed) {
    for (const key of allowed) {
      if (output[key] === undefined) {
        output[key] = [];
      }
    }
  }
  return output;
}

function normalizeCoupon(input) {
  const code = asString(input?.code).toUpperCase();
  const percent = parseNumber(input?.percent);
  const active = input?.active === undefined ? true : toBool(input?.active);
  return { code, percent, active };
}

function sanitizeConfig(config) {
  return {
    guildId: asString(config.guildId),
    staffRoleId: asString(config.staffRoleId),
    adminUserIds: Array.isArray(config.adminUserIds) ? config.adminUserIds.map(String) : [],
    cartCategoryId: asString(config.cartCategoryId),
    trackerChannelId: asString(config.trackerChannelId),
    staffLogChannelId: asString(config.staffLogChannelId),
    systemBanner: asString(config.systemBanner),
    pixInstructions: asString(config.pixInstructions),
    currency: asString(config.currency),
    paymentCheckIntervalMs: Number(config.paymentCheckIntervalMs || 0),
    maxAttachmentBytes: Number(config.maxAttachmentBytes || 0),
    postChannelId: asString(config.postChannelId)
  };
}

function applyConfigUpdate(config, update) {
  if (update.guildId !== undefined) config.guildId = asString(update.guildId);
  if (update.staffRoleId !== undefined) config.staffRoleId = asString(update.staffRoleId);
  if (update.cartCategoryId !== undefined) config.cartCategoryId = asString(update.cartCategoryId);
  if (update.trackerChannelId !== undefined) config.trackerChannelId = asString(update.trackerChannelId);
  if (update.staffLogChannelId !== undefined) config.staffLogChannelId = asString(update.staffLogChannelId);
  if (update.systemBanner !== undefined) config.systemBanner = asString(update.systemBanner);
  if (update.pixInstructions !== undefined) config.pixInstructions = asString(update.pixInstructions);
  if (update.currency !== undefined) config.currency = asString(update.currency);
  if (update.paymentCheckIntervalMs !== undefined) {
    const val = Number(update.paymentCheckIntervalMs);
    config.paymentCheckIntervalMs = Number.isFinite(val) ? val : config.paymentCheckIntervalMs;
  }
  if (update.maxAttachmentBytes !== undefined) {
    const val = Number(update.maxAttachmentBytes);
    config.maxAttachmentBytes = Number.isFinite(val) ? val : config.maxAttachmentBytes;
  }
  if (update.postChannelId !== undefined) config.postChannelId = asString(update.postChannelId);

  if (update.adminUserIds !== undefined) {
    if (Array.isArray(update.adminUserIds)) {
      config.adminUserIds = update.adminUserIds.map((id) => asString(id)).filter(Boolean);
    } else if (typeof update.adminUserIds === "string") {
      config.adminUserIds = update.adminUserIds
        .split(",")
        .map((item) => asString(item))
        .filter(Boolean);
    }
  }
}

function tokenFromRequest(req) {
  const header = asString(req.headers.authorization);
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  const token = asString(req.query?.token);
  return token || "";
}

function pushOrderEvent(order, type, details = {}) {
  if (!order || !type) return;
  if (!Array.isArray(order.events)) {
    order.events = [];
  }
  order.events.push({
    id: randomUUID(),
    type: asString(type),
    at: new Date().toISOString(),
    details: details && typeof details === "object" ? details : {}
  });
}

function pushOrderConfirmation(order, source, byUserId, note = "") {
  if (!order || !source) return;
  if (!Array.isArray(order.confirmations)) {
    order.confirmations = [];
  }
  order.confirmations.push({
    id: randomUUID(),
    source: asString(source) || "pix",
    byUserId: asString(byUserId) || "",
    at: new Date().toISOString(),
    note: asString(note)
  });
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(asString(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function buildDiagnosticsReport({ productsDb, stockDb, postsDb, ordersDb, cartsDb, deliveriesDb }) {
  const issues = [];
  const products = Array.isArray(productsDb?.products) ? productsDb.products : [];
  const carts = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];
  const orders = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
  const posts = Array.isArray(postsDb?.posts) ? postsDb.posts : [];
  const deliveries = Array.isArray(deliveriesDb?.deliveries) ? deliveriesDb.deliveries : [];
  const stock = stockDb?.stock && typeof stockDb.stock === "object" ? stockDb.stock : {};

  const productById = new Map(products.map((product) => [product.id, product]));
  const cartById = new Map(carts.map((cart) => [cart.id, cart]));
  const deliveryByOrderId = new Map(deliveries.map((delivery) => [delivery.orderId, delivery]));

  for (const product of products) {
    const variantIds = new Set((product.variants || []).map((variant) => asString(variant?.id)).filter(Boolean));
    if (variantIds.size === 0) {
      issues.push({
        severity: "medium",
        code: "product_without_variants",
        message: `Produto ${product.id} sem variacoes validas`
      });
    }

    const productStock = stock[product.id];
    if (productStock && typeof productStock === "object" && !Array.isArray(productStock)) {
      const seenKeys = new Set();
      for (const key of Object.keys(productStock)) {
        if (key === "default" || key === "shared") continue;
        if (!variantIds.has(key)) {
          issues.push({
            severity: "low",
            code: "stock_orphan_variant",
            message: `Estoque de ${product.id} contem chave de variacao inexistente: ${key}`
          });
        }
      }
      for (const [bucket, values] of Object.entries(productStock)) {
        if (!Array.isArray(values)) continue;
        for (const value of values) {
          const normalized = asString(value);
          if (!normalized) continue;
          if (seenKeys.has(normalized)) {
            issues.push({
              severity: "medium",
              code: "stock_duplicate_key",
              message: `Key duplicada no estoque de ${product.id}: ${normalized}`
            });
            break;
          }
          seenKeys.add(normalized);
        }
      }
    }
  }

  for (const productId of Object.keys(stock)) {
    if (!productById.has(productId)) {
      issues.push({
        severity: "high",
        code: "stock_orphan_product",
        message: `Estoque sem produto correspondente: ${productId}`
      });
    }
  }

  for (const post of posts) {
    if (!productById.has(post.productId)) {
      issues.push({
        severity: "high",
        code: "post_orphan_product",
        message: `Post aponta para produto inexistente: ${post.productId}`
      });
    }
  }

  for (const cart of carts) {
    const product = productById.get(cart.productId);
    if (!product) {
      issues.push({
        severity: "high",
        code: "cart_orphan_product",
        message: `Carrinho ${cart.id} aponta para produto inexistente: ${cart.productId}`
      });
      continue;
    }
    const hasVariant = (product.variants || []).some((variant) => variant.id === cart.variantId);
    if (!hasVariant) {
      issues.push({
        severity: "medium",
        code: "cart_orphan_variant",
        message: `Carrinho ${cart.id} aponta para variacao inexistente: ${cart.variantId}`
      });
    }
  }

  for (const order of orders) {
    const product = productById.get(order.productId);
    if (!product) {
      issues.push({
        severity: "high",
        code: "order_orphan_product",
        message: `Pedido ${order.id} aponta para produto inexistente: ${order.productId}`
      });
    } else {
      const hasVariant = (product.variants || []).some((variant) => variant.id === order.variantId);
      if (!hasVariant) {
        issues.push({
          severity: "medium",
          code: "order_orphan_variant",
          message: `Pedido ${order.id} aponta para variacao inexistente: ${order.variantId}`
        });
      }
    }

    if (order.cartId && !cartById.has(order.cartId)) {
      issues.push({
        severity: "low",
        code: "order_orphan_cart",
        message: `Pedido ${order.id} referencia carrinho inexistente: ${order.cartId}`
      });
    }

    if (order.status === "delivered" && !deliveryByOrderId.has(order.id)) {
      issues.push({
        severity: "medium",
        code: "order_missing_delivery",
        message: `Pedido ${order.id} entregue sem registro em deliveries.json`
      });
    }
  }

  const summary = {
    high: issues.filter((issue) => issue.severity === "high").length,
    medium: issues.filter((issue) => issue.severity === "medium").length,
    low: issues.filter((issue) => issue.severity === "low").length
  };

  return {
    ok: summary.high === 0 && summary.medium === 0,
    summary,
    issues
  };
}

export function startAdminServer(options) {
  const {
    rootDir,
    config,
    productsDb,
    couponsDb,
    cartsDb,
    ordersDb,
    postsDb,
    deliveriesDb,
    customersDb,
    stockDb,
    saveJson,
    reloadProducts,
    log,
    logError,
    client,
    postProductToChannel,
    purgeChannelMessages,
    confirmCartPurchaseByAdmin,
    deliverOrder,
    sendDeliveryMessage,
    sendOrUpdateCartMessage,
    sendSystemEmbed,
    sendUserSystemEmbed,
    syncOrderStatus,
    paths
  } = options;

  if (!Array.isArray(productsDb.products)) productsDb.products = [];
  if (!stockDb.stock || typeof stockDb.stock !== "object") stockDb.stock = {};
  if (couponsDb && !Array.isArray(couponsDb.coupons)) couponsDb.coupons = [];
  if (cartsDb && !Array.isArray(cartsDb.carts)) cartsDb.carts = [];
  if (ordersDb && !Array.isArray(ordersDb.orders)) ordersDb.orders = [];
  if (postsDb && !Array.isArray(postsDb.posts)) postsDb.posts = [];
  if (deliveriesDb && !Array.isArray(deliveriesDb.deliveries)) deliveriesDb.deliveries = [];
  if (customersDb && !Array.isArray(customersDb.customers)) customersDb.customers = [];

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  const adminDir = path.join(rootDir, "src", "admin");
  app.use("/admin", express.static(adminDir, { index: "index.html" }));

  app.get("/", (_req, res) => {
    res.redirect("/admin");
  });

  const token = asString(process.env.ADMIN_PANEL_TOKEN);
  const authRequired = Boolean(token);

  function requireAuth(req, res, next) {
    if (!authRequired) return next();
    const provided = tokenFromRequest(req);
    if (provided && provided === token) return next();
    return res.status(401).json({ error: "unauthorized" });
  }

  app.use("/api", requireAuth);

  app.get("/api/status", (_req, res) => {
    res.json({
      ok: true,
      botReady: typeof client?.isReady === "function" ? client.isReady() : false,
      productsCount: Array.isArray(productsDb.products) ? productsDb.products.length : 0,
      authRequired
    });
  });

  app.get("/api/products", (_req, res) => {
    res.json({ products: Array.isArray(productsDb.products) ? productsDb.products : [] });
  });

  app.post("/api/products", (req, res) => {
    const draft = normalizeProduct(req.body || {});
    if (!draft.id) return res.status(400).json({ error: "id obrigatorio" });
    if (productsDb.products.find((p) => p.id === draft.id)) {
      return res.status(409).json({ error: "id ja existe" });
    }

    if (!draft.name) draft.name = draft.id;
    const issues = validateProductDraft(draft, { allowEmptyVariants: true });
    if (issues.length) {
      return res.status(400).json({ error: issues.join("; ") });
    }

    productsDb.products.push(draft);
    saveJson(paths.products, productsDb);
    stockDb.stock = stockDb.stock || {};
    if (!stockDb.stock?.[draft.id]) {
      stockDb.stock[draft.id] = normalizeStock({}, getStockAllowedKeys(draft));
      saveJson(paths.stock, stockDb);
    }
    res.json({ product: draft, stock: stockDb.stock[draft.id] || {} });
  });

  app.put("/api/products/:id", (req, res) => {
    const productId = asString(req.params.id);
    const idx = productsDb.products.findIndex((p) => p.id === productId);
    if (idx < 0) return res.status(404).json({ error: "produto nao encontrado" });

    const draft = normalizeProduct(req.body || {});
    if (!draft.id) draft.id = productId;
    if (draft.id !== productId) {
      return res.status(400).json({ error: "alterar o id exige criar outro produto" });
    }
    const issues = validateProductDraft(draft, { allowEmptyVariants: true });
    if (issues.length) {
      return res.status(400).json({ error: issues.join("; ") });
    }

    productsDb.products[idx] = {
      ...productsDb.products[idx],
      ...draft
    };

    saveJson(paths.products, productsDb);
    stockDb.stock = stockDb.stock || {};
    stockDb.stock[productId] = normalizeStock(stockDb.stock[productId] || {}, getStockAllowedKeys(productsDb.products[idx]));
    saveJson(paths.stock, stockDb);
    res.json({ product: productsDb.products[idx] });
  });

  app.delete("/api/products/:id", (req, res) => {
    const productId = asString(req.params.id);
    const idx = productsDb.products.findIndex((p) => p.id === productId);
    if (idx < 0) return res.status(404).json({ error: "produto nao encontrado" });

    const removed = productsDb.products.splice(idx, 1)[0];
    saveJson(paths.products, productsDb);
    if (stockDb.stock && stockDb.stock[productId] !== undefined) {
      delete stockDb.stock[productId];
      saveJson(paths.stock, stockDb);
    }
    if (postsDb?.posts) {
      const before = postsDb.posts.length;
      postsDb.posts = postsDb.posts.filter((post) => post.productId !== productId);
      if (postsDb.posts.length !== before && paths?.posts) {
        saveJson(paths.posts, postsDb);
      }
    }
    res.json({ ok: true, product: removed });
  });

  app.get("/api/stock", (_req, res) => {
    res.json({ stock: stockDb.stock || {} });
  });

  app.put("/api/stock/:productId", (req, res) => {
    const productId = asString(req.params.productId);
    const product = productsDb.products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: "produto nao encontrado" });

    const normalized = normalizeStock(req.body?.stock ?? req.body ?? {}, getStockAllowedKeys(product));
    stockDb.stock = stockDb.stock || {};
    stockDb.stock[productId] = normalized;
    saveJson(paths.stock, stockDb);
    res.json({ ok: true, stock: stockDb.stock[productId] });
  });

  app.get("/api/coupons", (_req, res) => {
    const list = Array.isArray(couponsDb?.coupons) ? couponsDb.coupons : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    res.json({ coupons: sorted });
  });

  app.post("/api/coupons", (req, res) => {
    if (!couponsDb) return res.status(500).json({ error: "cupons indisponiveis" });
    const draft = normalizeCoupon(req.body || {});
    if (!draft.code) return res.status(400).json({ error: "codigo obrigatorio" });
    if (!draft.percent || draft.percent <= 0 || draft.percent >= 100) {
      return res.status(400).json({ error: "percentual invalido" });
    }

    const exists = couponsDb.coupons.find((c) => c.code === draft.code);
    if (exists) return res.status(409).json({ error: "cupom ja existe" });

    const record = {
      code: draft.code,
      percent: draft.percent,
      active: draft.active !== false,
      createdAt: new Date().toISOString(),
      createdBy: "admin-panel"
    };
    couponsDb.coupons.push(record);
    if (paths?.coupons) saveJson(paths.coupons, couponsDb);
    res.json({ coupon: record });
  });

  app.post("/api/coupons/:code/toggle", (req, res) => {
    if (!couponsDb) return res.status(500).json({ error: "cupons indisponiveis" });
    const code = asString(req.params.code).toUpperCase();
    const coupon = couponsDb.coupons.find((c) => c.code === code);
    if (!coupon) return res.status(404).json({ error: "cupom nao encontrado" });
    coupon.active = coupon.active === false;
    if (paths?.coupons) saveJson(paths.coupons, couponsDb);
    res.json({ coupon });
  });

  app.delete("/api/coupons/:code", (req, res) => {
    if (!couponsDb) return res.status(500).json({ error: "cupons indisponiveis" });
    const code = asString(req.params.code).toUpperCase();
    const idx = couponsDb.coupons.findIndex((c) => c.code === code);
    if (idx < 0) return res.status(404).json({ error: "cupom nao encontrado" });
    const removed = couponsDb.coupons.splice(idx, 1)[0];
    if (paths?.coupons) saveJson(paths.coupons, couponsDb);
    res.json({ ok: true, coupon: removed });
  });

  app.get("/api/orders", (_req, res) => {
    const list = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    res.json({ orders: sorted });
  });

  app.get("/api/carts", (_req, res) => {
    const list = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    res.json({ carts: sorted });
  });

  app.get("/api/posts", (_req, res) => {
    const list = Array.isArray(postsDb?.posts) ? postsDb.posts : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    res.json({ posts: sorted });
  });

  app.get("/api/posts/health", async (req, res) => {
    if (!client || typeof client.isReady !== "function" || !client.isReady()) {
      return res.status(409).json({ error: "bot nao esta pronto" });
    }

    const limit = clampInt(req.query?.limit, 1, 200, 50);
    const sorted = [...(Array.isArray(postsDb?.posts) ? postsDb.posts : [])].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    const target = sorted.slice(0, limit);
    const health = [];

    for (const post of target) {
      const entry = {
        id: post.id,
        productId: post.productId,
        channelId: post.channelId,
        messageId: post.messageId,
        createdAt: post.createdAt,
        status: "unknown",
        messageUrl: ""
      };

      try {
        const channel = await client.channels.fetch(post.channelId).catch(() => null);
        if (!channel || !channel.isTextBased || !channel.isTextBased()) {
          entry.status = "channel_missing";
          health.push(entry);
          continue;
        }

        const message = await channel.messages.fetch(post.messageId).catch(() => null);
        if (!message) {
          entry.status = "message_missing";
          health.push(entry);
          continue;
        }

        entry.status = "ok";
        entry.messageUrl = message.url;
        health.push(entry);
      } catch (err) {
        if (logError) logError("admin:postsHealth", err, { postId: post.id });
        entry.status = "fetch_error";
        health.push(entry);
      }
    }

    const summary = {
      checked: health.length,
      ok: health.filter((entry) => entry.status === "ok").length,
      missing: health.filter((entry) => entry.status === "message_missing").length,
      channelMissing: health.filter((entry) => entry.status === "channel_missing").length,
      fetchError: health.filter((entry) => entry.status === "fetch_error").length
    };
    res.json({ summary, health });
  });

  app.get("/api/deliveries", (_req, res) => {
    const list = Array.isArray(deliveriesDb?.deliveries) ? deliveriesDb.deliveries : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.deliveredAt || 0) - Date.parse(a.deliveredAt || 0)
    );
    res.json({ deliveries: sorted });
  });

  app.get("/api/customers", (_req, res) => {
    const list = Array.isArray(customersDb?.customers) ? customersDb.customers : [];
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
    );
    res.json({ customers: sorted });
  });

  app.post("/api/orders/:id/resync", async (req, res) => {
    if (!ordersDb) return res.status(500).json({ error: "pedidos indisponiveis" });
    if (!syncOrderStatus) return res.status(500).json({ error: "sync indisponivel" });
    const orderId = asString(req.params.id);
    const order = ordersDb.orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "pedido nao encontrado" });
    const apiKey = asString(process.env.ASAAS_API_KEY);
    if (!apiKey) return res.status(400).json({ error: "ASAAS_API_KEY nao configurado" });

    try {
      await syncOrderStatus(order, apiKey);
      if (paths?.orders) saveJson(paths.orders, ordersDb);
      res.json({ ok: true, order });
    } catch (err) {
      if (logError) logError("admin:orderResync", err, { orderId });
      res.status(500).json({ error: "falha ao sincronizar" });
    }
  });

  app.post("/api/orders/:id/manual-deliver", async (req, res) => {
    if (!ordersDb || !deliveriesDb) return res.status(500).json({ error: "entregas indisponiveis" });
    const orderId = asString(req.params.id);
    const key = asString(req.body?.key);
    if (!key) return res.status(400).json({ error: "key obrigatoria" });
    const order = ordersDb.orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "pedido nao encontrado" });
    if (order.status === "delivered") return res.status(409).json({ error: "pedido ja entregue" });

    const product = productsDb.products.find((p) => p.id === order.productId);
    const variant = product?.variants?.find((v) => v.id === order.variantId);
    const deliveredAt = new Date().toISOString();
    const deliveryId = randomUUID();

    deliveriesDb.deliveries.push({
      id: deliveryId,
      orderId: order.id,
      productId: order.productId,
      variantId: order.variantId,
      userId: order.userId,
      key,
      deliveredAt
    });
    if (paths?.deliveries) saveJson(paths.deliveries, deliveriesDb);

    order.status = "delivered";
    order.deliveredAt = deliveredAt;
    order.deliveryId = deliveryId;
    order.updatedAt = deliveredAt;
    order.confirmedSource = "admin_manual_delivery";
    order.confirmedByUserId = "admin-panel";
    order.confirmedAt = order.confirmedAt || deliveredAt;
    pushOrderConfirmation(order, "admin_manual_delivery", "admin-panel", "Entrega manual pelo painel");
    pushOrderEvent(order, "manual_delivery", {
      source: "admin_manual_delivery",
      actor: "admin-panel"
    });
    if (paths?.orders) saveJson(paths.orders, ordersDb);

    const cart = cartsDb?.carts?.find((c) => c.id === order.cartId);
    if (cart) {
      cart.status = "paid";
      cart.updatedAt = deliveredAt;
      cart.lastActivityAt = deliveredAt;
      if (paths?.carts) saveJson(paths.carts, cartsDb);
    }

    if (sendDeliveryMessage) {
      try {
        await sendDeliveryMessage(order, product, variant, key, {
          source: "admin_manual_delivery"
        });
      } catch (err) {
        if (logError) logError("admin:manualDeliverSend", err, { orderId });
      }
    }

    res.json({ ok: true, order, deliveryId });
  });

  app.post("/api/orders/retry-waiting-stock", async (req, res) => {
    if (!ordersDb) return res.status(500).json({ error: "pedidos indisponiveis" });
    if (typeof deliverOrder !== "function") return res.status(500).json({ error: "entrega indisponivel" });

    const actorUserId = asString(req.body?.adminUserId) || "admin-panel";
    const waitingOrders = ordersDb.orders
      .filter((order) => order.status === "waiting_stock")
      .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));

    const results = [];
    let delivered = 0;
    let stillWaiting = 0;
    let failed = 0;

    for (const order of waitingOrders) {
      try {
        const source = order.confirmedSource || "pix";
        const byUserId = order.confirmedByUserId || actorUserId;
        const deliveryResult = await deliverOrder(order, {
          source,
          confirmedByUserId: byUserId
        });

        if (deliveryResult?.ok) {
          delivered += 1;
          pushOrderEvent(order, "retry_waiting_stock_delivered", { actor: actorUserId });
          results.push({ id: order.id, status: order.status, reason: "" });
          continue;
        }

        if (deliveryResult?.reason === "waiting_stock") {
          stillWaiting += 1;
          pushOrderEvent(order, "retry_waiting_stock_pending", { actor: actorUserId });
          results.push({ id: order.id, status: order.status, reason: "waiting_stock" });
          continue;
        }

        failed += 1;
        pushOrderEvent(order, "retry_waiting_stock_failed", {
          actor: actorUserId,
          reason: deliveryResult?.reason || "unknown"
        });
        results.push({ id: order.id, status: order.status, reason: deliveryResult?.reason || "erro" });
      } catch (err) {
        failed += 1;
        pushOrderEvent(order, "retry_waiting_stock_error", { actor: actorUserId });
        if (logError) logError("admin:retryWaitingStock", err, { orderId: order.id });
        results.push({ id: order.id, status: order.status, reason: "erro interno" });
      }
    }

    if (paths?.orders) saveJson(paths.orders, ordersDb);
    res.json({
      ok: true,
      total: waitingOrders.length,
      delivered,
      stillWaiting,
      failed,
      orders: results
    });
  });

  app.post("/api/carts/:id/confirm-manual", async (req, res) => {
    if (!cartsDb) return res.status(500).json({ error: "carrinhos indisponiveis" });
    if (typeof confirmCartPurchaseByAdmin !== "function") {
      return res.status(500).json({ error: "confirmacao manual indisponivel" });
    }

    const cartId = asString(req.params.id);
    const cart = cartsDb.carts.find((entry) => entry.id === cartId);
    if (!cart) return res.status(404).json({ error: "carrinho nao encontrado" });

    const actorUserId = asString(req.body?.adminUserId) || "admin-panel";
    let result = null;
    try {
      result = await confirmCartPurchaseByAdmin(cart, actorUserId);
    } catch (err) {
      if (logError) logError("admin:cartConfirmManual", err, { cartId, actorUserId });
      return res.status(500).json({ error: "falha ao confirmar compra" });
    }

    if (result?.product && result?.variant && sendOrUpdateCartMessage && client && cart.channelId) {
      try {
        const channel = await client.channels.fetch(cart.channelId).catch(() => null);
        if (channel && channel.isTextBased && channel.isTextBased()) {
          await sendOrUpdateCartMessage(channel, cart, result.product, result.variant);
        }
      } catch (err) {
        if (logError) logError("admin:cartConfirmManualRefresh", err, { cartId, actorUserId });
      }
    }

    if (!result?.ok) {
      const reason = result?.reason || "falha";
      if (reason === "confirmacao em andamento") {
        return res.status(409).json({ error: reason, reason, order: result?.order || null, cart });
      }
      if (reason === "waiting_stock" || reason === "pedido ja entregue") {
        return res.json({ ok: false, reason, order: result?.order || null, cart });
      }
      return res.status(400).json({ error: reason, reason, order: result?.order || null, cart });
    }

    res.json({ ok: true, reason: "", order: result.order || null, cart });
  });

  app.post("/api/carts/:id/cancel", async (req, res) => {
    if (!cartsDb) return res.status(500).json({ error: "carrinhos indisponiveis" });
    const cartId = asString(req.params.id);
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) return res.status(404).json({ error: "carrinho nao encontrado" });
    if (cart.status === "paid" || cart.status === "cancelled") {
      return res.status(409).json({ error: "carrinho ja finalizado" });
    }

    cart.status = "cancelled";
    cart.updatedAt = new Date().toISOString();
    if (paths?.carts) saveJson(paths.carts, cartsDb);

    try {
      if (client && cart.channelId && sendSystemEmbed) {
        const channel = await client.channels.fetch(cart.channelId).catch(() => null);
        if (channel && channel.isTextBased && channel.isTextBased()) {
          await sendSystemEmbed(
            channel,
            "Carrinho cancelado",
            "Carrinho cancelado pelo admin.\nSe precisar, abra um novo carrinho pelo menu do produto.",
            "danger"
          );
        }
      }
      if (client && cart.userId && sendUserSystemEmbed) {
        const user = await client.users.fetch(cart.userId).catch(() => null);
        if (user) {
          await sendUserSystemEmbed(
            user,
            "Carrinho cancelado",
            "Seu carrinho foi cancelado pelo admin.\nSe ainda quiser comprar, abra outro carrinho pelo menu do produto.",
            "danger"
          );
        }
      }
    } catch (err) {
      if (logError) logError("admin:cartCancel", err, { cartId });
    }

    res.json({ ok: true, cart });
  });

  app.get("/api/config", (_req, res) => {
    res.json({ config: sanitizeConfig(config) });
  });

  app.put("/api/config", (req, res) => {
    applyConfigUpdate(config, req.body || {});
    saveJson(paths.config, config);
    res.json({ config: sanitizeConfig(config) });
  });

  app.post("/api/reload", (_req, res) => {
    const products = reloadProducts ? reloadProducts() : productsDb.products;
    res.json({ ok: true, productsCount: products?.length || 0 });
  });

  app.get("/api/diagnostics", (_req, res) => {
    const report = buildDiagnosticsReport({
      productsDb,
      stockDb,
      postsDb,
      ordersDb,
      cartsDb,
      deliveriesDb
    });
    res.json(report);
  });

  app.post("/api/discord/post-product", async (req, res) => {
    const productId = asString(req.body?.productId);
    const channelId = asString(req.body?.channelId);
    const purge = toBool(req.body?.purge);

    if (!productId || !channelId) return res.status(400).json({ error: "produto e canal obrigatorios" });
    if (!client || typeof client.isReady !== "function" || !client.isReady()) {
      return res.status(409).json({ error: "bot nao esta pronto" });
    }

    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased || !channel.isTextBased()) {
        return res.status(400).json({ error: "canal invalido" });
      }

      if (purge) {
        const result = await purgeChannelMessages(channel);
        if (!result?.ok) {
          return res.status(400).json({ error: result?.reason || "falha ao limpar canal" });
        }
      }

      const result = await postProductToChannel(channel.guild, channel, productId);
      if (!result?.ok) {
        return res.status(400).json({ error: result?.reason || "falha ao postar" });
      }
      res.json({ ok: true });
    } catch (err) {
      if (logError) {
        logError("admin:postProduct", err, { productId, channelId });
      }
      res.status(500).json({ error: "falha ao postar" });
    }
  });

  app.post("/api/discord/repost-product", async (req, res) => {
    const productId = asString(req.body?.productId);
    const channelId = asString(req.body?.channelId);
    const force = toBool(req.body?.force);
    const purge = toBool(req.body?.purge);

    if (!productId) return res.status(400).json({ error: "produto obrigatorio" });
    if (!client || typeof client.isReady !== "function" || !client.isReady()) {
      return res.status(409).json({ error: "bot nao esta pronto" });
    }

    const product = productsDb.products.find((entry) => entry.id === productId);
    if (!product) return res.status(404).json({ error: "produto nao encontrado" });

    const references = (postsDb?.posts || [])
      .filter((post) => post.productId === productId && (!channelId || post.channelId === channelId))
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));

    let channel = null;
    if (channelId) {
      channel = await client.channels.fetch(channelId).catch(() => null);
    } else if (references[0]?.channelId) {
      channel = await client.channels.fetch(references[0].channelId).catch(() => null);
    }

    if (!channel || !channel.isTextBased || !channel.isTextBased()) {
      return res.status(400).json({ error: "canal invalido para repost" });
    }

    const latestReference = references.find((post) => post.channelId === channel.id) || references[0] || null;
    if (latestReference?.messageId && !force) {
      const activeMessage = await channel.messages.fetch(latestReference.messageId).catch(() => null);
      if (activeMessage) {
        return res.status(409).json({
          error: "mensagem atual ainda existe; use force para repostar",
          messageUrl: activeMessage.url
        });
      }
    }

    if (purge) {
      const purgeResult = await purgeChannelMessages(channel);
      if (!purgeResult?.ok) {
        return res.status(400).json({ error: purgeResult?.reason || "falha ao limpar canal" });
      }
    }

    const result = await postProductToChannel(channel.guild, channel, productId);
    if (!result?.ok) {
      return res.status(400).json({ error: result?.reason || "falha ao repostar" });
    }

    res.json({ ok: true, channelId: channel.id, messageId: result.messageId || "" });
  });

  app.use((err, _req, res, _next) => {
    if (logError) logError("admin:server", err);
    res.status(500).json({ error: "erro interno" });
  });

  const host = asString(process.env.ADMIN_PANEL_HOST) || "127.0.0.1";
  const port = Number(process.env.ADMIN_PANEL_PORT || 3000);

  app.listen(port, host, () => {
    const url = `http://${host}:${port}/admin`;
    if (log) {
      log("info", "admin:server:start", { host, port, url, authRequired });
    }
    console.log(`Painel admin: ${url}`);
    if (!authRequired) {
      console.log("ADMIN_PANEL_TOKEN nao configurado. Painel sem autenticacao.");
    }
  });

  return { app, host, port, authRequired };
}
