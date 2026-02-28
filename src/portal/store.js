import fs from "fs";
import path from "path";

function safeString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

export function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function createPortalStore(options) {
  const filePath = options?.filePath;
  const log = options?.log;
  if (!filePath) throw new Error("portalStore: filePath obrigatorio");

  const fallback = {
    version: 1,
    users: [],
    instances: [],
    transactions: [],
    withdrawals: []
  };

  let queue = Promise.resolve();

  const runExclusive = (fn) => {
    const next = queue.then(fn, fn);
    // Keep the chain alive even if an operation fails.
    queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  function load() {
    const data = readJson(filePath, fallback);
    if (!data || typeof data !== "object") return { ...fallback };
    if (!Array.isArray(data.users)) data.users = [];
    if (!Array.isArray(data.instances)) data.instances = [];
    if (!Array.isArray(data.transactions)) data.transactions = [];
    if (!Array.isArray(data.withdrawals)) data.withdrawals = [];
    if (!data.version) data.version = 1;
    return data;
  }

  function save(data) {
    writeJsonAtomic(filePath, data);
    if (typeof log === "function") {
      log("debug", "portal:store:save", { filePath });
    }
  }

  function ensureUser(data, user) {
    const discordUserId = safeString(user?.discordUserId).trim();
    if (!discordUserId) throw new Error("portalStore: discordUserId obrigatorio");

    const now = new Date().toISOString();
    const existing = data.users.find((u) => safeString(u.discordUserId) === discordUserId) || null;
    if (existing) {
      existing.discordUsername = safeString(user?.discordUsername);
      existing.discordAvatar = safeString(user?.discordAvatar);
      existing.email = safeString(user?.email);
      if (existing.profileAvatarUrl === undefined) existing.profileAvatarUrl = "";
      existing.lastLoginAt = now;
      if (user?.discordToken) existing.discordToken = user.discordToken;
      return existing;
    }

    const created = {
      discordUserId,
      discordUsername: safeString(user?.discordUsername),
      discordAvatar: safeString(user?.discordAvatar),
      email: safeString(user?.email),
      createdAt: now,
      lastLoginAt: now,
      plan: { tier: "free", status: "inactive", expiresAt: "" },
      walletCents: 0,
      salesCentsTotal: 0,
      profileAvatarUrl: "",
      payout: { pixKey: "", pixKeyType: "" },
      discordToken: user?.discordToken || null
    };
    data.users.push(created);
    return created;
  }

  function getUserByDiscordId(data, discordUserId) {
    const id = safeString(discordUserId).trim();
    if (!id) return null;
    return data.users.find((u) => safeString(u.discordUserId) === id) || null;
  }

  function listUserInstances(data, discordUserId) {
    const id = safeString(discordUserId).trim();
    return data.instances.filter((i) => safeString(i.ownerDiscordUserId) === id);
  }

  return {
    load,
    save,
    runExclusive,
    ensureUser,
    getUserByDiscordId,
    listUserInstances
  };
}
