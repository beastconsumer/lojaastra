import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import axios from "axios";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { startAdminServer } from "./adminServer.js";
import { startPortalServer } from "./portalServer.js";
import { createPortalStore } from "./portal/store.js";
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  AttachmentBuilder,
  MessageFlags
} from "discord.js";
import { randomUUID, createHash, createDecipheriv } from "crypto";

dotenv.config();

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();
const DEFAULT_MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const CART_INACTIVE_MS = 5 * 60 * 1000;

// BSRage Theme Colors
const BRAND_COLOR = 0xE6212A;        // Main brand red
const BRAND_COLOR_ALT = 0xFF4D57;    // Secondary accent red
const COLOR_SUCCESS = 0x10B981;      // Green for success states
const COLOR_WARNING = 0xF59E0B;      // Amber for warnings
const COLOR_DANGER = 0xEF4444;       // Red for errors/danger
const COLOR_INFO = BRAND_COLOR;      // Brand color for info states
const DEFAULT_CART_COLOR = BRAND_COLOR;
const manualConfirmLocks = new Set();
let runtimeClientApplicationId = "";

function shouldLog(level) {
  const current = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.info;
  return LOG_LEVELS[level] >= current;
}

function safeStringify(data) {
  if (data === undefined) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function log(level, event, data) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
  const payload = data !== undefined ? ` ${safeStringify(data)}` : "";
  console.log(`[${ts}] [${level.toUpperCase()}] ${event}${payload}`);
}

function logEnter(fn, data) {
  log("debug", `${fn}:enter`, data);
}

function logExit(fn, data) {
  log("debug", `${fn}:exit`, data);
}

function logError(fn, err, data) {
  const payload = {
    message: err?.message || String(err),
    stack: err?.stack ? String(err.stack).split("\n").slice(0, 3).join(" | ") : undefined,
    ...data
  };
  log("error", `${fn}:error`, payload);
}

function asString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function getMercadoPagoAccessTokenForSale(_ownerDiscordUserId) {
  // Payments are processed by the platform Mercado Pago account (server .env).
  // Sellers withdraw their balance via the Portal wallet.
  return asString(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

async function mercadoPagoRequest(method, pathUrl, payload, accessToken, options = {}) {
  const token = asString(accessToken);
  if (!token) throw new Error("mercadopago_not_configured");

  const url = `https://api.mercadopago.com${pathUrl}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "astrasystems-bot"
  };
  if (options.idempotencyKey) headers["X-Idempotency-Key"] = String(options.idempotencyKey);

  try {
    const res = await axios({
      method,
      url,
      headers,
      data: payload || undefined
    });
    return res.data;
  } catch (err) {
    const status = Number(err?.response?.status || 0);
    const apiData = err?.response?.data && typeof err.response.data === "object" ? err.response.data : {};
    const message =
      asString(apiData?.message) ||
      asString(apiData?.error) ||
      asString(apiData?.cause?.[0]?.description) ||
      asString(err?.message) ||
      "mercadopago_request_failed";
    const wrapped = new Error(message);
    wrapped.code = status ? `mercadopago_http_${status}` : "mercadopago_request_failed";
    wrapped.status = status || 0;
    wrapped.responseData = apiData;
    throw wrapped;
  }
}

process.on("unhandledRejection", (err) => {
  logError("unhandledRejection", err);
});

process.on("uncaughtException", (err) => {
  logError("uncaughtException", err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config.json");
const DATA_DIR = path.join(ROOT, "data");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");
const COUPONS_PATH = path.join(DATA_DIR, "coupons.json");
const CARTS_PATH = path.join(DATA_DIR, "carts.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");
const POSTS_PATH = path.join(DATA_DIR, "posts.json");
const CUSTOMERS_PATH = path.join(DATA_DIR, "customers.json");
const STOCK_PATH = path.join(DATA_DIR, "stock.json");
const DELIVERIES_PATH = path.join(DATA_DIR, "deliveries.json");
const PORTAL_PATH = path.join(DATA_DIR, "portal.json");
const INSTANCES_DIR = path.join(DATA_DIR, "instances");

// Shared store used by the Portal (web) and by the bot runtime (licensing/wallet).
const portalStore = createPortalStore({ filePath: PORTAL_PATH, log });

const config = loadJson(CONFIG_PATH, {});
applyConfigDefaults();

const productsDb = loadJson(PRODUCTS_PATH, { products: [] });
const couponsDb = loadJson(COUPONS_PATH, { coupons: [] });
const cartsDb = loadJson(CARTS_PATH, { carts: [] });
const ordersDb = loadJson(ORDERS_PATH, { orders: [] });
const postsDb = loadJson(POSTS_PATH, { posts: [] });
const customersDb = loadJson(CUSTOMERS_PATH, { customers: [] });
const stockDb = loadJson(STOCK_PATH, { stock: {} });
const deliveriesDb = loadJson(DELIVERIES_PATH, { deliveries: [] });
const isInstanceRuntime = ["1", "true", "yes", "on"].includes(String(process.env.INSTANCE_RUNTIME || "").toLowerCase());
const instanceEnableMessageContent = !["0", "false", "off", "no"].includes(
  String(process.env.INSTANCE_ENABLE_MESSAGE_CONTENT || "true").toLowerCase()
);
const instanceEnableGuildMembers = ["1", "true", "yes", "on"].includes(
  String(process.env.INSTANCE_ENABLE_GUILD_MEMBERS || "").toLowerCase()
);
const clientIntents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];
if (!isInstanceRuntime || instanceEnableMessageContent) clientIntents.push(GatewayIntentBits.MessageContent);
if (!isInstanceRuntime || instanceEnableGuildMembers) clientIntents.push(GatewayIntentBits.GuildMembers);

const client = new Client({
  intents: clientIntents,
  partials: [Partials.Channel]
});

if (!isInstanceRuntime) {
  startAdminServer({
    rootDir: ROOT,
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
    paths: {
      config: CONFIG_PATH,
      products: PRODUCTS_PATH,
      stock: STOCK_PATH,
      coupons: COUPONS_PATH,
      carts: CARTS_PATH,
      orders: ORDERS_PATH,
      posts: POSTS_PATH,
      deliveries: DELIVERIES_PATH,
      customers: CUSTOMERS_PATH
    }
  });

  startPortalServer({
    rootDir: ROOT,
    log,
    logError,
    client,
    store: portalStore,
    postProductToChannel,
    purgeChannelMessages
  });
}

client.once("clientReady", async () => {
  await client.application?.fetch().catch(() => null);
  runtimeClientApplicationId = asString(client.application?.id || client.user?.id);
  log("info", "bot:ready", { tag: client.user.tag, pid: process.pid, applicationId: runtimeClientApplicationId });
  log("info", "bot:path", { root: ROOT });
  log("info", "bot:data", { products: productsDb.products.length, productsPath: PRODUCTS_PATH });
  logAdmins();
  startPaymentWatcher();
  startWelcomeTracker();
  startCartCleanupWatcher();
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!canCurrentRuntimeHandleGuild(message.guild.id)) return;

  const activeCart = cartsDb.carts.find(
    (c) =>
      c.channelId === message.channel.id &&
      (c.status === "open" || c.status === "pending")
  );
  if (activeCart) {
    await touchCartActivity(activeCart.id);
    log("debug", "cart:activity", {
      cartId: activeCart.id,
      channelId: message.channel.id,
      userId: message.author.id
    });
  }

  const content = message.content.trim();
  if (content.startsWith("!postar1")) {
    log("info", "cmd:postar1", { userId: message.author.id, channelId: message.channel.id });
    await handlePostProductCommand(message, "product1", { purge: true, acknowledge: false });
  }
  if (/^!postar(\s|$)/i.test(content) && !content.startsWith("!postar1")) {
    log("info", "cmd:postar", { userId: message.author.id, channelId: message.channel.id, content });
    await handlePostAnyCommand(message);
  }
  if (content.startsWith("!produtos")) {
    log("info", "cmd:produtos", { userId: message.author.id, channelId: message.channel.id });
    await handleListProductsCommand(message);
  }
  if (content.startsWith("!repost")) {
    log("info", "cmd:repost", { userId: message.author.id, channelId: message.channel.id, content });
    await handleRepostCommand(message);
  }
  if (content.startsWith("!admin")) {
    log("info", "cmd:admin", { userId: message.author.id, channelId: message.channel.id });
    await handleAdminMenu(message);
  }
  if (content.startsWith("!permcheck")) {
    log("info", "cmd:permcheck", { userId: message.author.id, channelId: message.channel.id });
    await handlePermCheck(message);
  }
  if (content.startsWith("!portal")) {
    log("info", "cmd:portal", { userId: message.author.id, channelId: message.channel.id });
    await handlePortalCommand(message);
  }
  if (content.startsWith("!link")) {
    log("info", "cmd:link", { userId: message.author.id, channelId: message.channel.id });
    await handleLinkCommand(message);
  }
});

client.on("guildMemberAdd", async (member) => {
  if (!canCurrentRuntimeHandleGuild(member.guild?.id)) return;
  log("info", "guild:memberAdd", { userId: member.id, guildId: member.guild?.id });
  enqueueWelcome(member);
});

client.on("interactionCreate", async (interaction) => {
  if (!canCurrentRuntimeHandleGuild(interaction.guildId || interaction.guild?.id)) return;
  try {
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable()) {
      const msg = "Ocorreu um erro. Avise um staff.";
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN nao configurado no .env");
  process.exit(1);
}
client.login(token).catch((err) => {
  logError("discord:login", err);
  if (isInstanceRuntime) {
    const message = String(err?.message || "").toLowerCase();
    if (message.includes("disallowed intents")) {
      log("error", "discord:login:hint", {
        reason: "used_disallowed_intents",
        note: "ative Message Content Intent do bot no Discord Developer Portal para comandos de texto"
      });
      setTimeout(() => process.exit(78), 250);
      return;
    }
    // Fail fast in instance containers so runtime monitor can mark token/start errors clearly.
    setTimeout(() => process.exit(1), 250);
  }
});

function parseChannelIdArg(value) {
  return String(value || "").replace(/[<#>]/g, "").trim();
}

function parsePostCommand(messageContent) {
  const parts = String(messageContent || "").trim().split(/\s+/).filter(Boolean);
  const productId = parts[1] || "";
  let channelId = "";
  let purge = true;

  for (const arg of parts.slice(2)) {
    if (arg === "--no-purge") {
      purge = false;
      continue;
    }
    if (arg === "--purge") {
      purge = true;
      continue;
    }
    if (!channelId) {
      channelId = parseChannelIdArg(arg);
    }
  }

  return { productId, channelId, purge };
}

async function handlePortalCommand(message) {
  const guildId = asString(message.guild?.id);
  const url = getPortalBaseUrl();
  const license = getGuildLicense(message.guild?.id);
  const planTier = license?.plan?.tier ? String(license.plan.tier) : "";

  const lines = [];
  if (guildId) lines.push(`Guild: ${guildId}`);
  lines.push(`Portal: ${url}`);
  if (!shouldEnforceLicense(message.guild?.id)) {
    lines.push("Licenca: modo legacy (LICENSE_MODE=auto e servidor nao vinculado).");
  } else if (license.ok) {
    lines.push(`Licenca: ativa${planTier ? ` (${planTier})` : ""}.`);
  } else {
    lines.push("Licenca: pendente.");
    lines.push("Use `!link SUA_API_KEY` para vincular este servidor.");
  }
  await message.reply(lines.join("\n"));
}

async function handleLinkCommand(message) {
  const parts = String(message.content || "").trim().split(/\s+/).filter(Boolean);
  const apiKey = parts[1] || "";
  if (!apiKey) {
    await message.reply("Uso: `!link <API_KEY>`");
    return;
  }

  const member = await resolveMember(message);
  if (!member) {
    await message.reply("Nao consegui validar suas permissoes.");
    return;
  }

  const canLink =
    isAdmin(member.id) ||
    member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions?.has(PermissionsBitField.Flags.ManageGuild);
  if (!canLink) {
    await message.reply("Sem permissao. Voce precisa ser admin do servidor para vincular.");
    return;
  }

  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  const now = new Date().toISOString();

  const result = await portalStore.runExclusive(async () => {
    const data = portalStore.load();
    const instance = (data.instances || []).find((i) => String(i.apiKeyHash || "") === apiKeyHash) || null;
    if (!instance) return { ok: false, reason: "api_key_invalida" };
    if (String(instance.ownerDiscordUserId || "") !== String(message.author.id)) {
      return { ok: false, reason: "nao_e_dono", instanceName: instance.name || instance.id };
    }

    instance.discordGuildId = message.guild.id;
    instance.discordGuildName = message.guild.name || "";
    instance.linkedAt = now;
    instance.linkedByDiscordUserId = message.author.id;
    instance.updatedAt = now;

    portalStore.save(data);
    return { ok: true, instance };
  });

  if (!result.ok) {
    if (result.reason === "api_key_invalida") {
      await message.reply("API key invalida. Gere uma nova no Portal e tente novamente.");
      return;
    }
    if (result.reason === "nao_e_dono") {
      await message.reply(`Esta API key pertence a outra conta (${result.instanceName}).`);
      return;
    }
    await message.reply("Falha ao vincular. Tente novamente.");
    return;
  }

  const portalUrl = getPortalBaseUrl();
  const payload = buildSystemEmbedPayload(
    "Servidor vinculado",
    `Instancia: **${result.instance.name || result.instance.id}**\nGuild: **${message.guild.name}**\n\nProximo passo:\n1) Ative seu plano em ${portalUrl}/plans\n2) Configure produtos e poste com !postar1`,
    "success",
    { includeBanner: true, includeThumbnail: true }
  );

  await message.reply(payload);
}

async function handlePostAnyCommand(message) {
  const { productId, channelId, purge } = parsePostCommand(message.content);
  if (!productId) {
    await message.reply("Uso: `!postar <productId> [channelId] [--purge|--no-purge]`");
    return;
  }
  await handlePostProductCommand(message, productId, { channelId, purge, acknowledge: true });
}

async function handleListProductsCommand(message) {
  const { products } = listProductsForGuild(message.guild.id, { force: true });
  const member = await resolveMember(message);
  if (!member) {
    await message.reply("Nao consegui validar suas permissoes.");
    return;
  }
  const hasAdmin = isAdmin(member.id);
  const hasStaff = member.roles.cache.has(config.staffRoleId);
  if (!hasAdmin && !hasStaff) {
    await message.reply("Sem permissao.");
    return;
  }

  const lines = products.map((product) => {
    const variants = getSelectableVariants(product).length;
    return `${product.id} | ${product.name || product.id} | ${variants} variacoes`;
  });
  let content = "Nenhum produto cadastrado.";
  if (lines.length) {
    const joined = lines.join("\n");
    if (joined.length > 1700) {
      const preview = lines.slice(0, 40).join("\n");
      content =
        `Produtos cadastrados (mostrando os 40 primeiros):\n\`\`\`\n${preview}\n\`\`\`\n` +
        "Use: `!postar <productId>`";
    } else {
      content = `Produtos cadastrados:\n\`\`\`\n${joined}\n\`\`\`\nUse: \`!postar <productId>\``;
    }
  }
  await message.reply(content);
}

async function handlePostProductCommand(message, productId, options = {}) {
  logEnter("handlePostProductCommand", {
    userId: message.author.id,
    productId,
    channelId: message.channel.id,
    targetChannelId: options.channelId
  });
  const member = await resolveMember(message);
  if (!member) {
    await message.reply("Nao consegui validar suas permissoes. Tente novamente.");
    log("warn", "handlePostProductCommand:memberNotFound", { userId: message.author.id });
    return;
  }
  const hasAdmin = isAdmin(member.id);
  const hasStaff = member.roles.cache.has(config.staffRoleId);
  if (!hasAdmin && !hasStaff) {
    log("warn", "perm:denied", {
      userId: member.id,
      roles: member.roles.cache.map((r) => r.id).join(",")
    });
    await message.reply(
      `Sem permissao. Admin: ${hasAdmin ? "sim" : "nao"} | Staff: ${hasStaff ? "sim" : "nao"}`
    );
    log("warn", "handlePostProductCommand:denied", {
      userId: member.id,
      hasAdmin,
      hasStaff,
      staffRoleId: config.staffRoleId
    });
    return;
  }
  const { product: precheck } = getProductForGuild(message.guild.id, productId, true);
  if (!precheck) {
    const list = listProductsForGuild(message.guild.id, { force: true });
    const ids = list.products.map((p) => p.id).join(", ") || "nenhum";
    await message.reply(`Produto nao encontrado. IDs carregados: ${ids}.`);
    log("warn", "handlePostProductCommand:productNotFound", { productId, ids });
    return;
  }
  const shouldPurge = options.purge !== false;
  let channel = message.channel;
  if (options.channelId) {
    channel = await message.guild.channels.fetch(options.channelId).catch(() => null);
    if (!channel || !channel.isTextBased || !channel.isTextBased()) {
      await message.reply("Canal invalido para postagem.");
      return;
    }
  }
  if (shouldPurge) {
    const purgeResult = await purgeChannelMessages(channel);
    if (!purgeResult.ok) {
      await message.reply(`Nao consegui limpar o canal: ${purgeResult.reason}`);
      log("warn", "handlePostProductCommand:purgeFailed", { reason: purgeResult.reason, channelId: channel.id });
      return;
    }
  }
  const posted = await postProductToChannel(message.guild, channel, productId);
  if (!posted?.ok) {
    await message.reply(`Nao foi possivel postar: ${posted?.reason || "erro desconhecido"}`);
    return;
  }

  if (options.acknowledge !== false) {
    const purgeLabel = shouldPurge ? "com limpeza" : "sem limpeza";
    await message.reply(`Produto ${productId} postado em <#${channel.id}> (${purgeLabel}).`);
  }

  logExit("handlePostProductCommand", { userId: member.id, productId, channelId: channel.id });
}

async function handleRepostCommand(message) {
  logEnter("handleRepostCommand", { userId: message.author.id, channelId: message.channel.id, content: message.content });
  if (!isAdmin(message.author.id)) {
    await message.reply("Sem permissao para re-postar produtos.");
    log("warn", "handleRepostCommand:denied", { userId: message.author.id });
    return;
  }

  const parts = message.content.trim().split(/\s+/).filter(Boolean);
  const [, productIdArg, channelArg, flagArg] = parts;
  const productId = productIdArg;
  const force = flagArg === "--force" || parts.includes("--force");
  const purge = flagArg === "--purge" || parts.includes("--purge");

  if (!productId) {
    await message.reply("Uso: `!repost <productId> [channelId] [--force] [--purge]`");
    return;
  }

  const { product } = getProductForGuild(message.guild.id, productId, true);
  if (!product) {
    await message.reply(`Produto ${productId} nao encontrado.`);
    log("warn", "handleRepostCommand:notFound", { productId });
    return;
  }

  let channel = null;
  let referencePost = null;

  const posts = postsDb.posts
    .filter((p) => p.productId === productId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (channelArg) {
    const channelId = parseChannelIdArg(channelArg);
    channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await message.reply(`Canal ${channelId} nao encontrado.`);
      return;
    }
    referencePost = posts.find((p) => p.channelId === channel.id) || null;
  } else {
    const scoped = posts.filter((p) => !p.guildId || String(p.guildId) === String(message.guild.id));
    for (const post of scoped.slice(0, 25)) {
      const found = await message.guild.channels.fetch(post.channelId).catch(() => null);
      if (!found) continue;
      channel = found;
      referencePost = post;
      break;
    }
  }

  if (!channel) {
    await message.reply("Nenhum post anterior encontrado para esse produto.");
    log("warn", "handleRepostCommand:noChannel", { productId });
    return;
  }
  if (!channel.isTextBased || !channel.isTextBased()) {
    await message.reply("Canal invalido para re-postar (nao e de texto).");
    log("warn", "handleRepostCommand:notText", { channelId: channel.id });
    return;
  }

  let existingMessage = null;
  if (referencePost?.messageId) {
    try {
      existingMessage = await channel.messages.fetch(referencePost.messageId);
    } catch {}
  }

  if (existingMessage && !force) {
    await message.reply(
      `A mensagem atual ainda esta ativa: ${existingMessage.url}\nUse \`--force\` para re-postar mesmo assim.`
    );
    logExit("handleRepostCommand", { productId, channelId: channel.id, skipped: true });
    return;
  }

  if (purge) {
    const purgeResult = await purgeChannelMessages(channel);
    if (!purgeResult.ok) {
      await message.reply(`Nao consegui limpar o canal: ${purgeResult.reason}`);
      log("warn", "handleRepostCommand:purgeFailed", { channelId: channel.id, reason: purgeResult.reason });
      return;
    }
  }

  const posted = await postProductToChannel(message.guild, channel, productId);
  if (!posted?.ok) {
    await message.reply(`Nao foi possivel re-postar: ${posted?.reason || "erro desconhecido"}`);
    return;
  }
  await message.reply(`Produto ${productId} re-postado em <#${channel.id}>${purge ? " (canal limpo)" : ""}.`);
  logExit("handleRepostCommand", { productId, channelId: channel.id, force, purge });
}

async function handleAdminMenu(message) {
  logEnter("handleAdminMenu", { userId: message.author.id, channelId: message.channel.id });
  if (!isAdmin(message.author.id)) {
    await message.reply("Sem permissao.");
    log("warn", "handleAdminMenu:denied", { userId: message.author.id });
    return;
  }

  const { products } = listProductsForGuild(message.guild.id, { force: true });
  const defaultProductId = products[0]?.id || "";
  const hasProducts = Boolean(defaultProductId);
  const embed = new EmbedBuilder()
    .setTitle("Painel Admin")
    .setDescription(
      [
        "Use os botoes abaixo e comandos de apoio:",
        "`!produtos` para listar IDs",
        "`!postar <productId> [channelId] [--purge|--no-purge]`",
        "`!repost <productId> [channelId] [--force] [--purge]`"
      ].join("\n")
    )
    .setColor(BRAND_COLOR);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_create_coupon")
      .setLabel("Cupons")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`admin_post_product:${defaultProductId || "none"}`)
      .setLabel(hasProducts ? `Postar ${defaultProductId}` : "Sem produto")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasProducts)
  );

  const files = [];
  const product = hasProducts ? getProductForGuild(message.guild.id, defaultProductId, true).product : null;
  if (product?.prePostGif) {
    const pre = attachIfExists(product.prePostGif, files);
    if (pre) embed.setImage(`attachment://${pre.name}`);
  }

  await message.reply({ embeds: [embed], components: [row], files });
  logExit("handleAdminMenu", { userId: message.author.id });
}
async function handlePermCheck(message) {
  logEnter("handlePermCheck", { userId: message.author.id, channelId: message.channel.id });
  const member = await resolveMember(message);
  if (!member) {
    await message.reply("Nao consegui validar suas permissoes.");
    log("warn", "handlePermCheck:memberNotFound", { userId: message.author.id });
    return;
  }

  const hasAdmin = isAdmin(member.id);
  const hasStaff = member.roles.cache.has(config.staffRoleId);
  const adminIds = Array.isArray(config.adminUserIds) ? config.adminUserIds.join(",") : "vazio";
  const envAdmins = (process.env.ADMIN_IDS || "").trim() || "vazio";

  await message.reply(
    `Perm check:\nUser: ${member.id}\nAdmin: ${hasAdmin ? "sim" : "nao"} | Staff: ${hasStaff ? "sim" : "nao"}\nStaffRoleId: ${config.staffRoleId}\nAdminIds: ${adminIds}\nEnvAdminIds: ${envAdmins}`
  );
  logExit("handlePermCheck", { userId: member.id, hasAdmin, hasStaff });
}

async function handleSelectMenu(interaction) {
  logEnter("handleSelectMenu", { userId: interaction.user?.id, customId: interaction.customId });
  if (!interaction.customId.startsWith("product_select:")) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const license = getGuildLicense(interaction.guildId);
  if (shouldEnforceLicense(interaction.guildId) && !license.ok) {
    await interaction.editReply(buildLicenseBlockedPayload(interaction.guildId, license));
    log("warn", "handleSelectMenu:licenseDenied", { guildId: interaction.guildId, reason: license.reason });
    return;
  }

  const selection = interaction.values[0] || "";
  const [productId, variantId] = selection.split("|");
  const { product } = getProductForGuild(interaction.guildId, productId, true);
  if (!product) {
    await interaction.editReply("Produto nao encontrado.");
    log("warn", "handleSelectMenu:productNotFound", { productId });
    return;
  }
  const variant = getVariant(product, variantId);
  if (!variant) {
    await interaction.editReply("Variacao nao encontrada.");
    log("warn", "handleSelectMenu:variantNotFound", { productId, variantId });
    return;
  }

  const cart = upsertCart(interaction.user.id, interaction.guildId, productId, variantId);
  let channel = null;
  try {
    channel = await ensureCartChannel(interaction.guild, interaction.user, cart);
  } catch (err) {
    logError("handleSelectMenu:ensureCartChannel", err, { userId: interaction.user?.id });
    await interaction.editReply("Nao foi possivel criar o carrinho. Avise um staff.");
    return;
  }
  const payload = buildSystemEmbedPayload(
    "Carrinho criado",
    `Canal: <#${channel.id}>\nProduto: **${product.name}**\nVariacao: **${variant.label}**\nClique no canal para continuar o atendimento.`,
    "success",
    { includeBanner: false }
  );
  await interaction.editReply(payload);
  if (!cart.messageId) {
    // Match the product post experience: send the pre-GIF once when the cart is first created.
    await sendPreProductGif(channel, product);
  }
  await sendOrUpdateCartMessage(channel, cart, product, variant);
  await notifyStaffLog("Carrinho criado", {
    guildId: interaction.guildId,
    userId: interaction.user?.id,
    channelId: channel.id,
    productId,
    variantId
  });
  await touchCartActivity(cart.id);
  logExit("handleSelectMenu", { userId: interaction.user?.id, cartId: cart.id, channelId: channel.id });
}

async function handleButton(interaction) {
  logEnter("handleButton", { userId: interaction.user?.id, customId: interaction.customId });
  const { customId } = interaction;

  if (customId === "admin_create_coupon") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminCreateCouponDenied", { userId: interaction.user.id });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Menu de Cupons")
      .setDescription("- Escolha uma acao para cupons.")
      .setColor(BRAND_COLOR);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_coupon_create_modal")
        .setLabel("Criar cupom")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("admin_coupon_list")
        .setLabel("Listar cupons")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("admin_coupon_toggle")
        .setLabel("Ativar/Desativar")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("admin_coupon_delete")
        .setLabel("Apagar cupom")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    logExit("handleButton:adminCreateCouponMenu", { userId: interaction.user.id });
    return;
  }

  if (customId === "admin_coupon_create_modal") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminCreateCouponDenied", { userId: interaction.user.id });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("admin_coupon_modal")
      .setTitle("Criar cupom");

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Codigo do cupom")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const percentInput = new TextInputBuilder()
      .setCustomId("percent")
      .setLabel("Desconto (%)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(codeInput),
      new ActionRowBuilder().addComponents(percentInput)
    );

    await interaction.showModal(modal);
    logExit("handleButton:adminCreateCoupon", { userId: interaction.user.id });
    return;
  }

  if (customId === "admin_list_coupons" || customId === "admin_coupon_list") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminListCouponsDenied", { userId: interaction.user.id });
      return;
    }

    const list = couponsDb.coupons
      .map((c) => `${c.code} | ${c.percent}% | ${c.active === false ? "inativo" : "ativo"}`)
      .join("\n");
    const content = list ? `Cupons:\n\`\`\`\n${list}\n\`\`\`` : "Nenhum cupom cadastrado.";
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    logExit("handleButton:adminListCoupons", { userId: interaction.user.id, count: couponsDb.coupons.length });
    return;
  }

  if (customId === "admin_toggle_coupon" || customId === "admin_coupon_toggle") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminToggleCouponDenied", { userId: interaction.user.id });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("admin_toggle_coupon_modal")
      .setTitle("Ativar/Desativar cupom");

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Codigo do cupom")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
    await interaction.showModal(modal);
    logExit("handleButton:adminToggleCouponModal", { userId: interaction.user.id });
    return;
  }

  if (customId === "admin_delete_coupon" || customId === "admin_coupon_delete") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminDeleteCouponDenied", { userId: interaction.user.id });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId("admin_delete_coupon_modal")
      .setTitle("Apagar cupom");

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Codigo do cupom")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
    await interaction.showModal(modal);
    logExit("handleButton:adminDeleteCouponModal", { userId: interaction.user.id });
    return;
  }

  if (customId === "admin_post_product1" || customId.startsWith("admin_post_product:")) {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminPostDenied", { userId: interaction.user.id });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const productId = customId === "admin_post_product1" ? "product1" : customId.split(":")[1];
    if (!productId) {
      await interaction.editReply("Nenhum produto configurado para postagem.");
      return;
    }
    const channel = interaction.channel;
    const precheck = getProductForGuild(interaction.guildId, productId, true).product;
    if (!precheck) {
      const list = listProductsForGuild(interaction.guildId, { force: true });
      const ids = list.products.map((p) => p.id).join(", ") || "nenhum";
      await interaction.editReply(`Produto nao encontrado. IDs carregados: ${ids}.`);
      log("warn", "handleButton:adminPostNotFound", { ids });
      return;
    }
    const purge = await purgeChannelMessages(channel);
    if (!purge.ok) {
      await interaction.editReply(`Nao consegui limpar o canal: ${purge.reason}`);
      log("warn", "handleButton:purgeFailed", { reason: purge.reason, channelId: channel?.id });
      return;
    }
    const posted = await postProductToChannel(interaction.guild, channel, productId);
    if (!posted?.ok) {
      await interaction.editReply(`Nao foi possivel postar: ${posted?.reason || "erro desconhecido"}`);
      return;
    }
    await interaction.editReply(`Produto ${productId} postado.`);
    logExit("handleButton:adminPost", { userId: interaction.user.id, channelId: channel?.id, productId });
    return;
  }

  if (customId.startsWith("cart_admin_confirm:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((entry) => entry.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Apenas admins podem confirmar compra.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:adminConfirmDenied", { userId: interaction.user.id, cartId });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await confirmCartPurchaseByAdmin(cart, interaction.user.id);
      const cartChannel = cart.channelId ? await client.channels.fetch(cart.channelId).catch(() => null) : null;
      if (cartChannel && cartChannel.isTextBased && cartChannel.isTextBased() && result.product && result.variant) {
        await sendOrUpdateCartMessage(cartChannel, cart, result.product, result.variant);
      }
      if (!result.ok) {
        if (result.reason === "confirmacao em andamento") {
          await interaction.editReply("Ja existe uma confirmacao em andamento para este carrinho.");
        } else if (result.reason === "waiting_stock") {
          await interaction.editReply("Compra confirmada, mas sem estoque. Pedido ficou aguardando reposicao.");
        } else if (result.reason === "pedido ja entregue") {
          await interaction.editReply("Este carrinho ja possui entrega concluida.");
        } else {
          await interaction.editReply(`Nao foi possivel confirmar compra: ${result.reason}.`);
        }
        return;
      }

      if (cartChannel && cartChannel.isTextBased && cartChannel.isTextBased()) {
        await sendSystemEmbed(
          cartChannel,
          "Compra confirmada pela equipe",
          `Pedido confirmado manualmente por <@${interaction.user.id}>.\nEntrega processada para <@${cart.userId}>.`,
          "success"
        );
      }
      if (cart.adminActionChannelId && cart.adminActionMessageId) {
        const staffChannel = await client.channels.fetch(cart.adminActionChannelId).catch(() => null);
        if (staffChannel && staffChannel.isTextBased && staffChannel.isTextBased()) {
          const adminMsg = await staffChannel.messages.fetch(cart.adminActionMessageId).catch(() => null);
          if (adminMsg) {
            const disabledRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`cart_admin_confirm:${cart.id}`)
                .setLabel("Pagamento Confirmado")
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
            );
            await adminMsg.edit({ components: [disabledRow] }).catch(() => null);
          }
        }
        cart.adminActionMessageId = "";
        cart.adminActionChannelId = "";
        cart.updatedAt = new Date().toISOString();
        saveJson(CARTS_PATH, cartsDb);
      }
      await notifyStaffLog("Compra confirmada (admin)", {
        guildId: cart.guildId,
        userId: cart.userId,
        cartId: cart.id,
        channelId: cart.channelId,
        productId: cart.productId,
        variantId: cart.variantId,
        paymentId: result.order?.paymentId,
        value: result.order?.value ? formatCurrency(result.order.value) : null
      });

      await interaction.editReply("Compra confirmada e entrega processada.");
    } catch (err) {
      logError("handleButton:adminConfirm", err, { cartId, userId: interaction.user.id });
      await interaction.editReply("Falha ao confirmar compra manualmente.");
    }
    return;
  }

  if (customId.startsWith("cart_qty:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartQtyNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartQtyDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status !== "open") {
      await interaction.reply({ content: "Nao e possivel alterar a quantidade neste status.", flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder().setCustomId(`cart_qty_modal:${cartId}`).setTitle("Alterar quantidade");

    const qtyInput = new TextInputBuilder()
      .setCustomId("quantity")
      .setLabel("Quantidade")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(String(getCartQuantity(cart)));

    modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));
    await interaction.showModal(modal);
    logExit("handleButton:cartQtyModal", { cartId, userId: interaction.user.id });
    return;
  }

  if (customId.startsWith("cart_remove_coupon:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartRemoveCouponNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartRemoveCouponDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status !== "open") {
      await interaction.reply({ content: "Nao e possivel remover cupom neste status.", flags: MessageFlags.Ephemeral });
      return;
    }

    cart.couponCode = null;
    cart.discountPercent = 0;
    cart.updatedAt = new Date().toISOString();
    saveJson(CARTS_PATH, cartsDb);

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (product && variant) {
      await sendOrUpdateCartMessage(interaction.channel, cart, product, variant);
    }

    await interaction.reply({ content: "Cupom removido.", flags: MessageFlags.Ephemeral });
    await touchCartActivity(cart.id);
    return;
  }

  if (customId.startsWith("cart_coupon:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartCouponNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartCouponDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status !== "open") {
      await interaction.reply({ content: "Nao e possivel adicionar cupom neste status.", flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`cart_coupon_modal:${cartId}`)
      .setTitle("Adicionar cupom");

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Codigo do cupom")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
    await interaction.showModal(modal);
    logExit("handleButton:cartCouponModal", { cartId, userId: interaction.user.id });
    return;
  }

  if (customId.startsWith("cart_pay:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartPayNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartPayDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status === "cancelled") {
      await interaction.reply({ content: "Carrinho cancelado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartPayCancelled", { cartId });
      return;
    }
    if (cart.status === "paid") {
      await interaction.reply({ content: "Este carrinho ja foi finalizado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (cart.status === "expired") {
      await interaction.reply({ content: "Este carrinho expirou. Abra um novo carrinho para comprar.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (cart.status === "pending") {
      await interaction.reply({ content: "Pix ja gerado. Aguarde a confirmacao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartPayPending", { cartId });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const license = getGuildLicense(cart.guildId);
    if (shouldEnforceLicense(cart.guildId) && !license.ok) {
      await interaction.editReply(buildLicenseBlockedPayload(cart.guildId, license));
      log("warn", "handleButton:cartPay:licenseDenied", { guildId: cart.guildId, reason: license.reason });
      return;
    }

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (!product || !variant) {
      await interaction.editReply("Produto/variacao invalida.");
      log("warn", "handleButton:cartPayInvalid", { cartId, productId: cart.productId, variantId: cart.variantId });
      return;
    }

    const quantity = getCartQuantity(cart);
    if (!isInfiniteStock(product)) {
      const available = getAvailableStockCount(cart.guildId, product.id, variant.id);
      if (available <= 0 || available < quantity) {
        await interaction.editReply(`Sem estoque para esta quantidade. Disponivel: ${available}.`);
        return;
      }
    }

    try {
      const payment = await createPixPayment(interaction.user, cart, product, variant);
      await sendPixMessage(interaction.channel, cart, product, variant, payment);
      await sendOrUpdateCartMessage(interaction.channel, cart, product, variant);
      await notifyStaffLog("PIX gerado", {
        guildId: cart.guildId,
        userId: interaction.user?.id,
        cartId,
        productId: product.id,
        variantId: variant.id,
        value: formatCurrency(payment.finalPrice),
        paymentId: payment.paymentId
      });
      await interaction.editReply("Pix gerado. Confira no canal do carrinho.");
      await touchCartActivity(cart.id);
      logExit("handleButton:cartPay", { cartId, paymentId: payment.paymentId });
    } catch (err) {
      logError("handleButton:cartPay", err, { cartId });
      const code = asString(err?.code || err?.message).toLowerCase();
      if (code.includes("mercadopago_not_configured") || code.includes("mercado pago nao configurado")) {
        await interaction.editReply("Nao foi possivel gerar o Pix: Mercado Pago da plataforma nao configurado.");
      } else {
        await interaction.editReply("Nao foi possivel gerar o Pix. Avise um staff.");
      }
    }
    return;
  }

  if (customId.startsWith("pix_copy:")) {
    const paymentId = customId.split(":")[1];
    const order = ordersDb.orders.find((o) => o.paymentId === paymentId);
    if (!order) {
      await interaction.reply({ content: "Pagamento nao encontrado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.user?.id !== order.userId && !isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao para este pagamento.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!order.pixPayload) {
      await interaction.reply({ content: "Codigo Pix indisponivel.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `PIX Copia e Cola:\n\`\`\`\n${order.pixPayload}\n\`\`\``, flags: MessageFlags.Ephemeral });
    return;
  }

  if (customId.startsWith("pix_qr:")) {
    const paymentId = customId.split(":")[1];
    const order = ordersDb.orders.find((o) => o.paymentId === paymentId);
    if (!order) {
      await interaction.reply({ content: "Pagamento nao encontrado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.user?.id !== order.userId && !isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao para este pagamento.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!order.pixPayload) {
      await interaction.reply({ content: "QR Code indisponivel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const qrBuffer = await QRCode.toBuffer(order.pixPayload);
    const file = new AttachmentBuilder(qrBuffer, { name: "qrcode.png" });
    await interaction.reply({ content: "QR Code:", files: [file], flags: MessageFlags.Ephemeral });
    return;
  }

  if (customId.startsWith("pix_terms:")) {
    const paymentId = customId.split(":")[1];
    const order = ordersDb.orders.find((o) => o.paymentId === paymentId);
    if (!order) {
      await interaction.reply({ content: "Pagamento nao encontrado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.user?.id !== order.userId && !isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao para este pagamento.", flags: MessageFlags.Ephemeral });
      return;
    }
    const terms = String(config.termsText || "").trim();
    await interaction.reply({ content: terms || "Termos indisponiveis.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (customId.startsWith("cart_cancel:")) {
    const cartId = customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartCancelNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleButton:cartCancelDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status === "paid") {
      await interaction.reply({ content: "Este carrinho ja foi finalizado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (cart.status === "cancelled" || cart.status === "expired") {
      await interaction.reply({ content: "Este carrinho ja esta finalizado.", flags: MessageFlags.Ephemeral });
      return;
    }

    const now = new Date().toISOString();
    cart.status = "cancelled";
    cart.updatedAt = now;
    cart.lastActivityAt = now;
    saveJson(CARTS_PATH, cartsDb);

    const affected = ordersDb.orders.filter(
      (o) => o.cartId === cartId && (o.status === "pending" || o.status === "waiting_stock")
    );
    for (const order of affected) {
      order.status = "cancelled";
      order.cancelledAt = now;
      order.updatedAt = now;
      appendOrderEvent(order, "order_cancelled", { actor: interaction.user.id, source: "cart_cancel" }, now);
    }
    if (affected.length) {
      saveJson(ORDERS_PATH, ordersDb);
    }

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (product && variant) {
      await sendOrUpdateCartMessage(interaction.channel, cart, product, variant);
    }

    await interaction.reply({ content: "Carrinho cancelado.", flags: MessageFlags.Ephemeral });
    await sendSystemEmbed(
      interaction.channel,
      "Carrinho cancelado",
      "Carrinho cancelado pelo usuario.\nSe precisar, abra um novo carrinho pelo menu do produto.",
      "danger"
    );
    await touchCartActivity(cart.id);
    logExit("handleButton:cartCancel", { cartId, userId: interaction.user.id });
    return;
  }
}

async function handleModalSubmit(interaction) {
  logEnter("handleModalSubmit", { userId: interaction.user?.id, customId: interaction.customId });
  if (interaction.customId === "admin_coupon_modal") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminCouponDenied", { userId: interaction.user.id });
      return;
    }

    const code = interaction.fields.getTextInputValue("code").trim().toUpperCase();
    const percentRaw = interaction.fields.getTextInputValue("percent").trim();
    const percent = Number(percentRaw);

    if (!code || Number.isNaN(percent) || percent <= 0 || percent >= 100) {
      await interaction.reply({ content: "Dados invalidos.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminCouponInvalid", { code, percentRaw });
      return;
    }

    const exists = couponsDb.coupons.find((c) => c.code === code);
    if (exists) {
      await interaction.reply({ content: "Cupom ja existe.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminCouponExists", { code });
      return;
    }

    couponsDb.coupons.push({
      code,
      percent,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: interaction.user.id
    });
    saveJson(COUPONS_PATH, couponsDb);

    await interaction.reply({ content: `Cupom ${code} criado.`, flags: MessageFlags.Ephemeral });
    logExit("handleModalSubmit:adminCouponCreated", { code, percent });
    return;
  }

  if (interaction.customId === "admin_toggle_coupon_modal") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminToggleDenied", { userId: interaction.user.id });
      return;
    }

    const code = interaction.fields.getTextInputValue("code").trim().toUpperCase();
    const coupon = couponsDb.coupons.find((c) => c.code === code);
    if (!coupon) {
      await interaction.reply({ content: "Cupom nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminToggleNotFound", { code });
      return;
    }

    coupon.active = coupon.active === false ? true : false;
    coupon.updatedAt = new Date().toISOString();
    saveJson(COUPONS_PATH, couponsDb);

    await interaction.reply({
      content: `Cupom ${code} agora esta ${coupon.active === false ? "inativo" : "ativo"}.`,
      flags: MessageFlags.Ephemeral
    });
    logExit("handleModalSubmit:adminToggleApplied", { code, active: coupon.active });
    return;
  }

  if (interaction.customId === "admin_delete_coupon_modal") {
    if (!isAdmin(interaction.user.id)) {
      await interaction.reply({ content: "Sem permissao.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminDeleteDenied", { userId: interaction.user.id });
      return;
    }

    const code = interaction.fields.getTextInputValue("code").trim().toUpperCase();
    const before = couponsDb.coupons.length;
    couponsDb.coupons = couponsDb.coupons.filter((c) => c.code !== code);
    const removed = before - couponsDb.coupons.length;
    if (!removed) {
      await interaction.reply({ content: "Cupom nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:adminDeleteNotFound", { code });
      return;
    }

    saveJson(COUPONS_PATH, couponsDb);
    await interaction.reply({ content: `Cupom ${code} apagado.`, flags: MessageFlags.Ephemeral });
    logExit("handleModalSubmit:adminDeleteApplied", { code });
    return;
  }

  if (interaction.customId.startsWith("cart_qty_modal:")) {
    const cartId = interaction.customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (cart.status !== "open") {
      await interaction.reply({ content: "Nao e possivel alterar a quantidade neste status.", flags: MessageFlags.Ephemeral });
      return;
    }

    const raw = String(interaction.fields.getTextInputValue("quantity") || "").trim().replace(",", ".");
    const qty = Math.floor(Number(raw));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      await interaction.reply({ content: "Quantidade invalida. Use um numero entre 1 e 99.", flags: MessageFlags.Ephemeral });
      return;
    }

    cart.quantity = qty;
    cart.updatedAt = new Date().toISOString();
    saveJson(CARTS_PATH, cartsDb);

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (product && variant) {
      await sendOrUpdateCartMessage(interaction.channel, cart, product, variant);
    }

    await interaction.reply({ content: `Quantidade atualizada para ${qty}.`, flags: MessageFlags.Ephemeral });
    await touchCartActivity(cart.id);
    return;
  }

  if (interaction.customId.startsWith("cart_coupon_modal:")) {
    const cartId = interaction.customId.split(":")[1];
    const cart = cartsDb.carts.find((c) => c.id === cartId);
    if (!cart) {
      await interaction.reply({ content: "Carrinho nao encontrado.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:cartCouponNotFound", { cartId });
      return;
    }
    if (!canAccessCart(interaction, cart)) {
      await interaction.reply({ content: "Sem permissao para este carrinho.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:cartCouponDenied", { cartId, userId: interaction.user.id });
      return;
    }
    if (cart.status !== "open") {
      await interaction.reply({ content: "Nao e possivel aplicar cupom neste status.", flags: MessageFlags.Ephemeral });
      return;
    }

    const code = interaction.fields.getTextInputValue("code").trim().toUpperCase();
    const coupon = couponsDb.coupons.find((c) => c.code === code && c.active !== false);

    if (!coupon) {
      await interaction.reply({ content: "Cupom invalido.", flags: MessageFlags.Ephemeral });
      log("warn", "handleModalSubmit:cartCouponInvalid", { cartId, code });
      return;
    }

    cart.couponCode = code;
    cart.discountPercent = coupon.percent;
    cart.updatedAt = new Date().toISOString();
    saveJson(CARTS_PATH, cartsDb);

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (product && variant) {
      await sendOrUpdateCartMessage(interaction.channel, cart, product, variant);
    }

    await interaction.reply({ content: `Cupom ${code} aplicado.`, flags: MessageFlags.Ephemeral });
    const quantity = getCartQuantity(cart);
    const finalPrice = product && variant ? applyDiscount(variant.price * quantity, cart.discountPercent) : null;
    const priceLine = finalPrice ? `Preco Total: **${formatCurrency(finalPrice)}**` : null;
    await sendSystemEmbed(
      interaction.channel,
      "Cupom aplicado",
      `Cupom **${code}** aplicado.\nDesconto: **${coupon.percent}%**${priceLine ? `\n${priceLine}` : ""}`,
      "success"
    );
    await notifyStaffLog("Cupom aplicado", {
      guildId: cart.guildId,
      userId: interaction.user?.id,
      cartId,
      code,
      percent: coupon.percent,
      finalPrice: finalPrice ? formatCurrency(finalPrice) : null
    });
    await touchCartActivity(cart.id);
    logExit("handleModalSubmit:cartCouponApplied", { cartId, code, percent: coupon.percent });
    return;
  }
}

function normalizeVariant(product, variant) {
  const id = String(variant?.id || "").trim();
  if (!id) return null;
  const price = Number(variant?.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    id,
    label: String(variant?.label || product?.shortLabel || product?.name || id),
    emoji: String(variant?.emoji || "").trim(),
    duration: String(variant?.duration || "sem duracao"),
    price
  };
}

function getSelectableVariants(product) {
  if (!product || !Array.isArray(product.variants)) return [];
  const variants = [];
  const seen = new Set();
  for (const raw of product.variants) {
    const normalized = normalizeVariant(product, raw);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    variants.push(normalized);
  }
  return variants;
}

function getVariant(product, variantId) {
  const id = String(variantId || "").trim();
  if (!id) return null;
  const variants = getSelectableVariants(product);
  return variants.find((entry) => entry.id === id) || null;
}

const INSTANCE_STORE_CACHE_TTL_MS = 2000;
const instanceStoreCache = new Map();

function instanceProductsPath(instanceId) {
  return path.join(INSTANCES_DIR, String(instanceId || ""), "products.json");
}

function instanceStockPath(instanceId) {
  return path.join(INSTANCES_DIR, String(instanceId || ""), "stock.json");
}

function getCurrentRuntimeApplicationId() {
  const current = asString(client.application?.id || runtimeClientApplicationId || client.user?.id);
  if (current) runtimeClientApplicationId = current;
  return current;
}

function findPortalInstanceForGuild(guildId) {
  const gid = String(guildId || "").trim();
  if (!gid) return null;
  const data = portalStore.load();
  return (data.instances || []).find((i) => String(i.discordGuildId || "") === gid) || null;
}

function isPortalInstanceAssignedToCurrentBot(instance) {
  const instanceClientId = asString(instance?.botProfile?.applicationId);
  if (!instanceClientId) return true;
  const runtimeClientId = getCurrentRuntimeApplicationId();
  if (!runtimeClientId) return true;
  return instanceClientId === runtimeClientId;
}

function getRuntimeBoundInstance() {
  if (!isInstanceRuntime) return null;
  const runtimeInstanceId = asString(process.env.INSTANCE_ID);
  if (!runtimeInstanceId) return null;
  const data = portalStore.load();
  const instance = (data.instances || []).find((i) => String(i?.id || "") === runtimeInstanceId) || null;
  if (!instance) return null;
  if (!isPortalInstanceAssignedToCurrentBot(instance)) return null;
  return instance;
}

function canCurrentRuntimeHandleGuild(guildId) {
  const gid = String(guildId || "").trim();
  if (!gid) return !isInstanceRuntime;
  const linkedInstance = findPortalInstanceForGuild(gid);
  if (isInstanceRuntime) {
    const runtimeInstance = getRuntimeBoundInstance();
    if (!runtimeInstance) return false;
    if (!linkedInstance) return true;
    return String(linkedInstance.id || "") === String(runtimeInstance.id || "");
  }
  if (!linkedInstance) return true;
  return isPortalInstanceAssignedToCurrentBot(linkedInstance);
}

function getPortalInstanceForGuild(guildId) {
  const instance = findPortalInstanceForGuild(guildId);
  if (instance) {
    if (!isPortalInstanceAssignedToCurrentBot(instance)) return null;
    return instance;
  }
  if (isInstanceRuntime) {
    return getRuntimeBoundInstance();
  }
  return null;
}

function getGuildChannelConfig(guildId) {
  const inst = getPortalInstanceForGuild(guildId);
  const ch = inst?.channels && typeof inst.channels === "object" ? inst.channels : {};
  return {
    logsChannelId: asString(ch.logsChannelId),
    salesChannelId: asString(ch.salesChannelId),
    feedbackChannelId: asString(ch.feedbackChannelId)
  };
}

function getInstanceIdForGuild(guildId) {
  const instance = getPortalInstanceForGuild(guildId);
  return instance?.id ? String(instance.id) : "";
}

function loadInstanceStore(instanceId, options = {}) {
  const id = String(instanceId || "").trim();
  if (!id) {
    return {
      productsDb: { products: [] },
      stockDb: { stock: {} },
      productsPath: "",
      stockPath: ""
    };
  }

  const force = options.force === true;
  const now = Date.now();
  const cached = instanceStoreCache.get(id) || null;
  if (!force && cached && now - Number(cached.loadedAt || 0) < INSTANCE_STORE_CACHE_TTL_MS) {
    return cached;
  }

  const productsPath = instanceProductsPath(id);
  const stockPath = instanceStockPath(id);

  const productsDbLocal = loadJson(productsPath, { products: [] });
  if (!Array.isArray(productsDbLocal.products)) productsDbLocal.products = [];

  const stockDbLocal = loadJson(stockPath, { stock: {} });
  if (!stockDbLocal.stock || typeof stockDbLocal.stock !== "object") stockDbLocal.stock = {};

  const record = {
    loadedAt: now,
    productsDb: productsDbLocal,
    stockDb: stockDbLocal,
    productsPath,
    stockPath
  };
  instanceStoreCache.set(id, record);
  return record;
}

function getStoreContextForGuild(guildId, options = {}) {
  const gid = String(guildId || "").trim();
  const linkedInstance = gid ? findPortalInstanceForGuild(gid) : null;
  const runtimeInstance = isInstanceRuntime ? getRuntimeBoundInstance() : null;

  if (runtimeInstance?.id) {
    if (linkedInstance && String(linkedInstance.id || "") !== String(runtimeInstance.id || "")) {
      return {
        source: "blocked",
        instanceId: asString(linkedInstance.id),
        productsDb: { products: [] },
        stockDb: { stock: {} },
        productsPath: "",
        stockPath: ""
      };
    }
    const boundInstanceId = String(runtimeInstance.id);
    const store = loadInstanceStore(boundInstanceId, options);
    return {
      source: "instance",
      instanceId: boundInstanceId,
      productsDb: store.productsDb,
      stockDb: store.stockDb,
      productsPath: store.productsPath,
      stockPath: store.stockPath
    };
  }

  if (linkedInstance && !isPortalInstanceAssignedToCurrentBot(linkedInstance)) {
    return {
      source: "blocked",
      instanceId: asString(linkedInstance.id),
      productsDb: { products: [] },
      stockDb: { stock: {} },
      productsPath: "",
      stockPath: ""
    };
  }
  const instanceId = linkedInstance?.id ? String(linkedInstance.id) : "";
  if (instanceId) {
    const store = loadInstanceStore(instanceId, options);
    return {
      source: "instance",
      instanceId,
      productsDb: store.productsDb,
      stockDb: store.stockDb,
      productsPath: store.productsPath,
      stockPath: store.stockPath
    };
  }
  return {
    source: "legacy",
    instanceId: "",
    productsDb,
    stockDb,
    productsPath: PRODUCTS_PATH,
    stockPath: STOCK_PATH
  };
}

function saveStoreStock(ctx) {
  if (!ctx || !ctx.stockPath) return;
  saveJson(ctx.stockPath, ctx.stockDb);
  if (ctx.source === "instance" && ctx.instanceId) {
    instanceStoreCache.set(ctx.instanceId, {
      loadedAt: Date.now(),
      productsDb: ctx.productsDb,
      stockDb: ctx.stockDb,
      productsPath: ctx.productsPath,
      stockPath: ctx.stockPath
    });
  }
}

function listProductsForGuild(guildId, options = {}) {
  const ctx = getStoreContextForGuild(guildId, options);
  const list = Array.isArray(ctx.productsDb?.products) ? ctx.productsDb.products : [];
  return { ctx, products: list };
}

function getProductForGuild(guildId, productId, refreshOnMiss = false) {
  const wanted = String(productId || "").trim();
  const ctx = getStoreContextForGuild(guildId, { force: refreshOnMiss });
  let product = Array.isArray(ctx.productsDb?.products)
    ? ctx.productsDb.products.find((p) => String(p?.id) === wanted) || null
    : null;

  if (!product && refreshOnMiss && ctx.source === "legacy") {
    reloadProducts();
    product = productsDb.products.find((p) => String(p?.id) === wanted) || null;
  }

  return { ctx, product };
}

function getProductStockBuckets(guildId, productId) {
  const ctx = getStoreContextForGuild(guildId);
  const raw = ctx.stockDb.stock?.[productId];
  if (!raw) return { default: [], shared: [] };
  if (Array.isArray(raw)) {
    return { default: raw, shared: [] };
  }
  const buckets = { ...raw };
  buckets.default = Array.isArray(raw.default) ? raw.default : [];
  buckets.shared = Array.isArray(raw.shared) ? raw.shared : [];
  return buckets;
}

function getStockCoverageForProduct(guildId, product) {
  const variants = getSelectableVariants(product);
  const stock = getProductStockBuckets(guildId, product?.id);
  const fallbackCount = (stock.default?.length || 0) + (stock.shared?.length || 0);
  const coverage = variants.map((variant) => {
    const ownCount = Array.isArray(stock[variant.id]) ? stock[variant.id].length : 0;
    const availableCount = ownCount > 0 ? ownCount : fallbackCount;
    return {
      variantId: variant.id,
      ownCount,
      fallbackCount,
      availableCount,
      covered: availableCount > 0
    };
  });
  return { fallbackCount, coverage };
}

function validateProductForPosting(guildId, product) {
  const issues = [];
  if (!product?.id) issues.push("produto sem id");
  if (!product?.name) issues.push("produto sem nome");
  const variants = getSelectableVariants(product);
  if (!variants.length) issues.push("produto sem variacoes validas");
  if (variants.length > 25) issues.push("mais de 25 variacoes (limite do select)");
  const stockCoverage = getStockCoverageForProduct(guildId, product);
  const totalKeys = Object.values(getProductStockBuckets(guildId, product?.id)).reduce((sum, list) => {
    if (!Array.isArray(list)) return sum;
    return sum + list.length;
  }, 0);
  if (totalKeys <= 0) issues.push("produto sem estoque");
  const uncovered = stockCoverage.coverage.find((entry) => !entry.covered);
  if (uncovered) {
    issues.push(`variacao sem key: ${uncovered.variantId}`);
  }
  return issues;
}

function reloadProducts() {
  const fresh = loadJson(PRODUCTS_PATH, { products: [] });
  if (!Array.isArray(fresh.products)) {
    fresh.products = [];
  }
  productsDb.products = fresh.products;
  log("info", "products:reload", { count: productsDb.products.length });
  return productsDb.products;
}

async function resolveMember(message) {
  logEnter("resolveMember", { userId: message.author?.id });
  if (message.member) return message.member;
  if (!message.guild) return null;
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  logExit("resolveMember", { userId: message.author?.id, found: !!member });
  return member;
}

function isAdmin(userId) {
  const ids = new Set();
  if (Array.isArray(config.adminUserIds)) {
    for (const id of config.adminUserIds) {
      if (id) ids.add(String(id));
    }
  }
  if (config.adminUserId) ids.add(String(config.adminUserId));
  const envAdmins = (process.env.ADMIN_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of envAdmins) ids.add(String(id));
  const result = ids.has(String(userId));
  log("debug", "isAdmin", { userId: String(userId), result });
  return result;
}

function isStaff(member) {
  if (!member) return false;
  if (isAdmin(member.id)) return true;
  const result = member.roles.cache.has(config.staffRoleId);
  log("debug", "isStaff", { userId: member.id, result, staffRoleId: config.staffRoleId });
  return result;
}

function getPortalBaseUrl() {
  const env = String(process.env.PORTAL_BASE_URL || "").trim();
  if (env) return env;
  const hostRaw = String(process.env.PORTAL_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const host = hostRaw === "0.0.0.0" ? "127.0.0.1" : hostRaw;
  const port = Number(process.env.PORTAL_PORT || 3100);
  return `http://${host}:${port}`;
}

function isPlanActive(plan) {
  if (!plan || typeof plan !== "object") return false;
  if (String(plan.status || "").toLowerCase() !== "active") return false;
  const expiresAt = String(plan.expiresAt || "").trim();
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (!Number.isFinite(ts)) return false;
  return ts > Date.now();
}

function getLicenseMode() {
  const raw = String(process.env.LICENSE_MODE || config.licenseMode || "auto")
    .trim()
    .toLowerCase();
  if (raw === "off" || raw === "false" || raw === "0") return "off";
  if (raw === "on" || raw === "true" || raw === "1" || raw === "enforce") return "enforce";
  return "auto";
}

function getGuildLicense(guildId) {
  const gid = String(guildId || "").trim();
  if (!gid) return { ok: false, reason: "missing_guild" };

  const data = portalStore.load();
  const instance = (data.instances || []).find((i) => String(i.discordGuildId || "") === gid) || null;
  if (!instance) return { ok: false, reason: "unlinked" };

  const owner =
    (data.users || []).find((u) => String(u.discordUserId || "") === String(instance.ownerDiscordUserId || "")) || null;
  if (!owner) return { ok: false, reason: "owner_missing", instance };

  const plan = owner.plan || null;
  if (!isPlanActive(plan)) return { ok: false, reason: "plan_inactive", instance, owner, plan };

  return { ok: true, instance, owner, plan };
}

function resolveSaleOwnerForGuild(guildId) {
  const license = getGuildLicense(guildId);
  const instanceId = asString(license?.instance?.id);
  const ownerDiscordUserId = asString(license?.owner?.discordUserId || license?.instance?.ownerDiscordUserId);
  if (instanceId || ownerDiscordUserId) {
    return { instanceId, ownerDiscordUserId };
  }

  const runtimeInstance = getRuntimeBoundInstance();
  if (runtimeInstance) {
    return {
      instanceId: asString(runtimeInstance.id),
      ownerDiscordUserId: asString(runtimeInstance.ownerDiscordUserId)
    };
  }

  return { instanceId: "", ownerDiscordUserId: "" };
}

function shouldEnforceLicense(guildId) {
  const mode = getLicenseMode();
  if (mode === "off") return false;
  if (mode === "enforce") return true;

  // auto: enforce only after the server is linked to a Portal instance (SaaS mode).
  const gid = String(guildId || "").trim();
  if (!gid) return false;
  const data = portalStore.load();
  return (data.instances || []).some((i) => String(i.discordGuildId || "") === gid);
}

function buildLicenseBlockedPayload(guildId, license) {
  const baseUrl = getPortalBaseUrl();
  const guildLabel = guildId ? `Guild: ${guildId}` : "";
  const reason = license?.reason || "licenca_invalida";
  const planExpires = license?.plan?.expiresAt ? `Plano expira em: ${String(license.plan.expiresAt).slice(0, 10)}` : "";

  const lines = [];
  lines.push("Este servidor precisa de uma licenca ativa para vender.");
  if (reason === "unlinked") {
    lines.push("Status: servidor nao vinculado ao Portal.");
  } else if (reason === "plan_inactive") {
    lines.push("Status: plano inativo ou expirado.");
    if (planExpires) lines.push(planExpires);
  } else {
    lines.push(`Status: ${reason}`);
  }
  if (guildLabel) lines.push(guildLabel);
  lines.push("");
  lines.push(`1) Acesse: ${baseUrl}/plans`);
  lines.push("2) Ative Trial (24h) ou Start (pago)");
  lines.push("3) Na Dashboard, crie uma instancia e gere sua API key");
  lines.push("4) No servidor, rode: `!link SUA_API_KEY` (admin)");

  return buildSystemEmbedPayload("Licenca necessaria", lines.join("\n"), "warn", { includeBanner: true, includeThumbnail: true });
}

function canAccessCart(interaction, cart) {
  if (!cart) return false;
  if (interaction.user?.id === cart.userId) return true;
  const member = interaction.member;
  if (!member) return false;
  return isAdmin(member.id) || member.roles.cache.has(config.staffRoleId);
}

function getLatestOrderByCartId(cartId) {
  if (!cartId) return null;
  const orders = ordersDb.orders
    .filter((order) => order.cartId === cartId)
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  return orders[0] || null;
}

function appendOrderEvent(order, type, details = {}, at = new Date().toISOString()) {
  if (!order || !type) return;
  if (!Array.isArray(order.events)) {
    order.events = [];
  }
  order.events.push({
    id: randomUUID(),
    type: String(type),
    at,
    details: details && typeof details === "object" ? details : {}
  });
}

function appendOrderConfirmation(order, source, byUserId, note = "", at = new Date().toISOString()) {
  if (!order || !source) return;
  if (!Array.isArray(order.confirmations)) {
    order.confirmations = [];
  }
  const nextSource = String(source || "pix");
  const nextByUserId = byUserId ? String(byUserId) : "";
  const nextNote = String(note || "");
  const last = order.confirmations[order.confirmations.length - 1];
  if (
    last &&
    String(last.source || "") === nextSource &&
    String(last.byUserId || "") === nextByUserId &&
    String(last.note || "") === nextNote
  ) {
    return;
  }
  order.confirmations.push({
    id: randomUUID(),
    source: nextSource,
    byUserId: nextByUserId,
    at,
    note: nextNote
  });
}

function markOrderConfirmed(order, source, byUserId, note = "", at = new Date().toISOString()) {
  if (!order) return;
  const normalizedSource = source || order.confirmedSource || "pix";
  order.confirmedSource = normalizedSource;
  if (byUserId) {
    order.confirmedByUserId = String(byUserId);
  }
  order.confirmedAt = at;
  appendOrderConfirmation(order, normalizedSource, order.confirmedByUserId || byUserId || "", note, at);
}

function toCents(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

function getPlatformFeePercent() {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT || config.platformFeePercent || 6);
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 6;
  return raw;
}

function resolveOrderOwnerDiscordUserId(order) {
  const fromOrder = asString(order?.ownerDiscordUserId);
  if (fromOrder) return fromOrder;

  const data = portalStore.load();
  const instanceId = asString(order?.instanceId);
  if (instanceId) {
    const byInstanceId = (data.instances || []).find((i) => String(i?.id || "") === instanceId) || null;
    const ownerByInstanceId = asString(byInstanceId?.ownerDiscordUserId);
    if (ownerByInstanceId) return ownerByInstanceId;
  }

  const guildId = asString(order?.guildId);
  if (guildId) {
    const byGuild = (data.instances || []).find((i) => String(i?.discordGuildId || "") === guildId) || null;
    const ownerByGuild = asString(byGuild?.ownerDiscordUserId);
    if (ownerByGuild) return ownerByGuild;
  }

  return "";
}

async function maybeCreditWalletForOrder(order) {
  try {
    if (!order) return { ok: false, reason: "missing_order" };
    if (order.walletCreditedAt) return { ok: false, reason: "already_credited" };

    const ownerDiscordUserId = resolveOrderOwnerDiscordUserId(order);
    if (!ownerDiscordUserId) return { ok: false, reason: "missing_owner" };

    const valueCents = Number(order.valueCents || 0) > 0 ? Number(order.valueCents) : toCents(order.value);
    if (!Number.isFinite(valueCents) || valueCents <= 0) return { ok: false, reason: "missing_value" };

    const feePercent = getPlatformFeePercent();
    const feeCents = Math.round((valueCents * feePercent) / 100);
    const netCents = Math.max(0, valueCents - feeCents);
    const now = new Date().toISOString();
    let txId = `tx_sale_${randomUUID()}`;
    let credited = false;

    await portalStore.runExclusive(async () => {
      const data = portalStore.load();
      if (!Array.isArray(data.transactions)) data.transactions = [];
      const existingTx =
        (data.transactions || []).find(
          (tx) =>
            String(tx?.type || "") === "sale_credit" &&
            String(tx?.metadata?.orderId || "") === String(order.id || "") &&
            String(tx?.ownerDiscordUserId || "") === ownerDiscordUserId
        ) || null;
      if (existingTx) {
        txId = asString(existingTx.id) || txId;
        credited = true;
        return;
      }

      const user = (data.users || []).find((u) => String(u.discordUserId || "") === ownerDiscordUserId) || null;
      if (!user) return;

      const prevSales = Math.floor(Number(user.salesCentsTotal || 0));
      const nextSales = prevSales + Math.floor(valueCents);
      user.salesCentsTotal = nextSales;

      user.walletCents = Math.floor(Number(user.walletCents || 0) + netCents);

      // Bonus: cada R$20,00 em vendas (gross) = +1 dia no plano.
      const prevDays = Math.floor(prevSales / 2000);
      const nextDays = Math.floor(nextSales / 2000);
      const bonusDays = Math.max(0, nextDays - prevDays);
      if (bonusDays > 0 && user.plan && String(user.plan.status || "").toLowerCase() === "active") {
        const currentExp = String(user.plan.expiresAt || "").trim();
        const baseTs = Number.isFinite(Date.parse(currentExp)) ? Date.parse(currentExp) : Date.now();
        const start = Math.max(Date.now(), baseTs);
        user.plan.expiresAt = new Date(start + bonusDays * 24 * 60 * 60 * 1000).toISOString();
      }

      data.transactions.push({
        id: txId,
        ownerDiscordUserId,
        type: "sale_credit",
        amountCents: netCents,
        status: "paid",
        provider: "internal",
        providerPaymentId: String(order.paymentId || ""),
        createdAt: now,
        updatedAt: now,
        metadata: {
          orderId: String(order.id || ""),
          grossCents: Math.floor(valueCents),
          feePercent,
          feeCents
        }
      });

      portalStore.save(data);
      credited = true;
    });

    if (!credited) {
      return { ok: false, reason: "owner_not_found" };
    }

    order.ownerDiscordUserId = ownerDiscordUserId;
    order.walletCreditedAt = now;
    order.platformFeePercent = feePercent;
    order.platformFeeCents = feeCents;
    order.netCents = netCents;
    order.walletTxId = txId;
    saveJson(ORDERS_PATH, ordersDb);

    return { ok: true, txId, netCents, feeCents };
  } catch (err) {
    logError("maybeCreditWalletForOrder", err, { orderId: order?.id });
    return { ok: false, reason: "error" };
  }
}

function upsertManualOrderForCart(cart, product, variant, adminUserId) {
  const now = new Date().toISOString();
  const latest = getLatestOrderByCartId(cart.id);
  const quantity = getCartQuantity(cart);
  const finalPrice = Number(applyDiscount(variant.price * quantity, cart.discountPercent || 0).toFixed(2));
  const valueCents = toCents(finalPrice);

  const saleOwner = resolveSaleOwnerForGuild(cart.guildId);
  const instanceId = asString(saleOwner.instanceId);
  const ownerDiscordUserId = asString(saleOwner.ownerDiscordUserId);

  if (latest && latest.status === "delivered") {
    return { order: latest, created: false, alreadyDelivered: true };
  }

  if (latest) {
    latest.productId = cart.productId;
    latest.variantId = cart.variantId;
    latest.channelId = cart.channelId;
    latest.couponCode = cart.couponCode || null;
    latest.discountPercent = cart.discountPercent || 0;
    latest.quantity = quantity;
    latest.value = finalPrice;
    latest.valueCents = valueCents;
    latest.guildId = cart.guildId;
    latest.instanceId = instanceId;
    latest.ownerDiscordUserId = ownerDiscordUserId;
    latest.status = latest.status === "waiting_stock" || latest.status === "failed" ? "pending" : latest.status;
    latest.paymentProvider = "manual";
    latest.providerStatus = "MANUAL_CONFIRMED";
    latest.providerStatusDetail = "";
    latest.asaasStatus = "MANUAL_CONFIRMED";
    latest.manualConfirmedByUserId = adminUserId;
    latest.manualConfirmedAt = now;
    latest.updatedAt = now;
    markOrderConfirmed(latest, "admin_button", adminUserId, "Compra confirmada manualmente");
    appendOrderEvent(latest, "manual_confirm_request", { actor: adminUserId, mode: "reuse_order" }, now);
    return { order: latest, created: false, alreadyDelivered: false };
  }

  const order = {
    id: randomUUID(),
    cartId: cart.id,
    paymentId: `manual-${randomUUID().split("-")[0]}`,
    paymentProvider: "manual",
    providerStatus: "MANUAL_CONFIRMED",
    providerStatusDetail: "",
    userId: cart.userId,
    guildId: cart.guildId,
    productId: cart.productId,
    variantId: cart.variantId,
    channelId: cart.channelId,
    couponCode: cart.couponCode || null,
    discountPercent: cart.discountPercent || 0,
    quantity,
    value: finalPrice,
    valueCents,
    instanceId,
    ownerDiscordUserId,
    status: "pending",
    asaasStatus: "MANUAL_CONFIRMED",
    createdAt: now,
    updatedAt: now,
    manualConfirmedByUserId: adminUserId,
    manualConfirmedAt: now,
    confirmedSource: "admin_button",
    confirmedByUserId: adminUserId,
    confirmedAt: now
  };
  appendOrderConfirmation(order, "admin_button", adminUserId, "Compra confirmada manualmente", now);
  appendOrderEvent(order, "manual_confirm_request", { actor: adminUserId, mode: "new_order" }, now);
  ordersDb.orders.push(order);
  return { order, created: true, alreadyDelivered: false };
}

async function confirmCartPurchaseByAdmin(cart, adminUserId) {
  if (!cart) return { ok: false, reason: "carrinho nao encontrado" };
  if (manualConfirmLocks.has(cart.id)) {
    return { ok: false, reason: "confirmacao em andamento" };
  }

  manualConfirmLocks.add(cart.id);
  try {
    if (cart.status === "cancelled" || cart.status === "expired") {
      return { ok: false, reason: "carrinho finalizado" };
    }

    const product = getProductForGuild(cart.guildId, cart.productId, true).product;
    const variant = getVariant(product, cart.variantId);
    if (!product || !variant) {
      return { ok: false, reason: "produto ou variacao invalida" };
    }

    const { order, alreadyDelivered } = upsertManualOrderForCart(cart, product, variant, adminUserId);
    saveJson(ORDERS_PATH, ordersDb);

    if (alreadyDelivered) {
      appendOrderEvent(order, "manual_confirm_skipped", { actor: adminUserId, reason: "already_delivered" });
      saveJson(ORDERS_PATH, ordersDb);
      return { ok: false, reason: "pedido ja entregue", order, product, variant };
    }

    const delivery = await deliverOrder(order, { source: "admin_button", confirmedByUserId: adminUserId });
    appendOrderEvent(order, delivery.ok ? "manual_confirm_delivered" : "manual_confirm_pending", {
      actor: adminUserId,
      reason: delivery.reason || ""
    });
    saveJson(ORDERS_PATH, ordersDb);
    return {
      ...delivery,
      order,
      product,
      variant
    };
  } finally {
    manualConfirmLocks.delete(cart.id);
  }
}

async function postProductToChannel(guild, channel, productId) {
  logEnter("postProductToChannel", { productId, channelId: channel?.id, guildId: guild?.id });

  const guildId = guild?.id || "";
  const license = getGuildLicense(guildId);
  if (shouldEnforceLicense(guildId) && !license.ok) {
    await channel.send(buildLicenseBlockedPayload(guildId, license));
    log("warn", "postProductToChannel:licenseDenied", { guildId, reason: license.reason });
    return { ok: false, reason: "licenca_necessaria" };
  }

  const product = getProductForGuild(guildId, productId, true).product;
  if (!product) {
    const list = listProductsForGuild(guildId, { force: true });
    const ids = list.products.map((p) => p.id).join(", ") || "nenhum";
    log("warn", "postProductToChannel:notFound", { productId, ids });
    await channel.send(`Produto nao encontrado. IDs carregados: ${ids}.`);
    return { ok: false, reason: "produto nao encontrado" };
  }

  const issues = validateProductForPosting(guildId, product);
  if (issues.length) {
    const reason = issues.join("; ");
    log("warn", "postProductToChannel:invalidProduct", { productId, issues });
    await channel.send(`Nao foi possivel postar o produto: ${reason}.`);
    return { ok: false, reason };
  }

  await sendPreProductGif(channel, product);

  let message = null;
  try {
    const messagePayload = buildProductMessage(product, { includeMedia: true, guildId });
    message = await channel.send(messagePayload);
  } catch (err) {
    logError("postProductToChannel:send", err, { productId });
    try {
      const fallbackPayload = buildProductMessage(product, { includeMedia: false, guildId });
      message = await channel.send(fallbackPayload);
      await channel.send("Produto postado sem midias. Verifique os arquivos do produto.");
      log("warn", "postProductToChannel:fallbackNoMedia", { productId });
    } catch (fallbackErr) {
      logError("postProductToChannel:fallback", fallbackErr, { productId });
      await channel.send("Falha ao montar o produto. Verifique os arquivos do produto.");
      return { ok: false, reason: "falha ao montar o produto" };
    }
  }
  if (!message) {
    return { ok: false, reason: "mensagem nao enviada" };
  }

  postsDb.posts.push({
    id: randomUUID(),
    guildId,
    productId: product.id,
    channelId: channel.id,
    messageId: message.id,
    createdAt: new Date().toISOString()
  });
  saveJson(POSTS_PATH, postsDb);
  logExit("postProductToChannel", { productId: product.id, messageId: message.id });
  return { ok: true, messageId: message.id };
}

async function sendPreProductGif(channel, product) {
  const gifPath = product?.prePostGif;
  if (!gifPath) return;
  try {
    const built = buildAttachment(gifPath);
    if (!built) return;
    await channel.send({ files: [built.attachment] });
    log("info", "preGif:sent", { channelId: channel?.id, name: built.name });
  } catch (err) {
    logError("preGif:send", err, { channelId: channel?.id });
  }
}

function buildProductMessage(product, options = {}) {
  logEnter("buildProductMessage", { productId: product?.id, includeMedia: options.includeMedia !== false });
  const includeMedia = options.includeMedia !== false;
  const guildId = String(options.guildId || "");
  const mode = getProductPostMode();

  let embeds = [];
  let files = [];
  let content = undefined;

  if (mode === "content") {
    const built = buildProductContentMessage(product, includeMedia);
    embeds = built.embeds || [];
    files = built.files || [];
    content = built.content;
  } else {
    const built = buildProductEmbeds(product, includeMedia);
    embeds = built.embeds || [];
    files = built.files || [];
  }
  const variants = getSelectableVariants(product);
  const limitedVariants = variants.slice(0, 25);

  if (!limitedVariants.length) {
    const warning = new EmbedBuilder()
      .setColor(COLOR_WARNING)
      .setTitle("Produto indisponivel")
      .setDescription(
        "Este produto ainda nao possui variacoes validas.\nAjuste as variacoes no painel para habilitar a compra."
      );
    return {
      embeds: [...embeds, warning],
      components: [],
      files
    };
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`product_select:${product.id}`)
    .setPlaceholder("Escolha uma variacao do produto...")
    .addOptions(
      limitedVariants.map((variant) => {
        const availableKeys = isInfiniteStock(product)
          ? "(estoque infinito)"
          : `(estoque ${Math.max(0, getAvailableStockCount(guildId, product.id, variant.id))})`;
        const descriptionText = `${formatCurrency(variant.price)} - ${variant.duration} - ${availableKeys}`;
        const option = {
          label: truncateSelectOptionText(variant.label || `${product.shortLabel || product.name}`),
          description: truncateSelectOptionText(descriptionText),
          value: `${product.id}|${variant.id}`
        };
        return option;
      })
    );

  const row = new ActionRowBuilder().addComponents(select);

  return {
    content,
    embeds,
    components: [row],
    files
  };
}

function getProductPostMode() {
  const raw = String(process.env.PRODUCT_POST_MODE || config.productPostMode || "embed")
    .trim()
    .toLowerCase();
  return raw === "content" ? "content" : "embed";
}

function truncateDiscordContent(text, maxLen = 2000) {
  const value = String(text || "");
  if (value.length <= maxLen) return value;
  // Keep a little room for the ellipsis.
  return value.slice(0, Math.max(0, maxLen - 3)).trimEnd() + "...";
}

function truncateSelectOptionText(text, maxLen = 100) {
  const value = String(text || "");
  if (value.length <= maxLen) return value;
  return value.slice(0, Math.max(0, maxLen - 3)).trimEnd() + "...";
}

function attachIfExistsLimited(filePath, files, maxFiles = 10) {
  if (!filePath) return null;
  if (!Array.isArray(files)) return null;
  if (files.length >= maxFiles) return null;
  return attachIfExists(filePath, files);
}

function buildProductContentMessage(product, includeMedia = true) {
  const files = [];

  if (includeMedia) {
    // The pre-GIF is already sent as its own message (sendPreProductGif), so here we focus on the media that should
    // appear "full width" together with the product text.
    attachIfExistsLimited(product.previewImage, files);

    if (Array.isArray(product.gifImages)) {
      for (const gifPath of product.gifImages) {
        attachIfExistsLimited(gifPath, files);
      }
    }

    attachIfExistsLimited(product.footerImage, files);
  }

  const lines = [];
  lines.push(`**${String(product?.name || "Produto").trim()}**`);
  if (product?.description) {
    lines.push(String(product.description));
  }

  if (Array.isArray(product.sections)) {
    for (const section of product.sections) {
      const name = String(section?.name || "").trim();
      const value = String(section?.value || "").trim();
      if (!name && !value) continue;
      if (name) lines.push(`\n${name}`);
      if (value) lines.push(value);
    }
  }

  if (product?.demoUrl) {
    lines.push(`\nDemo\n${String(product.demoUrl).trim()}`);
  }

  const content = truncateDiscordContent(lines.join("\n"));

  return { content, embeds: [], files };
}

function buildProductEmbeds(product, includeMedia = true) {
  logEnter("buildProductEmbeds", { productId: product?.id, includeMedia });
  const embeds = [];
  const files = [];

  if (includeMedia) {
    const sameAsPreGif =
      product.prePostGif &&
      product.bannerImage &&
      String(product.prePostGif).toLowerCase() === String(product.bannerImage).toLowerCase();
    if (!sameAsPreGif) {
      const banner = attachIfExists(product.bannerImage, files);
      if (banner) {
        embeds.push(new EmbedBuilder().setImage(`attachment://${banner.name}`));
      }
    } else {
      log("info", "buildProductEmbeds:skipBannerDuplicate", { bannerImage: product.bannerImage });
    }
  }

  const main = new EmbedBuilder()
    .setTitle(product.name)
    .setDescription(product.description || "")
    .setColor(BRAND_COLOR);

  if (includeMedia) {
    const disableThumb = product?.disableThumbnail === true;
    if (!disableThumb) {
      const thumb = attachIfExists(product.thumbnail, files);
      if (thumb) {
        main.setThumbnail(`attachment://${thumb.name}`);
      } else if (client.user) {
        const avatar = client.user.displayAvatarURL({ extension: "png", size: 256 });
        if (avatar) {
          main.setThumbnail(avatar);
        }
      }
    }
  }

  if (includeMedia) {
    const preview = attachIfExists(product.previewImage, files);
    if (preview) main.setImage(`attachment://${preview.name}`);
  }

  if (Array.isArray(product.sections)) {
    for (const section of product.sections) {
      main.addFields({
        name: section.name || "",
        value: section.value || "",
        inline: !!section.inline
      });
    }
  }

  if (product.demoUrl) {
    main.addFields({ name: "Demo", value: product.demoUrl, inline: false });
  }

  embeds.push(main);

  if (includeMedia && Array.isArray(product.gifImages)) {
    for (const gifPath of product.gifImages) {
      const gif = attachIfExists(gifPath, files);
      if (gif) {
        embeds.push(new EmbedBuilder().setImage(`attachment://${gif.name}`));
      }
    }
  }

  if (includeMedia) {
    const footer = attachIfExists(product.footerImage, files);
    if (footer) {
      embeds.push(new EmbedBuilder().setImage(`attachment://${footer.name}`));
    }
  }

  return { embeds, files };
}

function upsertCart(userId, guildId, productId, variantId) {
  logEnter("upsertCart", { userId, guildId, productId, variantId });
  let cart = cartsDb.carts.find((c) => c.userId === userId && c.status === "open");
  if (!cart) {
    cart = {
      id: randomUUID(),
      userId,
      guildId,
      productId,
      variantId,
      quantity: 1,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    };
    cartsDb.carts.push(cart);
  } else {
    cart.productId = productId;
    cart.variantId = variantId;
    if (!cart.quantity) cart.quantity = 1;
    cart.updatedAt = new Date().toISOString();
    cart.lastActivityAt = new Date().toISOString();
  }
  saveJson(CARTS_PATH, cartsDb);
  logExit("upsertCart", { cartId: cart.id, status: cart.status });
  return cart;
}

async function ensureCartChannel(guild, user, cart) {
  logEnter("ensureCartChannel", { userId: user?.id, cartId: cart?.id, guildId: guild?.id });
  if (cart.channelId) {
    const existing = guild.channels.cache.get(cart.channelId);
    if (existing) return existing;
  }

  let categoryId = config.cartCategoryId;
  if (!categoryId) {
    const category = await guild.channels.create({
      name: "carrinhos",
      type: ChannelType.GuildCategory
    });
    categoryId = category.id;
    config.cartCategoryId = categoryId;
    saveJson(CONFIG_PATH, config);
    log("info", "ensureCartChannel:categoryCreated", { categoryId });
  } else {
    const category = guild.channels.cache.get(categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      log("error", "ensureCartChannel:invalidCategory", { categoryId });
      throw new Error("Categoria de carrinho invalida");
    }
  }

  const channel = await guild.channels.create({
    name: `carrinho-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: config.staffRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  cart.channelId = channel.id;
  cart.updatedAt = new Date().toISOString();
  saveJson(CARTS_PATH, cartsDb);
  logExit("ensureCartChannel", { channelId: channel.id, cartId: cart.id });
  return channel;
}

async function sendOrUpdateCartMessage(channel, cart, product, variant) {
  logEnter("sendOrUpdateCartMessage", { cartId: cart?.id, channelId: channel?.id });
  const { embeds, files, components } = buildCartMessage(cart, product, variant);

  if (cart.messageId) {
    try {
      const msg = await channel.messages.fetch(cart.messageId);
      await msg.edit({ embeds, files, components });
      await touchCartActivity(cart.id);
      logExit("sendOrUpdateCartMessage", { messageId: msg.id, updated: true });
      return;
    } catch {}
  }

  const msg = await channel.send({ embeds, files, components });
  cart.messageId = msg.id;
  cart.updatedAt = new Date().toISOString();
  saveJson(CARTS_PATH, cartsDb);
  await touchCartActivity(cart.id);
  logExit("sendOrUpdateCartMessage", { messageId: msg.id, created: true });
}

function buildCartMessage(cart, product, variant) {
  logEnter("buildCartMessage", { cartId: cart?.id, productId: product?.id, variantId: variant?.id });
  const files = [];
  const embeds = [];

  const cartColor = Number.isFinite(Number(config.cartColor)) ? Number(config.cartColor) : DEFAULT_CART_COLOR;
  const author = getBrandAuthor();
  const quantity = getCartQuantity(cart);
  const label = getCartProductLabel(product, variant);

  // Top image embed (same visual style as product posts). Avoid duplicating the pre-GIF if it's the same file.
  const sameAsPreGif =
    product.prePostGif &&
    product.bannerImage &&
    String(product.prePostGif).toLowerCase() === String(product.bannerImage).toLowerCase();
  if (!sameAsPreGif) {
    const banner = attachIfExists(product.bannerImage, files);
    if (banner) {
      embeds.push(new EmbedBuilder().setImage('attachment://' + banner.name));
    }
  }

  const baseTotal = Number(variant.price) * quantity;
  const finalTotal = applyDiscount(baseTotal, cart.discountPercent);
  const availableText = isInfiniteStock(product)
    ? 'Estoque Infinito'
    : String(getAvailableStockCount(cart.guildId, product.id, variant.id)) + ' unidades';

  const lines = [];
  lines.push('Nossa entrega e 100% automatica.');
  lines.push('Voce esta comprando: **' + label + ' x' + quantity + '**');
  lines.push('');
  lines.push('**DETALHES DO PEDIDO**');
  lines.push('| Quantidade: **' + quantity + '**');
  lines.push('| Preco Total: **' + formatCurrency(finalTotal) + '**');
  lines.push('| Disponivel: **' + availableText + '**');
  if (cart.couponCode) {
    lines.push('| Cupom: **' + cart.couponCode + ' (-' + (cart.discountPercent || 0) + '%)**');
  }
  if (cart.status === 'pending') lines.push('| Status: **Aguardando pagamento**');
  if (cart.status === 'paid') lines.push('| Status: **Pagamento confirmado**');
  if (cart.status === 'cancelled') lines.push('| Status: **Cancelado**');
  if (cart.status === 'expired') lines.push('| Status: **Expirado**');

  const main = new EmbedBuilder().setTitle('SEU CARRINHO').setColor(cartColor).setDescription(lines.join('\n'));
  if (author) main.setAuthor(author);

  const footerText = String(config.cartFooterText || '').trim();
  if (footerText) main.setFooter({ text: footerText });

  const thumb = attachIfExists(product.thumbnail, files);
  if (thumb) main.setThumbnail('attachment://' + thumb.name);

  embeds.push(main);

  const disableOpenActions = cart.status !== 'open';
  const disablePay = cart.status === 'pending' || cart.status === 'paid' || cart.status === 'cancelled' || cart.status === 'expired';
  const disableCancel = cart.status === 'paid' || cart.status === 'cancelled' || cart.status === 'expired';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cart_qty:' + cart.id)
      .setLabel('Alterar Quantidade')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableOpenActions),
    new ButtonBuilder()
      .setCustomId('cart_coupon:' + cart.id)
      .setLabel('Adicionar Cupom')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disableOpenActions),
    new ButtonBuilder()
      .setCustomId('cart_remove_coupon:' + cart.id)
      .setLabel('Remover Cupom')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disableOpenActions || !cart.couponCode)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('cart_pay:' + cart.id)
      .setLabel('Ir para Pagamento')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disablePay),
    new ButtonBuilder()
      .setCustomId('cart_cancel:' + cart.id)
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disableCancel)
  );

  return { embeds, files, components: [row1, row2] };
}
async function createPixPayment(user, cart, product, variant) {
  logEnter("createPixPayment", { userId: user?.id, cartId: cart?.id, productId: product?.id, variantId: variant?.id });
  const quantity = getCartQuantity(cart);
  const baseTotal = variant.price * quantity;
  const finalPrice = applyDiscount(baseTotal, cart.discountPercent);

  const saleOwner = resolveSaleOwnerForGuild(cart.guildId);
  const instanceId = asString(saleOwner.instanceId);
  const ownerDiscordUserId = asString(saleOwner.ownerDiscordUserId);

  const mpToken = getMercadoPagoAccessTokenForSale(ownerDiscordUserId);
  if (!mpToken) {
    // Optional fallback for legacy environments.
    if (!config.asaas?.enabled) {
      throw new Error("Mercado Pago nao configurado");
    }
  }

  if (mpToken) {
    const payerEmail = `discord+${user.id}@example.com`;
    const description = `${product.name} - ${getCartProductLabel(product, variant)} x${quantity}`;
    const mpPayment = await mercadoPagoRequest(
      "post",
      "/v1/payments",
      {
        transaction_amount: Number(Number(finalPrice || 0).toFixed(2)),
        description,
        payment_method_id: "pix",
        payer: { email: payerEmail },
        external_reference: cart.id,
        metadata: {
          cart_id: cart.id,
          guild_id: cart.guildId,
          product_id: product.id,
          variant_id: variant.id,
          instance_id: instanceId,
          owner_user_id: ownerDiscordUserId
        }
      },
      mpToken,
      { idempotencyKey: `pix_${cart.id}` }
    );

    const pixPayload = asString(mpPayment?.point_of_interaction?.transaction_data?.qr_code);
    const valueCents = Math.round(Number(finalPrice || 0) * 100);

    const paymentRecord = {
      id: randomUUID(),
      cartId: cart.id,
      paymentId: String(mpPayment.id || ""),
      paymentProvider: "mercadopago",
      providerStatus: asString(mpPayment?.status),
      providerStatusDetail: asString(mpPayment?.status_detail),
      userId: user.id,
      guildId: cart.guildId,
      productId: product.id,
      variantId: variant.id,
      channelId: cart.channelId,
      couponCode: cart.couponCode || null,
      discountPercent: cart.discountPercent || 0,
      quantity,
      value: Number(Number(finalPrice || 0).toFixed(2)),
      valueCents,
      instanceId,
      ownerDiscordUserId,
      pixPayload,
      pixTicketUrl: asString(mpPayment?.point_of_interaction?.transaction_data?.ticket_url),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    appendOrderEvent(
      paymentRecord,
      "payment_created",
      { paymentId: paymentRecord.paymentId, provider: "mercadopago", source: "pix", actor: user.id },
      paymentRecord.createdAt
    );
    ordersDb.orders.push(paymentRecord);
    saveJson(ORDERS_PATH, ordersDb);
    logExit("createPixPayment", { paymentId: paymentRecord.paymentId, value: paymentRecord.value, provider: "mercadopago" });

    return {
      paymentId: paymentRecord.paymentId,
      payload: pixPayload,
      encodedImage: asString(mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64),
      quantity,
      finalPrice: paymentRecord.value,
      couponCode: cart.couponCode || null,
      discountPercent: cart.discountPercent || 0,
      ticketUrl: paymentRecord.pixTicketUrl
    };
  }

  // Legacy Asaas flow (kept for backward compatibility).
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY nao configurado");
  }

  const customerId = await ensureCustomer(user, apiKey);
  const dueDate = new Date().toISOString().slice(0, 10);

  const paymentPayload = {
    customer: customerId,
    billingType: "PIX",
    value: Number(finalPrice.toFixed(2)),
    dueDate,
    description: `${product.name} - ${getCartProductLabel(product, variant)} x${quantity}`,
    externalReference: cart.id
  };

  const payment = await asaasRequest("post", "/payments", paymentPayload, apiKey);
  const pix = await asaasRequest("get", `/payments/${payment.id}/pixQrCode`, null, apiKey);
  const pixPayload = pix.payload || pix.encodedPayload || pix.qrCode || "";
  const valueCents = Math.round(Number(paymentPayload.value || 0) * 100);

  const paymentRecord = {
    id: randomUUID(),
    cartId: cart.id,
    paymentId: payment.id,
    paymentProvider: "asaas",
    providerStatus: payment.status || "PENDING",
    userId: user.id,
    guildId: cart.guildId,
    productId: product.id,
    variantId: variant.id,
    channelId: cart.channelId,
    couponCode: cart.couponCode || null,
    discountPercent: cart.discountPercent || 0,
    quantity,
    value: paymentPayload.value,
    valueCents,
    instanceId,
    ownerDiscordUserId,
    pixPayload,
    status: "pending",
    asaasStatus: payment.status || "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appendOrderEvent(paymentRecord, "payment_created", {
    paymentId: payment.id,
    provider: "asaas",
    source: "pix",
    actor: user.id
  }, paymentRecord.createdAt);
  ordersDb.orders.push(paymentRecord);
  saveJson(ORDERS_PATH, ordersDb);
  logExit("createPixPayment", { paymentId: payment.id, value: paymentPayload.value });

  return {
    paymentId: payment.id,
    payload: pixPayload,
    encodedImage: pix.encodedImage || pix.encodedQrCode || "",
    quantity,
    finalPrice: paymentPayload.value,
    couponCode: cart.couponCode || null,
    discountPercent: cart.discountPercent || 0
  };
}

async function sendPixMessage(channel, cart, product, variant, payment) {
  logEnter("sendPixMessage", { cartId: cart?.id, channelId: channel?.id, paymentId: payment?.paymentId });
  const cartColor = Number.isFinite(Number(config.cartColor)) ? Number(config.cartColor) : DEFAULT_CART_COLOR;
  const quantity = Math.max(1, Math.floor(Number(payment.quantity || cart?.quantity || 1)));
  const label = getCartProductLabel(product, variant);
  const unitPrice = Number(variant.price || 0);
  const baseTotal = unitPrice * quantity;
  const finalTotal = Number(payment.finalPrice || 0);
  const discountValue = Math.max(0, Number((baseTotal - finalTotal).toFixed(2)));

  const productsLine = `${formatCurrency(unitPrice)} - ${label} (${quantity} unidade${quantity === 1 ? "" : "s"})`;
  const pixPayload = asString(payment?.payload).trim();
  const pixInstructions = asString(config.pixInstructions || "Leia com atencao. Pague pelo Pix e aguarde a confirmacao.");
  const pixCodeForEmbed = pixPayload
    ? `\`\`\`\n${pixPayload.length > 960 ? `${pixPayload.slice(0, 957)}...` : pixPayload}\n\`\`\``
    : "Codigo PIX indisponivel no momento. Tente gerar novamente.";

  const embed = new EmbedBuilder()
    .setTitle("Confirmacao de Compra")
    .setColor(cartColor)
    .setDescription("Verifique se os produtos estao corretos e efetue o pagamento.\nUse o QR Code abaixo ou o codigo Copia e Cola.")
    .addFields(
      { name: "Produtos:", value: productsLine, inline: false },
      { name: "Valor Total:", value: formatCurrency(finalTotal), inline: false },
      { name: "Desconto:", value: formatCurrency(discountValue), inline: false },
      { name: "PIX Copia e Cola:", value: pixCodeForEmbed, inline: false },
      { name: "Instrucoes:", value: truncateForEmbed(pixInstructions, 900), inline: false }
    );

  const footerText = String(config.cartFooterText || "").trim();
  if (footerText) {
    embed.setFooter({ text: footerText });
  }

  const files = [];
  const qrFileName = `pix-${String(payment?.paymentId || cart?.id || "code")}.png`;
  let qrBuffer = null;

  if (payment?.encodedImage) {
    try {
      const raw = String(payment.encodedImage);
      const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
      qrBuffer = Buffer.from(base64 || "", "base64");
      if (!qrBuffer || !qrBuffer.length) qrBuffer = null;
    } catch {
      qrBuffer = null;
    }
  }
  if (!qrBuffer && pixPayload) {
    try {
      qrBuffer = await QRCode.toBuffer(pixPayload);
    } catch {
      qrBuffer = null;
    }
  }
  if (qrBuffer) {
    files.push(new AttachmentBuilder(qrBuffer, { name: qrFileName }));
    embed.setImage(`attachment://${qrFileName}`);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pix_copy:${payment.paymentId}`)
      .setLabel("Codigo Copia e Cola")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!pixPayload),
    new ButtonBuilder()
      .setCustomId(`pix_terms:${payment.paymentId}`)
      .setLabel("Termos e Condicoes")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cart_cancel:${cart.id}`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row], files });

  cart.status = "pending";
  cart.updatedAt = new Date().toISOString();
  cart.lastActivityAt = new Date().toISOString();
  saveJson(CARTS_PATH, cartsDb);
  await sendAdminPaymentActionMessage(cart, product, variant, payment);
  logExit("sendPixMessage", { cartId: cart?.id });
}

async function sendAdminPaymentActionMessage(cart, product, variant, payment) {
  const guildId = asString(cart?.guildId);
  const instChannels = guildId ? getGuildChannelConfig(guildId) : { logsChannelId: "" };
  const candidates = [asString(instChannels.logsChannelId), asString(config.staffLogChannelId)]
    .map((value) => value.trim())
    .filter(Boolean);
  if (!candidates.length) return;

  let staffChannel = null;
  for (const candidate of candidates) {
    const fetched = await client.channels.fetch(candidate).catch(() => null);
    if (!fetched || !fetched.isTextBased || !fetched.isTextBased()) continue;
    if (guildId && fetched.guildId && String(fetched.guildId) !== String(guildId)) continue;
    staffChannel = fetched;
    break;
  }
  if (!staffChannel) return;

  const quantity = getCartQuantity(cart);
  const unitPrice = Number(variant?.price || 0);
  const finalTotal = Number(payment?.finalPrice || applyDiscount(unitPrice * quantity, cart.discountPercent || 0));
  const label = getCartProductLabel(product, variant);
  const cartColor = Number.isFinite(Number(config.cartColor)) ? Number(config.cartColor) : DEFAULT_CART_COLOR;

  const embed = new EmbedBuilder()
    .setColor(cartColor)
    .setTitle("Acao de Admin: Confirmar Pagamento")
    .setDescription(
      `Usuario: <@${cart.userId}>\nCanal do carrinho: <#${cart.channelId}>\nProduto: **${label}** x${quantity}\nValor: **${formatCurrency(finalTotal)}**`
    )
    .addFields(
      { name: "Carrinho", value: String(cart.id), inline: true },
      { name: "Pagamento", value: String(payment?.paymentId || "manual"), inline: true },
      { name: "Status", value: String(cart.status || "open"), inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cart_admin_confirm:${cart.id}`)
      .setLabel("Confirmar Pagamento (Admin)")
      .setStyle(ButtonStyle.Primary)
  );

  try {
    if (cart.adminActionMessageId && cart.adminActionChannelId === staffChannel.id) {
      const existing = await staffChannel.messages.fetch(cart.adminActionMessageId).catch(() => null);
      if (existing) {
        await existing.edit({ embeds: [embed], components: [row] });
        return;
      }
    }
    const msg = await staffChannel.send({ embeds: [embed], components: [row] });
    cart.adminActionMessageId = msg.id;
    cart.adminActionChannelId = staffChannel.id;
    cart.updatedAt = new Date().toISOString();
    saveJson(CARTS_PATH, cartsDb);
  } catch (err) {
    logError("sendAdminPaymentActionMessage", err, { cartId: cart?.id, guildId });
  }
}

async function ensureCustomer(user, apiKey) {
  logEnter("ensureCustomer", { userId: user?.id });
  const existing = customersDb.customers.find((c) => c.userId === user.id);
  if (existing) return existing.customerId;

  const defaults = config.asaas?.customerDefaults || {};
  if (!defaults.email || !defaults.cpfCnpj) {
    throw new Error("Configure customerDefaults no config.json");
  }

  const payload = {
    name: defaults.name || user.username,
    email: defaults.email,
    cpfCnpj: defaults.cpfCnpj,
    externalReference: `discord:${user.id}`
  };

  const customer = await asaasRequest("post", "/customers", payload, apiKey);
  customersDb.customers.push({
    userId: user.id,
    customerId: customer.id,
    createdAt: new Date().toISOString()
  });
  saveJson(CUSTOMERS_PATH, customersDb);
  logExit("ensureCustomer", { userId: user.id, customerId: customer.id });
  return customer.id;
}

async function asaasRequest(method, pathUrl, data, apiKey) {
  logEnter("asaasRequest", { method, path: pathUrl });
  const baseUrl = config.asaas?.sandbox ? config.asaas.baseUrlSandbox : config.asaas.baseUrlProduction;
  const url = `${baseUrl}${pathUrl}`;
  const headers = {
    "Content-Type": "application/json",
    "access_token": apiKey,
    "User-Agent": "botdc"
  };

  const res = await axios({
    method,
    url,
    headers,
    data: data || undefined
  });

  logExit("asaasRequest", { method, path: pathUrl, status: res?.status || 200 });
  return res.data;
}

const KNOWN_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

function resolveAssetPath(filePath) {
  if (!filePath) return null;
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (fs.existsSync(abs)) return abs;

  const parsed = path.parse(abs);
  if (parsed.ext) {
    for (const ext of KNOWN_EXTS) {
      if (ext === parsed.ext) continue;
      const alt = path.join(parsed.dir, `${parsed.name}${ext}`);
      if (fs.existsSync(alt)) {
        log("info", "asset:fallback", { requested: abs, resolved: alt });
        return alt;
      }
    }
  } else {
    for (const ext of KNOWN_EXTS) {
      const alt = `${abs}${ext}`;
      if (fs.existsSync(alt)) {
        log("info", "asset:fallback", { requested: abs, resolved: alt });
        return alt;
      }
    }
  }

  return null;
}

function getMaxAttachmentBytes() {
  const value = Number(config.maxAttachmentBytes || DEFAULT_MAX_ATTACHMENT_BYTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_ATTACHMENT_BYTES;
}

function buildAttachment(filePath) {
  if (!filePath) return null;
  const abs = resolveAssetPath(filePath);
  if (!abs) {
    log("warn", "attachIfExists:missing", { filePath });
    return null;
  }
  const stats = fs.statSync(abs);
  const maxBytes = getMaxAttachmentBytes();
  if (stats.size > maxBytes) {
    log("warn", "attachIfExists:tooLarge", { filePath: abs, size: stats.size, maxBytes });
    return null;
  }
  const originalName = path.basename(abs);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (safeName !== originalName) {
    log("info", "attachIfExists:rename", { originalName, safeName });
  }
  return { attachment: new AttachmentBuilder(abs, { name: safeName }), name: safeName };
}

function attachIfExists(filePath, files) {
  const built = buildAttachment(filePath);
  if (!built) return null;
  files.push(built.attachment);
  return { name: built.name };
}

function applyDiscount(price, percent) {
  if (!percent || percent <= 0) return price;
  return price * (1 - percent / 100);
}

function formatCurrency(value) {
  const num = Number(value || 0);
  try {
    const currency = String(config.currency || "BRL").toUpperCase();
    // Intl for pt-BR uses NBSP between "R$" and the amount; normalize to regular space for UI consistency.
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(num).replace(/\u00a0/g, " ");
  } catch {
    return `R$ ${num.toFixed(2)}`;
  }
}

function getCartQuantity(cart) {
  const raw = Number(cart?.quantity ?? 1);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(1, Math.floor(raw));
}

function isInfiniteStock(product) {
  return product?.infiniteStock === true || String(product?.stockMode || "").toLowerCase() === "infinite";
}

function getAvailableStockCount(guildId, productId, variantId) {
  const buckets = getProductStockBuckets(guildId, productId);
  const ownCount = variantId && Array.isArray(buckets[variantId]) ? buckets[variantId].length : 0;
  const fallbackCount = (buckets.default?.length || 0) + (buckets.shared?.length || 0);
  return ownCount > 0 ? ownCount : fallbackCount;
}

function getCartProductLabel(product, variant) {
  const base = String(product?.shortLabel || product?.name || "Produto").trim();
  const duration = String(variant?.duration || "").trim();
  if (!duration) return base;
  return `${base} | ${duration}`;
}

function loadJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    log("debug", "loadJson", { filePath });
    return JSON.parse(clean);
  } catch (err) {
    log("warn", "loadJson:failed", { filePath, message: err?.message || String(err) });
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  log("debug", "saveJson", { filePath });
}

function applyConfigDefaults() {
  logEnter("applyConfigDefaults");
  const defaults = {
    guildId: "",
    staffRoleId: "",
    adminUserIds: [],
    cartCategoryId: "",
    postChannelId: "",
      trackerChannelId: "1411555508833488948",
      staffLogChannelId: "1415241834061365248",
      systemBanner: "assets/product1/astraprojectbanner.gif",
      cartColor: DEFAULT_CART_COLOR,
      cartFooterText: "Todos os direitos reservados a AstraSystems (c) 2026",
      termsText: "Termos e Condicoes: pagamento via Pix, produto digital, entrega automatica. Em caso de duvidas, fale com a equipe.",
      cartBottomImage: "",
      showAdminConfirmButton: false,
      maxAttachmentBytes: DEFAULT_MAX_ATTACHMENT_BYTES,
      pixInstructions: "Leia com atencao. Pague pelo Pix e aguarde a confirmacao.",
      currency: "BRL",
      paymentCheckIntervalMs: 60000,
    asaas: {
      enabled: false,
      sandbox: true,
      baseUrlSandbox: "https://sandbox.asaas.com/api/v3",
      baseUrlProduction: "https://api.asaas.com/v3",
      customerDefaults: {
        name: "Cliente Discord",
        email: "cliente@example.com",
        cpfCnpj: "00000000000"
      }
    }
  };

  let changed = false;
  for (const [key, val] of Object.entries(defaults)) {
    if (config[key] === undefined) {
      config[key] = val;
      changed = true;
    }
  }

  if (!config.asaas) {
    config.asaas = defaults.asaas;
    changed = true;
  }

  if (changed) {
    saveJson(CONFIG_PATH, config);
    log("info", "config:defaultsApplied", { path: CONFIG_PATH });
  }
}

async function logAdmins() {
  if (!Array.isArray(config.adminUserIds) || config.adminUserIds.length === 0) return;
  for (const id of config.adminUserIds) {
    try {
      const user = await client.users.fetch(String(id));
      log("info", "admin:resolved", { tag: user.tag, id: user.id });
    } catch {
      log("warn", "admin:resolveFailed", { id });
    }
  }
}

const welcomeQueue = [];
const welcomeSeen = new Set();

function enqueueWelcome(member) {
  if (!member?.id) return;
  if (welcomeSeen.has(member.id)) return;
  welcomeSeen.add(member.id);
  welcomeQueue.push({
    id: member.id,
    username: member.user?.username || "usuario",
    tag: member.user?.tag || member.id,
    joinedAt: new Date().toISOString()
  });
  log("info", "welcome:queued", { userId: member.id, queueSize: welcomeQueue.length });
}

function startWelcomeTracker() {
  const intervalMs = 2 * 60 * 1000;
  log("info", "welcomeTracker:start", { intervalMs, channelId: config.trackerChannelId });
  setInterval(async () => {
    await flushWelcomeQueue();
  }, intervalMs);
}

async function flushWelcomeQueue() {
  if (welcomeQueue.length === 0) return;
  const channelId = config.trackerChannelId || "1411555508833488948";
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased || !channel.isTextBased()) return;

  const items = welcomeQueue.splice(0, welcomeQueue.length);
  log("info", "welcome:flush", { count: items.length, channelId });
  for (const entry of items) {
    await sendWelcomeEmbed(channel, entry);
  }
}

async function sendWelcomeEmbed(channel, entry) {
  logEnter("sendWelcomeEmbed", { userId: entry.id, channelId: channel?.id });
  const filePath = path.join(ROOT, "bemvindo.gif");
  const files = [];
  if (fs.existsSync(filePath)) {
    files.push(new AttachmentBuilder(filePath, { name: "bemvindo.gif" }));
  }

  const embed = new EmbedBuilder()
    .setTitle("Bem-vindo(a) a AstraSystems")
    .setColor(BRAND_COLOR)
    .setDescription(
      `Ola <@${entry.id}>! Seja bem-vindo(a).\nUse o comando !portal para abrir sua Dashboard e comecar a configurar.`
    )
    .setFooter({ text: `ID do usuario: ${entry.id} - ${new Date().toLocaleString("pt-BR")}` });

  if (files.length) {
    embed.setImage("attachment://bemvindo.gif");
  }

  await channel.send({ embeds: [embed], files });
  logExit("sendWelcomeEmbed", { userId: entry.id });
}

function startPaymentWatcher() {
  const interval = Number(config.paymentCheckIntervalMs || 60000);
  if (!interval || interval < 10000) return;

  log("info", "paymentWatcher:start", { interval });
  setInterval(async () => {
    await checkPendingPayments();
  }, interval);
}

let paymentCheckRunning = false;
async function checkPendingPayments() {
  if (paymentCheckRunning) return;
  paymentCheckRunning = true;
  try {
    const pending = ordersDb.orders.filter((o) => {
      if (o.status !== "pending" && o.status !== "waiting_stock") return false;
      return canCurrentRuntimeHandleGuild(o.guildId);
    });
    log("info", "paymentWatcher:check", { pending: pending.length });
    for (const order of pending) {
      await syncOrderStatus(order);
    }
    saveJson(ORDERS_PATH, ordersDb);
  } finally {
    paymentCheckRunning = false;
  }
}

async function syncOrderStatus(order, apiKeyOverride = "") {
  const provider = String(order?.paymentProvider || order?.provider || "").toLowerCase();
  if (provider === "manual") return;

  try {
    if (provider === "mercadopago") {
      await syncOrderStatusMercadoPago(order);
      return;
    }

    // Default / legacy: Asaas
    const apiKey = String(apiKeyOverride || process.env.ASAAS_API_KEY || "").trim();
    if (!apiKey) return;
    await syncOrderStatusAsaas(order, apiKey);
  } catch (err) {
    logError("syncOrderStatus", err, { orderId: order?.id, provider });
  }
}

async function syncOrderStatusMercadoPago(order) {
  const paymentId = asString(order?.paymentId);
  if (!paymentId) return;

  const ownerDiscordUserId = asString(order?.ownerDiscordUserId);
  const token = getMercadoPagoAccessTokenForSale(ownerDiscordUserId);
  if (!token) return;

  const payment = await mercadoPagoRequest("get", `/v1/payments/${encodeURIComponent(paymentId)}`, null, token);
  const status = asString(payment?.status).toLowerCase() || "pending";
  const previousStatus = asString(order?.providerStatus).toLowerCase();

  order.paymentProvider = "mercadopago";
  order.providerStatus = asString(payment?.status);
  order.providerStatusDetail = asString(payment?.status_detail);
  order.updatedAt = new Date().toISOString();

  if (previousStatus && previousStatus !== status) {
    appendOrderEvent(order, "payment_status", { provider: "mercadopago", from: previousStatus, to: status });
  }

  if (isPaidStatus("mercadopago", status)) {
    await deliverOrder(order);
  } else if (isFinalFailureStatus("mercadopago", status)) {
    order.status = "failed";
    order.failedAt = new Date().toISOString();
    order.updatedAt = order.failedAt;
    appendOrderEvent(order, "payment_failed", { provider: "mercadopago", status }, order.failedAt);
    log("warn", "paymentWatcher:failed", { orderId: order.id, provider: "mercadopago", status });
  }
}

async function syncOrderStatusAsaas(order, apiKey) {
  const paymentId = asString(order?.paymentId);
  if (!paymentId) return;

  const payment = await asaasRequest("get", `/payments/${encodeURIComponent(paymentId)}`, null, apiKey);
  const status = asString(payment?.status) || "PENDING";
  const previousStatus = asString(order?.providerStatus) || asString(order?.asaasStatus);

  order.paymentProvider = "asaas";
  order.providerStatus = status;
  order.asaasStatus = status;
  order.updatedAt = new Date().toISOString();

  if (previousStatus && previousStatus !== status) {
    appendOrderEvent(order, "payment_status", { provider: "asaas", from: previousStatus, to: status });
  }

  if (isPaidStatus("asaas", status)) {
    await deliverOrder(order);
  } else if (isFinalFailureStatus("asaas", status)) {
    order.status = "failed";
    order.failedAt = new Date().toISOString();
    order.updatedAt = order.failedAt;
    appendOrderEvent(order, "payment_failed", { provider: "asaas", status }, order.failedAt);
    log("warn", "paymentWatcher:failed", { orderId: order.id, provider: "asaas", status });
  }
}

function isPaidStatus(provider, status) {
  const p = String(provider || "").toLowerCase();
  if (p === "mercadopago") {
    return String(status || "").toLowerCase() === "approved";
  }
  const st = String(status || "").toUpperCase();
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(st);
}

function isFinalFailureStatus(provider, status) {
  const p = String(provider || "").toLowerCase();
  if (p === "mercadopago") {
    const st = String(status || "").toLowerCase();
    return ["rejected", "cancelled", "refunded", "charged_back"].includes(st);
  }
  const st = String(status || "").toUpperCase();
  return [
    "CANCELED",
    "REFUNDED",
    "REFUND_REQUESTED",
    "CHARGEBACK_REQUESTED",
    "CHARGEBACK_DISPUTE",
    "AWAITING_CHARGEBACK_REVERSAL",
    "DUNNING_REQUESTED",
    "DUNNING_RECEIVED",
    "OVERDUE"
  ].includes(st);
}

async function deliverOrder(order, options = {}) {
  logEnter("deliverOrder", { orderId: order.id, paymentId: order.paymentId });
  if (order.status === "delivered") {
    return { ok: false, reason: "pedido ja entregue" };
  }
  if (order.status === "cancelled") {
    return { ok: false, reason: "pedido cancelado" };
  }

  const orderCart = order.cartId ? cartsDb.carts.find((entry) => entry.id === order.cartId) : null;
  if (orderCart && orderCart.status === "cancelled") {
    const now = new Date().toISOString();
    order.status = "cancelled";
    order.cancelledAt = now;
    order.updatedAt = now;
    appendOrderEvent(order, "delivery_blocked", { reason: "cart_cancelled" }, now);
    saveJson(ORDERS_PATH, ordersDb);
    return { ok: false, reason: "carrinho cancelado" };
  }

  const now = new Date().toISOString();
  const source = options.source || order.confirmedSource || "pix";
  const confirmedByUserId = options.confirmedByUserId || order.confirmedByUserId || "";
  markOrderConfirmed(order, source, confirmedByUserId, "Pagamento confirmado", now);

  const quantity = Math.max(1, Math.floor(Number(order.quantity || 1)));
  const keys = takeStockKeys(order.guildId, order.productId, order.variantId, quantity);
  if (!keys || keys.length < quantity) {
    order.status = "waiting_stock";
    order.updatedAt = now;
    appendOrderEvent(order, "delivery_waiting_stock", { source, confirmedByUserId }, now);
    saveJson(ORDERS_PATH, ordersDb);
    const cart = cartsDb.carts.find((entry) => entry.id === order.cartId);
    if (cart) {
      cart.status = "pending";
      cart.updatedAt = order.updatedAt;
      cart.lastActivityAt = order.updatedAt;
      saveJson(CARTS_PATH, cartsDb);
    }
    await notifyOutOfStock(order);
    log("warn", "deliverOrder:outOfStock", { orderId: order.id, productId: order.productId });
    return { ok: false, reason: "waiting_stock" };
  }

  const deliveryId = randomUUID();
  const deliveredAt = new Date().toISOString();
  const keyBundle = keys.join("\n");
  deliveriesDb.deliveries.push({
    id: deliveryId,
    orderId: order.id,
    productId: order.productId,
    variantId: order.variantId,
    userId: order.userId,
    key: keyBundle,
    deliveredAt
  });
  saveJson(DELIVERIES_PATH, deliveriesDb);

  order.status = "delivered";
  order.deliveredAt = deliveredAt;
  order.deliveryId = deliveryId;
  order.updatedAt = deliveredAt;
  markOrderConfirmed(order, source, confirmedByUserId, "Entrega concluida", deliveredAt);
  appendOrderEvent(order, "delivery_success", {
    source,
    confirmedByUserId,
    deliveryId
  }, deliveredAt);
  saveJson(ORDERS_PATH, ordersDb);

  const product = getProductForGuild(order.guildId, order.productId, true).product;
  const variant = getVariant(product, order.variantId);
  await sendDeliveryMessage(order, product, variant, keyBundle, {
    source,
    confirmedByUserId: confirmedByUserId || null
  });

  const cart = cartsDb.carts.find((c) => c.id === order.cartId);
  if (cart) {
    cart.status = "paid";
    cart.updatedAt = deliveredAt;
    cart.lastActivityAt = deliveredAt;
    saveJson(CARTS_PATH, cartsDb);
  }

  // Credit the seller wallet (Portal) once per order. This is independent from DM success.
  await maybeCreditWalletForOrder(order);
  logExit("deliverOrder", { orderId: order.id, deliveryId: deliveryId });
  return { ok: true, deliveryId, key: keyBundle };
}

function takeStockKey(guildId, productId, variantId) {
  const keys = takeStockKeys(guildId, productId, variantId, 1);
  return Array.isArray(keys) && keys.length ? keys[0] : null;
}

function takeStockKeys(guildId, productId, variantId, count) {
  const wanted = Math.max(1, Math.floor(Number(count || 1)));
  const ctx = getStoreContextForGuild(guildId);
  const productStock = ctx.stockDb.stock?.[productId];
  if (!productStock) return null;

  let list = null;
  if (Array.isArray(productStock)) {
    list = productStock;
  } else if (variantId && Array.isArray(productStock[variantId])) {
    list = productStock[variantId];
  } else if (Array.isArray(productStock.default)) {
    list = productStock.default;
  } else if (Array.isArray(productStock.shared)) {
    list = productStock.shared;
  }

  if (!list || list.length < wanted) return null;
  const keys = list.splice(0, wanted);
  saveStoreStock(ctx);
  log("info", "stock:take", { guildId, productId, variantId, wanted, remaining: list.length, source: ctx.source });
  return keys;
}

function renderMessageTemplate(template, variables = {}) {
  const raw = String(template || "");
  return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const value = variables[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function truncateForEmbed(text, maxLength = 3500) {
  const value = String(text || "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function buildDeliveryUserMessage(order, product, variant, key, options = {}) {
  const source = options.source || "pix";
  const sourceLabelMap = {
    pix: "Pagamento Pix confirmado",
    admin_button: "Compra confirmada manualmente pela equipe",
    admin_manual_delivery: "Entrega manual realizada pela equipe"
  };

  const productName = product?.name || order.productId || "Produto";
  const variantLabel = variant?.label || order.variantId || "Variacao";
  const sourceTemplate =
    source === "admin_button" || source === "admin_manual_delivery"
      ? product?.deliveryDmMessageAdmin
      : product?.deliveryDmMessagePix;
  const template =
    sourceTemplate ||
    product?.deliveryDmMessage ||
    [
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
  const templateHasKey = template.includes("{{key}}");
  const variables = {
    source,
    sourceLabel: sourceLabelMap[source] || "Compra confirmada",
    productName,
    productId: order.productId || "",
    variantLabel,
    variantId: order.variantId || "",
    orderId: order.id || "",
    paymentId: order.paymentId || "",
    orderValue: order.value ? formatCurrency(order.value) : "-",
    couponCode: order.couponCode || "",
    discountPercent: order.discountPercent || 0,
    key,
    userId: order.userId || "",
    channelId: order.channelId || ""
  };

  let description = renderMessageTemplate(template, variables).trim();
  if (!description) {
    description = `Compra confirmada.\nProduto: **${productName}**\nVariacao: **${variantLabel}**`;
  }
  if (!templateHasKey) {
    description = `${description}\n\nSua key:\n\`\`\`\n${key}\n\`\`\``;
  }
  return {
    title: product?.deliveryDmTitle || "Compra confirmada",
    description: truncateForEmbed(description)
  };
}

async function fetchTextChannel(channelId, guildId = "") {
  const cid = asString(channelId);
  if (!cid) return null;
  const channel = await client.channels.fetch(cid).catch(() => null);
  if (!channel || !channel.isTextBased || !channel.isTextBased()) return null;
  const gid = asString(guildId);
  if (gid && channel.guildId && String(channel.guildId) !== String(gid)) return null;
  return channel;
}

function buildDiscordChannelUrl(guildId, channelId) {
  const gid = asString(guildId);
  const cid = asString(channelId);
  if (!gid || !cid) return "";
  return `https://discord.com/channels/${gid}/${cid}`;
}

async function sendLiveSaleNotification(order, product, variant) {
  const guildId = asString(order?.guildId);
  if (!guildId) return;

  const cfg = getGuildChannelConfig(guildId);
  const salesChannelId = asString(cfg.salesChannelId);
  if (!salesChannelId) return;

  const channel = await fetchTextChannel(salesChannelId, guildId);
  if (!channel) return;

  const productName = product?.name || order?.productId || "Produto";
  const variantLabel = variant?.label || order?.variantId || "Variacao";
  const buyer = order?.userId ? `<@${order.userId}>` : "-";

  const lines = [];
  lines.push(`Cliente: ${buyer}`);
  lines.push(`Produto: **${productName}**`);
  lines.push(`Variacao: **${variantLabel}**`);
  if (order?.value) lines.push(`Valor: **${formatCurrency(order.value)}**`);
  if (order?.id) lines.push(`Pedido: \`${order.id}\``);

  const payload = buildSystemEmbedPayload("Venda concluida", lines.join("\n"), "success", {
    includeBanner: false,
    includeThumbnail: true
  });

  await channel.send(payload);
}

async function sendFeedbackRequest(order, product, variant, options = {}) {
  const guildId = asString(order?.guildId);
  if (!guildId) return;

  const cfg = getGuildChannelConfig(guildId);
  const feedbackChannelId = asString(cfg.feedbackChannelId);
  if (!feedbackChannelId) return;

  const url = buildDiscordChannelUrl(guildId, feedbackChannelId);
  const feedbackChannel = await fetchTextChannel(feedbackChannelId, guildId);
  const channelLabel = feedbackChannel?.name ? `#${feedbackChannel.name}` : "canal de feedback";

  const productName = product?.name || order?.productId || "Produto";
  const variantLabel = variant?.label || order?.variantId || "Variacao";

  const lines = [];
  lines.push("Obrigado pela compra.");
  lines.push(`Produto: **${productName}**`);
  lines.push(`Variacao: **${variantLabel}**`);
  lines.push("");
  lines.push(`Se puder, deixe sua avaliacao no ${channelLabel}:`);
  if (url) lines.push(url);

  const user = options.user || null;
  const channel = options.channel || null;

  if (user) {
    await sendUserSystemEmbed(user, "Avalie a loja", lines.join("\n"), "info");
    return;
  }

  if (channel) {
    await sendSystemEmbed(channel, "Avalie a loja", lines.join("\n"), "info");
  }
}

async function sendDeliveryMessage(order, product, variant, key, options = {}) {
  logEnter("sendDeliveryMessage", { orderId: order.id, userId: order.userId });
  const channelId = order.channelId;
  let channel = null;
  if (channelId) {
    channel = await client.channels.fetch(channelId).catch(() => null);
  }

  const source = options.source || order.confirmedSource || "pix";
  const productName = product?.name || order.productId;
  const variantLabel = variant?.label || order.variantId;
  const userMessage = buildDeliveryUserMessage(order, product, variant, key, { source });
  const buildDeliveryPayload = () =>
    buildSystemEmbedPayload(userMessage.title, userMessage.description, "success", {
      includeBanner: true,
      includeThumbnail: true
    });

  let dmSent = false;
  let channelDelivered = false;
  let channelNotified = false;
  const user = await client.users.fetch(order.userId).catch(() => null);
  if (user) {
    try {
      const payload = buildDeliveryPayload();
      await user.send({
        ...payload,
        content: `Sua key:\n\`\`\`\n${key}\n\`\`\``
      });
      dmSent = true;
    } catch (err) {
      logError("sendDeliveryMessage:dm", err, { orderId: order.id, userId: order.userId });
    }
  }

  if (channel && channel.isTextBased && channel.isTextBased()) {
    if (dmSent) {
      await sendSystemEmbed(
        channel,
        "Entrega enviada na DM",
        `Compra confirmada.\nProduto: **${productName}**\nVariacao: **${variantLabel}**\nEnviamos a key no privado.`,
        "success"
      );
      channelNotified = true;
    } else {
      const payload = buildDeliveryPayload();
      await channel.send({
        ...payload,
        content: "Nao foi possivel enviar DM. Entrega realizada neste canal."
      });
      channelDelivered = true;
    }
  }

  if (!dmSent && !channelDelivered) {
    await notifyStaffLog("Falha ao enviar entrega", {
      guildId: order.guildId,
      userId: order.userId,
      channelId: order.channelId,
      productId: order.productId,
      variantId: order.variantId,
      paymentId: order.paymentId,
      value: order.value ? formatCurrency(order.value) : null
    });
  }

  try {
    await sendFeedbackRequest(order, product, variant, { user: dmSent ? user : null, channel: dmSent ? null : channel });
  } catch (err) {
    logError("sendFeedbackRequest", err, { orderId: order?.id, guildId: order?.guildId });
  }

  try {
    await sendLiveSaleNotification(order, product, variant);
  } catch (err) {
    logError("sendLiveSaleNotification", err, { orderId: order?.id, guildId: order?.guildId });
  }

  logExit("sendDeliveryMessage", {
    orderId: order.id,
    dmSent,
    channelDelivered,
    channelNotified,
    channelId
  });
}

async function notifyOutOfStock(order) {
  logEnter("notifyOutOfStock", { orderId: order.id });
  const channelId = order.channelId;
  let channel = null;
  if (channelId) {
    channel = await client.channels.fetch(channelId).catch(() => null);
  }
  if (!channel || !channel.isTextBased || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("Sem estoque")
    .setColor(COLOR_WARNING)
    .setDescription("Pagamento confirmado, mas o estoque esta vazio. Avise um staff.");

  await channel.send({ embeds: [embed], content: `<@&${config.staffRoleId}>` });
  logExit("notifyOutOfStock", { orderId: order.id, channelId });
}

function getBotAvatarUrl() {
  if (!client?.user) return null;
  return client.user.displayAvatarURL({ extension: "png", size: 256 });
}

function getBrandAuthor() {
  if (!client?.user) return null;
  const iconURL = getBotAvatarUrl();
  return { name: client.user.username, iconURL };
}

function buildSystemEmbedPayload(title, description, tone = "info", options = {}) {
  const { includeBanner = true, includeThumbnail = true } = options;
  const colors = {
    info: BRAND_COLOR,
    success: 0x2ECC71,
    danger: 0xE74C3C,
    warn: 0xE67E22
  };

  const embed = new EmbedBuilder().setTitle(title).setColor(colors[tone] || colors.info);
  const author = getBrandAuthor();
  if (author) embed.setAuthor(author);

  const avatar = getBotAvatarUrl();
  if (includeThumbnail && avatar) embed.setThumbnail(avatar);

  if (description) {
    const lines = String(description)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line.startsWith("- ") ? line : `- ${line}`));
    if (lines.length) embed.setDescription(lines.join("\n"));
  }

  const files = [];
  if (includeBanner && config.systemBanner) {
    const banner = attachIfExists(config.systemBanner, files);
    if (banner) embed.setImage(`attachment://${banner.name}`);
  }

  return { embeds: [embed], files };
}

async function sendSystemEmbed(channel, title, description, tone = "info") {
  if (!channel || !channel.isTextBased || !channel.isTextBased()) return;
  try {
    const payload = buildSystemEmbedPayload(title, description, tone);
    await channel.send(payload);
  } catch (err) {
    logError("sendSystemEmbed", err, { title });
  }
}

async function sendUserSystemEmbed(user, title, description, tone = "info") {
  if (!user) return;
  try {
    const payload = buildSystemEmbedPayload(title, description, tone, { includeBanner: false });
    await user.send(payload);
  } catch (err) {
    logError("sendUserSystemEmbed", err, { userId: user.id, title });
  }
}

async function notifyStaffLog(title, details = {}) {
  const guildId = asString(details.guildId);
  const instChannels = guildId ? getGuildChannelConfig(guildId) : { logsChannelId: "" };
  const candidates = [asString(instChannels.logsChannelId), asString(config.staffLogChannelId)]
    .map((value) => value.trim())
    .filter(Boolean);
  if (!candidates.length) return;

  let channel = null;
  let channelId = "";
  for (const candidate of candidates) {
    const fetched = await client.channels.fetch(candidate).catch(() => null);
    if (!fetched || !fetched.isTextBased || !fetched.isTextBased()) continue;
    if (guildId && fetched.guildId && String(fetched.guildId) !== String(guildId)) continue;
    channel = fetched;
    channelId = candidate;
    break;
  }
  if (!channel) return;

  const lines = [];
  if (details.userId) lines.push(`Usuario: <@${details.userId}> (${details.userId})`);
  if (details.cartId) lines.push(`Carrinho: ${details.cartId}`);
  if (details.channelId) lines.push(`Canal: <#${details.channelId}>`);
  if (details.productId) lines.push(`Produto: ${details.productId}`);
  if (details.variantId) lines.push(`Variacao: ${details.variantId}`);
  if (details.code) lines.push(`Cupom: ${details.code}`);
  if (details.percent !== undefined && details.percent !== null) lines.push(`Desconto: ${details.percent}%`);
  if (details.finalPrice) lines.push(`Total: ${details.finalPrice}`);
  if (details.value) lines.push(`Valor: ${details.value}`);
  if (details.paymentId) lines.push(`Pagamento: ${details.paymentId}`);

  const payload = buildSystemEmbedPayload(title, lines.join("\n"), "info", {
    includeBanner: false,
    includeThumbnail: true
  });
  try {
    await channel.send(payload);
  } catch (err) {
    logError("notifyStaffLog", err, { title, channelId });
  }
}

async function touchCartActivity(cartId) {
  const cart = cartsDb.carts.find((c) => c.id === cartId);
  if (!cart) return;
  cart.lastActivityAt = new Date().toISOString();
  cart.updatedAt = cart.lastActivityAt;
  saveJson(CARTS_PATH, cartsDb);
}

function startCartCleanupWatcher() {
  const intervalMs = 60 * 1000;
  log("info", "cartCleanup:start", { intervalMs, idleMs: CART_INACTIVE_MS });
  setInterval(async () => {
    await cleanupInactiveCarts();
  }, intervalMs);
}

async function cleanupInactiveCarts() {
  const now = Date.now();
  const stale = cartsDb.carts.filter((c) => {
    if (c.status !== "open") return false;
    if (!canCurrentRuntimeHandleGuild(c.guildId)) return false;
    const last = Date.parse(c.lastActivityAt || c.updatedAt || c.createdAt || 0);
    return last && now - last >= CART_INACTIVE_MS;
  });

  for (const cart of stale) {
    await closeCartForInactivity(cart);
  }
}

async function closeCartForInactivity(cart) {
  try {
    const channel = cart.channelId ? await client.channels.fetch(cart.channelId).catch(() => null) : null;
    if (channel && channel.isTextBased && channel.isTextBased()) {
      await sendSystemEmbed(
        channel,
        "Carrinho expirado",
        "Carrinho fechado por inatividade (5 minutos).\nAbra um novo carrinho pelo menu do produto.",
        "warn"
      );
      await channel.delete("Carrinho inativo");
    }
  } catch (err) {
    logError("closeCartForInactivity", err, { cartId: cart.id });
  }

  cart.status = "expired";
  cart.updatedAt = new Date().toISOString();
  saveJson(CARTS_PATH, cartsDb);

  const user = await client.users.fetch(cart.userId).catch(() => null);
  if (user) {
    await sendUserSystemEmbed(
      user,
      "Carrinho expirado",
      "Seu carrinho foi fechado por inatividade (5 minutos).\nSe ainda quiser comprar, abra outro carrinho pelo menu do produto.",
      "warn"
    );
  }
}

async function purgeChannelMessages(channel) {
  logEnter("purgeChannelMessages", { channelId: channel?.id });
  if (!channel || !channel.isTextBased || !channel.isTextBased()) {
    return { ok: false, reason: "canal invalido" };
  }
  const me = channel.guild?.members?.me;
  if (me) {
    const perms = channel.permissionsFor(me);
    const needed = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.ManageMessages
    ];
    if (!perms?.has(needed)) {
      return { ok: false, reason: "precisa das permissoes Ver canal, Ler historico e Gerenciar mensagens" };
    }
  }

  try {
    let fetched = null;
    do {
      fetched = await channel.messages.fetch({ limit: 100 });
      if (!fetched.size) break;

      const deletable = fetched.filter((m) => m.deletable);
      if (!deletable.size) break;

      const now = Date.now();
      const recent = deletable.filter((m) => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      const older = deletable.filter((m) => now - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);

      if (recent.size) {
        await channel.bulkDelete(recent, true);
      }

      for (const msg of older.values()) {
        try {
          await msg.delete();
        } catch {}
      }
    } while (fetched.size >= 2);
  } catch {
    return { ok: false, reason: "nao foi possivel apagar todas as mensagens" };
  }

  logExit("purgeChannelMessages", { channelId: channel?.id });
  return { ok: true };
}

