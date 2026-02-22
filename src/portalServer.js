import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import { ChannelType, PermissionsBitField } from "discord.js";
import { createPortalStore } from "./portal/store.js";

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
    variants: normalizeVariants(input?.variants),
    // Extra flags supported by the runtime (optional)
    infiniteStock: toBool(input?.infiniteStock),
    stockMode: asString(input?.stockMode)
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
  const normalizeBucket = (value, globalSeen) => {
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
    const list = normalizeBucket(input, new Set());
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
    output[stockKey] = normalizeBucket(input[stockKey], seenAcrossBuckets);
  }

  if (!allowed) {
    for (const [key, value] of Object.entries(input)) {
      const stockKey = asString(key);
      if (!stockKey || output[stockKey] !== undefined || !canUseKey(stockKey)) continue;
      output[stockKey] = normalizeBucket(value, seenAcrossBuckets);
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

function normalizeDiscordId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Accept "123", "<#123>", "#123" etc.
  return raw.replace(/[<#>]/g, "").replace(/^#/, "").trim();
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

function writeJsonFileAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function json(obj) {
  return obj && typeof obj === "object" ? obj : {};
}

function parseCookies(header) {
  const out = {};
  const raw = asString(header);
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function base64UrlEncode(data) {
  return Buffer.from(data).toString("base64url");
}

function base64UrlDecode(data) {
  return Buffer.from(String(data || ""), "base64url").toString("utf8");
}

function hmacSha256Hex(secret, message) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function timingSafeEqualsHex(a, b) {
  const aa = Buffer.from(String(a || ""), "hex");
  const bb = Buffer.from(String(b || ""), "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function encryptJson(secret, payload) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload || {}), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), ciphertext.toString("base64url"), tag.toString("base64url")].join(".");
}

function decryptJson(secret, packed) {
  const parts = String(packed || "").split(".");
  if (parts.length !== 3) return null;
  const [ivB64, ctB64, tagB64] = parts;
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = Buffer.from(ivB64, "base64url");
  const ciphertext = Buffer.from(ctB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

function formatBRL(cents) {
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function addHoursIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addDaysIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeEmail(value) {
  return asString(value).toLowerCase().trim();
}

function isValidEmail(email) {
  const value = normalizeEmail(email);
  if (!value || value.length > 160) return false;
  if (!value.includes("@")) return false;
  // Minimal sanity check (avoid over-validating).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password || ""), salt, 64);
  return {
    salt: salt.toString("base64url"),
    hash: hash.toString("base64url")
  };
}

function verifyPassword(password, stored) {
  try {
    const salt = Buffer.from(asString(stored?.salt), "base64url");
    const expected = Buffer.from(asString(stored?.hash), "base64url");
    if (!salt.length || !expected.length) return false;
    const computed = crypto.scryptSync(String(password || ""), salt, expected.length);
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

function isPlanActive(plan) {
  if (!plan || typeof plan !== "object") return false;
  if (asString(plan.status).toLowerCase() !== "active") return false;
  const expiresAt = asString(plan.expiresAt).trim();
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now();
}

function getPlanCatalog() {
  return {
    start_monthly: {
      id: "start_monthly",
      title: "Plano Start (AstraSystems)",
      amountCents: 597,
      tier: "start",
      durationDays: 30,
      recommended: true,
      features: [
        "Sistema de vendas completo",
        "Dashboard e carteira",
        "1 bot por assinatura",
        "Automacao e onboarding"
      ]
    }
  };
}

function getMaxInstancesForTier(tier) {
  const value = asString(tier).toLowerCase();
  if (value === "start") return 1;
  if (value === "trial") return 1;
  return 0;
}

function getMaxInstancesForPlan(plan) {
  if (!isPlanActive(plan)) return 0;
  return getMaxInstancesForTier(plan?.tier);
}

function addDaysFromTimestampIso(timestampMs, days) {
  const d = Math.max(0, Math.floor(Number(days || 0)));
  return new Date(Number(timestampMs) + d * 24 * 60 * 60 * 1000).toISOString();
}

function extendPlanExpiry(currentPlan, durationDays) {
  const now = Date.now();
  const current = Date.parse(asString(currentPlan?.expiresAt));
  const base = Number.isFinite(current) && current > now ? current : now;
  return addDaysFromTimestampIso(base, durationDays);
}

function getInvitePermissions() {
  const perms = new PermissionsBitField([
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageMessages
  ]);
  return perms.bitfield.toString();
}

function buildDiscordOauthAuthorizeUrl(params) {
  const base = "https://discord.com/oauth2/authorize";
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: params.scopes.join(" ")
  });
  if (params.state) q.set("state", params.state);
  if (params.prompt) q.set("prompt", params.prompt);
  return `${base}?${q.toString()}`;
}

async function discordTokenExchange({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const { data } = await axios.post("https://discord.com/api/oauth2/token", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return data;
}

async function discordTokenRefresh({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const { data } = await axios.post("https://discord.com/api/oauth2/token", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return data;
}

async function discordApiGet(url, accessToken) {
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
}

async function discordBotApiGet(url, botToken) {
  const token = asString(botToken);
  if (!token) throw new Error("bot_token_missing");
  const { data } = await axios.get(url, { headers: { Authorization: `Bot ${token}` } });
  return data;
}

async function validateDiscordBotToken(botToken) {
  const token = asString(botToken);
  if (!token || token.length < 30) throw new Error("bot_token_invalido");

  let me = null;
  try {
    me = await discordBotApiGet("https://discord.com/api/users/@me", token);
  } catch {
    throw new Error("bot_token_invalido");
  }
  if (!me?.id || !me?.username || me?.bot !== true) {
    throw new Error("bot_token_invalido");
  }

  let app = null;
  try {
    app = await discordBotApiGet("https://discord.com/api/oauth2/applications/@me", token);
  } catch {
    app = null;
  }

  const applicationId = asString(app?.id || me?.id);
  if (!applicationId) throw new Error("bot_token_invalido");

  return {
    applicationId,
    botUserId: asString(me.id),
    username: asString(me.username),
    discriminator: asString(me.discriminator),
    avatar: asString(me.avatar),
    avatarUrl: getDiscordAvatarUrl(me.id, me.avatar),
    verified: app?.bot_public !== undefined ? app.bot_public !== false : true
  };
}

function getDiscordAvatarUrl(discordUserId, avatarHash) {
  if (!discordUserId || !avatarHash) return "";
  const ext = String(avatarHash).startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.${ext}?size=128`;
}

function isLikelyDiscordBotToken(token) {
  const raw = asString(token);
  if (!raw || raw.length < 50) return false;
  // Discord bot tokens are usually 3 dot-separated chunks.
  return raw.split(".").length >= 3;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getMercadoPagoAccessToken() {
  const token = asString(process.env.MERCADOPAGO_ACCESS_TOKEN);
  return token;
}

async function mpRequestWithToken(method, pathName, payload, token, extraHeaders = {}) {
  const tok = asString(token);
  if (!tok) throw new Error("mercadopago_not_configured");
  const url = `https://api.mercadopago.com${pathName}`;
  const { data } = await axios({
    method,
    url,
    data: payload,
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
  return data;
}

async function mpRequest(method, pathName, payload) {
  const token = getMercadoPagoAccessToken();
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN nao configurado");
  }
  return mpRequestWithToken(method, pathName, payload, token);
}

function verifyMercadoPagoSignature(req, secret) {
  const sigHeader = asString(req.headers["x-signature"]);
  const reqId = asString(req.headers["x-request-id"]);
  if (!sigHeader || !reqId) return false;

  const parts = Object.fromEntries(
    sigHeader
      .split(",")
      .map((chunk) => chunk.trim())
      .map((chunk) => {
        const idx = chunk.indexOf("=");
        if (idx <= 0) return [chunk, ""];
        return [chunk.slice(0, idx), chunk.slice(idx + 1)];
      })
  );

  const ts = asString(parts.ts);
  const v1 = asString(parts.v1);

  const dataId =
    asString(req.query?.["data.id"]) ||
    asString(req.query?.id) ||
    asString(req.body?.data?.id) ||
    asString(req.body?.id);

  if (!ts || !v1 || !dataId) return false;

  // Mercado Pago manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${reqId};ts:${ts};`;
  const expected = hmacSha256Hex(secret, manifest);
  return timingSafeEqualsHex(expected, v1);
}

function computeBaseUrl(host, port) {
  const env = asString(process.env.PORTAL_BASE_URL);
  if (env) return env;
  const effectiveHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${effectiveHost}:${port}`;
}

export function startPortalServer(options = {}) {
  const rootDir = asString(options.rootDir) || process.cwd();
  const log = typeof options.log === "function" ? options.log : null;
  const logError = typeof options.logError === "function" ? options.logError : null;
  const discordClient = options.client || null;
  const postProductToChannel = typeof options.postProductToChannel === "function" ? options.postProductToChannel : null;
  const purgeChannelMessages = typeof options.purgeChannelMessages === "function" ? options.purgeChannelMessages : null;

  const host = asString(process.env.PORTAL_HOST) || "127.0.0.1";
  const port = Number(process.env.PORTAL_PORT || 3100);

  const sessionSecret = asString(process.env.PORTAL_SESSION_SECRET);
  if (!sessionSecret) {
    console.log("PORTAL_SESSION_SECRET nao configurado. Portal desativado por seguranca.");
    return { app: null, host, port, enabled: false };
  }

  const oauthClientId = asString(process.env.DISCORD_OAUTH_CLIENT_ID);
  const oauthClientSecret = asString(process.env.DISCORD_OAUTH_CLIENT_SECRET);
  const oauthRedirectUri = asString(process.env.DISCORD_OAUTH_REDIRECT_URI);

  const oauthEnabled = Boolean(oauthClientId && oauthClientSecret && oauthRedirectUri);

  const baseUrl = computeBaseUrl(host, port);

  const portalFile = path.join(rootDir, "data", "portal.json");
  const store = options.store || createPortalStore({ filePath: portalFile, log });
  const instancesDir = path.join(rootDir, "data", "instances");
  const instanceDockerEnabled = !["0", "false", "off", "no"].includes(
    asString(process.env.INSTANCE_DOCKER_ENABLED || "true").toLowerCase()
  );
  const instanceBotImage = asString(process.env.INSTANCE_BOT_IMAGE || "botdc-bot:latest").trim();
  const monitorIntervalMs = Math.max(10_000, Number(process.env.INSTANCE_MONITOR_INTERVAL_MS || 30_000) || 30_000);
  const crashThreshold = Math.max(2, Number(process.env.INSTANCE_CRASH_THRESHOLD || 3) || 3);

  function sanitizeContainerSegment(value, fallback = "bot") {
    const raw = asString(value)
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, "_")
      .replace(/^[_\-.]+|[_\-.]+$/g, "");
    return raw || fallback;
  }

  function getInstanceContainerName(instance) {
    const owner = sanitizeContainerSegment(instance?.ownerDiscordUserId, "owner");
    const instId = sanitizeContainerSegment(instance?.id, "inst");
    return `bot_${owner}_${instId}`;
  }

  function getInstanceBotToken(instance) {
    const packed = asString(instance?.botToken?.packed);
    if (!packed) return "";
    try {
      const payload = decryptJson(sessionSecret, packed);
      return asString(payload?.token).trim();
    } catch {
      return "";
    }
  }

  function instanceTokenMatchesHash(instance, tokenHash) {
    const wanted = asString(tokenHash);
    if (!wanted) return false;
    const cachedHash = asString(instance?.botTokenHash);
    if (cachedHash && cachedHash === wanted) return true;
    const token = getInstanceBotToken(instance);
    if (!token) return false;
    return hashToken(token) === wanted;
  }

  function getInstanceRuntime(instance) {
    const source = instance && typeof instance === "object" ? instance : {};
    if (!source.runtime || typeof source.runtime !== "object") source.runtime = {};
    const runtime = source.runtime;
    const hasToken = Boolean(asString(source?.botToken?.packed));
    if (!asString(runtime.status)) runtime.status = hasToken ? "configurado" : "nao_configurado";
    if (!asString(runtime.containerName)) runtime.containerName = getInstanceContainerName(source);
    if (!runtime.updatedAt) runtime.updatedAt = nowIso();
    return runtime;
  }

  function fallbackRuntimeStatus(instance) {
    return asString(instance?.botToken?.packed) ? "configurado" : "nao_configurado";
  }

  function isDockerObjectMissing(stderr, stdout = "") {
    const msg = `${asString(stderr)} ${asString(stdout)}`.toLowerCase();
    return msg.includes("no such container") || msg.includes("no such object") || msg.includes("not found");
  }

  function normalizeDockerError(err, fallback = "docker_error") {
    const code = asString(err?.code);
    const stderr = asString(err?.stderr || err?.message);
    const full = `${code} ${stderr}`.toLowerCase();
    if (code === "ENOENT" || full.includes("docker is not recognized")) return "docker_unavailable";
    if (full.includes("cannot connect to the docker daemon")) return "docker_unavailable";
    if (full.includes("permission denied")) return "docker_permission_denied";
    if (full.includes("pull access denied") || full.includes("unable to find image")) return "docker_image_missing";
    return fallback;
  }

  async function dockerExec(args, options = {}) {
    if (!instanceDockerEnabled) {
      const err = new Error("docker_disabled");
      err.code = "docker_disabled";
      throw err;
    }
    const timeoutMs = Math.max(3_000, Number(options.timeoutMs || 30_000));
    const env = options.env || process.env;
    return await new Promise((resolve, reject) => {
      execFile(
        "docker",
        args,
        { timeout: timeoutMs, windowsHide: true, maxBuffer: 2 * 1024 * 1024, env },
        (err, stdout, stderr) => {
          if (err) {
            err.stdout = stdout;
            err.stderr = stderr;
            return reject(err);
          }
          resolve({ stdout: asString(stdout), stderr: asString(stderr) });
        }
      );
    });
  }

  async function dockerInspectContainer(name) {
    try {
      const { stdout } = await dockerExec(["inspect", name, "--format", "{{json .}}"], { timeoutMs: 20_000 });
      if (!stdout) return null;
      return JSON.parse(stdout);
    } catch (err) {
      if (isDockerObjectMissing(err?.stderr, err?.stdout)) return null;
      const code = normalizeDockerError(err);
      const wrapped = new Error(code);
      wrapped.code = code;
      throw wrapped;
    }
  }

  async function dockerRemoveContainer(name) {
    try {
      await dockerExec(["rm", "-f", name], { timeoutMs: 25_000 });
      return true;
    } catch (err) {
      if (isDockerObjectMissing(err?.stderr, err?.stdout)) return false;
      const code = normalizeDockerError(err);
      const wrapped = new Error(code);
      wrapped.code = code;
      throw wrapped;
    }
  }

  async function dockerStopContainer(name) {
    try {
      await dockerExec(["stop", name], { timeoutMs: 25_000 });
      return true;
    } catch (err) {
      if (isDockerObjectMissing(err?.stderr, err?.stdout)) return false;
      const code = normalizeDockerError(err);
      const wrapped = new Error(code);
      wrapped.code = code;
      throw wrapped;
    }
  }

  async function dockerStartInstanceContainer(instance, token) {
    const containerName = getInstanceContainerName(instance);
    await dockerRemoveContainer(containerName);
    try {
      await dockerExec(
        [
          "run",
          "-d",
          "--name",
          containerName,
          "--restart",
          "unless-stopped",
          "-e",
          "DISCORD_TOKEN",
          "-e",
          "LOG_LEVEL",
          "-e",
          "LICENSE_MODE=off",
          "-e",
          "PORTAL_SESSION_SECRET=",
          instanceBotImage
        ],
        {
          timeoutMs: 60_000,
          env: {
            ...process.env,
            DISCORD_TOKEN: String(token || ""),
            LOG_LEVEL: "warn"
          }
        }
      );
    } catch (err) {
      const code = normalizeDockerError(err);
      const wrapped = new Error(code);
      wrapped.code = code;
      throw wrapped;
    }
    return containerName;
  }

  async function refreshInstanceRuntime(instance, owner, options = {}) {
    const runtime = getInstanceRuntime(instance);
    const allowSuspendActions = options.allowSuspendActions !== false;
    const hasToken = Boolean(asString(instance?.botToken?.packed));
    const planActive = isPlanActive(owner?.plan);
    const containerName = asString(runtime.containerName) || getInstanceContainerName(instance);
    runtime.containerName = containerName;

    if (!planActive) {
      runtime.status = "suspenso";
      runtime.lastError = "plano_inativo";
      runtime.updatedAt = nowIso();
      if (allowSuspendActions && instanceDockerEnabled) {
        await dockerStopContainer(containerName).catch(() => null);
        await dockerRemoveContainer(containerName).catch(() => null);
      }
      return runtime;
    }

    if (!instanceDockerEnabled) {
      runtime.status = hasToken ? "configurado" : "nao_configurado";
      runtime.updatedAt = nowIso();
      return runtime;
    }

    try {
      const info = await dockerInspectContainer(containerName);
      if (!info) {
        runtime.status = hasToken ? "configurado" : "nao_configurado";
        runtime.updatedAt = nowIso();
        runtime.lastError = "";
        return runtime;
      }

      const state = info?.State && typeof info.State === "object" ? info.State : {};
      runtime.containerId = asString(info?.Id);
      runtime.containerName = asString(info?.Name).replace(/^\//, "") || containerName;
      runtime.startedAt = asString(state?.StartedAt || runtime.startedAt);
      runtime.finishedAt = asString(state?.FinishedAt || runtime.finishedAt);
      runtime.exitCode = Number.isFinite(Number(state?.ExitCode)) ? Number(state.ExitCode) : null;
      runtime.restartCount = Number.isFinite(Number(info?.RestartCount)) ? Number(info.RestartCount) : 0;
      runtime.updatedAt = nowIso();

      if (state?.Running) {
        runtime.status = "online";
        runtime.lastError = "";
      } else {
        const exitCode = Number(runtime.exitCode || 0);
        if (exitCode !== 0 && Number(runtime.restartCount || 0) >= crashThreshold) {
          runtime.status = "erro";
          runtime.lastError = `crash_repetido_exit_${exitCode}`;
        } else {
          runtime.status = "offline";
          runtime.lastError = "";
        }
      }
      return runtime;
    } catch (err) {
      runtime.status = hasToken ? "configurado" : "nao_configurado";
      runtime.lastError = asString(err?.code || err?.message || "docker_error");
      runtime.updatedAt = nowIso();
      return runtime;
    }
  }

  function toClientInstance(instance, extra = {}) {
    const source = instance && typeof instance === "object" ? instance : {};
    const botProfileRaw = source.botProfile && typeof source.botProfile === "object" ? source.botProfile : {};
    const botProfile = {
      applicationId: asString(botProfileRaw.applicationId),
      botUserId: asString(botProfileRaw.botUserId),
      username: asString(botProfileRaw.username),
      discriminator: asString(botProfileRaw.discriminator),
      avatar: asString(botProfileRaw.avatar),
      avatarUrl: asString(botProfileRaw.avatarUrl),
      verified: botProfileRaw.verified === undefined ? false : !!botProfileRaw.verified,
      updatedAt: asString(botProfileRaw.updatedAt)
    };
    const hasBotToken = Boolean(asString(source?.botToken?.packed));
    const runtimeRaw = source.runtime && typeof source.runtime === "object" ? source.runtime : {};
    const runtime = {
      status: asString(runtimeRaw.status) || (hasBotToken ? "configurado" : "nao_configurado"),
      containerName: asString(runtimeRaw.containerName),
      containerId: asString(runtimeRaw.containerId),
      startedAt: asString(runtimeRaw.startedAt),
      finishedAt: asString(runtimeRaw.finishedAt),
      stoppedAt: asString(runtimeRaw.stoppedAt),
      restartedAt: asString(runtimeRaw.restartedAt),
      suspendedAt: asString(runtimeRaw.suspendedAt),
      exitCode: Number.isFinite(Number(runtimeRaw.exitCode)) ? Number(runtimeRaw.exitCode) : null,
      restartCount: Number.isFinite(Number(runtimeRaw.restartCount)) ? Number(runtimeRaw.restartCount) : 0,
      lastError: asString(runtimeRaw.lastError),
      updatedAt: asString(runtimeRaw.updatedAt)
    };

    const {
      apiKeyHash: _apiKeyHash,
      botToken: _botToken,
      botTokenHash: _botTokenHash,
      ...safe
    } = source;

    return {
      ...safe,
      hasBotToken,
      botProfile,
      runtime,
      ...extra
    };
  }

  function ensureRunningBotMatchesInstance(instance) {
    const requiredClientId = asString(instance?.botProfile?.applicationId);
    if (!requiredClientId) return { ok: true };
    const runningClientId = asString(discordClient?.application?.id || discordClient?.user?.id);
    if (!runningClientId) return { ok: false, reason: "bot_not_ready" };
    if (runningClientId !== requiredClientId) {
      return { ok: false, reason: "instance_requires_own_bot_token", requiredClientId, runningClientId };
    }
    return { ok: true };
  }

  function instanceProductsPath(instanceId) {
    return path.join(instancesDir, instanceId, "products.json");
  }

  function instanceStockPath(instanceId) {
    return path.join(instancesDir, instanceId, "stock.json");
  }

  function loadInstanceProducts(instanceId) {
    const data = readJsonFile(instanceProductsPath(instanceId), { products: [] });
    if (!data || typeof data !== "object") return { products: [] };
    if (!Array.isArray(data.products)) data.products = [];
    return data;
  }

  function saveInstanceProducts(instanceId, data) {
    const next = data && typeof data === "object" ? data : { products: [] };
    if (!Array.isArray(next.products)) next.products = [];
    writeJsonFileAtomic(instanceProductsPath(instanceId), next);
  }

  function loadInstanceStock(instanceId) {
    const data = readJsonFile(instanceStockPath(instanceId), { stock: {} });
    if (!data || typeof data !== "object") return { stock: {} };
    if (!data.stock || typeof data.stock !== "object") data.stock = {};
    return data;
  }

  function saveInstanceStock(instanceId, data) {
    const next = data && typeof data === "object" ? data : { stock: {} };
    if (!next.stock || typeof next.stock !== "object") next.stock = {};
    writeJsonFileAtomic(instanceStockPath(instanceId), next);
  }

  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));

  function setCookie(res, name, value, opts = {}) {
    const parts = [];
    parts.push(`${name}=${encodeURIComponent(value)}`);
    parts.push(`Path=${opts.path || "/"}`);
    if (opts.httpOnly !== false) parts.push("HttpOnly");
    parts.push(`SameSite=${opts.sameSite || "Lax"}`);
    if (opts.maxAgeSeconds) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
    if (opts.secure) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }

  function clearCookie(res, name) {
    res.setHeader("Set-Cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  }

  function issueSession(discordUserId) {
    const payload = { uid: String(discordUserId), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
    const body = base64UrlEncode(JSON.stringify(payload));
    const sig = hmacSha256Hex(sessionSecret, body);
    return `${body}.${sig}`;
  }

  function verifySession(token) {
    const raw = asString(token);
    const idx = raw.lastIndexOf(".");
    if (idx <= 0) return null;
    const body = raw.slice(0, idx);
    const sig = raw.slice(idx + 1);
    const expected = hmacSha256Hex(sessionSecret, body);
    if (!timingSafeEqualsHex(expected, sig)) return null;
    let decoded = null;
    try {
      decoded = JSON.parse(base64UrlDecode(body));
    } catch {
      return null;
    }
    if (!decoded?.uid || !decoded?.exp) return null;
    if (Date.now() > Number(decoded.exp)) return null;
    return { discordUserId: String(decoded.uid) };
  }

  async function requireUser(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySession(cookies.nm_session);
    if (!session) return res.status(401).json({ error: "unauthorized" });

    const data = store.load();
    const user = store.getUserByDiscordId(data, session.discordUserId);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    req.portalUser = user;
    req.portalData = data;
    next();
  }

  async function getDiscordAccessToken(user) {
    const packed = user?.discordToken?.packed;
    if (!packed) return null;
    const tokenData = decryptJson(sessionSecret, packed);
    if (!tokenData) return null;

    const expiresAt = Number(tokenData.expiresAt || 0);
    if (expiresAt && Date.now() + 30_000 < expiresAt) {
      return tokenData.access_token;
    }

    const refreshed = await discordTokenRefresh({
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
      refreshToken: tokenData.refresh_token
    });

    const next = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || tokenData.refresh_token,
      expiresAt: Date.now() + Number(refreshed.expires_in || 0) * 1000
    };

    await store.runExclusive(async () => {
      const data = store.load();
      const found = store.getUserByDiscordId(data, user.discordUserId);
      if (!found) return;
      found.discordToken = { packed: encryptJson(sessionSecret, next) };
      store.save(data);
    });

    return next.access_token;
  }

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/auth/discord", (req, res) => {
    if (!oauthEnabled) {
      return res.redirect("/login?error=oauth_config");
    }
    const state = crypto.randomBytes(18).toString("hex");
    setCookie(res, "nm_oauth_state", state, {
      maxAgeSeconds: 10 * 60,
      secure: req.secure
    });

    const redirect = buildDiscordOauthAuthorizeUrl({
      clientId: oauthClientId,
      redirectUri: oauthRedirectUri,
      scopes: ["identify", "email", "guilds"],
      state
    });
    res.redirect(redirect);
  });

  app.get("/auth/discord/callback", async (req, res) => {
    if (!oauthEnabled) {
      return res.redirect("/login?error=oauth_config");
    }
    const code = asString(req.query.code);
    const state = asString(req.query.state);
    const cookies = parseCookies(req.headers.cookie);
    const expectedState = asString(cookies.nm_oauth_state);

    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect("/login?error=oauth_state");
    }

    clearCookie(res, "nm_oauth_state");

    try {
      const token = await discordTokenExchange({
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        redirectUri: oauthRedirectUri,
        code
      });

      const me = await discordApiGet("https://discord.com/api/users/@me", token.access_token);
      const packed = encryptJson(sessionSecret, {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiresAt: Date.now() + Number(token.expires_in || 0) * 1000
      });

      await store.runExclusive(async () => {
        const data = store.load();
        store.ensureUser(data, {
          discordUserId: String(me.id),
          discordUsername: String(me.username),
          discordAvatar: String(me.avatar || ""),
          email: String(me.email || ""),
          discordToken: { packed }
        });
        store.save(data);
      });

      const session = issueSession(me.id);
      setCookie(res, "nm_session", session, {
        maxAgeSeconds: 7 * 24 * 60 * 60,
        secure: req.secure
      });

      res.redirect("/dashboard");
    } catch (err) {
      if (logError) logError("portal:oauth", err);
      res.redirect("/login?error=oauth_failed");
    }
  });

  app.post("/auth/local/register", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = asString(req.body?.password);
    const username = asString(req.body?.username);

    if (!email) return res.status(400).json({ error: "email obrigatorio" });
    if (!isValidEmail(email)) return res.status(400).json({ error: "email invalido" });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "senha deve ter no minimo 6 caracteres" });
    }

    const passwordData = hashPassword(password);
    const userId = `local_${crypto.randomUUID()}`;

    await store
      .runExclusive(async () => {
        const data = store.load();
        const exists =
          data.users.find((u) => normalizeEmail(u?.localAuth?.email || u?.email) === email) || null;
        if (exists) throw new Error("email_exists");

        const baseName = username || email.split("@")[0] || "Usuario";
        const created = store.ensureUser(data, {
          discordUserId: userId,
          discordUsername: baseName,
          discordAvatar: "",
          email
        });

        created.email = email;
        created.isLocal = true;
        created.localAuth = {
          email,
          salt: passwordData.salt,
          hash: passwordData.hash,
          createdAt: nowIso(),
          updatedAt: nowIso()
        };

        store.save(data);
      })
      .catch((err) => {
        if (String(err?.message) === "email_exists") {
          return res.status(409).json({ error: "email ja cadastrado" });
        }
        if (logError) logError("portal:localRegister", err);
        return res.status(500).json({ error: "erro interno" });
      });

    // If the handler already responded with an error, stop here.
    if (res.headersSent) return;

    const session = issueSession(userId);
    setCookie(res, "nm_session", session, {
      maxAgeSeconds: 7 * 24 * 60 * 60,
      secure: req.secure
    });

    res.json({ ok: true });
  });

  app.post("/auth/local/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = asString(req.body?.password);

    if (!email) return res.status(400).json({ error: "email obrigatorio" });
    if (!password) return res.status(400).json({ error: "senha obrigatoria" });

    const data = store.load();
    const user = data.users.find((u) => normalizeEmail(u?.localAuth?.email || u?.email) === email) || null;
    if (!user?.localAuth?.hash) return res.status(401).json({ error: "email ou senha invalidos" });

    const ok = verifyPassword(password, user.localAuth);
    if (!ok) return res.status(401).json({ error: "email ou senha invalidos" });

    const session = issueSession(user.discordUserId);
    setCookie(res, "nm_session", session, {
      maxAgeSeconds: 7 * 24 * 60 * 60,
      secure: req.secure
    });

    res.json({ ok: true });
  });

  app.post("/auth/local/change-password", requireUser, async (req, res) => {
    const currentPassword = asString(req.body?.currentPassword);
    const newPassword = asString(req.body?.newPassword);

    if (!currentPassword) return res.status(400).json({ error: "senha atual obrigatoria" });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "nova senha deve ter no minimo 6 caracteres" });
    }

    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("not_found");
        if (!user?.localAuth?.hash) throw new Error("not_local");

        const ok = verifyPassword(currentPassword, user.localAuth);
        if (!ok) throw new Error("invalid_password");

        const next = hashPassword(newPassword);
        user.localAuth = {
          email: normalizeEmail(user.localAuth.email || user.email),
          salt: next.salt,
          hash: next.hash,
          createdAt: user.localAuth.createdAt || nowIso(),
          updatedAt: nowIso()
        };
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (code === "not_local") return res.status(409).json({ error: "conta nao usa senha" });
        if (code === "invalid_password") return res.status(401).json({ error: "senha atual invalida" });
        if (logError) logError("portal:localChangePassword", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  // Demo login was removed. Keep the route to avoid "Cannot GET /auth/demo" from cached pages.
  app.get("/auth/demo", (_req, res) => res.redirect("/login"));

  app.post("/auth/logout", (req, res) => {
    clearCookie(res, "nm_session");
    res.json({ ok: true });
  });

  app.get("/api/me", requireUser, (req, res) => {
    const user = req.portalUser;
    const plan = user.plan || { tier: "free", status: "inactive", expiresAt: "" };

    const mercadoPagoConfigured = Boolean(getMercadoPagoAccessToken());
    res.json({
      ok: true,
      user: {
        discordUserId: user.discordUserId,
        discordUsername: user.discordUsername,
        discordAvatarUrl: getDiscordAvatarUrl(user.discordUserId, user.discordAvatar),
        email: user.email || "",
        walletCents: Number(user.walletCents || 0),
        walletFormatted: formatBRL(user.walletCents || 0),
        salesCentsTotal: Number(user.salesCentsTotal || 0),
        payout: {
          pixKey: asString(user?.payout?.pixKey),
          pixKeyType: asString(user?.payout?.pixKeyType)
        },
        plan,
        planActive: isPlanActive(plan),
        authProvider: user?.isLocal ? "local" : "discord",
        mercadoPagoConfigured
      }
    });
  });

  app.put("/api/me/profile", requireUser, async (req, res) => {
    const name = asString(req.body?.name).trim();
    if (!name) return res.status(400).json({ error: "nome obrigatorio" });
    if (name.length > 32) return res.status(400).json({ error: "nome muito grande (max 32)" });

    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("not_found");
        user.discordUsername = name;
        store.save(data);
      })
      .catch((err) => {
        if (String(err?.message) === "not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (logError) logError("portal:me:updateProfile", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  app.get("/api/instances", requireUser, async (req, res) => {
    const ownerId = asString(req.portalUser?.discordUserId);
    const data = store.load();
    const owner = store.getUserByDiscordId(data, ownerId);
    if (!owner) return res.status(404).json({ error: "usuario nao encontrado" });

    const ready = !!discordClient && typeof discordClient.isReady === "function" && discordClient.isReady();
    const rawList = store.listUserInstances(data, ownerId);
    const runtimeUpdates = [];

    for (const inst of rawList) {
      const before = JSON.stringify(inst.runtime || {});
      await refreshInstanceRuntime(inst, owner, { allowSuspendActions: true });
      const after = JSON.stringify(inst.runtime || {});
      if (before !== after) {
        runtimeUpdates.push({ id: asString(inst.id), runtime: inst.runtime });
      }
    }

    if (runtimeUpdates.length) {
      await store.runExclusive(async () => {
        const next = store.load();
        for (const update of runtimeUpdates) {
          const target = (next.instances || []).find((entry) => asString(entry.id) === update.id);
          if (!target) continue;
          target.runtime = update.runtime;
          target.updatedAt = nowIso();
        }
        store.save(next);
      });
    }

    const list = rawList.map((inst) => {
      const gid = asString(inst?.discordGuildId);
      const botInGuild = ready && gid ? discordClient.guilds.cache.has(gid) : false;
      return toClientInstance(inst, { botInGuild });
    });
    res.json({ ok: true, instances: list });
  });

  app.post("/api/instances", requireUser, async (req, res) => {
    const name = asString(req.body?.name).trim();
    const token = asString(req.body?.token || req.body?.botToken).trim();
    if (!name) return res.status(400).json({ error: "nome obrigatorio" });
    if (name.length > 48) return res.status(400).json({ error: "nome muito grande (max 48)" });
    if (!token) return res.status(400).json({ error: "bot_token_obrigatorio" });
    if (!isLikelyDiscordBotToken(token)) return res.status(400).json({ error: "bot_token_invalido" });

    let profile = null;
    try {
      profile = await validateDiscordBotToken(token);
    } catch (err) {
      const code = asString(err?.message);
      if (code === "bot_token_invalido" || code === "bot_token_missing") {
        return res.status(400).json({ error: "bot_token_invalido" });
      }
      if (logError) logError("portal:instances:create:validateBotToken", err);
      return res.status(500).json({ error: "falha_ao_validar_bot_token" });
    }

    const tokenHash = hashToken(token);
    const apiKey = crypto.randomBytes(24).toString("base64url");
    const now = nowIso();
    const instanceId = randomId("inst");
    const instance = {
      id: instanceId,
      ownerDiscordUserId: req.portalUser.discordUserId,
      name,
      createdAt: now,
      updatedAt: now,
      branding: {
        brandName: "AstraSystems",
        accent: "#E6212A",
        logoUrl: ""
      },
      channels: {
        logsChannelId: "",
        salesChannelId: "",
        feedbackChannelId: ""
      },
      botToken: {
        packed: encryptJson(sessionSecret, {
          token,
          updatedAt: now
        })
      },
      botTokenHash: tokenHash,
      botProfile: {
        applicationId: asString(profile.applicationId),
        botUserId: asString(profile.botUserId),
        username: asString(profile.username),
        discriminator: asString(profile.discriminator),
        avatar: asString(profile.avatar),
        avatarUrl: asString(profile.avatarUrl),
        verified: !!profile.verified,
        updatedAt: now
      },
      runtime: {
        status: "configurado",
        containerName: getInstanceContainerName({ ownerDiscordUserId: req.portalUser.discordUserId, id: instanceId }),
        containerId: "",
        startedAt: "",
        finishedAt: "",
        stoppedAt: "",
        restartedAt: "",
        suspendedAt: "",
        exitCode: null,
        restartCount: 0,
        lastError: "",
        updatedAt: now
      },
      discordGuildId: "",
      apiKeyLast4: apiKey.slice(-4),
      apiKeyHash: crypto.createHash("sha256").update(apiKey).digest("hex")
    };

    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("user_not_found");

        const maxInstances = getMaxInstancesForPlan(user.plan);
        if (maxInstances <= 0) throw new Error("plan_inactive");

        const currentCount = (data.instances || []).filter(
          (entry) => String(entry.ownerDiscordUserId) === String(req.portalUser.discordUserId)
        ).length;
        if (currentCount >= maxInstances) throw new Error("instance_limit");
        const duplicate = (data.instances || []).find((entry) => instanceTokenMatchesHash(entry, tokenHash));
        if (duplicate) throw new Error("bot_token_duplicado");

        data.instances.push(instance);
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "user_not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (code === "plan_inactive") {
          return res.status(403).json({ error: "plano inativo. Ative um plano em /plans" });
        }
        if (code === "instance_limit") {
          return res.status(409).json({ error: "limite de instancias atingido para seu plano" });
        }
        if (code === "bot_token_duplicado") return res.status(409).json({ error: "bot_token_ja_em_uso" });
        if (logError) logError("portal:instances:create", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true, instance: toClientInstance(instance), apiKey });
  });

  app.put("/api/instances/:id", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const patch = json(req.body);
    const nextGuildId = patch.discordGuildId !== undefined ? asString(patch.discordGuildId).trim() : null;

    // If the user is linking a guild, require Discord login and validate ownership (no more blind linking).
    if (nextGuildId && nextGuildId.length > 0) {
      try {
        const accessToken = await getDiscordAccessToken(req.portalUser);
        if (!accessToken) return res.status(409).json({ error: "discord_token_missing" });

        const guilds = await discordApiGet("https://discord.com/api/users/@me/guilds", accessToken);
        const manageable = (Array.isArray(guilds) ? guilds : []).filter((g) => {
          const perms = Number(g?.permissions || 0);
          return (perms & 0x20) === 0x20; // MANAGE_GUILD
        });
        const allowed = manageable.some((g) => String(g?.id) === nextGuildId);
        if (!allowed) return res.status(403).json({ error: "guild_not_manageable" });
      } catch (err) {
        if (logError) logError("portal:instances:validateGuild", err, { instanceId, nextGuildId });
        return res.status(500).json({ error: "falha ao validar servidor" });
      }
    }

    await store.runExclusive(async () => {
      const data = store.load();
      const instance = data.instances.find((i) => i.id === instanceId) || null;
      if (!instance) throw new Error("not_found");
      if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");

      if (patch.name !== undefined) instance.name = asString(patch.name) || instance.name;
      if (patch.discordGuildId !== undefined) {
        const value = asString(patch.discordGuildId).trim();
        if (value) {
          const conflict = (data.instances || []).find((it) => String(it.discordGuildId || "") === value && String(it.id) !== instanceId) || null;
          if (conflict) throw new Error("guild_in_use");
        }
        instance.discordGuildId = value;
      }
      if (patch.branding && typeof patch.branding === "object") {
        instance.branding = {
          ...instance.branding,
          brandName: asString(patch.branding.brandName) || instance.branding.brandName,
          accent: asString(patch.branding.accent) || instance.branding.accent,
          logoUrl: asString(patch.branding.logoUrl) || instance.branding.logoUrl
        };
      }
      if (patch.channels && typeof patch.channels === "object") {
        instance.channels = {
          ...(instance.channels || {}),
          logsChannelId:
            patch.channels.logsChannelId !== undefined
              ? normalizeDiscordId(patch.channels.logsChannelId)
              : asString(instance.channels?.logsChannelId),
          salesChannelId:
            patch.channels.salesChannelId !== undefined
              ? normalizeDiscordId(patch.channels.salesChannelId)
              : asString(instance.channels?.salesChannelId),
          feedbackChannelId:
            patch.channels.feedbackChannelId !== undefined
              ? normalizeDiscordId(patch.channels.feedbackChannelId)
              : asString(instance.channels?.feedbackChannelId)
        };
      }
      instance.updatedAt = nowIso();

      store.save(data);
    }).catch((err) => {
      if (String(err?.message) === "not_found") return res.status(404).json({ error: "instancia nao encontrada" });
      if (String(err?.message) === "forbidden") return res.status(403).json({ error: "forbidden" });
      if (String(err?.message) === "guild_in_use") return res.status(409).json({ error: "servidor ja vinculado em outra instancia" });
      if (logError) logError("portal:instances:update", err, { instanceId });
      return res.status(500).json({ error: "erro interno" });
    });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  app.put("/api/instances/:id/bot-token", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const token = asString(req.body?.token || req.body?.botToken).trim();
    if (!token) return res.status(400).json({ error: "bot_token_obrigatorio" });
    if (!isLikelyDiscordBotToken(token)) return res.status(400).json({ error: "bot_token_invalido" });

    let profile = null;
    try {
      profile = await validateDiscordBotToken(token);
    } catch (err) {
      const code = asString(err?.message);
      if (code === "bot_token_invalido" || code === "bot_token_missing") {
        return res.status(400).json({ error: "bot_token_invalido" });
      }
      if (logError) logError("portal:instances:validateBotToken", err, { instanceId });
      return res.status(500).json({ error: "falha_ao_validar_bot_token" });
    }

    const tokenHash = hashToken(token);
    let updatedInstance = null;
    let ownerPlanActive = false;
    await store
      .runExclusive(async () => {
        const data = store.load();
        const instance = data.instances.find((i) => i.id === instanceId) || null;
        if (!instance) throw new Error("not_found");
        if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");
        const duplicate = (data.instances || []).find(
          (entry) => String(entry.id) !== String(instanceId) && instanceTokenMatchesHash(entry, tokenHash)
        );
        if (duplicate) throw new Error("bot_token_duplicado");
        const owner = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        ownerPlanActive = isPlanActive(owner?.plan);

        const now = nowIso();
        instance.botToken = {
          packed: encryptJson(sessionSecret, {
            token,
            updatedAt: now
          })
        };
        instance.botTokenHash = tokenHash;
        instance.botProfile = {
          applicationId: asString(profile.applicationId),
          botUserId: asString(profile.botUserId),
          username: asString(profile.username),
          discriminator: asString(profile.discriminator),
          avatar: asString(profile.avatar),
          avatarUrl: asString(profile.avatarUrl),
          verified: !!profile.verified,
          updatedAt: now
        };
        const runtime = getInstanceRuntime(instance);
        runtime.status = ownerPlanActive ? "configurado" : "suspenso";
        runtime.lastError = ownerPlanActive ? "" : "plano_inativo";
        runtime.suspendedAt = ownerPlanActive ? "" : now;
        runtime.updatedAt = now;
        instance.updatedAt = now;
        updatedInstance = instance;
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "instancia nao encontrada" });
        if (code === "forbidden") return res.status(403).json({ error: "forbidden" });
        if (code === "bot_token_duplicado") return res.status(409).json({ error: "bot_token_ja_em_uso" });
        if (logError) logError("portal:instances:setBotToken", err, { instanceId });
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    let warning = "";
    const containerName = getInstanceContainerName(updatedInstance);
    if (!ownerPlanActive) {
      await dockerStopContainer(containerName).catch(() => null);
      await dockerRemoveContainer(containerName).catch(() => null);
    } else {
      try {
        await dockerStartInstanceContainer(updatedInstance, token);
      } catch (err) {
        warning = asString(err?.code || err?.message || "docker_error");
      }
    }

    await store.runExclusive(async () => {
      const data = store.load();
      const instance = data.instances.find((entry) => String(entry.id) === String(instanceId));
      const owner = store.getUserByDiscordId(data, req.portalUser.discordUserId);
      if (!instance) return;
      await refreshInstanceRuntime(instance, owner, { allowSuspendActions: true });
      instance.updatedAt = nowIso();
      store.save(data);
      updatedInstance = instance;
    });

    res.json({ ok: true, warning, instance: toClientInstance(updatedInstance) });
  });

  app.delete("/api/instances/:id/bot-token", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    let containerName = "";
    await store
      .runExclusive(async () => {
        const data = store.load();
        const instance = data.instances.find((i) => i.id === instanceId) || null;
        if (!instance) throw new Error("not_found");
        if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");
        containerName = getInstanceContainerName(instance);

        instance.botToken = { packed: "" };
        instance.botTokenHash = "";
        instance.botProfile = {
          applicationId: "",
          botUserId: "",
          username: "",
          discriminator: "",
          avatar: "",
          avatarUrl: "",
          verified: false,
          updatedAt: nowIso()
        };
        const runtime = getInstanceRuntime(instance);
        runtime.status = "nao_configurado";
        runtime.lastError = "";
        runtime.containerName = containerName;
        runtime.containerId = "";
        runtime.stoppedAt = nowIso();
        runtime.updatedAt = nowIso();
        instance.updatedAt = nowIso();
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "instancia nao encontrada" });
        if (code === "forbidden") return res.status(403).json({ error: "forbidden" });
        if (logError) logError("portal:instances:clearBotToken", err, { instanceId });
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    await dockerStopContainer(containerName).catch(() => null);
    await dockerRemoveContainer(containerName).catch(() => null);
    res.json({ ok: true });
  });

  app.post("/api/instances/:id/bot/start", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = store.load();
    const instance = (data.instances || []).find((entry) => String(entry.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });

    const owner = store.getUserByDiscordId(data, req.portalUser.discordUserId);
    if (!isPlanActive(owner?.plan)) {
      await refreshInstanceRuntime(instance, owner, { allowSuspendActions: true });
      await store.runExclusive(async () => {
        const next = store.load();
        const target = (next.instances || []).find((entry) => String(entry.id) === instanceId);
        if (!target) return;
        target.runtime = instance.runtime;
        target.updatedAt = nowIso();
        store.save(next);
      });
      return res.status(403).json({ error: "plano_inativo" });
    }

    const token = getInstanceBotToken(instance);
    if (!token) return res.status(409).json({ error: "bot_token_obrigatorio" });
    if (!isLikelyDiscordBotToken(token)) return res.status(409).json({ error: "bot_token_invalido" });

    try {
      await dockerStartInstanceContainer(instance, token);
    } catch (err) {
      const code = asString(err?.code || err?.message);
      if (code === "docker_unavailable" || code === "docker_permission_denied") {
        return res.status(503).json({ error: code });
      }
      if (code === "docker_image_missing") {
        return res.status(409).json({ error: code });
      }
      if (logError) logError("portal:instances:bot:start", err, { instanceId });
      return res.status(500).json({ error: "falha_ao_iniciar_bot" });
    }

    let updatedInstance = instance;
    await store.runExclusive(async () => {
      const next = store.load();
      const ownerNext = store.getUserByDiscordId(next, req.portalUser.discordUserId);
      const target = (next.instances || []).find((entry) => String(entry.id) === instanceId);
      if (!target) return;
      await refreshInstanceRuntime(target, ownerNext, { allowSuspendActions: true });
      target.runtime.restartedAt = nowIso();
      target.updatedAt = nowIso();
      updatedInstance = target;
      store.save(next);
    });

    res.json({ ok: true, instance: toClientInstance(updatedInstance) });
  });

  app.post("/api/instances/:id/bot/stop", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = store.load();
    const instance = (data.instances || []).find((entry) => String(entry.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });

    const containerName = getInstanceContainerName(instance);
    try {
      await dockerStopContainer(containerName);
    } catch (err) {
      const code = asString(err?.code || err?.message);
      if (code === "docker_unavailable" || code === "docker_permission_denied") {
        return res.status(503).json({ error: code });
      }
      if (logError) logError("portal:instances:bot:stop", err, { instanceId });
      return res.status(500).json({ error: "falha_ao_parar_bot" });
    }

    let updatedInstance = instance;
    await store.runExclusive(async () => {
      const next = store.load();
      const target = (next.instances || []).find((entry) => String(entry.id) === instanceId);
      if (!target) return;
      const runtime = getInstanceRuntime(target);
      runtime.status = isPlanActive(store.getUserByDiscordId(next, req.portalUser.discordUserId)?.plan)
        ? (asString(target?.botToken?.packed) ? "offline" : "nao_configurado")
        : "suspenso";
      runtime.stoppedAt = nowIso();
      runtime.containerName = containerName;
      runtime.updatedAt = nowIso();
      target.updatedAt = nowIso();
      updatedInstance = target;
      store.save(next);
    });

    res.json({ ok: true, instance: toClientInstance(updatedInstance) });
  });

  app.post("/api/instances/:id/bot/restart", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = store.load();
    const instance = (data.instances || []).find((entry) => String(entry.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });

    const owner = store.getUserByDiscordId(data, req.portalUser.discordUserId);
    if (!isPlanActive(owner?.plan)) {
      await refreshInstanceRuntime(instance, owner, { allowSuspendActions: true });
      await store.runExclusive(async () => {
        const next = store.load();
        const target = (next.instances || []).find((entry) => String(entry.id) === instanceId);
        if (!target) return;
        target.runtime = instance.runtime;
        target.updatedAt = nowIso();
        store.save(next);
      });
      return res.status(403).json({ error: "plano_inativo" });
    }

    const token = getInstanceBotToken(instance);
    if (!token) return res.status(409).json({ error: "bot_token_obrigatorio" });
    if (!isLikelyDiscordBotToken(token)) return res.status(409).json({ error: "bot_token_invalido" });

    try {
      await dockerStartInstanceContainer(instance, token);
    } catch (err) {
      const code = asString(err?.code || err?.message);
      if (code === "docker_unavailable" || code === "docker_permission_denied") {
        return res.status(503).json({ error: code });
      }
      if (code === "docker_image_missing") {
        return res.status(409).json({ error: code });
      }
      if (logError) logError("portal:instances:bot:restart", err, { instanceId });
      return res.status(500).json({ error: "falha_ao_reiniciar_bot" });
    }

    let updatedInstance = instance;
    await store.runExclusive(async () => {
      const next = store.load();
      const ownerNext = store.getUserByDiscordId(next, req.portalUser.discordUserId);
      const target = (next.instances || []).find((entry) => String(entry.id) === instanceId);
      if (!target) return;
      await refreshInstanceRuntime(target, ownerNext, { allowSuspendActions: true });
      target.runtime.restartedAt = nowIso();
      target.updatedAt = nowIso();
      updatedInstance = target;
      store.save(next);
    });

    res.json({ ok: true, instance: toClientInstance(updatedInstance) });
  });

  app.get("/api/instances/:id/discord/channels", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const botMatch = ensureRunningBotMatchesInstance(instance);
    if (!botMatch.ok) {
      if (botMatch.reason === "bot_not_ready") return res.status(409).json({ error: "bot_not_ready" });
      return res.status(409).json({ error: "instance_requires_own_bot_token" });
    }

    const guildId = asString(req.query.guildId || instance.discordGuildId).trim();
    if (!guildId) return res.status(400).json({ error: "guild_id_required" });

    if (!discordClient || typeof discordClient.isReady !== "function" || !discordClient.isReady()) {
      return res.status(409).json({ error: "bot_not_ready" });
    }

    const guild = await discordClient.guilds.fetch(guildId).catch(() => null);
    if (!guild) return res.status(404).json({ error: "bot_not_in_guild" });

    const channels = await guild.channels.fetch().catch(() => null);
    if (!channels) return res.status(500).json({ error: "falha_ao_listar_canais" });

    let me = guild.members?.me || null;
    if (!me && typeof guild.members?.fetchMe === "function") {
      me = await guild.members.fetchMe().catch(() => null);
    }

    const wantedTypes = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
    const list = [];

    for (const channel of channels.values()) {
      if (!channel) continue;
      if (!wantedTypes.has(channel.type)) continue;
      if (channel.isTextBased && !channel.isTextBased()) continue;

      const perms = me ? channel.permissionsFor(me) : null;
      const canSend = perms
        ? perms.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])
        : false;
      if (!canSend) continue;

      const parentName = channel.parent?.name ? String(channel.parent.name) : "";
      const label = parentName ? `${parentName} / #${channel.name}` : `#${channel.name}`;

      list.push({
        id: String(channel.id),
        name: String(channel.name || ""),
        parentId: channel.parentId ? String(channel.parentId) : "",
        parentName,
        type: channel.type,
        label,
        position: Number.isFinite(Number(channel.rawPosition)) ? Number(channel.rawPosition) : 0,
        parentPosition: Number.isFinite(Number(channel.parent?.rawPosition)) ? Number(channel.parent.rawPosition) : 0
      });
    }

    list.sort((a, b) => {
      if (a.parentPosition !== b.parentPosition) return a.parentPosition - b.parentPosition;
      if (a.parentName !== b.parentName) return a.parentName.localeCompare(b.parentName);
      if (a.position !== b.position) return a.position - b.position;
      return a.name.localeCompare(b.name);
    });

    res.json({
      ok: true,
      guildId,
      channels: list.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        parentName: c.parentName,
        type: c.type,
        label: c.label
      }))
    });
  });

  app.get("/api/instances/:id/products", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const productsDb = loadInstanceProducts(instanceId);
    const stockDb = loadInstanceStock(instanceId);
    const stockCounts = {};
    const bucketCounts = {};

    for (const product of productsDb.products) {
      const pid = asString(product?.id);
      if (!pid) continue;
      const raw = stockDb.stock?.[pid];
      let total = 0;
      const buckets = {};
      if (Array.isArray(raw)) {
        buckets.default = raw.length;
        total = raw.length;
      } else if (raw && typeof raw === "object") {
        for (const [key, list] of Object.entries(raw)) {
          if (!Array.isArray(list)) continue;
          buckets[key] = list.length;
          total += list.length;
        }
      }
      stockCounts[pid] = total;
      bucketCounts[pid] = buckets;
    }

    res.json({ ok: true, products: productsDb.products, stockCounts, bucketCounts });
  });

  app.post("/api/instances/:id/products", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const draft = normalizeProduct(req.body || {});
    if (!draft.id) return res.status(400).json({ error: "id obrigatorio" });
    if (draft.id.length > 48) return res.status(400).json({ error: "id muito grande (max 48)" });
    if (!/^[a-zA-Z0-9._-]+$/.test(draft.id)) {
      return res.status(400).json({ error: "id invalido (use letras, numeros, . _ -)" });
    }
    if (!draft.name) draft.name = draft.id;

    const issues = validateProductDraft(draft, { allowEmptyVariants: true });
    if (issues.length) return res.status(400).json({ error: issues.join("; ") });

    const productsDb = loadInstanceProducts(instanceId);
    if (productsDb.products.find((p) => String(p.id) === draft.id)) {
      return res.status(409).json({ error: "id ja existe" });
    }

    productsDb.products.push(draft);
    saveInstanceProducts(instanceId, productsDb);

    const stockDb = loadInstanceStock(instanceId);
    if (!stockDb.stock[draft.id]) {
      stockDb.stock[draft.id] = normalizeStock({}, getStockAllowedKeys(draft));
      saveInstanceStock(instanceId, stockDb);
    }

    res.json({ ok: true, product: draft });
  });

  app.put("/api/instances/:id/products/:productId", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const productId = asString(req.params.productId);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const productsDb = loadInstanceProducts(instanceId);
    const idx = productsDb.products.findIndex((p) => String(p.id) === productId);
    if (idx < 0) return res.status(404).json({ error: "produto nao encontrado" });

    const draft = normalizeProduct(req.body || {});
    if (!draft.id) draft.id = productId;
    if (draft.id !== productId) return res.status(400).json({ error: "nao e permitido alterar o id" });
    if (!draft.name) draft.name = draft.id;

    const issues = validateProductDraft(draft, { allowEmptyVariants: true });
    if (issues.length) return res.status(400).json({ error: issues.join("; ") });

    productsDb.products[idx] = { ...productsDb.products[idx], ...draft };
    saveInstanceProducts(instanceId, productsDb);

    const stockDb = loadInstanceStock(instanceId);
    stockDb.stock = stockDb.stock || {};
    stockDb.stock[productId] = normalizeStock(stockDb.stock[productId] || {}, getStockAllowedKeys(productsDb.products[idx]));
    saveInstanceStock(instanceId, stockDb);

    res.json({ ok: true, product: productsDb.products[idx] });
  });

  app.delete("/api/instances/:id/products/:productId", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const productId = asString(req.params.productId);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const productsDb = loadInstanceProducts(instanceId);
    const idx = productsDb.products.findIndex((p) => String(p.id) === productId);
    if (idx < 0) return res.status(404).json({ error: "produto nao encontrado" });
    const removed = productsDb.products.splice(idx, 1)[0];
    saveInstanceProducts(instanceId, productsDb);

    const stockDb = loadInstanceStock(instanceId);
    if (stockDb.stock && stockDb.stock[productId] !== undefined) {
      delete stockDb.stock[productId];
      saveInstanceStock(instanceId, stockDb);
    }

    res.json({ ok: true, product: removed });
  });

  app.get("/api/instances/:id/stock/:productId", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const productId = asString(req.params.productId);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const productsDb = loadInstanceProducts(instanceId);
    const product = productsDb.products.find((p) => String(p.id) === productId) || null;
    if (!product) return res.status(404).json({ error: "produto nao encontrado" });

    const stockDb = loadInstanceStock(instanceId);
    const stock = stockDb.stock?.[productId] || {};
    const normalized = normalizeStock(stock, getStockAllowedKeys(product));
    res.json({ ok: true, stock: normalized });
  });

  app.put("/api/instances/:id/stock/:productId", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const productId = asString(req.params.productId);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const productsDb = loadInstanceProducts(instanceId);
    const product = productsDb.products.find((p) => String(p.id) === productId) || null;
    if (!product) return res.status(404).json({ error: "produto nao encontrado" });

    const stockDb = loadInstanceStock(instanceId);
    const normalized = normalizeStock(req.body?.stock ?? req.body ?? {}, getStockAllowedKeys(product));
    stockDb.stock = stockDb.stock || {};
    stockDb.stock[productId] = normalized;
    saveInstanceStock(instanceId, stockDb);

    res.json({ ok: true, stock: normalized });
  });

  app.post("/api/instances/:id/discord/post-product", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const data = req.portalData;
    const instance = (data.instances || []).find((i) => String(i.id) === instanceId) || null;
    if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
    if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const botMatch = ensureRunningBotMatchesInstance(instance);
    if (!botMatch.ok) {
      if (botMatch.reason === "bot_not_ready") return res.status(409).json({ error: "bot_not_ready" });
      return res.status(409).json({ error: "instance_requires_own_bot_token" });
    }

    if (!postProductToChannel) return res.status(409).json({ error: "post_indisponivel" });
    if (!discordClient || typeof discordClient.isReady !== "function" || !discordClient.isReady()) {
      return res.status(409).json({ error: "bot_not_ready" });
    }

    const productId = asString(req.body?.productId);
    const channelId = normalizeDiscordId(req.body?.channelId);
    const purge = toBool(req.body?.purge);

    if (!productId) return res.status(400).json({ error: "productId obrigatorio" });
    if (!channelId) return res.status(400).json({ error: "channelId obrigatorio" });

    try {
      const channel = await discordClient.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased || !channel.isTextBased()) {
        return res.status(400).json({ error: "canal invalido" });
      }
      if (instance.discordGuildId && String(channel.guildId || "") !== String(instance.discordGuildId || "")) {
        return res.status(400).json({ error: "canal nao pertence ao servidor vinculado" });
      }

      if (purge && purgeChannelMessages) {
        const result = await purgeChannelMessages(channel);
        if (!result?.ok) {
          return res.status(400).json({ error: result?.reason || "falha ao limpar canal" });
        }
      }

      const posted = await postProductToChannel(channel.guild, channel, productId);
      if (!posted?.ok) return res.status(400).json({ error: posted?.reason || "falha ao postar" });
      res.json({ ok: true, messageId: posted.messageId || "" });
    } catch (err) {
      if (logError) logError("portal:discord:postProduct", err, { instanceId, channelId, productId });
      res.status(500).json({ error: "falha ao postar" });
    }
  });

  app.post("/api/instances/:id/rotate-key", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    const apiKey = crypto.randomBytes(24).toString("base64url");
    const apiKeyLast4 = apiKey.slice(-4);
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    await store
      .runExclusive(async () => {
        const data = store.load();
        const instance = data.instances.find((i) => i.id === instanceId) || null;
        if (!instance) throw new Error("not_found");
        if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");

        instance.apiKeyLast4 = apiKeyLast4;
        instance.apiKeyHash = apiKeyHash;
        instance.updatedAt = nowIso();
        store.save(data);
      })
      .catch((err) => {
        if (String(err?.message) === "not_found") return res.status(404).json({ error: "instancia nao encontrada" });
        if (String(err?.message) === "forbidden") return res.status(403).json({ error: "forbidden" });
        if (logError) logError("portal:instances:rotateKey", err, { instanceId });
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true, apiKey, apiKeyLast4 });
  });

  app.delete("/api/instances/:id", requireUser, async (req, res) => {
    const instanceId = asString(req.params.id);
    let containerName = "";

    await store
      .runExclusive(async () => {
        const data = store.load();
        const idx = (data.instances || []).findIndex((i) => String(i.id) === instanceId);
        if (idx < 0) throw new Error("not_found");

        const inst = data.instances[idx];
        if (String(inst.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");
        containerName = getInstanceContainerName(inst);

        data.instances.splice(idx, 1);
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "instancia nao encontrada" });
        if (code === "forbidden") return res.status(403).json({ error: "forbidden" });
        if (logError) logError("portal:instances:delete", err, { instanceId });
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    await dockerStopContainer(containerName).catch(() => null);
    await dockerRemoveContainer(containerName).catch(() => null);
    res.json({ ok: true });
  });

  app.get("/api/discord/guilds", requireUser, async (req, res) => {
    try {
      const accessToken = await getDiscordAccessToken(req.portalUser);
      if (!accessToken) return res.status(409).json({ error: "discord_token_missing" });
      const guilds = await discordApiGet("https://discord.com/api/users/@me/guilds", accessToken);

      // Keep only guilds where the user can manage the server.
      const manageable = (Array.isArray(guilds) ? guilds : []).filter((g) => {
        const perms = Number(g?.permissions || 0);
        // MANAGE_GUILD = 0x20
        return (perms & 0x20) === 0x20;
      });

      res.json({
        ok: true,
        guilds: manageable.map((g) => ({
          id: String(g.id),
          name: String(g.name || ""),
          icon: String(g.icon || ""),
          iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : ""
        }))
      });
    } catch (err) {
      if (logError) logError("portal:guilds", err);
      res.status(500).json({ error: "falha ao carregar servidores" });
    }
  });

  app.get("/api/bot/invite", requireUser, (req, res) => {
    const instanceId = asString(req.query.instanceId);
    const guildIdRaw = asString(req.query.guildId);
    let guildId = guildIdRaw;
    let clientId = oauthClientId || asString(discordClient?.user?.id);

    if (instanceId) {
      const data = store.load();
      const instance = (data.instances || []).find((entry) => String(entry.id) === instanceId) || null;
      if (!instance) return res.status(404).json({ error: "instancia nao encontrada" });
      if (String(instance.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) {
        return res.status(403).json({ error: "forbidden" });
      }

      const instanceClientId = asString(instance?.botProfile?.applicationId);
      if (!instanceClientId) return res.status(409).json({ error: "bot_token_nao_configurado" });
      clientId = instanceClientId;
      if (!guildId) guildId = asString(instance.discordGuildId);
    }

    if (!clientId) return res.status(409).json({ error: "bot_client_id_missing" });
    const perms = getInvitePermissions();
    const qs = new URLSearchParams({
      client_id: clientId,
      scope: "bot applications.commands",
      permissions: perms
    });
    if (guildId) {
      qs.set("guild_id", guildId);
      qs.set("disable_guild_select", "true");
    }
    res.json({ ok: true, url: `https://discord.com/oauth2/authorize?${qs.toString()}` });
  });

  app.get("/api/plans/catalog", (_req, res) => {
    const catalog = getPlanCatalog();
    const plans = Object.values(catalog).map((plan) => ({
      id: plan.id,
      title: plan.title,
      tier: plan.tier,
      durationDays: plan.durationDays,
      recommended: !!plan.recommended,
      amountCents: Number(plan.amountCents || 0),
      amountFormatted: formatBRL(plan.amountCents || 0),
      features: Array.isArray(plan.features) ? plan.features : []
    }));
    res.json({ ok: true, plans });
  });

  app.post("/api/plans/trial", requireUser, async (req, res) => {
    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("not_found");
        if (user.trialClaimedAt) throw new Error("trial_used");
        if (isPlanActive(user.plan)) throw new Error("plan_active");

        const now = nowIso();
        user.trialClaimedAt = now;
        user.plan = { tier: "trial", status: "active", expiresAt: addHoursIso(24) };

        if (!Array.isArray(data.transactions)) data.transactions = [];
        data.transactions.push({
          id: randomId("tx"),
          ownerDiscordUserId: req.portalUser.discordUserId,
          type: "trial_activated",
          amountCents: 0,
          status: "paid",
          provider: "internal",
          providerPaymentId: "",
          createdAt: now,
          updatedAt: now
        });

        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (code === "trial_used") return res.status(409).json({ error: "trial ja utilizado" });
        if (code === "plan_active") return res.status(409).json({ error: "voce ja tem um plano ativo" });
        if (logError) logError("portal:plans:trial", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  app.post("/api/checkout/plan", requireUser, async (req, res) => {
    const planId = asString(req.body?.planId);
    const catalog = getPlanCatalog();
    const plan = catalog[planId];
    if (!plan) return res.status(400).json({ error: "plano invalido" });
    const mpToken = getMercadoPagoAccessToken();
    if (!mpToken) return res.status(409).json({ error: "mercadopago_not_configured" });

    const tx = {
      id: randomId("tx"),
      ownerDiscordUserId: req.portalUser.discordUserId,
      type: "plan_purchase",
      planId,
      amountCents: plan.amountCents,
      status: "pending",
      provider: "mercadopago",
      providerPaymentId: "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    await store.runExclusive(async () => {
      const data = store.load();
      data.transactions.push(tx);
      store.save(data);
    });

    try {
      const preference = await mpRequestWithToken(
        "post",
        "/checkout/preferences",
        {
          items: [
            {
              title: plan.title,
              quantity: 1,
              unit_price: Number((plan.amountCents / 100).toFixed(2)),
              currency_id: "BRL"
            }
          ],
          external_reference: tx.id,
          metadata: { tx_id: tx.id, discord_user_id: req.portalUser.discordUserId, plan_id: planId },
          back_urls: {
            success: `${baseUrl}/dashboard?mp=success`,
            pending: `${baseUrl}/dashboard?mp=pending`,
            failure: `${baseUrl}/dashboard?mp=failure`
          },
          auto_return: "approved",
          notification_url: `${baseUrl}/webhooks/mercadopago`
        },
        mpToken,
        { "X-Idempotency-Key": tx.id }
      );

      res.json({ ok: true, initPoint: preference.init_point || "", sandboxInitPoint: preference.sandbox_init_point || "" });
    } catch (err) {
      if (logError) logError("portal:plan:checkout", err, { planId });
      res.status(500).json({ error: "falha ao criar pagamento" });
    }
  });

  app.get("/api/wallet/transactions", requireUser, (req, res) => {
    const data = store.load();
    const list = (data.transactions || [])
      .filter((t) => String(t.ownerDiscordUserId) === String(req.portalUser.discordUserId))
      .slice()
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, 30)
      .map((t) => ({
        id: t.id,
        type: t.type,
        planId: t.planId || "",
        amountCents: Number(t.amountCents || 0),
        amountFormatted: formatBRL(t.amountCents || 0),
        status: t.status,
        provider: t.provider,
        createdAt: t.createdAt || "",
        updatedAt: t.updatedAt || ""
      }));

    res.json({ ok: true, transactions: list });
  });

  app.get("/api/wallet/withdrawals", requireUser, (req, res) => {
    const data = store.load();
    const list = (data.withdrawals || [])
      .filter((w) => String(w.ownerDiscordUserId) === String(req.portalUser.discordUserId))
      .slice()
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, 50)
      .map((w) => ({
        id: asString(w.id),
        amountCents: Number(w.amountCents || 0),
        amountFormatted: formatBRL(w.amountCents || 0),
        status: asString(w.status || "requested"),
        method: asString(w.method || "pix"),
        pixKey: asString(w.pixKey),
        pixKeyType: asString(w.pixKeyType),
        createdAt: asString(w.createdAt),
        updatedAt: asString(w.updatedAt)
      }));

    res.json({ ok: true, withdrawals: list });
  });

  app.post("/api/wallet/withdrawals", requireUser, async (req, res) => {
    const cents = Math.floor(Number(req.body?.amountCents || 0));
    const pixKey = asString(req.body?.pixKey).trim();
    const pixKeyType = asString(req.body?.pixKeyType).trim();

    if (!pixKey) return res.status(400).json({ error: "pix_key_obrigatoria" });
    if (!Number.isFinite(cents) || cents < 1000) {
      return res.status(400).json({ error: "valor_minimo: R$ 10,00" });
    }

    const now = nowIso();
    const withdrawal = {
      id: randomId("wd"),
      ownerDiscordUserId: req.portalUser.discordUserId,
      amountCents: cents,
      status: "requested",
      method: "pix",
      pixKey,
      pixKeyType,
      createdAt: now,
      updatedAt: now
    };

    const tx = {
      id: randomId("tx"),
      ownerDiscordUserId: req.portalUser.discordUserId,
      type: "withdrawal_request",
      amountCents: -cents,
      status: "pending",
      provider: "internal",
      providerPaymentId: "",
      createdAt: now,
      updatedAt: now,
      metadata: { withdrawalId: withdrawal.id }
    };

    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("not_found");

        const current = Math.floor(Number(user.walletCents || 0));
        if (cents > current) throw new Error("insufficient_funds");

        user.walletCents = current - cents;
        user.payout = { pixKey, pixKeyType };

        if (!Array.isArray(data.withdrawals)) data.withdrawals = [];
        if (!Array.isArray(data.transactions)) data.transactions = [];

        data.withdrawals.push(withdrawal);
        data.transactions.push(tx);
        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (code === "insufficient_funds") return res.status(409).json({ error: "saldo_insuficiente" });
        if (logError) logError("portal:wallet:withdraw", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true, withdrawalId: withdrawal.id });
  });

  app.post("/api/wallet/withdrawals/:id/cancel", requireUser, async (req, res) => {
    const wid = asString(req.params.id);
    if (!wid) return res.status(400).json({ error: "withdrawal_id_obrigatorio" });

    await store
      .runExclusive(async () => {
        const data = store.load();
        const user = store.getUserByDiscordId(data, req.portalUser.discordUserId);
        if (!user) throw new Error("not_found");

        const wd = (data.withdrawals || []).find((w) => String(w.id) === wid) || null;
        if (!wd) throw new Error("withdrawal_not_found");
        if (String(wd.ownerDiscordUserId) !== String(req.portalUser.discordUserId)) throw new Error("forbidden");

        const status = asString(wd.status || "requested").toLowerCase();
        if (status !== "requested") throw new Error("cannot_cancel");

        wd.status = "cancelled";
        wd.updatedAt = nowIso();

        const refund = Math.floor(Number(wd.amountCents || 0));
        user.walletCents = Math.floor(Number(user.walletCents || 0) + refund);

        if (!Array.isArray(data.transactions)) data.transactions = [];
        data.transactions.push({
          id: randomId("tx"),
          ownerDiscordUserId: req.portalUser.discordUserId,
          type: "withdrawal_cancelled",
          amountCents: refund,
          status: "paid",
          provider: "internal",
          providerPaymentId: "",
          createdAt: wd.updatedAt,
          updatedAt: wd.updatedAt,
          metadata: { withdrawalId: wid }
        });

        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "usuario nao encontrado" });
        if (code === "withdrawal_not_found") return res.status(404).json({ error: "saque_nao_encontrado" });
        if (code === "forbidden") return res.status(403).json({ error: "forbidden" });
        if (code === "cannot_cancel") return res.status(409).json({ error: "nao_pode_cancelar" });
        if (logError) logError("portal:wallet:withdraw:cancel", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  // ── Admin: complete withdrawal (mark as paid/sent) ───────────────
  function isPortalAdmin(discordUserId) {
    const ids = asString(process.env.ADMIN_IDS).split(",").map((s) => s.trim()).filter(Boolean);
    return ids.includes(asString(discordUserId));
  }

  app.post("/api/admin/withdrawals/:id/complete", requireUser, async (req, res) => {
    if (!isPortalAdmin(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });
    const wid = asString(req.params.id);
    if (!wid) return res.status(400).json({ error: "withdrawal_id_obrigatorio" });

    await store
      .runExclusive(async () => {
        const data = store.load();
        const wd = (data.withdrawals || []).find((w) => w.id === wid);
        if (!wd) throw new Error("not_found");
        if (wd.status !== "requested") throw new Error("cannot_complete");

        const now = nowIso();
        wd.status = "completed";
        wd.updatedAt = now;
        wd.completedAt = now;

        if (!Array.isArray(data.transactions)) data.transactions = [];
        data.transactions.push({
          id: randomId("tx"),
          ownerDiscordUserId: wd.ownerDiscordUserId,
          type: "withdrawal_completed",
          amountCents: 0,
          status: "paid",
          provider: "internal",
          providerPaymentId: "",
          createdAt: now,
          updatedAt: now,
          metadata: { withdrawalId: wid }
        });

        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "saque_nao_encontrado" });
        if (code === "cannot_complete") return res.status(409).json({ error: "saque_nao_esta_pendente" });
        if (logError) logError("portal:admin:withdraw:complete", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  app.post("/api/admin/withdrawals/:id/reject", requireUser, async (req, res) => {
    if (!isPortalAdmin(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });
    const wid = asString(req.params.id);
    if (!wid) return res.status(400).json({ error: "withdrawal_id_obrigatorio" });

    await store
      .runExclusive(async () => {
        const data = store.load();
        const wd = (data.withdrawals || []).find((w) => w.id === wid);
        if (!wd) throw new Error("not_found");
        if (wd.status !== "requested") throw new Error("cannot_reject");

        const now = nowIso();
        wd.status = "rejected";
        wd.updatedAt = now;

        // Refund wallet
        const user = store.getUserByDiscordId(data, wd.ownerDiscordUserId);
        const refund = Math.floor(Number(wd.amountCents || 0));
        if (user && refund > 0) {
          user.walletCents = Math.floor(Number(user.walletCents || 0)) + refund;
        }

        if (!Array.isArray(data.transactions)) data.transactions = [];
        data.transactions.push({
          id: randomId("tx"),
          ownerDiscordUserId: wd.ownerDiscordUserId,
          type: "withdrawal_cancelled",
          amountCents: refund,
          status: "paid",
          provider: "internal",
          providerPaymentId: "",
          createdAt: now,
          updatedAt: now,
          metadata: { withdrawalId: wid }
        });

        store.save(data);
      })
      .catch((err) => {
        const code = asString(err?.message);
        if (code === "not_found") return res.status(404).json({ error: "saque_nao_encontrado" });
        if (code === "cannot_reject") return res.status(409).json({ error: "saque_nao_esta_pendente" });
        if (logError) logError("portal:admin:withdraw:reject", err);
        return res.status(500).json({ error: "erro interno" });
      });

    if (res.headersSent) return;
    res.json({ ok: true });
  });

  // ── Admin: list all pending withdrawals ──────────────────────────
  app.get("/api/admin/withdrawals", requireUser, (req, res) => {
    if (!isPortalAdmin(req.portalUser.discordUserId)) return res.status(403).json({ error: "forbidden" });
    const data = store.load();
    const list = (data.withdrawals || [])
      .filter((w) => w.status === "requested")
      .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0))
      .map((w) => ({
        id: asString(w.id),
        ownerDiscordUserId: asString(w.ownerDiscordUserId),
        amountCents: Number(w.amountCents || 0),
        amountFormatted: formatBRL(w.amountCents || 0),
        status: asString(w.status),
        method: asString(w.method || "pix"),
        pixKey: asString(w.pixKey),
        pixKeyType: asString(w.pixKeyType),
        createdAt: asString(w.createdAt)
      }));
    res.json({ ok: true, withdrawals: list });
  });

  app.post("/webhooks/mercadopago", async (req, res) => {
    const secret = asString(process.env.MERCADOPAGO_WEBHOOK_SECRET);
    if (secret) {
      const ok = verifyMercadoPagoSignature(req, secret);
      if (!ok) return res.status(401).json({ error: "invalid_signature" });
    }

    const type = asString(req.query?.type) || asString(req.query?.topic) || asString(req.body?.type) || asString(req.body?.topic);
    const dataId =
      asString(req.query?.["data.id"]) ||
      asString(req.query?.id) ||
      asString(req.body?.data?.id) ||
      asString(req.body?.id);

    if (!dataId) return res.json({ ok: true });

    // Only handle payment notifications for now.
    if (type && !String(type).toLowerCase().includes("payment")) {
      return res.json({ ok: true });
    }

    try {
      const envToken = getMercadoPagoAccessToken();
      if (!envToken) return res.json({ ok: true });
      const payment = await mpRequestWithToken("get", `/v1/payments/${encodeURIComponent(dataId)}`, null, envToken);
      const status = asString(payment?.status);
      const externalRef = asString(payment?.external_reference);

      if (!externalRef) return res.json({ ok: true });

      await store.runExclusive(async () => {
        const data = store.load();
        const tx = data.transactions.find((t) => t.id === externalRef) || null;
        if (!tx) return;
        if (tx.status === "paid") return;

        tx.providerPaymentId = asString(payment?.id);
        tx.updatedAt = nowIso();

        if (status === "approved") {
          tx.status = "paid";
          const user = store.getUserByDiscordId(data, tx.ownerDiscordUserId);
          if (user) {
            if (tx.type === "plan_purchase") {
              const catalog = getPlanCatalog();
              const plan = catalog[asString(tx.planId)] || null;
              if (plan) {
                user.plan = {
                  tier: plan.tier,
                  status: "active",
                  expiresAt: extendPlanExpiry(user.plan, plan.durationDays)
                };
              }
            }
          }
        } else if (status === "rejected" || status === "cancelled") {
          tx.status = "failed";
        } else {
          tx.status = "pending";
        }

        store.save(data);
      });

      res.json({ ok: true });
    } catch (err) {
      if (logError) logError("portal:mp:webhook", err, { dataId });
      res.json({ ok: true });
    }
  });

  let instanceMonitorRunning = false;
  async function runInstanceMonitor() {
    if (instanceMonitorRunning) return;
    instanceMonitorRunning = true;
    try {
      const data = store.load();
      const updates = [];
      const instances = Array.isArray(data.instances) ? data.instances : [];
      for (const instance of instances) {
        const owner = store.getUserByDiscordId(data, instance.ownerDiscordUserId);
        if (!owner) continue;
        const before = JSON.stringify(instance.runtime || {});
        await refreshInstanceRuntime(instance, owner, { allowSuspendActions: true });
        const after = JSON.stringify(instance.runtime || {});
        if (before !== after) {
          updates.push({
            id: asString(instance.id),
            runtime: instance.runtime,
            updatedAt: nowIso()
          });
        }
      }
      if (!updates.length) return;
      await store.runExclusive(async () => {
        const next = store.load();
        for (const update of updates) {
          const target = (next.instances || []).find((entry) => asString(entry.id) === update.id);
          if (!target) continue;
          target.runtime = update.runtime;
          target.updatedAt = update.updatedAt;
        }
        store.save(next);
      });
    } catch (err) {
      if (logError) logError("portal:instances:monitor", err);
    } finally {
      instanceMonitorRunning = false;
    }
  }

  const monitorTimer = setInterval(() => {
    runInstanceMonitor().catch(() => null);
  }, monitorIntervalMs);
  if (typeof monitorTimer.unref === "function") monitorTimer.unref();
  runInstanceMonitor().catch(() => null);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const portalDir = path.join(path.resolve(__dirname, ".."), "src", "portal");
  app.use(express.static(portalDir, { index: "index.html" }));
  app.get(["/", "/login", "/plans", "/dashboard", "/tutorials", "/terms", "/privacy"], (_req, res) => {
    res.sendFile(path.join(portalDir, "index.html"));
  });

  app.use((err, _req, res, _next) => {
    if (logError) logError("portal:server", err);
    if (res.headersSent) return;

    // Express JSON parser (body-parser) invalid JSON
    if (err && (err.type === "entity.parse.failed" || Number(err.status) === 400)) {
      return res.status(400).json({ error: "invalid_json" });
    }
    res.status(500).json({ error: "erro interno" });
  });

  app.listen(port, host, () => {
    const url = `${baseUrl}/`;
    if (log) log("info", "portal:server:start", { host, port, url });
    console.log(`Portal: ${url}`);
  });

  // Small integration point for future: expose the discord client status.
  app.get("/api/bot/status", (_req, res) => {
    const ready = !!discordClient && typeof discordClient.isReady === "function" && discordClient.isReady();
    res.json({
      ok: true,
      botReady: ready,
      oauthEnabled,
      mercadoPagoEnabled: Boolean(getMercadoPagoAccessToken()),
      localAuthEnabled: true
    });
  });

  return { app, host, port, enabled: true };
}
