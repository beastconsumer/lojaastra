import express from "express";
import path from "path";
import fs from "fs";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";

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
  return "";
}

function parseCookies(rawCookieHeader) {
  const raw = asString(rawCookieHeader);
  if (!raw) return {};
  const result = {};
  for (const part of raw.split(";")) {
    const chunk = String(part || "").trim();
    if (!chunk) continue;
    const idx = chunk.indexOf("=");
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function appendSetCookie(res, cookieValue) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, cookieValue]);
    return;
  }
  res.setHeader("Set-Cookie", [current, cookieValue]);
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(String(value || ""))}`];
  parts.push(`Path=${options.path || "/"}`);
  if (Number.isFinite(options.maxAgeSeconds)) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  appendSetCookie(res, parts.join("; "));
}

function clearCookie(res, name, options = {}) {
  setCookie(res, name, "", {
    ...options,
    maxAgeSeconds: 0
  });
}

function safeCompareText(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hashSha256Hex(value) {
  return createHash("sha256").update(String(value || ""), "utf8").digest("hex");
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

function parseIsoTimestamp(value) {
  const raw = asString(value);
  if (!raw) return 0;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? ts : 0;
}

function sortByDateDesc(list, getter) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const left = parseIsoTimestamp(getter(a));
    const right = parseIsoTimestamp(getter(b));
    return right - left;
  });
}

function humanizeCode(value) {
  const raw = asString(value).toLowerCase();
  if (!raw) return "-";
  const normalized = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCents(cents, currency = "BRL") {
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function isPlanActiveNow(plan) {
  if (!plan || typeof plan !== "object") return false;
  if (asString(plan.status).toLowerCase() !== "active") return false;
  const expiresAt = asString(plan.expiresAt);
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && ts > Date.now();
}

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, payload) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.renameSync(tmp, filePath);
    return true;
  } catch {
    return false;
  }
}

function getPortalFilePath(rootDir) {
  return path.join(rootDir, "data", "portal.json");
}

function normalizePortalSnapshot(data) {
  const fallback = {
    users: [],
    instances: [],
    transactions: [],
    withdrawals: []
  };
  const normalized = data && typeof data === "object" ? data : {};
  if (!Array.isArray(normalized.users)) normalized.users = [];
  if (!Array.isArray(normalized.instances)) normalized.instances = [];
  if (!Array.isArray(normalized.transactions)) normalized.transactions = [];
  if (!Array.isArray(normalized.withdrawals)) normalized.withdrawals = [];
  return { ...fallback, ...normalized };
}

function loadPortalSnapshot(rootDir) {
  const filePath = getPortalFilePath(rootDir);
  const data = readJsonSafe(filePath, {});
  return normalizePortalSnapshot(data);
}

function loadPortalSnapshotWithPath(rootDir) {
  const filePath = getPortalFilePath(rootDir);
  const data = normalizePortalSnapshot(readJsonSafe(filePath, {}));
  return { filePath, data };
}

function isAccountBlocked(user) {
  return asString(user?.accountStatus).toLowerCase() === "blocked";
}

function resolveOrderOwnerDiscordUserId(order, maps) {
  const direct = asString(order?.ownerDiscordUserId);
  if (direct) return direct;

  const byInstanceId = asString(order?.instanceId);
  if (byInstanceId && maps?.instanceById?.has(byInstanceId)) {
    const instance = maps.instanceById.get(byInstanceId);
    const owner = asString(instance?.ownerDiscordUserId);
    if (owner) return owner;
  }

  const byGuildId = asString(order?.guildId);
  if (byGuildId && maps?.instanceByGuild?.has(byGuildId)) {
    const instance = maps.instanceByGuild.get(byGuildId);
    const owner = asString(instance?.ownerDiscordUserId);
    if (owner) return owner;
  }

  return "";
}

function toOrderValueCents(order) {
  const fromCents = Math.floor(Number(order?.valueCents || 0));
  if (Number.isFinite(fromCents) && fromCents > 0) return fromCents;
  const fromValue = Number(order?.value || 0);
  if (!Number.isFinite(fromValue) || fromValue <= 0) return 0;
  return Math.round(fromValue * 100);
}

function buildBusinessOverview({ rootDir, ordersDb, cartsDb, customersDb, deliveriesDb }) {
  const portal = loadPortalSnapshot(rootDir);
  const users = portal.users || [];
  const instances = portal.instances || [];
  const transactions = portal.transactions || [];
  const withdrawals = portal.withdrawals || [];
  const orders = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
  const carts = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];
  const customers = Array.isArray(customersDb?.customers) ? customersDb.customers : [];
  const deliveries = Array.isArray(deliveriesDb?.deliveries) ? deliveriesDb.deliveries : [];

  const usersById = new Map(users.map((user) => [asString(user?.discordUserId), user]));
  const instanceById = new Map(instances.map((instance) => [asString(instance?.id), instance]));
  const instanceByGuild = new Map(
    instances
      .map((instance) => [asString(instance?.discordGuildId), instance])
      .filter(([guildId]) => !!guildId)
  );

  const summary = {
    usersTotal: users.length,
    usersActivePlan: users.filter((user) => isPlanActiveNow(user?.plan)).length,
    usersTrialUsed: users.filter((user) => !!asString(user?.trialClaimedAt)).length,
    instancesTotal: instances.length,
    instancesWithToken: instances.filter((instance) => !!asString(instance?.botTokenHash || instance?.botProfile?.applicationId)).length,
    instancesOnline: instances.filter((instance) => asString(instance?.runtime?.status).toLowerCase() === "online").length,
    instancesSuspended: instances.filter((instance) => asString(instance?.runtime?.status).toLowerCase() === "suspenso").length,
    customersTotal: customers.length,
    cartsTotal: carts.length,
    cartsOpen: carts.filter((cart) => asString(cart?.status).toLowerCase() === "open").length,
    cartsPending: carts.filter((cart) => asString(cart?.status).toLowerCase() === "pending").length,
    ordersTotal: orders.length,
    ordersDelivered: orders.filter((order) => asString(order?.status).toLowerCase() === "delivered").length,
    ordersPending: orders.filter((order) => asString(order?.status).toLowerCase() === "pending").length,
    ordersWaitingStock: orders.filter((order) => asString(order?.status).toLowerCase() === "waiting_stock").length,
    deliveriesTotal: deliveries.length
  };

  const sales = orders.reduce(
    (acc, order) => {
      const orderStatus = asString(order?.status).toLowerCase();
      const valueCents = toOrderValueCents(order);
      const netCents = Math.floor(Number(order?.netCents || 0));
      const computedNet = netCents > 0 ? netCents : Math.max(0, Math.round(valueCents * 0.94));
      if (orderStatus === "delivered") {
        acc.grossCents += valueCents;
        acc.netCents += computedNet;
      }
      return acc;
    },
    { grossCents: 0, netCents: 0 }
  );

  const txSummary = transactions.reduce(
    (acc, tx) => {
      const type = asString(tx?.type).toLowerCase();
      const status = asString(tx?.status).toLowerCase();
      const amountCents = Math.floor(Number(tx?.amountCents || 0));
      if (type === "plan_purchase") {
        if (status === "paid") acc.planRevenuePaidCents += amountCents;
        if (status === "pending") acc.planRevenuePendingCents += amountCents;
      }
      if (type === "sale_credit") acc.salesCreditCents += amountCents;
      return acc;
    },
    {
      planRevenuePaidCents: 0,
      planRevenuePendingCents: 0,
      salesCreditCents: 0
    }
  );

  const withdrawalsSummary = withdrawals.reduce(
    (acc, wd) => {
      const status = asString(wd?.status).toLowerCase();
      const amountCents = Math.floor(Number(wd?.amountCents || 0));
      if (status === "requested") {
        acc.requestedCount += 1;
        acc.requestedCents += amountCents;
      } else if (status === "completed") {
        acc.completedCount += 1;
        acc.completedCents += amountCents;
      } else if (status === "rejected" || status === "cancelled") {
        acc.revertedCount += 1;
        acc.revertedCents += amountCents;
      }
      return acc;
    },
    {
      requestedCount: 0,
      requestedCents: 0,
      completedCount: 0,
      completedCents: 0,
      revertedCount: 0,
      revertedCents: 0
    }
  );

  const walletOutstandingCents = users.reduce((sum, user) => sum + Math.floor(Number(user?.walletCents || 0)), 0);

  const recentUsers = sortByDateDesc(users, (user) => user?.createdAt)
    .slice(0, 18)
    .map((user) => ({
      discordUserId: asString(user?.discordUserId),
      discordUsername: asString(user?.discordUsername),
      email: asString(user?.email),
      planTier: asString(user?.plan?.tier || "free"),
      planStatus: asString(user?.plan?.status || "inactive"),
      planActive: isPlanActiveNow(user?.plan),
      trialClaimedAt: asString(user?.trialClaimedAt),
      createdAt: asString(user?.createdAt),
      lastLoginAt: asString(user?.lastLoginAt)
    }));

  const recentInstances = sortByDateDesc(instances, (instance) => instance?.createdAt)
    .slice(0, 18)
    .map((instance) => {
      const ownerDiscordUserId = asString(instance?.ownerDiscordUserId);
      const owner = usersById.get(ownerDiscordUserId) || null;
      return {
        id: asString(instance?.id),
        name: asString(instance?.name),
        createdAt: asString(instance?.createdAt),
        updatedAt: asString(instance?.updatedAt),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email),
        botUsername: asString(instance?.botProfile?.username),
        hasToken: !!asString(instance?.botTokenHash || instance?.botProfile?.applicationId),
        discordGuildId: asString(instance?.discordGuildId),
        runtimeStatus: asString(instance?.runtime?.status),
        runtimeError: asString(instance?.runtime?.lastError)
      };
    });

  const recentPayments = sortByDateDesc(transactions, (tx) => tx?.createdAt)
    .slice(0, 24)
    .map((tx) => {
      const ownerDiscordUserId = asString(tx?.ownerDiscordUserId);
      const owner = usersById.get(ownerDiscordUserId) || null;
      return {
        id: asString(tx?.id),
        type: asString(tx?.type),
        status: asString(tx?.status),
        amountCents: Math.floor(Number(tx?.amountCents || 0)),
        amountFormatted: formatCents(tx?.amountCents || 0),
        planId: asString(tx?.planId),
        provider: asString(tx?.provider),
        createdAt: asString(tx?.createdAt),
        updatedAt: asString(tx?.updatedAt),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email)
      };
    });

  const recentOrders = sortByDateDesc(orders, (order) => order?.createdAt)
    .slice(0, 24)
    .map((order) => {
      const ownerDiscordUserId = resolveOrderOwnerDiscordUserId(order, { instanceById, instanceByGuild });
      const owner = usersById.get(ownerDiscordUserId) || null;
      const valueCents = toOrderValueCents(order);
      return {
        id: asString(order?.id),
        cartId: asString(order?.cartId),
        paymentId: asString(order?.paymentId),
        userId: asString(order?.userId),
        status: asString(order?.status),
        confirmedSource: asString(order?.confirmedSource),
        productId: asString(order?.productId),
        variantId: asString(order?.variantId),
        valueCents,
        valueFormatted: formatCents(valueCents),
        createdAt: asString(order?.createdAt),
        confirmedAt: asString(order?.confirmedAt),
        deliveredAt: asString(order?.deliveredAt),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email)
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      salesGrossCents: sales.grossCents,
      salesGrossFormatted: formatCents(sales.grossCents),
      salesNetCents: sales.netCents,
      salesNetFormatted: formatCents(sales.netCents),
      walletOutstandingCents,
      walletOutstandingFormatted: formatCents(walletOutstandingCents),
      planRevenuePaidCents: txSummary.planRevenuePaidCents,
      planRevenuePaidFormatted: formatCents(txSummary.planRevenuePaidCents),
      planRevenuePendingCents: txSummary.planRevenuePendingCents,
      planRevenuePendingFormatted: formatCents(txSummary.planRevenuePendingCents),
      salesCreditCents: txSummary.salesCreditCents,
      salesCreditFormatted: formatCents(txSummary.salesCreditCents),
      withdrawalsRequestedCount: withdrawalsSummary.requestedCount,
      withdrawalsRequestedCents: withdrawalsSummary.requestedCents,
      withdrawalsRequestedFormatted: formatCents(withdrawalsSummary.requestedCents),
      withdrawalsCompletedCount: withdrawalsSummary.completedCount,
      withdrawalsCompletedCents: withdrawalsSummary.completedCents,
      withdrawalsCompletedFormatted: formatCents(withdrawalsSummary.completedCents),
      withdrawalsRevertedCount: withdrawalsSummary.revertedCount,
      withdrawalsRevertedCents: withdrawalsSummary.revertedCents,
      withdrawalsRevertedFormatted: formatCents(withdrawalsSummary.revertedCents)
    },
    recent: {
      users: recentUsers,
      instances: recentInstances,
      payments: recentPayments,
      orders: recentOrders
    }
  };
}

function buildMonitoringRequests({ rootDir, ordersDb, cartsDb, limit = 60 }) {
  const portal = loadPortalSnapshot(rootDir);
  const users = portal.users || [];
  const instances = portal.instances || [];
  const withdrawals = portal.withdrawals || [];
  const orders = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
  const carts = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];

  const usersById = new Map(users.map((user) => [asString(user?.discordUserId), user]));
  const instanceById = new Map(instances.map((instance) => [asString(instance?.id), instance]));
  const instanceByGuild = new Map(
    instances
      .map((instance) => [asString(instance?.discordGuildId), instance])
      .filter(([guildId]) => !!guildId)
  );

  const ordersPending = sortByDateDesc(
    orders.filter((order) => asString(order?.status).toLowerCase() === "pending"),
    (order) => order?.createdAt
  )
    .slice(0, limit)
    .map((order) => {
      const ownerDiscordUserId = resolveOrderOwnerDiscordUserId(order, { instanceById, instanceByGuild });
      const owner = usersById.get(ownerDiscordUserId) || null;
      const valueCents = toOrderValueCents(order);
      return {
        id: asString(order?.id),
        createdAt: asString(order?.createdAt),
        status: asString(order?.status),
        userId: asString(order?.userId),
        paymentId: asString(order?.paymentId),
        productId: asString(order?.productId),
        variantId: asString(order?.variantId),
        valueCents,
        valueFormatted: formatCents(valueCents),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email)
      };
    });

  const ordersWaitingStock = sortByDateDesc(
    orders.filter((order) => asString(order?.status).toLowerCase() === "waiting_stock"),
    (order) => order?.createdAt
  )
    .slice(0, limit)
    .map((order) => {
      const ownerDiscordUserId = resolveOrderOwnerDiscordUserId(order, { instanceById, instanceByGuild });
      const owner = usersById.get(ownerDiscordUserId) || null;
      const valueCents = toOrderValueCents(order);
      return {
        id: asString(order?.id),
        createdAt: asString(order?.createdAt),
        status: asString(order?.status),
        userId: asString(order?.userId),
        paymentId: asString(order?.paymentId),
        productId: asString(order?.productId),
        variantId: asString(order?.variantId),
        valueCents,
        valueFormatted: formatCents(valueCents),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email)
      };
    });

  const cartsOpen = sortByDateDesc(
    carts.filter((cart) => asString(cart?.status).toLowerCase() === "open"),
    (cart) => cart?.updatedAt || cart?.createdAt
  )
    .slice(0, limit)
    .map((cart) => {
      const user = usersById.get(asString(cart?.userId)) || null;
      return {
        id: asString(cart?.id),
        status: asString(cart?.status),
        userId: asString(cart?.userId),
        userDiscordUsername: asString(user?.discordUsername),
        userEmail: asString(user?.email),
        productId: asString(cart?.productId),
        variantId: asString(cart?.variantId),
        channelId: asString(cart?.channelId),
        updatedAt: asString(cart?.updatedAt || cart?.createdAt),
        createdAt: asString(cart?.createdAt)
      };
    });

  const cartsPending = sortByDateDesc(
    carts.filter((cart) => asString(cart?.status).toLowerCase() === "pending"),
    (cart) => cart?.updatedAt || cart?.createdAt
  )
    .slice(0, limit)
    .map((cart) => {
      const user = usersById.get(asString(cart?.userId)) || null;
      return {
        id: asString(cart?.id),
        status: asString(cart?.status),
        userId: asString(cart?.userId),
        userDiscordUsername: asString(user?.discordUsername),
        userEmail: asString(user?.email),
        productId: asString(cart?.productId),
        variantId: asString(cart?.variantId),
        channelId: asString(cart?.channelId),
        updatedAt: asString(cart?.updatedAt || cart?.createdAt),
        createdAt: asString(cart?.createdAt)
      };
    });

  const withdrawalsRequested = sortByDateDesc(
    withdrawals.filter((withdrawal) => asString(withdrawal?.status).toLowerCase() === "requested"),
    (withdrawal) => withdrawal?.createdAt
  )
    .slice(0, limit)
    .map((withdrawal) => {
      const ownerDiscordUserId = asString(withdrawal?.ownerDiscordUserId);
      const owner = usersById.get(ownerDiscordUserId) || null;
      const amountCents = Math.floor(Number(withdrawal?.amountCents || 0));
      return {
        id: asString(withdrawal?.id),
        createdAt: asString(withdrawal?.createdAt),
        status: asString(withdrawal?.status),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email),
        amountCents,
        amountFormatted: formatCents(amountCents),
        pixKeyType: asString(withdrawal?.pixKeyType)
      };
    });

  const runtimeAlerts = sortByDateDesc(
    instances.filter((instance) => {
      const status = asString(instance?.runtime?.status).toLowerCase();
      return status !== "online" || !!asString(instance?.runtime?.lastError);
    }),
    (instance) => instance?.runtime?.updatedAt || instance?.updatedAt || instance?.createdAt
  )
    .slice(0, limit)
    .map((instance) => {
      const ownerDiscordUserId = asString(instance?.ownerDiscordUserId);
      const owner = usersById.get(ownerDiscordUserId) || null;
      const runtimeStatus = asString(instance?.runtime?.status) || "unknown";
      return {
        id: asString(instance?.id),
        name: asString(instance?.name),
        ownerDiscordUserId,
        ownerDiscordUsername: asString(owner?.discordUsername),
        ownerEmail: asString(owner?.email),
        runtimeStatus,
        runtimeError: asString(instance?.runtime?.lastError),
        runtimeUpdatedAt: asString(instance?.runtime?.updatedAt || instance?.updatedAt || instance?.createdAt)
      };
    });

  const summary = {
    ordersPending: ordersPending.length,
    ordersWaitingStock: ordersWaitingStock.length,
    cartsOpen: cartsOpen.length,
    cartsPending: cartsPending.length,
    withdrawalsRequested: withdrawalsRequested.length,
    runtimeAlerts: runtimeAlerts.length,
    totalActionable:
      ordersPending.length +
      ordersWaitingStock.length +
      cartsOpen.length +
      cartsPending.length +
      withdrawalsRequested.length +
      runtimeAlerts.length
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    queues: {
      ordersPending,
      ordersWaitingStock,
      cartsOpen,
      cartsPending,
      withdrawalsRequested,
      runtimeAlerts
    }
  };
}

function buildAdminUsersOverview({ rootDir, ordersDb, cartsDb }) {
  const portal = loadPortalSnapshot(rootDir);
  const users = portal.users || [];
  const instances = portal.instances || [];
  const transactions = portal.transactions || [];
  const withdrawals = portal.withdrawals || [];
  const orders = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
  const carts = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];

  const byUser = new Map();
  const ensure = (userId) => {
    const id = asString(userId);
    if (!id) return null;
    if (!byUser.has(id)) {
      byUser.set(id, {
        instancesCount: 0,
        runtimeAlertsCount: 0,
        ordersPurchasedCount: 0,
        ordersPurchasedPendingCount: 0,
        ordersPurchasedDeliveredCount: 0,
        ordersOwnedCount: 0,
        ordersOwnedPendingCount: 0,
        cartsOpenCount: 0,
        cartsPendingCount: 0,
        txPaidCount: 0,
        txPendingCount: 0,
        withdrawalsRequestedCount: 0
      });
    }
    return byUser.get(id);
  };

  const instanceById = new Map(instances.map((instance) => [asString(instance?.id), instance]));
  const instanceByGuild = new Map(
    instances
      .map((instance) => [asString(instance?.discordGuildId), instance])
      .filter(([guildId]) => !!guildId)
  );

  for (const instance of instances) {
    const ownerId = asString(instance?.ownerDiscordUserId);
    const entry = ensure(ownerId);
    if (!entry) continue;
    entry.instancesCount += 1;
    const status = asString(instance?.runtime?.status).toLowerCase();
    if (status !== "online" || asString(instance?.runtime?.lastError)) {
      entry.runtimeAlertsCount += 1;
    }
  }

  for (const order of orders) {
    const buyerId = asString(order?.userId);
    const buyer = ensure(buyerId);
    if (buyer) {
      buyer.ordersPurchasedCount += 1;
      const status = asString(order?.status).toLowerCase();
      if (status === "pending" || status === "waiting_stock") buyer.ordersPurchasedPendingCount += 1;
      if (status === "delivered") buyer.ordersPurchasedDeliveredCount += 1;
    }

    const ownerId = resolveOrderOwnerDiscordUserId(order, { instanceById, instanceByGuild });
    const owner = ensure(ownerId);
    if (owner) {
      owner.ordersOwnedCount += 1;
      const status = asString(order?.status).toLowerCase();
      if (status === "pending" || status === "waiting_stock") owner.ordersOwnedPendingCount += 1;
    }
  }

  for (const cart of carts) {
    const entry = ensure(cart?.userId);
    if (!entry) continue;
    const status = asString(cart?.status).toLowerCase();
    if (status === "open") entry.cartsOpenCount += 1;
    if (status === "pending") entry.cartsPendingCount += 1;
  }

  for (const tx of transactions) {
    const entry = ensure(tx?.ownerDiscordUserId);
    if (!entry) continue;
    const status = asString(tx?.status).toLowerCase();
    if (status === "paid") entry.txPaidCount += 1;
    if (status === "pending") entry.txPendingCount += 1;
  }

  for (const withdrawal of withdrawals) {
    const entry = ensure(withdrawal?.ownerDiscordUserId);
    if (!entry) continue;
    if (asString(withdrawal?.status).toLowerCase() === "requested") {
      entry.withdrawalsRequestedCount += 1;
    }
  }

  const rows = users
    .map((user) => {
      const userId = asString(user?.discordUserId);
      const metric = byUser.get(userId) || ensure(userId) || {};
      const accountStatus = isAccountBlocked(user) ? "blocked" : "active";
      const planStatus = asString(user?.plan?.status || "inactive");
      const planTier = asString(user?.plan?.tier || "free");
      const pendingItems =
        (metric.ordersPurchasedPendingCount || 0) +
        (metric.ordersOwnedPendingCount || 0) +
        (metric.cartsOpenCount || 0) +
        (metric.cartsPendingCount || 0) +
        (metric.txPendingCount || 0) +
        (metric.withdrawalsRequestedCount || 0) +
        (metric.runtimeAlertsCount || 0);
      return {
        discordUserId: userId,
        discordUsername: asString(user?.discordUsername),
        email: asString(user?.email),
        isLocal: user?.isLocal === true,
        createdAt: asString(user?.createdAt),
        lastLoginAt: asString(user?.lastLoginAt),
        planTier,
        planStatus,
        planExpiresAt: asString(user?.plan?.expiresAt),
        planActive: isPlanActiveNow(user?.plan),
        walletCents: Math.floor(Number(user?.walletCents || 0)),
        walletFormatted: formatCents(user?.walletCents || 0),
        trialClaimedAt: asString(user?.trialClaimedAt),
        accountStatus,
        blockedAt: asString(user?.blockedAt),
        blockedReason: asString(user?.blockedReason),
        blockedBy: asString(user?.blockedBy),
        metrics: {
          instancesCount: metric.instancesCount || 0,
          runtimeAlertsCount: metric.runtimeAlertsCount || 0,
          ordersPurchasedCount: metric.ordersPurchasedCount || 0,
          ordersPurchasedPendingCount: metric.ordersPurchasedPendingCount || 0,
          ordersPurchasedDeliveredCount: metric.ordersPurchasedDeliveredCount || 0,
          ordersOwnedCount: metric.ordersOwnedCount || 0,
          ordersOwnedPendingCount: metric.ordersOwnedPendingCount || 0,
          cartsOpenCount: metric.cartsOpenCount || 0,
          cartsPendingCount: metric.cartsPendingCount || 0,
          txPaidCount: metric.txPaidCount || 0,
          txPendingCount: metric.txPendingCount || 0,
          withdrawalsRequestedCount: metric.withdrawalsRequestedCount || 0,
          pendingItems
        }
      };
    })
    .sort((a, b) => {
      const blockedA = a.accountStatus === "blocked" ? 1 : 0;
      const blockedB = b.accountStatus === "blocked" ? 1 : 0;
      if (blockedA !== blockedB) return blockedB - blockedA;
      const pendingA = Number(a?.metrics?.pendingItems || 0);
      const pendingB = Number(b?.metrics?.pendingItems || 0);
      if (pendingA !== pendingB) return pendingB - pendingA;
      return parseIsoTimestamp(b?.lastLoginAt || b?.createdAt) - parseIsoTimestamp(a?.lastLoginAt || a?.createdAt);
    });

  const summary = {
    usersTotal: rows.length,
    usersBlocked: rows.filter((row) => row.accountStatus === "blocked").length,
    usersActive: rows.filter((row) => row.accountStatus !== "blocked").length,
    usersWithActivePlan: rows.filter((row) => row.planActive).length,
    usersTrialUsed: rows.filter((row) => !!row.trialClaimedAt).length,
    usersWithPendingItems: rows.filter((row) => Number(row?.metrics?.pendingItems || 0) > 0).length
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    users: rows
  };
}

function detectLogLevel(line) {
  const text = String(line || "");
  if (/\[(ERROR|ERR)\]/i.test(text)) return "error";
  if (/\[(WARN|WARNING)\]/i.test(text)) return "warn";
  if (/\[(DEBUG)\]/i.test(text)) return "debug";
  if (/\[(INFO)\]/i.test(text)) return "info";
  return "info";
}

function parseLogTimestamp(line) {
  const text = String(line || "");
  const match = text.match(/\[(\d{4}-\d{2}-\d{2}[^/\]]*)\]/);
  if (!match) return "";
  const raw = asString(match[1]);
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : "";
}

function tailFileLines(filePath, maxLines) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw) return [];
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) return [];
    return lines.slice(-Math.max(1, maxLines));
  } catch {
    return [];
  }
}

function buildSystemLogs({ rootDir, ordersDb, cartsDb, postsDb, deliveriesDb, limit = 220, rawLimit = 120 }) {
  const portal = loadPortalSnapshot(rootDir);
  const users = portal.users || [];
  const instances = portal.instances || [];
  const transactions = portal.transactions || [];
  const withdrawals = portal.withdrawals || [];
  const orders = Array.isArray(ordersDb?.orders) ? ordersDb.orders : [];
  const carts = Array.isArray(cartsDb?.carts) ? cartsDb.carts : [];
  const posts = Array.isArray(postsDb?.posts) ? postsDb.posts : [];
  const deliveries = Array.isArray(deliveriesDb?.deliveries) ? deliveriesDb.deliveries : [];

  const usersById = new Map(users.map((user) => [asString(user?.discordUserId), user]));
  const instanceById = new Map(instances.map((instance) => [asString(instance?.id), instance]));
  const instanceByGuild = new Map(
    instances
      .map((instance) => [asString(instance?.discordGuildId), instance])
      .filter(([guildId]) => !!guildId)
  );

  const events = [];
  const addEvent = ({ id, at, type, source, severity = "info", summary, details = {} }) => {
    const ts = parseIsoTimestamp(at);
    if (!ts) return;
    events.push({
      id: asString(id) || randomUUID(),
      at: new Date(ts).toISOString(),
      type: asString(type) || "event",
      source: asString(source) || "system",
      severity: asString(severity) || "info",
      summary: asString(summary) || "-",
      details: details && typeof details === "object" ? details : {},
      _ts: ts
    });
  };

  for (const user of users) {
    const userId = asString(user?.discordUserId);
    const label = asString(user?.discordUsername || user?.email || userId || "usuario");
    addEvent({
      id: `user_created:${userId}`,
      at: user?.createdAt,
      type: "user_created",
      source: "portal_user",
      severity: "info",
      summary: `Conta criada: ${label}`,
      details: { userId, email: asString(user?.email) }
    });
    if (asString(user?.trialClaimedAt)) {
      addEvent({
        id: `trial_claimed:${userId}`,
        at: user?.trialClaimedAt,
        type: "trial_claimed",
        source: "portal_user",
        severity: "warn",
        summary: `Trial ativado por ${label}`,
        details: { userId }
      });
    }
  }

  for (const instance of instances) {
    const instanceId = asString(instance?.id);
    const ownerId = asString(instance?.ownerDiscordUserId);
    const owner = usersById.get(ownerId) || null;
    const ownerName = asString(owner?.discordUsername || owner?.email || ownerId || "usuario");
    const instanceName = asString(instance?.name || instanceId);
    addEvent({
      id: `instance_created:${instanceId}`,
      at: instance?.createdAt,
      type: "instance_created",
      source: "portal_instance",
      severity: "info",
      summary: `Instancia criada: ${instanceName} (${ownerName})`,
      details: {
        instanceId,
        ownerDiscordUserId: ownerId,
        botUsername: asString(instance?.botProfile?.username),
        runtimeStatus: asString(instance?.runtime?.status)
      }
    });
    if (asString(instance?.runtime?.lastError) && asString(instance?.runtime?.updatedAt)) {
      addEvent({
        id: `instance_runtime:${instanceId}:${asString(instance?.runtime?.updatedAt)}`,
        at: instance?.runtime?.updatedAt,
        type: "instance_runtime",
        source: "portal_instance",
        severity: "warn",
        summary: `Runtime da instancia ${instanceName}: ${asString(instance?.runtime?.lastError)}`,
        details: {
          instanceId,
          status: asString(instance?.runtime?.status),
          error: asString(instance?.runtime?.lastError)
        }
      });
    }
  }

  for (const tx of transactions) {
    const txId = asString(tx?.id);
    const ownerId = asString(tx?.ownerDiscordUserId);
    const owner = usersById.get(ownerId) || null;
    const ownerName = asString(owner?.discordUsername || owner?.email || ownerId || "usuario");
    const status = asString(tx?.status).toLowerCase();
    addEvent({
      id: `tx:${txId}:${asString(tx?.updatedAt || tx?.createdAt)}`,
      at: tx?.updatedAt || tx?.createdAt,
      type: `transaction_${asString(tx?.type) || "event"}`,
      source: "portal_transaction",
      severity: status === "failed" ? "error" : status === "pending" ? "warn" : "info",
      summary: `${humanizeCode(tx?.type)} ${humanizeCode(tx?.status)} (${formatCents(tx?.amountCents || 0)}) - ${ownerName}`,
      details: {
        txId,
        ownerDiscordUserId: ownerId,
        status: asString(tx?.status),
        provider: asString(tx?.provider),
        planId: asString(tx?.planId)
      }
    });
  }

  for (const wd of withdrawals) {
    const wid = asString(wd?.id);
    const ownerId = asString(wd?.ownerDiscordUserId);
    const owner = usersById.get(ownerId) || null;
    const ownerName = asString(owner?.discordUsername || owner?.email || ownerId || "usuario");
    addEvent({
      id: `withdrawal_requested:${wid}`,
      at: wd?.createdAt,
      type: "withdrawal_requested",
      source: "portal_withdrawal",
      severity: "warn",
      summary: `Saque solicitado por ${ownerName} (${formatCents(wd?.amountCents || 0)})`,
      details: {
        withdrawalId: wid,
        ownerDiscordUserId: ownerId,
        status: asString(wd?.status),
        pixKeyType: asString(wd?.pixKeyType)
      }
    });
    const updatedAt = asString(wd?.updatedAt);
    const createdAt = asString(wd?.createdAt);
    if (updatedAt && updatedAt !== createdAt && asString(wd?.status).toLowerCase() !== "requested") {
      const status = asString(wd?.status).toLowerCase();
      addEvent({
        id: `withdrawal_status:${wid}:${updatedAt}`,
        at: updatedAt,
        type: `withdrawal_${status || "updated"}`,
        source: "portal_withdrawal",
        severity: status === "completed" ? "info" : "warn",
        summary: `Saque ${wid} atualizado para ${humanizeCode(status)}`,
        details: { withdrawalId: wid, status: asString(wd?.status), ownerDiscordUserId: ownerId }
      });
    }
  }

  for (const order of orders) {
    const orderId = asString(order?.id);
    const ownerId = resolveOrderOwnerDiscordUserId(order, { instanceById, instanceByGuild });
    addEvent({
      id: `order_created:${orderId}`,
      at: order?.createdAt,
      type: "order_created",
      source: "order",
      severity: "info",
      summary: `Pedido criado ${orderId} (${asString(order?.productId)}/${asString(order?.variantId)})`,
      details: {
        orderId,
        paymentId: asString(order?.paymentId),
        userId: asString(order?.userId),
        ownerDiscordUserId: ownerId,
        status: asString(order?.status)
      }
    });
    if (asString(order?.confirmedAt)) {
      addEvent({
        id: `order_confirmed:${orderId}`,
        at: order?.confirmedAt,
        type: "order_confirmed",
        source: "order",
        severity: "info",
        summary: `Pedido ${orderId} confirmado via ${asString(order?.confirmedSource || "pix")}`,
        details: {
          orderId,
          source: asString(order?.confirmedSource),
          byUserId: asString(order?.confirmedByUserId)
        }
      });
    }
    if (asString(order?.deliveredAt)) {
      addEvent({
        id: `order_delivered:${orderId}`,
        at: order?.deliveredAt,
        type: "order_delivered",
        source: "order",
        severity: "info",
        summary: `Pedido ${orderId} entregue`,
        details: { orderId, deliveryId: asString(order?.deliveryId) }
      });
    }
    if (asString(order?.cancelledAt)) {
      addEvent({
        id: `order_cancelled:${orderId}`,
        at: order?.cancelledAt,
        type: "order_cancelled",
        source: "order",
        severity: "warn",
        summary: `Pedido ${orderId} cancelado`,
        details: { orderId }
      });
    }

    const confirmations = Array.isArray(order?.confirmations) ? order.confirmations : [];
    for (const confirmation of confirmations) {
      addEvent({
        id: asString(confirmation?.id) || `order_confirmation:${orderId}:${asString(confirmation?.at)}`,
        at: confirmation?.at,
        type: "order_confirmation",
        source: "order_confirmation",
        severity: "info",
        summary: `Confirmacao de pedido ${orderId} por ${asString(confirmation?.source) || "pix"}`,
        details: {
          orderId,
          byUserId: asString(confirmation?.byUserId),
          source: asString(confirmation?.source),
          note: asString(confirmation?.note)
        }
      });
    }

    const orderEvents = Array.isArray(order?.events) ? order.events : [];
    for (const event of orderEvents) {
      addEvent({
        id: asString(event?.id) || `order_event:${orderId}:${asString(event?.at)}:${asString(event?.type)}`,
        at: event?.at,
        type: `order_event_${asString(event?.type) || "event"}`,
        source: "order_event",
        severity: asString(event?.type).includes("failed") || asString(event?.type).includes("error") ? "warn" : "info",
        summary: `Evento ${humanizeCode(event?.type)} no pedido ${orderId}`,
        details: {
          orderId,
          eventType: asString(event?.type),
          details: event?.details && typeof event.details === "object" ? event.details : {}
        }
      });
    }
  }

  for (const cart of carts) {
    const cartId = asString(cart?.id);
    addEvent({
      id: `cart_created:${cartId}`,
      at: cart?.createdAt,
      type: "cart_created",
      source: "cart",
      severity: "info",
      summary: `Carrinho criado ${cartId} (${asString(cart?.status) || "open"})`,
      details: {
        cartId,
        userId: asString(cart?.userId),
        productId: asString(cart?.productId),
        variantId: asString(cart?.variantId)
      }
    });
    if (asString(cart?.updatedAt) && asString(cart?.status).toLowerCase() !== "open") {
      addEvent({
        id: `cart_status:${cartId}:${asString(cart?.updatedAt)}`,
        at: cart?.updatedAt,
        type: `cart_${asString(cart?.status).toLowerCase() || "updated"}`,
        source: "cart",
        severity: asString(cart?.status).toLowerCase() === "cancelled" ? "warn" : "info",
        summary: `Carrinho ${cartId} atualizado para ${humanizeCode(cart?.status)}`,
        details: { cartId, status: asString(cart?.status) }
      });
    }
  }

  for (const post of posts) {
    addEvent({
      id: asString(post?.id) || `post:${asString(post?.messageId)}`,
      at: post?.createdAt,
      type: "post_created",
      source: "post",
      severity: "info",
      summary: `Post de produto ${asString(post?.productId)} enviado para canal ${asString(post?.channelId)}`,
      details: {
        postId: asString(post?.id),
        productId: asString(post?.productId),
        messageId: asString(post?.messageId)
      }
    });
  }

  for (const delivery of deliveries) {
    addEvent({
      id: asString(delivery?.id) || `delivery:${asString(delivery?.orderId)}`,
      at: delivery?.deliveredAt,
      type: "delivery_created",
      source: "delivery",
      severity: "info",
      summary: `Entrega registrada para pedido ${asString(delivery?.orderId)}`,
      details: {
        deliveryId: asString(delivery?.id),
        orderId: asString(delivery?.orderId),
        productId: asString(delivery?.productId),
        variantId: asString(delivery?.variantId)
      }
    });
  }

  const sorted = events
    .sort((a, b) => b._ts - a._ts)
    .map((entry) => {
      const { _ts, ...clean } = entry;
      return clean;
    });

  const logsDir = path.join(rootDir, "logs");
  const outLines = tailFileLines(path.join(logsDir, "app.out.log"), rawLimit);
  const errLines = tailFileLines(path.join(logsDir, "app.err.log"), Math.max(20, Math.floor(rawLimit / 2)));
  const mapRaw = (lines, source) =>
    lines.map((line, idx) => ({
      id: `${source}_${idx}`,
      source,
      at: parseLogTimestamp(line),
      level: detectLogLevel(line),
      line
    }));

  const rawOut = mapRaw(outLines, "app.out.log");
  const rawErr = mapRaw(errLines, "app.err.log");

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      domainTotal: sorted.length,
      domainReturned: Math.min(limit, sorted.length),
      rawOutTotal: rawOut.length,
      rawErrTotal: rawErr.length,
      totalReturned: Math.min(limit, sorted.length) + rawOut.length + rawErr.length
    },
    events: sorted.slice(0, limit),
    rawLogs: {
      out: rawOut,
      err: rawErr
    }
  };
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
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  const forceSecureCookie = asString(process.env.ADMIN_COOKIE_SECURE).toLowerCase() === "true";
  const host = asString(process.env.ADMIN_PANEL_HOST) || "127.0.0.1";
  const port = Number(process.env.ADMIN_PANEL_PORT || 3000);

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    if (forceSecureCookie || req.secure || asString(req.headers["x-forwarded-proto"]).toLowerCase() === "https") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  const adminDir = path.join(rootDir, "src", "admin");
  app.use("/admin", express.static(adminDir, { index: "index.html" }));

  app.get("/", (_req, res) => {
    res.redirect("/admin");
  });

  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  const authRequired = asString(process.env.ADMIN_PANEL_AUTH_REQUIRED || "true").toLowerCase() !== "false";
  const monitoringOnly = asString(process.env.ADMIN_PANEL_MODE).toLowerCase() !== "full";
  const token = asString(process.env.ADMIN_PANEL_TOKEN);
  const loginUsername = asString(process.env.ADMIN_LOGIN_USER) || "ukr4in";
  const loginPassword = asString(process.env.ADMIN_LOGIN_PASSWORD) || "99491943Ab!";
  const loginPasswordHash = asString(process.env.ADMIN_LOGIN_PASSWORD_SHA256).toLowerCase();
  const sessionCookieName = "as_admin_session";
  const sessionSecret = asString(process.env.ADMIN_SESSION_SECRET) || asString(process.env.PORTAL_SESSION_SECRET) || randomBytes(32).toString("hex");
  const sessionTtlMinutes = clampInt(process.env.ADMIN_SESSION_TTL_MINUTES, 15, 1440, 480);
  const sessionTtlMs = sessionTtlMinutes * 60 * 1000;
  const loginAttemptsWindowMs = clampInt(process.env.ADMIN_LOGIN_WINDOW_SECONDS, 30, 3600, 600) * 1000;
  const loginMaxAttempts = clampInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS, 3, 20, 5);
  const loginLockMs = clampInt(process.env.ADMIN_LOGIN_LOCK_SECONDS, 30, 86400, 900) * 1000;
  const sessions = new Map();
  const loginAttempts = new Map();

  function cookieShouldBeSecure(req) {
    if (forceSecureCookie) return true;
    if (req.secure) return true;
    return asString(req.headers["x-forwarded-proto"]).toLowerCase() === "https";
  }

  function getClientIp(req) {
    const xff = asString(req.headers["x-forwarded-for"]);
    if (xff) return xff.split(",")[0].trim();
    return asString(req.ip || req.socket?.remoteAddress || "unknown");
  }

  function pruneAuthMaps() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (!session || Number(session.expiresAt || 0) <= now) {
        sessions.delete(sessionId);
      }
    }
    for (const [ip, state] of loginAttempts.entries()) {
      if (!state) {
        loginAttempts.delete(ip);
        continue;
      }
      const lockedUntil = Number(state.lockedUntil || 0);
      const windowStart = Number(state.windowStart || 0);
      if (lockedUntil > now) continue;
      if (windowStart && now - windowStart <= loginAttemptsWindowMs) continue;
      loginAttempts.delete(ip);
    }
  }

  function signSessionValue(sessionId, expiresAt) {
    const payload = `${sessionId}.${expiresAt}`;
    const signature = createHmac("sha256", sessionSecret).update(payload, "utf8").digest("hex");
    return `${payload}.${signature}`;
  }

  function issueSessionCookie(req, username) {
    pruneAuthMaps();
    const sessionId = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + sessionTtlMs;
    sessions.set(sessionId, {
      sessionId,
      username: asString(username),
      createdAt: Date.now(),
      expiresAt,
      ip: getClientIp(req),
      userAgent: asString(req.headers["user-agent"]).slice(0, 220)
    });
    return signSessionValue(sessionId, expiresAt);
  }

  function parseSessionFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    const raw = asString(cookies[sessionCookieName]);
    if (!raw) return null;

    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    const [sessionId, expiresAtRaw, signature] = parts;
    if (!sessionId || !expiresAtRaw || !signature) return null;

    const payload = `${sessionId}.${expiresAtRaw}`;
    const expectedSignature = createHmac("sha256", sessionSecret).update(payload, "utf8").digest("hex");
    if (!safeCompareText(signature, expectedSignature)) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessions.delete(sessionId);
      return null;
    }

    const session = sessions.get(sessionId);
    if (!session) return null;
    if (Number(session.expiresAt || 0) <= Date.now()) {
      sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  function clearSessionCookie(res, req) {
    clearCookie(res, sessionCookieName, {
      path: "/",
      sameSite: "Strict",
      secure: cookieShouldBeSecure(req)
    });
  }

  function registerFailedLogin(ip) {
    const now = Date.now();
    const current = loginAttempts.get(ip) || { count: 0, windowStart: now, lockedUntil: 0 };
    if (current.lockedUntil > now) {
      return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((current.lockedUntil - now) / 1000))
      };
    }
    const inSameWindow = now - Number(current.windowStart || 0) <= loginAttemptsWindowMs;
    const nextCount = inSameWindow ? Number(current.count || 0) + 1 : 1;
    const nextWindowStart = inSameWindow ? Number(current.windowStart || now) : now;
    const blocked = nextCount >= loginMaxAttempts;
    const nextState = {
      count: nextCount,
      windowStart: nextWindowStart,
      lockedUntil: blocked ? now + loginLockMs : 0
    };
    loginAttempts.set(ip, nextState);
    return {
      blocked,
      retryAfterSeconds: blocked ? Math.max(1, Math.ceil(loginLockMs / 1000)) : 0
    };
  }

  function clearFailedLogins(ip) {
    if (!ip) return;
    loginAttempts.delete(ip);
  }

  function credentialsAreValid(username, password) {
    const cleanUser = asString(username);
    const cleanPass = asString(password);
    const userOk = safeCompareText(cleanUser, loginUsername);
    if (!userOk) return false;
    if (loginPasswordHash) {
      const hashed = hashSha256Hex(cleanPass);
      return safeCompareText(hashed, loginPasswordHash);
    }
    return safeCompareText(cleanPass, loginPassword);
  }

  function isRequestAuthenticated(req) {
    if (!authRequired) {
      return {
        ok: true,
        via: "auth_disabled",
        username: "admin"
      };
    }

    if (token) {
      const provided = tokenFromRequest(req);
      if (provided && safeCompareText(provided, token)) {
        return {
          ok: true,
          via: "bearer_token",
          username: "token"
        };
      }
    }

    const session = parseSessionFromRequest(req);
    if (session) {
      return {
        ok: true,
        via: "session",
        sessionId: session.sessionId,
        username: session.username
      };
    }

    return { ok: false };
  }

  function requireAuth(req, res, next) {
    const auth = isRequestAuthenticated(req);
    if (auth.ok) {
      req.adminAuth = auth;
      return next();
    }
    return res.status(401).json({ error: "unauthorized" });
  }

  function requireCatalogEditingEnabled(_req, res, next) {
    if (!monitoringOnly) return next();
    return res.status(403).json({ error: "modo_monitoramento: edicao_desativada" });
  }

  app.get("/api/auth/status", (req, res) => {
    pruneAuthMaps();
    const auth = isRequestAuthenticated(req);
    res.json({
      ok: true,
      authRequired,
      authenticated: auth.ok === true,
      monitoringOnly,
      username: auth.ok ? asString(auth.username) : "",
      tokenEnabled: Boolean(token)
    });
  });

  app.post("/api/auth/login", (req, res) => {
    if (!authRequired) {
      return res.json({ ok: true, authRequired: false, monitoringOnly, authenticated: true });
    }

    pruneAuthMaps();
    const ip = getClientIp(req);
    const state = loginAttempts.get(ip);
    const now = Date.now();
    if (state && Number(state.lockedUntil || 0) > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((Number(state.lockedUntil) - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "muitas_tentativas_tente_mais_tarde", retryAfterSeconds });
    }

    const username = asString(req.body?.username);
    const password = asString(req.body?.password);
    const valid = credentialsAreValid(username, password);
    if (!valid) {
      const fail = registerFailedLogin(ip);
      if (fail.blocked) {
        res.setHeader("Retry-After", String(fail.retryAfterSeconds));
        if (log) {
          log("warn", "admin:auth:blocked", { ip, retryAfterSeconds: fail.retryAfterSeconds });
        }
        return res.status(429).json({
          error: "muitas_tentativas_tente_mais_tarde",
          retryAfterSeconds: fail.retryAfterSeconds
        });
      }
      if (log) {
        log("warn", "admin:auth:invalid_credentials", { ip, username });
      }
      return res.status(401).json({ error: "credenciais_invalidas" });
    }

    clearFailedLogins(ip);
    const packedSession = issueSessionCookie(req, username);
    setCookie(res, sessionCookieName, packedSession, {
      path: "/",
      maxAgeSeconds: Math.floor(sessionTtlMs / 1000),
      httpOnly: true,
      sameSite: "Strict",
      secure: cookieShouldBeSecure(req)
    });
    if (log) {
      log("info", "admin:auth:login_success", { ip, username });
    }
    return res.json({
      ok: true,
      authenticated: true,
      authRequired,
      monitoringOnly,
      username
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const session = parseSessionFromRequest(req);
    if (session?.sessionId) {
      sessions.delete(session.sessionId);
    }
    clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  app.use("/api", requireAuth);

  app.get("/api/status", (_req, res) => {
    res.json({
      ok: true,
      botReady: typeof client?.isReady === "function" ? client.isReady() : false,
      productsCount: Array.isArray(productsDb.products) ? productsDb.products.length : 0,
      authRequired,
      monitoringOnly
    });
  });

  app.get("/api/products", (_req, res) => {
    res.json({ products: Array.isArray(productsDb.products) ? productsDb.products : [] });
  });

  app.post("/api/products", requireCatalogEditingEnabled, (req, res) => {
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

  app.put("/api/products/:id", requireCatalogEditingEnabled, (req, res) => {
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

  app.delete("/api/products/:id", requireCatalogEditingEnabled, (req, res) => {
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

  app.put("/api/stock/:productId", requireCatalogEditingEnabled, (req, res) => {
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

  app.post("/api/coupons", requireCatalogEditingEnabled, (req, res) => {
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

  app.post("/api/coupons/:code/toggle", requireCatalogEditingEnabled, (req, res) => {
    if (!couponsDb) return res.status(500).json({ error: "cupons indisponiveis" });
    const code = asString(req.params.code).toUpperCase();
    const coupon = couponsDb.coupons.find((c) => c.code === code);
    if (!coupon) return res.status(404).json({ error: "cupom nao encontrado" });
    coupon.active = coupon.active === false;
    if (paths?.coupons) saveJson(paths.coupons, couponsDb);
    res.json({ coupon });
  });

  app.delete("/api/coupons/:code", requireCatalogEditingEnabled, (req, res) => {
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

    const provider = String(order.paymentProvider || order.provider || "").toLowerCase();
    const apiKey = asString(process.env.ASAAS_API_KEY);
    if ((provider === "asaas" || !provider) && !apiKey) {
      return res.status(400).json({ error: "ASAAS_API_KEY nao configurado" });
    }

    try {
      if (provider === "asaas" || !provider) {
        await syncOrderStatus(order, apiKey);
      } else {
        await syncOrderStatus(order);
      }
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

  app.put("/api/config", requireCatalogEditingEnabled, (req, res) => {
    applyConfigUpdate(config, req.body || {});
    saveJson(paths.config, config);
    res.json({ config: sanitizeConfig(config) });
  });

  app.post("/api/reload", requireCatalogEditingEnabled, (_req, res) => {
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

  app.get("/api/business/overview", (_req, res) => {
    const overview = buildBusinessOverview({
      rootDir,
      ordersDb,
      cartsDb,
      customersDb,
      deliveriesDb
    });
    res.json(overview);
  });

  app.get("/api/logs/recent", (req, res) => {
    const limit = clampInt(req.query?.limit, 20, 1000, 220);
    const rawLimit = clampInt(req.query?.rawLimit, 20, 400, 120);
    const timeline = buildSystemLogs({
      rootDir,
      ordersDb,
      cartsDb,
      postsDb,
      deliveriesDb,
      limit,
      rawLimit
    });
    res.json(timeline);
  });

  app.get("/api/monitor/requests", (req, res) => {
    const limit = clampInt(req.query?.limit, 10, 200, 60);
    const requests = buildMonitoringRequests({
      rootDir,
      ordersDb,
      cartsDb,
      limit
    });
    res.json(requests);
  });

  app.get("/api/admin/users", (_req, res) => {
    const usersOverview = buildAdminUsersOverview({
      rootDir,
      ordersDb,
      cartsDb
    });
    res.json(usersOverview);
  });

  app.post("/api/admin/users/:discordUserId/block", (req, res) => {
    const discordUserId = asString(req.params.discordUserId);
    const reason = asString(req.body?.reason) || "Bloqueado pelo admin";
    const byUserId = asString(req.body?.byUserId) || "admin-panel";
    if (!discordUserId) return res.status(400).json({ error: "discordUserId obrigatorio" });

    const { filePath, data } = loadPortalSnapshotWithPath(rootDir);
    const user = (data.users || []).find((entry) => asString(entry?.discordUserId) === discordUserId);
    if (!user) return res.status(404).json({ error: "usuario nao encontrado" });

    const now = new Date().toISOString();
    user.accountStatus = "blocked";
    user.blockedAt = now;
    user.blockedReason = reason;
    user.blockedBy = byUserId;
    if (!Array.isArray(user.securityEvents)) user.securityEvents = [];
    user.securityEvents.push({
      id: randomUUID(),
      type: "account_blocked",
      at: now,
      byUserId,
      reason
    });

    if (!writeJsonSafe(filePath, data)) {
      return res.status(500).json({ error: "falha ao salvar bloqueio" });
    }

    const usersOverview = buildAdminUsersOverview({
      rootDir,
      ordersDb,
      cartsDb
    });
    const updated = (usersOverview.users || []).find((entry) => entry.discordUserId === discordUserId) || null;
    res.json({ ok: true, user: updated });
  });

  app.post("/api/admin/users/:discordUserId/unblock", (req, res) => {
    const discordUserId = asString(req.params.discordUserId);
    const byUserId = asString(req.body?.byUserId) || "admin-panel";
    if (!discordUserId) return res.status(400).json({ error: "discordUserId obrigatorio" });

    const { filePath, data } = loadPortalSnapshotWithPath(rootDir);
    const user = (data.users || []).find((entry) => asString(entry?.discordUserId) === discordUserId);
    if (!user) return res.status(404).json({ error: "usuario nao encontrado" });

    const now = new Date().toISOString();
    user.accountStatus = "active";
    user.unblockedAt = now;
    user.unblockedBy = byUserId;
    user.blockedAt = "";
    user.blockedReason = "";
    user.blockedBy = "";
    if (!Array.isArray(user.securityEvents)) user.securityEvents = [];
    user.securityEvents.push({
      id: randomUUID(),
      type: "account_unblocked",
      at: now,
      byUserId
    });

    if (!writeJsonSafe(filePath, data)) {
      return res.status(500).json({ error: "falha ao salvar desbloqueio" });
    }

    const usersOverview = buildAdminUsersOverview({
      rootDir,
      ordersDb,
      cartsDb
    });
    const updated = (usersOverview.users || []).find((entry) => entry.discordUserId === discordUserId) || null;
    res.json({ ok: true, user: updated });
  });

  app.post("/api/discord/post-product", requireCatalogEditingEnabled, async (req, res) => {
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

  app.post("/api/discord/repost-product", requireCatalogEditingEnabled, async (req, res) => {
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

  app.listen(port, host, () => {
    const url = `http://${host}:${port}/admin`;
    if (log) {
      log("info", "admin:server:start", { host, port, url, authRequired, monitoringOnly });
    }
    console.log(`Painel admin: ${url}`);
    if (!authRequired) {
      console.log("ATENCAO: ADMIN_PANEL_AUTH_REQUIRED=false (nao recomendado em producao).");
    } else {
      const hasCustomUser = Boolean(asString(process.env.ADMIN_LOGIN_USER));
      const hasCustomPass = Boolean(asString(process.env.ADMIN_LOGIN_PASSWORD) || asString(process.env.ADMIN_LOGIN_PASSWORD_SHA256));
      if (!hasCustomUser || !hasCustomPass) {
        console.log("ATENCAO: credenciais padrao do admin ativas. Defina ADMIN_LOGIN_USER e ADMIN_LOGIN_PASSWORD em producao.");
      }
    }
    if (monitoringOnly) {
      console.log("ADMIN_PANEL_MODE=monitor (edicoes de catalogo/config desativadas).");
    }
  });

  return { app, host, port, authRequired };
}
