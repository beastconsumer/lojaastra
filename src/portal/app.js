import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import htm from "https://esm.sh/htm@3.1.1";
import {
  Bot,
  CircleUserRound,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Link2,
  Plus,
  Rocket,
  ShoppingBag,
  Play,
  Square,
  RotateCcw,
  Settings,
  Trash2,
  Edit3,
  Package,
  Send,
  Save,
  X,
  RefreshCw,
  Search,
  Box,
  Boxes,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Key,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  Wallet,
  ChevronRight,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Lock,
  User,
  LogOut,
  Gift,
  Store,
  Banknote,
  AlertTriangle,
  Check,
  Loader2,
  Timer,
  Bell,
  BookOpen,
  FileText,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Info,
  CircleDollarSign,
  Receipt,
  BadgeCheck
} from "https://esm.sh/lucide-react@0.468.0?deps=react@18.2.0";

const html = htm.bind(React.createElement);

function asString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function isHttpMediaUrl(value) {
  const raw = asString(value).trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatBRLFromCents(cents) {
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function formatDateTime(value) {
  const raw = asString(value).trim();
  if (!raw) return "—";
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return raw;
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return raw.slice(0, 19).replace("T", " ");
  }
}

function humanizeCode(value) {
  const raw = asString(value).trim().toLowerCase();
  if (!raw) return "—";
  const text = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function maskSensitive(value, visibleStart = 3, visibleEnd = 3) {
  const text = asString(value).trim();
  if (!text) return "—";
  const minLen = visibleStart + visibleEnd + 1;
  if (text.length <= minLen) return text;
  return `${text.slice(0, visibleStart)}...${text.slice(-visibleEnd)}`;
}

function getTransactionTypeMeta(type) {
  const key = asString(type).trim().toLowerCase();
  const labels = {
    sale_credit: "Venda aprovada",
    plan_purchase: "Assinatura",
    trial_activated: "Trial ativado",
    withdrawal_request: "Saque solicitado",
    withdrawal_cancelled: "Saque cancelado",
    withdrawal_completed: "Saque concluido"
  };
  return {
    key,
    label: labels[key] || humanizeCode(key)
  };
}

function getTransactionStatusMeta(status) {
  const key = asString(status).trim().toLowerCase();
  if (key === "paid") return { key, label: "Pago", className: "active" };
  if (key === "pending") return { key, label: "Pendente", className: "pending" };
  if (key === "failed") return { key, label: "Falhou", className: "error" };
  if (key === "cancelled") return { key, label: "Cancelado", className: "none" };
  return { key, label: humanizeCode(key), className: "none" };
}

function getWithdrawalStatusMeta(status) {
  const key = asString(status).trim().toLowerCase();
  if (key === "requested") return { key, label: "Solicitado", className: "pending" };
  if (key === "completed") return { key, label: "Concluido", className: "active" };
  if (key === "cancelled") return { key, label: "Cancelado", className: "none" };
  if (key === "rejected") return { key, label: "Rejeitado", className: "error" };
  return { key, label: humanizeCode(key), className: "none" };
}

function formatRuntimeStatus(status) {
  const key = asString(status).toLowerCase();
  if (key === "online") return { label: "Online", className: "active" };
  if (key === "offline") return { label: "Offline", className: "pending" };
  if (key === "erro") return { label: "Erro", className: "error" };
  if (key === "suspenso") return { label: "Suspenso", className: "none" };
  if (key === "nao_configurado") return { label: "Sem token", className: "none" };
  return { label: key ? key : "Configurando", className: "pending" };
}

function formatDockerIssue(code) {
  const key = asString(code).toLowerCase();
  if (key === "docker_unavailable") return "Docker indisponível no servidor.";
  if (key === "docker_permission_denied") return "Sem permissão para acessar o Docker.";
  if (key === "docker_image_missing") return "Imagem do bot não encontrada. Faça build da imagem da instância.";
  if (key === "docker_disabled") return "Modo Docker desativado no servidor.";
  if (key === "crash_exit_1" || key === "crash_repetido_exit_1") {
    return "Falha ao iniciar o bot. Revise o token do bot e as intents no Discord Developer Portal.";
  }
  if (key === "crash_exit_78" || key === "crash_repetido_exit_78") {
    return "Token válido, mas intent bloqueada. Ative Message Content Intent no Discord Developer Portal do bot.";
  }
  if (key === "crash_repetido_exit_0") {
    return "O bot iniciou e encerrou em seguida. Revise token, permissões e conexão com Discord.";
  }
  if (key.startsWith("crash_exit_")) return `Bot encerrou ao iniciar (${key}).`;
  if (key.startsWith("crash_repetido_exit_")) return `Bot entrou em loop de reinício (${key}).`;
  if (!key) return "";
  return `Falha no runtime: ${key}`;
}

function parseVariantPrice(value) {
  const raw = asString(value).replace(",", ".").trim();
  const num = Number(raw);
  return Number.isFinite(num) ? num : NaN;
}

function validateProductDraftClient(draft, options = {}) {
  const { requireId = false, requireVariant = true } = options;
  const issues = [];

  const id = asString(draft?.id).trim();
  const name = asString(draft?.name).trim();
  if (requireId && !id) issues.push("Defina um ID para o produto.");
  if (requireId && id && !/^[a-zA-Z0-9._-]+$/.test(id)) {
    issues.push("ID inválido: use apenas letras, números, ponto, underline e hífen.");
  }
  if (!name) issues.push("Defina um nome para o produto.");

  const variants = Array.isArray(draft?.variants) ? draft.variants : [];
  const seen = new Set();
  let validVariants = 0;

  variants.forEach((variant, index) => {
    const vid = asString(variant?.id).trim();
    const label = asString(variant?.label).trim();
    const duration = asString(variant?.duration).trim();
    const price = parseVariantPrice(variant?.price);
    const hasAny = Boolean(vid || label || duration || asString(variant?.price).trim());
    if (!hasAny) return;

    if (!vid) issues.push(`Variação ${index + 1}: informe o ID.`);
    if (!label) issues.push(`Variação ${index + 1}: informe o label.`);
    if (!duration) issues.push(`Variação ${index + 1}: informe a duração.`);
    if (!Number.isFinite(price) || price <= 0) issues.push(`Variação ${index + 1}: preço inválido.`);
    if (vid) {
      if (seen.has(vid)) issues.push(`Variação duplicada: ${vid}.`);
      seen.add(vid);
    }

    if (vid && label && duration && Number.isFinite(price) && price > 0) {
      validVariants += 1;
    }
  });

  if (requireVariant && validVariants === 0) {
    issues.push("Adicione ao menos 1 variação válida.");
  }

  return issues;
}

function countStockKeys(stock) {
  if (!stock || typeof stock !== "object") return 0;
  return Object.values(stock).reduce((sum, bucket) => {
    if (!Array.isArray(bucket)) return sum;
    return sum + bucket.length;
  }, 0);
}

const DASHBOARD_TABS = ["overview", "instances", "store", "wallet", "account"];

function normalizeDashboardTab(value) {
  const key = asString(value).trim().toLowerCase();
  return DASHBOARD_TABS.includes(key) ? key : "overview";
}

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const navigate = (to) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPath(to);
  };
  return { path, navigate };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function Button({ variant = "primary", disabled, onClick, children, icon: Icon }) {
  return html`<button type="button" className=${`btn ${variant}`} disabled=${disabled} onClick=${onClick}>
    ${Icon ? html`<${Icon} className="btnIcon" size=${16} strokeWidth=${1.9} aria-hidden="true" />` : null}
    <span>${children}</span>
  </button>`;
}

function TopBar({ route, me, onLogout }) {
  const nav = [
    { label: "Inicio", to: "/" },
    { label: "Planos", to: "/plans" },
    { label: "Tutoriais", to: "/tutorials" },
    { label: "Termos", to: "/terms" },
    { label: "Privacidade", to: "/privacy" }
  ];
  return html`
    <div className="topbar">
      <div className="brand" role="button" tabindex="0" onClick=${() => route.navigate("/")}>
        <div className="name"><b>Astra</b><i>Systems</i></div>
      </div>
      <div className="nav">
        ${nav.map(
          (item) =>
            html`<a
              href=${item.to}
              className=${route.path === item.to ? "active" : ""}
              onClick=${(e) => {
                e.preventDefault();
                route.navigate(item.to);
              }}
              >${item.label}</a
            >`
        )}
        <a href="https://discord.gg/5H7xhCptbX" target="_blank" rel="noreferrer">Discord</a>
      </div>
      <div className="right">
        ${me
          ? html`
              <${Button} variant="subtle" icon=${LayoutDashboard} onClick=${() => route.navigate("/dashboard")}>Dashboard</${Button}>
              ${me.profileAvatarUrl || me.discordAvatarUrl
                ? html`<img
                    src=${me.profileAvatarUrl || me.discordAvatarUrl}
                    alt=${me.discordUsername || "avatar"}
                    className="topbarAvatar"
                    onClick=${() => route.navigate("/dashboard")}
                    title=${me.discordUsername || "Dashboard"}
                  />`
                : null}
              <${Button} variant="ghost" icon=${X} onClick=${onLogout}>Sair</${Button}>
            `
          : html`<${Button} variant="primary" icon=${UserPlus} onClick=${() => route.navigate("/login")}>Entrar</${Button}>`}
      </div>
    </div>
  `;
}

function Home({ route }) {
  const [calcRaw, setCalcRaw] = useState("");

  const calcCents = (() => {
    const v = parseFloat(String(calcRaw).replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : 0;
  })();

  function fmtBRL(cents) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  const competitors = [
    { name: "AstraSystems", tag: "Menor taxa", rate: 0.06, release: "Na hora", highlight: true },
    { name: "Outras plataformas", rate: 0.13, release: "Até 7 dias", highlight: false },
    { name: "Mercado Livre / Outros", rate: 0.19, release: "Até 1 mês", highlight: false }
  ];

  const features = [
    {
      icon: html`<${Zap} size=${20} />`,
      title: "Taxa imbatível: apenas 6%",
      desc: html`A menor taxa do mercado. Concorrentes cobram até <b style=${{ color: "var(--accent2)" }}>19%</b>. Você fica com mais do que vendeu.`
    },
    {
      icon: html`<${Banknote} size=${20} />`,
      title: "PIX cai na hora",
      desc: "Aprovação do pagamento confirmada em segundos. Zero espera, zero burocracia."
    },
    {
      icon: html`<${Bot} size=${20} />`,
      title: "Bot 100% seu",
      desc: "Use o token do seu próprio bot Discord. Nome, avatar e identidade são seus."
    },
    {
      icon: html`<${Store} size=${20} />`,
      title: "Loja embutida no Discord",
      desc: "Produtos com variações, estoque, embed rico e botão de compra — tudo dentro do servidor."
    },
    {
      icon: html`<${Shield} size=${20} />`,
      title: "Proteção anti-fraude",
      desc: "Entrega automática só após confirmação do pagamento. Stock zerado nunca entrega."
    },
    {
      icon: html`<${Gift} size=${20} />`,
      title: "Plano cresce com suas vendas",
      desc: html`A cada <b style=${{ color: "var(--good)" }}>R$ 20 em vendas</b>, seu plano ganha <b style=${{ color: "var(--good)" }}>+1 dia</b> automático.`
    }
  ];

  return html`
    <div className="container">
      <div className="hero">
        <div className="pill reco" style=${{ margin: "0 auto 14px", width: "fit-content" }}>
          <span>Venda no Discord como nunca antes</span>
        </div>
        <h1>Astra<span className="accent">Systems</span></h1>
        <p>
          Transforme seu servidor Discord em uma plataforma de vendas completa.
          Bot próprio, estoque automático, PIX na hora e taxa de só 6%.
        </p>
        <div className="cta">
          <${Button} variant="primary" icon=${Rocket} onClick=${() => route.navigate("/dashboard")}>Começar agora</${Button}>
          <${Button} variant="ghost" icon=${CreditCard} onClick=${() => route.navigate("/plans")}>Ver Planos</${Button}>
        </div>
      </div>

      <div className="homeGrid">
        <div className="homeFeaturesCol">
          <div className="homeSectionLabel">Por que usar a AstraSystems?</div>
          <div className="featureList">
            ${features.map((f) => html`
              <div className="featureItem">
                <div className="featureIcon">${f.icon}</div>
                <div className="featureText">
                  <div className="featureTitle">${f.title}</div>
                  <div className="featureDesc">${f.desc}</div>
                </div>
              </div>
            `)}
          </div>

          <div className="bonusBox">
            <${Sparkles} size=${20} style=${{ color: "var(--accent2)", flexShrink: 0 }} />
            <div>
              <div style=${{ fontWeight: 800, fontSize: "14px" }}>
                Como a AstraSystems pode te deixar no lucro
              </div>
              <div style=${{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginTop: "4px", lineHeight: "1.5" }}>
                A cada <b style=${{ color: "var(--good)" }}>R$ 20 em vendas</b>, você ganha <b style=${{ color: "var(--good)" }}>+1 dia</b> no seu bot.
                Vendendo R$ 20 por dia, você não precisa renovar — o plano se paga sozinho.
              </div>
            </div>
          </div>
        </div>

        <div className="homeCalcCol">
          <div className="homeSectionLabel">Calculadora de Taxas</div>
          <div className="feeCalc card pad">
            <div className="label" style=${{ marginBottom: "8px" }}>Valor do produto</div>
            <div className="feeInput">
              <span className="feeInputPrefix">R$</span>
              <input
                className="input"
                style=${{ paddingLeft: "42px" }}
                value=${calcRaw}
                onInput=${(e) => setCalcRaw(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>

            <div className="feeRows" style=${{ marginTop: "16px" }}>
              ${competitors.map((c) => {
                const fee = Math.round(calcCents * c.rate);
                const receive = calcCents - fee;
                return html`
                  <div className=${`feeRow ${c.highlight ? "feeRowHighlight" : ""}`}>
                    <div className="feeRowHead">
                      <span className="feeRowName">${c.name}</span>
                      ${c.tag ? html`<span className="feeRowTag">${c.tag}</span>` : null}
                      <span className="feeRowRate" style=${{ color: c.highlight ? "var(--good)" : "var(--warn)" }}>
                        ${Math.round(c.rate * 100)}%
                      </span>
                    </div>
                    <div className="feeRowDetails">
                      <div className="feeRowLine">
                        <span>Taxa:</span>
                        <span style=${{ color: "var(--bad)" }}>-${fmtBRL(fee)}</span>
                      </div>
                      <div className="feeRowLine">
                        <span>Você recebe:</span>
                        <span style=${{ color: c.highlight ? "var(--good)" : "var(--ink)", fontWeight: 900 }}>${fmtBRL(receive)}</span>
                      </div>
                      <div className="feeRowLine">
                        <span>Liberação:</span>
                        <span style=${{ color: c.highlight ? "var(--good)" : "var(--warn)" }}>${c.release}</span>
                      </div>
                    </div>
                  </div>
                `;
              })}
            </div>

            ${calcCents > 0 ? html`
              <div className="feeSaving">
                💰 Você economiza <b style=${{ color: "var(--good)" }}>
                  ${fmtBRL(Math.round(calcCents * 0.19) - Math.round(calcCents * 0.06))}
                </b> por venda vs. a maior taxa do mercado.
              </div>
            ` : null}
          </div>
        </div>
      </div>
    </div>
  `;
}

function Login({ error }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [status, setStatus] = useState({ oauthEnabled: true });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiFetch("/api/bot/status");
        if (mounted) setStatus(data || { oauthEnabled: true });
      } catch {
        if (mounted) setStatus({ oauthEnabled: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const submitLocal = async () => {
    setLocalError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await apiFetch("/auth/local/register", {
          method: "POST",
          body: JSON.stringify({ email, password, username })
        });
      } else {
        await apiFetch("/auth/local/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
      }
      window.location.href = "/dashboard";
    } catch (err) {
      const raw = err?.message || "Falha ao entrar. Tente novamente.";
      const msg = raw === "conta_bloqueada" ? "Conta bloqueada. Entre em contato com o suporte." : raw;
      setLocalError(msg);
    } finally {
      setBusy(false);
    }
  };

  const errorText =
    error === "oauth_failed"
      ? "Falha no login. Tente novamente."
    : error === "oauth_state"
      ? "Sessao expirou. Tente novamente."
    : error === "oauth_config"
      ? "Login com Discord indisponivel no momento."
    : error === "account_blocked"
      ? "Conta bloqueada. Entre em contato com o suporte."
      : "";

  return html`
    <div className="center">
      <div className="glass loginCard">
        <div style=${{ textAlign: "center" }}>
          <div className="brand" style=${{ justifyContent: "center" }}>
            <div className="name" style=${{ fontSize: "30px" }}><b>Astra</b><i>Systems</i></div>
          </div>
          <div className="muted" style=${{ marginTop: "8px" }}>Acesse sua conta</div>
        </div>

        <div className="card pad" style=${{ marginTop: "18px" }}>
          <h2>Como voce quer entrar?</h2>
          <div className="loginActions">
            <${Button}
              variant="primary"
              disabled=${busy || !status?.oauthEnabled}
              onClick=${() => (window.location.href = "/auth/discord")}
            >
              <${Bot} size=${18} style=${{ marginRight: "8px" }} />
              Continuar com Discord
            </${Button}>
            ${status?.oauthEnabled
              ? null
              : html`<div className="muted2" style=${{ fontSize: "12px" }}>Login com Discord ainda nao esta configurado.</div>`}
            <div className="divider">ou</div>

            <div className="row grow" style=${{ marginTop: "4px" }}>
              <${Button} variant=${mode === "login" ? "primary" : "ghost"} disabled=${busy} onClick=${() => setMode("login")}>
                <${Mail} size=${16} style=${{ marginRight: "6px" }} />
                Entrar com Email
              </${Button}>
              <${Button}
                variant=${mode === "register" ? "primary" : "ghost"}
                disabled=${busy}
                onClick=${() => setMode("register")}
              >
                <${UserPlus} size=${16} style=${{ marginRight: "6px" }} />
                Criar conta
              </${Button}>
            </div>

            ${mode === "register"
              ? html`<input
                  className="input"
                  value=${username}
                  onInput=${(e) => setUsername(e.target.value)}
                  placeholder="Seu nome (opcional)"
                />`
              : null}
            <input className="input" type="email" value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            <input className="input" type="password" value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="sua senha" />
            <${Button} variant="subtle" disabled=${busy} onClick=${submitLocal}>
              <${LogOut} size=${16} style=${{ marginRight: "6px", transform: "rotate(180deg)" }} />
              ${mode === "register" ? "Criar e entrar" : "Entrar"}
            </${Button}>
          </div>
          ${localError || errorText
            ? html`<div className="muted2" style=${{ marginTop: "10px", color: "rgba(239,68,68,0.95)" }}>${localError || errorText}</div>`
            : null}
        </div>

        <div className="muted2" style=${{ textAlign: "center", marginTop: "16px", fontSize: "12px" }}>
          Ao continuar, voce concorda com nossos <a href="/terms" style=${{ color: "var(--accent2)" }}>Termos de Servico</a> e
          <a href="/privacy" style=${{ color: "var(--accent2)" }}> Politica de Privacidade</a>.
        </div>
      </div>
    </div>
  `;
}

function Plans({ route, me, toast }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ mercadoPagoEnabled: true });
  const allowParallax = useMemo(() => {
    try {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiFetch("/api/bot/status");
        if (mounted) setStatus(data || { mercadoPagoEnabled: true });
      } catch {
        if (mounted) setStatus({ mercadoPagoEnabled: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const planTier = asString(me?.plan?.tier);
  const planActive = !!me?.planActive;
  const trialClaimedAt = asString(me?.trialClaimedAt).trim();
  const trialAlreadyUsed = !!trialClaimedAt;
  const mpEnabled = !!status?.mercadoPagoEnabled;
  const trialDisabled = busy || (me && (planActive || trialAlreadyUsed));

  const onTrial = async () => {
    if (!me) return route.navigate("/login");
    if (trialAlreadyUsed) {
      return toast(
        "Nao elegivel ao trial",
        "Este usuario ja utilizou o trial gratuito e nao pode ativar novamente.",
        "bad"
      );
    }
    if (planActive) {
      return toast("Plano ativo", "Voce ja possui um plano ativo.", "bad");
    }
    setBusy(true);
    try {
      await apiFetch("/api/plans/trial", { method: "POST", body: "{}" });
      toast("Plano Trial ativado", "Voce ganhou 24 horas para testar.", "good");
      route.navigate("/dashboard");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "trial ja utilizado") {
        toast("Nao elegivel ao trial", "Este usuario ja utilizou o trial gratuito.", "bad");
      } else if (msg === "voce ja tem um plano ativo") {
        toast("Plano ativo", "Voce ja possui um plano ativo.", "bad");
      } else {
        toast("Falha ao ativar trial", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onStart = async () => {
    if (!me) return route.navigate("/login");
    if (!mpEnabled) {
      return toast("Pagamento indisponivel", "Pagamentos nao estao configurados no servidor. Contate o suporte.", "bad");
    }

    setBusy(true);
    try {
      toast("Abrindo pagamento...", "Voce sera redirecionado para o Mercado Pago.", "good");
      const data = await apiFetch("/api/checkout/plan", {
        method: "POST",
        body: JSON.stringify({ planId: "start_monthly" })
      });
      const url = data.initPoint || data.sandboxInitPoint;
      if (url) window.location.href = url;
      else toast("Falha ao criar pagamento", "Sem URL de checkout.", "bad");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "mercadopago_not_configured" || msg.includes("mercadopago_not_configured")) {
        toast("Pagamento indisponivel", "Pagamentos nao estao configurados no servidor.", "bad");
      } else if (msg.includes("MP API Error")) {
        toast("Erro no Mercado Pago", msg.replace("MP API Error: ", ""), "bad");
      } else {
        toast("Falha ao criar pagamento", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const resetPlanParallax = (card) => {
    if (!card) return;
    card.style.setProperty("--plan-rx", "0deg");
    card.style.setProperty("--plan-ry", "0deg");
  };

  const onPlanMove = (e) => {
    if (!allowParallax) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const rx = (0.5 - y) * 4.2;
    const ry = (x - 0.5) * 5.4;

    card.style.setProperty("--plan-rx", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--plan-ry", `${ry.toFixed(2)}deg`);
  };

  const onPlanLeave = (e) => resetPlanParallax(e.currentTarget);

  return html`
    <div className="container">
      <div className="hero" style=${{ paddingTop: "24px" }}>
        <h1>
          Escolha o plano ideal <span className="accent">para voce</span>
        </h1>
        <p>Solucoes flexiveis para negocios em crescimento e empresas em expansao.</p>
      </div>

      ${me && planActive
        ? html`
            <div className="card pad" style=${{ marginBottom: "16px" }}>
              <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="muted2">Seu plano atual</div>
                  <div style=${{ fontWeight: 900, fontSize: "18px", marginTop: "4px" }}>
                    ${planTier === "trial" ? "Trial (24h)" : planTier === "start" ? "Start" : planTier || "Ativo"}
                  </div>
                </div>
                <${Button} variant="ghost" onClick=${() => route.navigate("/dashboard")}>
                  <${LayoutDashboard} size=${16} style=${{ marginRight: "6px" }} />
                  Ir para Dashboard
                </${Button}>
              </div>
            </div>
          `
        : null}

      ${me && !mpEnabled
        ? html`
            <div className="card pad" style=${{ marginBottom: "16px" }}>
              <div className="row" style=${{ alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div className="muted2">Atencao</div>
                  <div style=${{ fontWeight: 900, fontSize: "16px", marginTop: "4px" }}>Pagamentos indisponiveis</div>
                  <div className="muted" style=${{ marginTop: "6px" }}>
                    O sistema de pagamentos nao esta configurado no servidor. Contate o suporte para habilitar.
                  </div>
                </div>
                <${Button} variant="ghost" onClick=${() => route.navigate("/dashboard")}>
                  <${LayoutDashboard} size=${16} style=${{ marginRight: "6px" }} />
                  Abrir Dashboard
                </${Button}>
              </div>
            </div>
          `
        : null}

      <div className="grid cols3">
        <div className="card plan parallaxPlan" onMouseMove=${onPlanMove} onMouseLeave=${onPlanLeave} onBlur=${onPlanLeave}>
          <div className="outlineGlow"></div>
          <div className="pill good">Gratuito</div>
          <h3>Trial</h3>
          <div className="muted">Teste todas as funcionalidades por 24 horas gratuitamente.</div>
          <div className="price">
            <div className="big">R$ 0</div>
            <div className="unit">/24h</div>
          </div>
          <ul>
            <li>Sistema de vendas completo</li>
            <li>Dashboard + carteira</li>
            <li>Onboarding e tutoriais</li>
            <li>Personalizacao base</li>
          </ul>
          <div className="foot">
            <${Button} variant="ghost" disabled=${trialDisabled} onClick=${onTrial}>
              <${Sparkles} size=${16} style=${{ marginRight: "6px" }} />
              ${me && trialAlreadyUsed ? "Nao elegivel" : me && planActive ? "Plano ativo" : "Testar Gratis"}
            </${Button}>
            ${me && trialAlreadyUsed
                ? html`<div className="muted2" style=${{ marginTop: "10px", fontSize: "12px" }}>
                    Este usuario ja utilizou o trial e nao esta mais elegivel.
                    ${trialClaimedAt ? html`<br />Usado em: ${formatDateTime(trialClaimedAt)}.` : null}
                  </div>`
              : me && planActive
                ? html`<div className="muted2" style=${{ marginTop: "10px", fontSize: "12px" }}>Voce ja possui um plano ativo.</div>`
              : null}
          </div>
        </div>

        <div className="card plan recommended parallaxPlan" onMouseMove=${onPlanMove} onMouseLeave=${onPlanLeave} onBlur=${onPlanLeave}>
          <div className="outlineGlow"></div>
          <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
            <div className="pill reco">Recomendado</div>
            <div className="pill" style=${{ color: "rgba(255,255,255,0.66)" }}>Mais Popular</div>
          </div>
          <h3>Start</h3>
          <div className="muted">Solucao completa para vendas e atendimento no Discord.</div>
          <div className="price">
            <div className="muted" style=${{ fontWeight: 800 }}>a partir de</div>
          </div>
          <div className="price">
            <div className="big">R$ 5,97</div>
            <div className="unit">/mes</div>
          </div>
          <ul>
            <li>Sistema de vendas completo</li>
            <li>Saldo de vendas + saques</li>
            <li>Seguranca e protecao basica</li>
            <li>Personalizacao completa</li>
            <li>Suporte prioritario</li>
          </ul>
          <div className="foot">
            <${Button} variant="primary" disabled=${busy || !mpEnabled} onClick=${onStart}>
              <${Rocket} size=${16} style=${{ marginRight: "6px" }} />
              Comecar Agora
            </${Button}>
            ${mpEnabled
              ? null
              : html`<div className="muted2" style=${{ marginTop: "10px", fontSize: "12px" }}>Pagamentos indisponiveis no servidor.</div>`}
          </div>
        </div>

        <div className="card plan parallaxPlan" onMouseMove=${onPlanMove} onMouseLeave=${onPlanLeave} onBlur=${onPlanLeave}>
          <div className="outlineGlow"></div>
          <div className="pill soon">Em desenvolvimento</div>
          <h3>Enterprise</h3>
          <div className="muted">Recursos avancados para grandes servidores e empresas.</div>
          <div className="price">
            <div className="big" style=${{ opacity: 0.6 }}>Em breve</div>
          </div>
          <ul>
            <li>Multiplos bots por servidor</li>
            <li>API personalizada</li>
            <li>White-label completo</li>
          </ul>
          <div className="foot">
            <${Button} variant="ghost" disabled=${true}>
              <${Clock} size=${16} style=${{ marginRight: "6px" }} />
              Em Breve
            </${Button}>
          </div>
        </div>
      </div>
    </div>
  `;
}

function TrialPage({ route, me, refreshMe, toast }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | done

  const alreadyHasPlan = me?.planActive;
  const trialClaimedAt = asString(me?.trialClaimedAt).trim();
  const alreadyUsedTrial = !!trialClaimedAt;

  const features = [
    "Vendas via PIX (Mercado Pago)",
    "Loja embutida no Discord",
    "Estoque e entrega automática",
    "Logs e moderação integrados",
    "Proteção anti-fraude",
    "Personalização completa do bot",
    "Suporte via Discord"
  ];

  const onActivate = async () => {
    if (alreadyUsedTrial) {
      return toast(
        "Nao elegivel ao trial",
        "Este usuario ja utilizou o trial gratuito e nao pode ativar novamente.",
        "bad"
      );
    }
    if (alreadyHasPlan) {
      return toast("Plano ativo", "Voce ja possui um plano ativo.", "bad");
    }
    setPhase("loading");
    try {
      await apiFetch("/api/plans/trial", { method: "POST", body: "{}" });
      await refreshMe();
      setPhase("done");
      setTimeout(() => route.navigate("/dashboard"), 1800);
    } catch (err) {
      setPhase("idle");
      const msg = err?.message || "Erro interno";
      if (msg === "trial ja utilizado") {
        toast("Trial já utilizado", "Você já usou o trial gratuito.", "bad");
      } else if (msg === "voce ja tem um plano ativo") {
        toast("Plano ativo", "Você já tem um plano ativo.", "bad");
      } else {
        toast("Falha ao ativar", msg, "bad");
      }
    }
  };

  return html`
    <div className="container">
      <div style=${{ textAlign: "center", padding: "32px 0 24px" }}>
        <div className="pill reco" style=${{ margin: "0 auto 12px", width: "fit-content" }}>
          <span>Trial Gratuito</span>
        </div>
        <h2 style=${{ margin: 0, fontFamily: '"Space Grotesk", sans-serif', fontSize: "clamp(24px,4vw,36px)", letterSpacing: "-0.03em" }}>
          Teste a <span style=${{ color: "var(--accent2)" }}>AstraSystems</span> sem custo
        </h2>
        <p className="muted" style=${{ marginTop: "8px", fontSize: "15px" }}>
          Confirme para receber 24 horas de acesso completo — grátis.
        </p>
      </div>

      <div className="trialGrid">

        <!-- LEFT: Trial details card -->
        <div className="card pad trialCard">
          <div style=${{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div className="trialIconBox"><${Gift} size=${24} /></div>
            <div>
              <div style=${{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "18px" }}>Trial Gratuito</div>
              <div className="pill good" style=${{ marginTop: "5px", fontSize: "11px", padding: "3px 9px" }}>24 Horas Grátis</div>
            </div>
          </div>
          <div className="muted" style=${{ marginBottom: "16px", fontSize: "14px" }}>
            Teste todas as funcionalidades do bot por 24 horas sem custo algum.
          </div>

          <div className="trialPrice">GRÁTIS</div>
          <div style=${{ color: "var(--good)", fontWeight: 800, fontSize: "14px", marginBottom: "20px" }}>
            Acesso completo por 24 horas
          </div>

          <div style=${{ fontWeight: 800, fontSize: "13px", marginBottom: "10px" }}>Funções incluídas:</div>
          <div className="trialFeatures">
            ${features.map((f) => html`
              <div className="trialFeatureRow">
                <${Check} size=${14} className="trialCheck" />
                <span>${f}</span>
              </div>
            `)}
          </div>

          <div className="trialNote">
            <b>Importante:</b> Após 24 horas, o plano expira automaticamente.
            Para continuar, adquira um dos nossos planos a partir de R$ 5,97/mês.
          </div>
        </div>

        <!-- RIGHT: Status panel -->
        <div className="card pad trialStatusCard">
          <div style=${{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "18px", marginBottom: "20px" }}>
            Status do Trial
          </div>

          ${phase === "idle" ? html`
            <div className="trialStatusBody">
              ${alreadyUsedTrial ? html`
                <div className="trialStatusIcon trialStatusIconWarn"><${AlertTriangle} size=${28} /></div>
                <div className="trialStatusTitle">Nao elegivel: trial ja utilizado</div>
                <div className="trialStatusDesc">
                  Voce ja usou o trial gratuito e nao pode ativar novamente.
                  ${trialClaimedAt ? html`<br />Data de uso: <b>${formatDateTime(trialClaimedAt)}</b>.` : null}
                </div>
              ` : alreadyHasPlan ? html`
                <div className="trialStatusIcon trialStatusIconWarn"><${Zap} size=${28} /></div>
                <div className="trialStatusTitle">Plano já ativo</div>
                <div className="trialStatusDesc">Você já possui um plano ativo. Gerencie seu plano ou acesse a dashboard.</div>
              ` : html`
                <div className="trialStatusIcon trialStatusIconGood"><${Check} size=${28} /></div>
                <div className="trialStatusTitle">Você está elegível!</div>
                <div className="trialStatusDesc">Sua conta está apta para receber o trial gratuito. Clique no botão abaixo para ativar.</div>
              `}

              ${!alreadyHasPlan && !alreadyUsedTrial ? html`
                <div className="trialChecks">
                  <div className="trialCheckLine">
                    <${Check} size=${14} style=${{ color: "var(--good)" }} />
                    Primeira vez usando o trial
                  </div>
                  <div className="trialCheckLine">
                    <${Check} size=${14} style=${{ color: "var(--good)" }} />
                    Conta verificada
                  </div>
                </div>
              ` : null}
            </div>

            <div style=${{ marginTop: "20px" }}>
              ${alreadyHasPlan || alreadyUsedTrial ? html`
                <${Button} variant="primary" icon=${Rocket} onClick=${() => route.navigate("/dashboard")}>
                  Ir para a Dashboard
                </${Button}>
              ` : html`
                <${Button} variant="primary" icon=${Rocket} onClick=${onActivate}>
                  Ativar Trial Gratuito
                </${Button}>
              `}
              <div style=${{ margin: "12px 0" }}>
                <${Button} variant="ghost" onClick=${() => route.navigate("/plans")}>Ver todos os planos</${Button}>
              </div>
            </div>
          ` : phase === "loading" ? html`
            <div className="trialStatusBody">
              <div className="trialStatusIcon trialStatusIconLoading">
                <${Loader2} size=${28} className="spin" />
              </div>
              <div className="trialStatusTitle">Preparando seu bot...</div>
              <div className="trialStatusDesc">Estamos configurando sua conta trial. Isso pode levar alguns instantes.</div>
              <div className="trialLoadingBox">
                <${Timer} size=${16} style=${{ opacity: 0.6 }} />
                <div>
                  <div style=${{ fontWeight: 800, fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>Aguarde...</div>
                  <div style=${{ fontSize: "12px", color: "var(--muted2)", marginTop: "2px" }}>O trial será ativado automaticamente</div>
                </div>
              </div>
            </div>
          ` : html`
            <div className="trialStatusBody">
              <div className="trialStatusIcon trialStatusIconGood"><${Check} size=${28} /></div>
              <div className="trialStatusTitle">Trial ativado!</div>
              <div className="trialStatusDesc">Tudo pronto. Redirecionando para a dashboard...</div>
            </div>
          `}

          <div className="hr" style=${{ margin: "20px 0 16px" }}></div>
          <div className="trialDetailsGrid">
            <div className="trialDetailRow">
              <span className="muted2">Duração:</span>
              <span style=${{ fontWeight: 800 }}>24 horas</span>
            </div>
            <div className="trialDetailRow">
              <span className="muted2">Preço:</span>
              <span style=${{ fontWeight: 900, color: "var(--good)" }}>GRÁTIS</span>
            </div>
            <div className="trialDetailRow">
              <span className="muted2">Renovação:</span>
              <span style=${{ fontWeight: 700 }}>Manual</span>
            </div>
            <div className="trialDetailRow">
              <span className="muted2">Taxa por venda:</span>
              <span style=${{ fontWeight: 700 }}>6%</span>
            </div>
            <div className="trialDetailRow">
              <span className="muted2">Elegibilidade:</span>
              <span style=${{ fontWeight: 700, color: alreadyUsedTrial || alreadyHasPlan ? "var(--warn)" : "var(--good)" }}>
                ${alreadyUsedTrial ? "Nao elegivel (ja utilizado)" : alreadyHasPlan ? "Nao elegivel (plano ativo)" : "Elegivel"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

function Dashboard({ route, me, refreshMe, toast }) {
  const createEmptyInstanceEdit = () => ({
    id: "",
    name: "",
    guildId: "",
    brandName: "",
    accent: "",
    logoUrl: "",
    logsChannelId: "",
    salesChannelId: "",
    feedbackChannelId: ""
  });

  const [instances, setInstances] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [txs, setTxs] = useState([]);
  const [botStatus, setBotStatus] = useState({ ok: false, botReady: false, oauthEnabled: false, mercadoPagoEnabled: false });
  const [tab, setTab] = useState(() => {
    try {
      return normalizeDashboardTab(window.localStorage.getItem("as_dash_tab"));
    } catch {
      return "overview";
    }
  });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBotToken, setNewBotToken] = useState("");
  const [autoOnboardingDone, setAutoOnboardingDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("50,00");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState([]);
  const [pendingAdminWithdrawalAction, setPendingAdminWithdrawalAction] = useState({ id: "", action: "" });
  const [adminWithdrawalActionKey, setAdminWithdrawalActionKey] = useState("");
  const [tokenDraftByInstance, setTokenDraftByInstance] = useState({});
  const [savingTokenFor, setSavingTokenFor] = useState("");
  const [clearingTokenFor, setClearingTokenFor] = useState("");
  const [pendingClearTokenInstanceId, setPendingClearTokenInstanceId] = useState("");
  const [pendingDeleteInstanceId, setPendingDeleteInstanceId] = useState("");
  const [pendingCancelWithdrawalId, setPendingCancelWithdrawalId] = useState("");
  const [botActionByInstance, setBotActionByInstance] = useState({});
  const [editChannels, setEditChannels] = useState({ loading: false, error: "", channels: [] });
  const [instanceWorkspaceMode, setInstanceWorkspaceMode] = useState("none");
  const [instanceWorkspaceId, setInstanceWorkspaceId] = useState("");
  const [edit, setEdit] = useState(createEmptyInstanceEdit);
  const [profileName, setProfileName] = useState("");
  const [profileAvatarDraft, setProfileAvatarDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");

  const [storeInstanceId, setStoreInstanceId] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeProducts, setStoreProducts] = useState({ loading: false, products: [], stockCounts: {}, bucketCounts: {} });
  const createEmptyProductDraft = () => ({
    id: "",
    name: "",
    shortLabel: "",
    description: "",
    sections: [],
    variants: [{ id: "", label: "", duration: "", price: "", emoji: "" }],
    bannerImage: "",
    previewImage: "",
    prePostGif: "",
    thumbnail: "",
    footerImage: "",
    demoUrl: "",
    disableThumbnail: false,
    infiniteStock: false
  });
  const createEmptyProductEditor = () => ({ open: false, mode: "create", instanceId: "", saving: false, draft: null });
  const createEmptyStockEditor = () => ({
    open: false,
    instanceId: "",
    productId: "",
    productName: "",
    variants: [],
    loading: false,
    saving: false,
    bucket: "default",
    keysText: "",
    stock: {}
  });
  const createEmptyPostEditor = () => ({
    open: false,
    instanceId: "",
    productId: "",
    productName: "",
    channelId: "",
    purge: true,
    loading: false,
    channels: []
  });
  const [storeSelectedProductId, setStoreSelectedProductId] = useState("");
  const [storeWorkspaceMode, setStoreWorkspaceMode] = useState("none");
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState("");
  const [pendingClearBucket, setPendingClearBucket] = useState("");
  const [productEditor, setProductEditor] = useState(createEmptyProductEditor);
  const [stockEditor, setStockEditor] = useState(createEmptyStockEditor);
  const [postEditor, setPostEditor] = useState(createEmptyPostEditor);

  const load = async () => {
    if (!me) return;
    const list = await apiFetch("/api/instances");
    setInstances(list.instances || []);
    try {
      const t = await apiFetch("/api/wallet/transactions");
      setTxs(t.transactions || []);
    } catch {
      setTxs([]);
    }
    try {
      const w = await apiFetch("/api/wallet/withdrawals");
      setWithdrawals(w.withdrawals || []);
    } catch {
      setWithdrawals([]);
    }
    if (me?.isPortalAdmin) {
      try {
        const admin = await apiFetch("/api/admin/withdrawals");
        setAdminWithdrawals(admin.withdrawals || []);
      } catch (err) {
        setAdminWithdrawals([]);
        if (Number(err?.status) !== 403) {
          toast("Falha ao carregar saques pendentes", err?.message || "Erro interno", "bad");
        }
      }
    } else {
      setAdminWithdrawals([]);
    }
    try {
      const g = await apiFetch("/api/discord/guilds");
      setGuilds(g.guilds || []);
    } catch {
      setGuilds([]);
    }
    try {
      const s = await apiFetch("/api/bot/status", { headers: {} });
      setBotStatus(s || { ok: false });
    } catch {
      setBotStatus({ ok: false, botReady: false, oauthEnabled: false, mercadoPagoEnabled: false });
    }
  };

  const loadStoreProducts = async (instanceId) => {
    const id = asString(instanceId).trim();
    if (!id) return;
    setStoreProducts((s) => ({ ...s, loading: true }));
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(id)}/products`);
      setStoreProducts({
        loading: false,
        products: data.products || [],
        stockCounts: data.stockCounts || {},
        bucketCounts: data.bucketCounts || {}
      });
    } catch (err) {
      setStoreProducts({ loading: false, products: [], stockCounts: {}, bucketCounts: {} });
      toast("Falha ao carregar produtos", err.message || "Erro interno", "bad");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.discordUserId]);

  useEffect(() => {
    if (!storeInstanceId && instances?.length) {
      setStoreInstanceId(asString(instances[0]?.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances?.length]);

  useEffect(() => {
    if (!storeInstanceId) return;
    setStoreSelectedProductId("");
    setStoreWorkspaceMode("none");
    setPendingDeleteProductId("");
    setPendingClearBucket("");
    setProductEditor(createEmptyProductEditor());
    setStockEditor(createEmptyStockEditor());
    setPostEditor(createEmptyPostEditor());
    loadStoreProducts(storeInstanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInstanceId]);

  useEffect(() => {
    setProfileName(asString(me?.discordUsername || ""));
    setProfileAvatarDraft(asString(me?.profileAvatarUrl || me?.discordAvatarUrl || ""));
    setEmailDraft(asString(me?.email || ""));
    setEmailPassword("");
  }, [me?.discordUsername, me?.profileAvatarUrl, me?.discordAvatarUrl, me?.email]);

  useEffect(() => {
    setPixKey(asString(me?.payout?.pixKey || ""));
    setPixKeyType(asString(me?.payout?.pixKeyType || ""));
  }, [me?.discordUserId]);

  useEffect(() => {
    const normalized = normalizeDashboardTab(tab);
    if (normalized !== tab) {
      setTab(normalized);
      return;
    }
    try {
      window.localStorage.setItem("as_dash_tab", normalized);
    } catch {}
  }, [tab]);

  useEffect(() => {
    if (autoOnboardingDone) return;
    if (!me?.planActive) return;
    if ((instances?.length || 0) > 0) return;
    setTab("instances");
    setCreating(true);
    setAutoOnboardingDone(true);
  }, [autoOnboardingDone, me?.planActive, instances?.length]);

  useEffect(() => {
    if (!pendingClearTokenInstanceId && !pendingDeleteInstanceId) return;
    if (pendingClearTokenInstanceId) {
      const stillHasToken = (instances || []).some(
        (inst) => asString(inst?.id) === pendingClearTokenInstanceId && !!inst?.hasBotToken
      );
      if (!stillHasToken) setPendingClearTokenInstanceId("");
    }
    if (pendingDeleteInstanceId) {
      const stillExists = (instances || []).some((inst) => asString(inst?.id) === pendingDeleteInstanceId);
      if (!stillExists) setPendingDeleteInstanceId("");
    }
  }, [instances, pendingClearTokenInstanceId, pendingDeleteInstanceId]);

  useEffect(() => {
    if (!pendingCancelWithdrawalId) return;
    const stillRequested = (withdrawals || []).some(
      (w) => asString(w?.id) === pendingCancelWithdrawalId && asString(w?.status).toLowerCase() === "requested"
    );
    if (!stillRequested) setPendingCancelWithdrawalId("");
  }, [pendingCancelWithdrawalId, withdrawals]);

  useEffect(() => {
    const id = asString(pendingAdminWithdrawalAction?.id);
    const action = asString(pendingAdminWithdrawalAction?.action);
    if (!id || !action) return;
    const stillRequested = (adminWithdrawals || []).some(
      (w) => asString(w?.id) === id && asString(w?.status).toLowerCase() === "requested"
    );
    if (!stillRequested) setPendingAdminWithdrawalAction({ id: "", action: "" });
  }, [adminWithdrawals, pendingAdminWithdrawalAction]);

  const planText = useMemo(() => {
    const p = me?.plan;
    if (!p) return "Free";
    const tier = asString(p.tier || "free");
    if (tier === "trial") return "Trial (24h)";
    if (tier === "start") return "Start";
    return tier;
  }, [me]);

  const onRequestWithdrawal = async () => {
    const key = asString(pixKey).trim();
    if (!key) return toast("Pix", "Informe sua chave Pix para receber.", "bad");

    const raw = asString(withdrawAmount).replace(".", "").replace(",", ".");
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return toast("Valor invalido", "Digite um valor valido (ex: 50,00).", "bad");
    }

    const cents = Math.floor(value * 100);
    setBusy(true);
    try {
      await apiFetch("/api/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({ amountCents: cents, pixKey: key, pixKeyType: asString(pixKeyType).trim() })
      });
      toast("Saque solicitado", "Pedido criado. O processamento pode levar algum tempo.", "good");
      await refreshMe();
      await load();
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "saldo_insuficiente") {
        toast("Saldo insuficiente", "Seu saldo nao cobre esse valor.", "bad");
      } else if (String(msg).startsWith("valor_minimo")) {
        toast("Valor minimo", "O saque minimo e R$ 10,00.", "bad");
      } else if (msg === "pix_key_obrigatoria") {
        toast("Pix", "Informe sua chave Pix.", "bad");
      } else {
        toast("Falha ao solicitar saque", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onCancelWithdrawal = async (wid) => {
    const id = asString(wid);
    if (!id) return;
    if (pendingCancelWithdrawalId !== id) {
      setPendingCancelWithdrawalId(id);
      return toast("Confirme cancelamento", "Clique novamente em Cancelar para devolver o valor ao saldo.", "bad");
    }

    setBusy(true);
    try {
      await apiFetch(`/api/wallet/withdrawals/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" });
      setPendingCancelWithdrawalId("");
      toast("Saque cancelado", "O valor foi devolvido para seu saldo.", "good");
      await refreshMe();
      await load();
    } catch (err) {
      toast("Falha ao cancelar", err.message || "Erro interno", "bad");
    } finally {
      setBusy(false);
    }
  };

  const onAdminProcessWithdrawal = async (wid, action) => {
    const id = asString(wid).trim();
    const op = asString(action).trim().toLowerCase();
    if (!id || (op !== "complete" && op !== "reject")) return;

    const needsConfirm =
      asString(pendingAdminWithdrawalAction?.id) !== id ||
      asString(pendingAdminWithdrawalAction?.action) !== op;
    if (needsConfirm) {
      setPendingAdminWithdrawalAction({ id, action: op });
      return toast(
        "Confirme a acao",
        op === "complete"
          ? "Clique novamente em Concluir para confirmar que o Pix foi pago."
          : "Clique novamente em Rejeitar para devolver o valor ao saldo do vendedor.",
        "bad"
      );
    }

    const opKey = `${op}:${id}`;
    setAdminWithdrawalActionKey(opKey);
    try {
      const endpoint =
        op === "complete"
          ? `/api/admin/withdrawals/${encodeURIComponent(id)}/complete`
          : `/api/admin/withdrawals/${encodeURIComponent(id)}/reject`;
      await apiFetch(endpoint, { method: "POST", body: "{}" });
      setPendingAdminWithdrawalAction({ id: "", action: "" });
      toast(
        op === "complete" ? "Saque concluido" : "Saque rejeitado",
        op === "complete"
          ? "Marcado como pago e removido da fila pendente."
          : "Saque rejeitado e saldo devolvido ao vendedor.",
        "good"
      );
      await refreshMe();
      await load();
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "saque_nao_encontrado") {
        toast("Saque nao encontrado", "Ele pode ter sido processado por outro admin.", "bad");
      } else if (msg === "saque_nao_esta_pendente") {
        toast("Saque ja processado", "Apenas saques pendentes podem ser alterados.", "bad");
      } else if (msg === "forbidden") {
        toast("Permissao negada", "Seu usuario nao tem permissao administrativa.", "bad");
      } else {
        toast("Falha ao processar saque", msg, "bad");
      }
    } finally {
      setAdminWithdrawalActionKey("");
    }
  };

  const onCreateInstance = async () => {
    const name = newName.trim();
    const token = asString(newBotToken).trim();
    if (!name) return toast("Nome obrigatorio", "Digite um nome para sua instancia.", "bad");
    if (!token) return toast("Token obrigatorio", "Cole o token do bot do cliente para criar.", "bad");
    setBusy(true);
    try {
      const data = await apiFetch("/api/instances", { method: "POST", body: JSON.stringify({ name, token }) });
      setNewName("");
      setNewBotToken("");
      setCreating(false);
      const botName = asString(data?.instance?.botProfile?.username);
      const warning = asString(data?.warning).trim();
      if (warning) {
        toast(
          "Instancia criada com alerta",
          `${botName ? `Token validado para @${botName}. ` : ""}${formatDockerIssue(warning) || warning}`,
          "bad"
        );
      } else {
        toast("Instancia criada", botName ? `Token validado para @${botName}.` : "Token validado com sucesso.", "good");
      }
      await load();
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (String(msg).toLowerCase().includes("plano inativo")) {
        toast("Plano inativo", "Ative um plano para criar instancias.", "bad");
        route.navigate("/plans");
      } else if (msg === "bot_token_obrigatorio") {
        toast("Token obrigatorio", "Informe o token do bot do cliente.", "bad");
      } else if (msg === "bot_token_invalido") {
        toast("Token invalido", "Nao foi possivel validar o token no Discord.", "bad");
      } else if (msg === "limite de instancias atingido para seu plano") {
        toast("Limite do plano", "Cada assinatura libera apenas 1 bot/instancia.", "bad");
      } else {
        toast("Falha ao criar instancia", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onInvite = async (guildId, instanceId = "") => {
    try {
      const q = new URLSearchParams();
      if (guildId) q.set("guildId", guildId);
      if (instanceId) q.set("instanceId", instanceId);
      const data = await apiFetch(`/api/bot/invite?${q.toString()}`);
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err?.message === "bot_token_nao_configurado") {
        toast("Token pendente", "Configure o token do bot nessa instancia antes do invite.", "bad");
      } else {
        toast("Falha ao gerar invite", err.message || "Erro interno", "bad");
      }
    }
  };

  const onSaveBotToken = async (instId) => {
    const id = asString(instId);
    const token = asString(tokenDraftByInstance?.[id]).trim();
    if (!id) return;
    if (!token) return toast("Token obrigatorio", "Cole o token para salvar nessa instancia.", "bad");

    setSavingTokenFor(id);
    setBusy(true);
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(id)}/bot-token`, {
        method: "PUT",
        body: JSON.stringify({ token })
      });
      setPendingClearTokenInstanceId("");
      setTokenDraftByInstance((prev) => ({ ...prev, [id]: "" }));
      await load();
      const warning = asString(data?.warning).trim();
      if (warning) {
        toast("Token atualizado com alerta", formatDockerIssue(warning) || warning, "bad");
      } else {
        toast("Token atualizado", "Bot da instancia validado com sucesso.", "good");
      }
    } catch (err) {
      if (err?.message === "bot_token_invalido") {
        toast("Token invalido", "Nao foi possivel validar esse token.", "bad");
      } else {
        toast("Falha ao salvar token", err.message || "Erro interno", "bad");
      }
    } finally {
      setSavingTokenFor("");
      setBusy(false);
    }
  };

  const onClearBotToken = async (instId) => {
    const id = asString(instId);
    if (!id) return;
    if (pendingClearTokenInstanceId !== id) {
      setPendingClearTokenInstanceId(id);
      return toast("Confirme remoção", "Clique novamente em Remover token para essa instância.", "bad");
    }

    setClearingTokenFor(id);
    setBusy(true);
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(id)}/bot-token`, { method: "DELETE" });
      setPendingClearTokenInstanceId("");
      await load();
      toast("Token removido", "A instancia ficou sem token configurado.", "good");
    } catch (err) {
      toast("Falha ao remover token", err.message || "Erro interno", "bad");
    } finally {
      setClearingTokenFor("");
      setBusy(false);
    }
  };

  const onBotRuntimeAction = async (instId, action) => {
    const id = asString(instId);
    const op = asString(action).toLowerCase();
    if (!id || !op) return;

    setBotActionByInstance((prev) => ({ ...prev, [id]: op }));
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(id)}/bot/${encodeURIComponent(op)}`, {
        method: "POST",
        body: "{}"
      });
      await load();

      const runtimeStatus = asString(data?.instance?.runtime?.status).toLowerCase();
      const runtimeError = asString(data?.instance?.runtime?.lastError).trim();

      if (op === "start") {
        if (runtimeStatus === "online") {
          toast("Bot iniciado", "Container iniciado para esta instância.", "good");
        } else if (runtimeStatus === "erro" || runtimeError) {
          toast("Falha no runtime", formatDockerIssue(runtimeError) || runtimeError || "Erro interno", "bad");
        } else {
          toast("Start concluído", `Runtime retornou status: ${runtimeStatus || "desconhecido"}.`, "good");
        }
      } else if (op === "stop") {
        if (runtimeStatus === "offline" || runtimeStatus === "nao_configurado" || runtimeStatus === "suspenso") {
          toast("Bot parado", "Container parado para esta instância.", "good");
        } else {
          toast("Stop concluído", `Runtime retornou status: ${runtimeStatus || "desconhecido"}.`, "good");
        }
      } else if (op === "restart") {
        if (runtimeStatus === "online") {
          toast("Bot reiniciado", "Container reiniciado para esta instância.", "good");
        } else if (runtimeStatus === "erro" || runtimeError) {
          toast("Falha no runtime", formatDockerIssue(runtimeError) || runtimeError || "Erro interno", "bad");
        } else {
          toast("Restart concluído", `Runtime retornou status: ${runtimeStatus || "desconhecido"}.`, "good");
        }
      } else {
        toast("Ação concluída", "Runtime atualizado.", "good");
      }
    } catch (err) {
      const msg = asString(err?.message);
      if (msg === "plano_inativo") {
        toast("Plano inativo", "Ative um plano para operar o runtime do bot.", "bad");
      } else if (msg === "bot_token_obrigatorio") {
        toast("Token pendente", "Configure o token do bot antes de iniciar.", "bad");
      } else if (msg === "bot_token_invalido") {
        toast("Token inválido", "Atualize o token do bot desta instância.", "bad");
      } else {
        toast("Falha no runtime", formatDockerIssue(msg) || msg || "Erro interno", "bad");
      }
      await load();
    } finally {
      setBotActionByInstance((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const openEditInstance = (inst) => {
    const branding = inst?.branding || {};
    const channels = inst?.channels || {};
    const id = asString(inst?.id);
    setEditChannels({ loading: false, error: "", channels: [] });
    setInstanceWorkspaceMode("edit");
    setInstanceWorkspaceId(id);
    setPendingDeleteInstanceId("");
    setEdit({
      id,
      name: asString(inst?.name),
      guildId: asString(inst?.discordGuildId),
      brandName: asString(branding?.brandName || "AstraSystems"),
      accent: asString(branding?.accent || "#E6212A"),
      logoUrl: asString(branding?.logoUrl || ""),
      logsChannelId: asString(channels?.logsChannelId || ""),
      salesChannelId: asString(channels?.salesChannelId || ""),
      feedbackChannelId: asString(channels?.feedbackChannelId || "")
    });
  };

  const closeEditInstance = () => {
    setEditChannels({ loading: false, error: "", channels: [] });
    setInstanceWorkspaceMode("none");
    setInstanceWorkspaceId("");
    setPendingDeleteInstanceId("");
    setEdit(createEmptyInstanceEdit());
  };

  const onSaveInstance = async () => {
    const id = asString(edit.id);
    const name = asString(edit.name).trim();
    const guildId = asString(edit.guildId).trim();
    if (!id) return;
    if (!name) return toast("Nome obrigatorio", "Digite um nome para a instancia.", "bad");

    setBusy(true);
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          discordGuildId: guildId,
          branding: {
            brandName: asString(edit.brandName).trim(),
            accent: asString(edit.accent).trim(),
            logoUrl: asString(edit.logoUrl).trim()
          },
          channels: {
            logsChannelId: asString(edit.logsChannelId).trim(),
            salesChannelId: asString(edit.salesChannelId).trim(),
            feedbackChannelId: asString(edit.feedbackChannelId).trim()
          }
        })
      });
      await load();
      toast("Instancia atualizada", "Configuracoes salvas.", "good");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "discord_token_missing") {
        toast("Login com Discord", "Para vincular um servidor, entre com Discord.", "bad");
      } else if (msg === "guild_not_manageable") {
        toast("Sem permissao", "Voce precisa ter permissao de Gerenciar Servidor nesse servidor.", "bad");
      } else {
        toast("Falha ao salvar", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onLoadInstanceChannels = async () => {
    const id = asString(edit.id);
    const guildId = asString(edit.guildId).trim();
    if (!id) return;
    if (!guildId) return toast("Guild ID", "Informe/vincule um servidor para carregar canais.", "bad");

    setEditChannels({ loading: true, error: "", channels: [] });
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(id)}/discord/channels?guildId=${encodeURIComponent(guildId)}`);
      setEditChannels({ loading: false, error: "", channels: data.channels || [] });
      toast("Canais carregados", "Selecione os canais do bot pelo dropdown.", "good");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      setEditChannels({ loading: false, error: msg, channels: [] });
      if (msg === "bot_not_ready") {
        toast("Bot offline", "O bot precisa estar online para listar canais.", "bad");
      } else if (msg === "bot_not_in_guild") {
        toast("Bot nao esta no servidor", "Convide o bot para esse servidor e tente novamente.", "bad");
      } else if (msg === "instance_requires_own_bot_token") {
        toast("Token/runtime divergente", "Esse servidor esta com um bot diferente do runtime principal. Ajuste o token da instância ou use o bot principal.", "bad");
      } else {
        toast("Falha ao carregar canais", msg, "bad");
      }
    }
  };

  const onDeleteInstance = async (instId) => {
    const id = asString(instId).trim();
    if (!id) return;
    if (pendingDeleteInstanceId !== id) {
      setPendingDeleteInstanceId(id);
      return toast("Confirme exclusão", "Clique novamente em Excluir para remover essa instância.", "bad");
    }

    setBusy(true);
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(id)}`, { method: "DELETE" });
      setPendingDeleteInstanceId("");
      if (asString(edit.id) === id) closeEditInstance();
      await load();
      toast("Instancia removida", "A instancia foi excluida.", "good");
    } catch (err) {
      toast("Falha ao excluir", err.message || "Erro interno", "bad");
    } finally {
      setBusy(false);
    }
  };

  const onClaimTrial = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/plans/trial", { method: "POST", body: "{}" });
      await refreshMe();
      toast("Trial ativado", "Voce ganhou 24 horas para testar.", "good");
    } catch (err) {
      toast("Falha ao ativar trial", err.message || "Erro interno", "bad");
    } finally {
      setBusy(false);
    }
  };

  const onUpdateProfile = async () => {
    const name = asString(profileName).trim();
    const draftAvatarUrl = asString(profileAvatarDraft).trim();
    const currentCustomAvatar = asString(me?.profileAvatarUrl).trim();
    const currentDiscordAvatar = asString(me?.discordAvatarUrl).trim();
    const avatarUrl =
      !currentCustomAvatar && draftAvatarUrl === currentDiscordAvatar ? "" : draftAvatarUrl;
    if (!name) return toast("Nome obrigatorio", "Digite um nome para exibir.", "bad");
    if (avatarUrl && !/^https?:\/\/\S+$/i.test(avatarUrl)) {
      return toast("Foto invalida", "Use uma URL http(s) valida para a foto.", "bad");
    }

    setBusy(true);
    try {
      await apiFetch("/api/me/profile", { method: "PUT", body: JSON.stringify({ name, avatarUrl }) });
      await refreshMe();
      toast("Perfil atualizado", "Nome e foto salvos com sucesso.", "good");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "avatar_url_invalida") {
        toast("Foto invalida", "Use uma URL http(s) valida para a foto.", "bad");
      } else {
        toast("Falha ao atualizar perfil", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onUpdateEmail = async () => {
    if (me?.authProvider !== "local") {
      return toast("Email gerenciado pelo Discord", "Para contas Discord, altere o email direto no Discord.", "bad");
    }

    const email = asString(emailDraft).trim().toLowerCase();
    const currentPassword = asString(emailPassword);
    const currentEmail = asString(me?.email).trim().toLowerCase();
    if (!email) return toast("Email obrigatorio", "Informe o novo email.", "bad");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Email invalido", "Digite um email valido.", "bad");
    if (email === currentEmail) return toast("Sem alteracao", "O email informado ja e o atual.", "good");
    if (!currentPassword) return toast("Senha atual", "Informe sua senha atual para confirmar a troca de email.", "bad");

    setBusy(true);
    try {
      await apiFetch("/api/me/email", {
        method: "PUT",
        body: JSON.stringify({ email, currentPassword })
      });
      setEmailPassword("");
      await refreshMe();
      toast("Email atualizado", "Seu email de acesso foi atualizado.", "good");
    } catch (err) {
      const msg = err?.message || "Erro interno";
      if (msg === "senha_atual_invalida") {
        toast("Senha invalida", "A senha atual informada nao confere.", "bad");
      } else if (msg === "email ja cadastrado") {
        toast("Email em uso", "Ja existe uma conta com esse email.", "bad");
      } else if (msg === "email_managed_by_discord") {
        toast("Conta Discord", "Esse email e gerenciado pelo Discord OAuth.", "bad");
      } else {
        toast("Falha ao atualizar email", msg, "bad");
      }
    } finally {
      setBusy(false);
    }
  };

  const onChangePassword = async () => {
    const currentPassword = asString(pwCurrent);
    const newPassword = asString(pwNew);
    const confirm = asString(pwNew2);

    if (!currentPassword) return toast("Senha atual", "Digite sua senha atual.", "bad");
    if (!newPassword || newPassword.length < 6) return toast("Senha nova", "Minimo 6 caracteres.", "bad");
    if (newPassword !== confirm) return toast("Confirmacao", "As senhas nao conferem.", "bad");

    setBusy(true);
    try {
      await apiFetch("/auth/local/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPwCurrent("");
      setPwNew("");
      setPwNew2("");
      toast("Senha atualizada", "Sua senha foi alterada com sucesso.", "good");
    } catch (err) {
      toast("Falha ao alterar senha", err.message || "Erro interno", "bad");
    } finally {
      setBusy(false);
    }
  };

  const currentInstance = useMemo(() => {
    const id = asString(storeInstanceId);
    return (instances || []).find((i) => asString(i?.id) === id) || null;
  }, [instances, storeInstanceId]);
  const canPostFromStore = !!currentInstance?.discordGuildId && !!currentInstance?.hasBotToken;

  const firstInstance = useMemo(() => {
    return (instances || [])[0] || null;
  }, [instances]);

  const recentTransactionsCount = useMemo(() => {
    return Array.isArray(txs) ? txs.length : 0;
  }, [txs]);

  const pendingWithdrawalsCount = useMemo(() => {
    return (withdrawals || []).filter((w) => asString(w?.status).toLowerCase() === "requested").length;
  }, [withdrawals]);

  const adminPendingWithdrawalsCount = useMemo(() => {
    return Array.isArray(adminWithdrawals) ? adminWithdrawals.length : 0;
  }, [adminWithdrawals]);

  const onlineInstancesCount = useMemo(() => {
    return (instances || []).filter((inst) => asString(inst?.runtime?.status).toLowerCase() === "online").length;
  }, [instances]);

  const selectedInstance = useMemo(() => {
    const id = asString(instanceWorkspaceId).trim();
    if (!id) return null;
    return (instances || []).find((inst) => asString(inst?.id).trim() === id) || null;
  }, [instanceWorkspaceId, instances]);

  useEffect(() => {
    if (!instanceWorkspaceId) return;
    if (selectedInstance) return;
    setInstanceWorkspaceId("");
    setInstanceWorkspaceMode("none");
    setEdit(createEmptyInstanceEdit());
    setEditChannels({ loading: false, error: "", channels: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceWorkspaceId, selectedInstance]);

  const filteredStoreProducts = useMemo(() => {
    const list = Array.isArray(storeProducts.products) ? storeProducts.products : [];
    const q = asString(storeSearch).trim().toLowerCase();
    if (!q) return list;
    return list.filter((product) => {
      const id = asString(product?.id).toLowerCase();
      const name = asString(product?.name).toLowerCase();
      const shortLabel = asString(product?.shortLabel).toLowerCase();
      return id.includes(q) || name.includes(q) || shortLabel.includes(q);
    });
  }, [storeProducts.products, storeSearch]);

  const selectedStoreProduct = useMemo(() => {
    const pid = asString(storeSelectedProductId).trim();
    if (!pid) return null;
    const list = Array.isArray(storeProducts.products) ? storeProducts.products : [];
    return list.find((product) => asString(product?.id).trim() === pid) || null;
  }, [storeProducts.products, storeSelectedProductId]);

  const storeCatalogSummary = useMemo(() => {
    const list = Array.isArray(storeProducts.products) ? storeProducts.products : [];
    const total = list.length;
    const filtered = Array.isArray(filteredStoreProducts) ? filteredStoreProducts.length : 0;
    const totalStock = list.reduce((sum, product) => {
      const pid = asString(product?.id).trim();
      return sum + Number(storeProducts.stockCounts?.[pid] || 0);
    }, 0);
    const outOfStock = list.reduce((sum, product) => {
      const pid = asString(product?.id).trim();
      const stock = Number(storeProducts.stockCounts?.[pid] || 0);
      return sum + (stock > 0 ? 0 : 1);
    }, 0);
    return { total, filtered, totalStock, outOfStock };
  }, [filteredStoreProducts, storeProducts.products, storeProducts.stockCounts]);

  const stockBucketCount = useMemo(() => {
    const bucket = asString(stockEditor.bucket).trim() || "default";
    const list = stockEditor?.stock?.[bucket];
    return Array.isArray(list) ? list.length : 0;
  }, [stockEditor.bucket, stockEditor.stock]);

  const stockTotalCount = useMemo(() => {
    return countStockKeys(stockEditor.stock);
  }, [stockEditor.stock]);

  const stockBucketOptions = useMemo(() => {
    const variantIds = (stockEditor.variants || [])
      .map((v) => asString(v?.id).trim())
      .filter(Boolean);
    const currentBuckets = Object.keys(stockEditor.stock || {})
      .map((id) => asString(id).trim())
      .filter(Boolean);
    const merged = [...new Set(["default", "shared", ...variantIds, ...currentBuckets])];
    return merged;
  }, [stockEditor.stock, stockEditor.variants]);

  const stockActiveEntries = useMemo(() => {
    const bucket = asString(stockEditor.bucket).trim() || "default";
    const list = stockEditor?.stock?.[bucket];
    return Array.isArray(list) ? list : [];
  }, [stockEditor.bucket, stockEditor.stock]);

  const stockDraftKeys = useMemo(() => {
    const lines = asString(stockEditor.keysText)
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    return [...new Set(lines)];
  }, [stockEditor.keysText]);

  useEffect(() => {
    if (!storeSelectedProductId) return;
    if (selectedStoreProduct) return;
    setStoreSelectedProductId("");
    setStoreWorkspaceMode("none");
    setPendingDeleteProductId("");
    setPendingClearBucket("");
    setProductEditor(createEmptyProductEditor());
    setStockEditor(createEmptyStockEditor());
    setPostEditor(createEmptyPostEditor());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreProduct, storeSelectedProductId]);

  const openCreateProduct = () => {
    if (!storeInstanceId) return toast("Instancia", "Selecione uma instancia para criar produtos.", "bad");
    setStoreWorkspaceMode("product");
    setStoreSelectedProductId("");
    setPendingDeleteProductId("");
    setStockEditor(createEmptyStockEditor());
    setPostEditor(createEmptyPostEditor());
    setProductEditor({
      open: true,
      mode: "create",
      instanceId: storeInstanceId,
      saving: false,
      draft: createEmptyProductDraft()
    });
  };

  const openEditProduct = (product) => {
    if (!storeInstanceId) return;
    const clone = JSON.parse(JSON.stringify(product || {}));
    if (!Array.isArray(clone.sections)) clone.sections = [];
    if (!Array.isArray(clone.variants)) clone.variants = [];
    setStoreWorkspaceMode("product");
    setStoreSelectedProductId(asString(clone.id).trim());
    setPendingDeleteProductId("");
    setStockEditor(createEmptyStockEditor());
    setPostEditor(createEmptyPostEditor());
    setProductEditor({ open: true, mode: "edit", instanceId: storeInstanceId, saving: false, draft: clone });
  };

  const closeProductEditor = () => {
    setProductEditor(createEmptyProductEditor());
    setStoreWorkspaceMode((mode) => (mode === "product" ? "none" : mode));
  };

  const saveProductEditor = async () => {
    const instId = asString(productEditor.instanceId).trim();
    const draft = productEditor.draft || null;
    if (!instId || !draft) return;

    const id = asString(draft.id).trim();
    const name = asString(draft.name).trim();
    if (productEditor.mode === "create" && !id) return toast("ID obrigatorio", "Defina um id para o produto.", "bad");
    if (!name) return toast("Nome obrigatorio", "Defina um nome para o produto.", "bad");
    const issues = validateProductDraftClient(draft, {
      requireId: productEditor.mode === "create",
      requireVariant: true
    });
    if (issues.length) {
      const preview = issues.slice(0, 3).join(" ");
      return toast("Revise o produto", preview, "bad");
    }

    setProductEditor((s) => ({ ...s, saving: true }));
    try {
      if (productEditor.mode === "create") {
        await apiFetch(`/api/instances/${encodeURIComponent(instId)}/products`, {
          method: "POST",
          body: JSON.stringify(draft)
        });
      } else {
        await apiFetch(`/api/instances/${encodeURIComponent(instId)}/products/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(draft)
        });
      }
      await loadStoreProducts(instId);
      closeProductEditor();
      toast("Produto salvo", "Produto atualizado com sucesso.", "good");
    } catch (err) {
      toast("Falha ao salvar produto", err.message || "Erro interno", "bad");
    } finally {
      setProductEditor((s) => ({ ...s, saving: false }));
    }
  };

  const addVariantRow = () => {
    setProductEditor((s) => {
      const draft = s.draft || null;
      if (!draft) return s;
      const variants = Array.isArray(draft.variants) ? draft.variants : [];
      return { ...s, draft: { ...draft, variants: [...variants, { id: "", label: "", duration: "", price: 0, emoji: "" }] } };
    });
  };

  const removeVariantRow = (idx) => {
    setProductEditor((s) => {
      const draft = s.draft || null;
      if (!draft) return s;
      const variants = Array.isArray(draft.variants) ? [...draft.variants] : [];
      variants.splice(idx, 1);
      return { ...s, draft: { ...draft, variants } };
    });
  };

  const addSectionRow = () => {
    setProductEditor((s) => {
      const draft = s.draft || null;
      if (!draft) return s;
      const sections = Array.isArray(draft.sections) ? draft.sections : [];
      return { ...s, draft: { ...draft, sections: [...sections, { name: "", value: "", inline: false }] } };
    });
  };

  const removeSectionRow = (idx) => {
    setProductEditor((s) => {
      const draft = s.draft || null;
      if (!draft) return s;
      const sections = Array.isArray(draft.sections) ? [...draft.sections] : [];
      sections.splice(idx, 1);
      return { ...s, draft: { ...draft, sections } };
    });
  };

  const deleteProduct = async (product) => {
    const instId = asString(storeInstanceId).trim();
    const pid = asString(product?.id).trim();
    if (!instId || !pid) return;
    if (pendingDeleteProductId !== pid) {
      setPendingDeleteProductId(pid);
      return toast("Confirme exclusao", `Clique novamente em Excluir para remover ${pid}.`, "bad");
    }

    setStoreProducts((s) => ({ ...s, loading: true }));
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(instId)}/products/${encodeURIComponent(pid)}`, { method: "DELETE" });
      await loadStoreProducts(instId);
      setPendingDeleteProductId("");
      if (asString(storeSelectedProductId).trim() === pid) {
        setStoreSelectedProductId("");
        setStoreWorkspaceMode("none");
        setProductEditor(createEmptyProductEditor());
        setStockEditor(createEmptyStockEditor());
        setPostEditor(createEmptyPostEditor());
      }
      toast("Produto removido", "Produto excluido.", "good");
    } catch (err) {
      toast("Falha ao excluir produto", err.message || "Erro interno", "bad");
      setStoreProducts((s) => ({ ...s, loading: false }));
    }
  };

  const openStock = async (product) => {
    const instId = asString(storeInstanceId).trim();
    const pid = asString(product?.id).trim();
    if (!instId || !pid) return;

    setStoreWorkspaceMode("stock");
    setStoreSelectedProductId(pid);
    setPendingDeleteProductId("");
    setPendingClearBucket("");
    setProductEditor(createEmptyProductEditor());
    setPostEditor(createEmptyPostEditor());
    setStockEditor((s) => ({
      ...s,
      open: true,
      instanceId: instId,
      productId: pid,
      productName: asString(product?.name || pid),
      variants: Array.isArray(product?.variants) ? product.variants : [],
      loading: true,
      saving: false,
      bucket: "default",
      keysText: "",
      stock: {}
    }));

    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(instId)}/stock/${encodeURIComponent(pid)}`);
      setStockEditor((s) => ({ ...s, loading: false, stock: data.stock || {} }));
    } catch (err) {
      toast("Falha ao carregar estoque", err.message || "Erro interno", "bad");
      setStockEditor((s) => ({ ...s, loading: false }));
    }
  };

  const closeStock = () => {
    setStockEditor(createEmptyStockEditor());
    setPendingClearBucket("");
    setStoreWorkspaceMode((mode) => (mode === "stock" ? "none" : mode));
  };

  const saveStock = async (nextStock, options = {}) => {
    const { silentSuccess = false } = options;
    const instId = asString(stockEditor.instanceId).trim();
    const pid = asString(stockEditor.productId).trim();
    if (!instId || !pid) return false;

    setStockEditor((s) => ({ ...s, saving: true }));
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(instId)}/stock/${encodeURIComponent(pid)}`, {
        method: "PUT",
        body: JSON.stringify({ stock: nextStock })
      });
      setStockEditor((s) => ({ ...s, stock: data.stock || nextStock }));
      await loadStoreProducts(instId);
      if (!silentSuccess) {
        toast("Estoque salvo", "Atualizado com sucesso.", "good");
      }
      return true;
    } catch (err) {
      toast("Falha ao salvar estoque", err.message || "Erro interno", "bad");
      return false;
    } finally {
      setStockEditor((s) => ({ ...s, saving: false }));
    }
  };

  const addStockKeys = async () => {
    const bucket = asString(stockEditor.bucket).trim() || "default";
    const raw = asString(stockEditor.keysText);
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return toast("Keys", "Cole ao menos 1 key (uma por linha).", "bad");

    const stock = stockEditor.stock && typeof stockEditor.stock === "object" ? stockEditor.stock : {};
    const current = Array.isArray(stock[bucket]) ? stock[bucket] : [];
    const dedupInput = [...new Set(lines)];
    const existing = new Set(current.map((entry) => asString(entry).trim()).filter(Boolean));
    const usedInOtherBuckets = new Set();
    Object.entries(stock).forEach(([stockBucket, list]) => {
      if (stockBucket === bucket || !Array.isArray(list)) return;
      list.forEach((entry) => {
        const normalized = asString(entry).trim();
        if (normalized) usedInOtherBuckets.add(normalized);
      });
    });

    const toAdd = dedupInput.filter((entry) => !existing.has(entry) && !usedInOtherBuckets.has(entry));
    const skippedCurrent = dedupInput.filter((entry) => existing.has(entry)).length;
    const skippedOther = dedupInput.filter((entry) => usedInOtherBuckets.has(entry)).length;
    const skipped = skippedCurrent + skippedOther;
    if (!toAdd.length) {
      if (skippedOther > 0) {
        return toast("Sem novas keys", "As keys já existem em outros buckets ou no bucket atual.", "bad");
      }
      return toast("Sem novas keys", "Todas as keys já existem nesse bucket.", "bad");
    }
    const next = { ...stock, [bucket]: [...current, ...toAdd] };

    setStockEditor((s) => ({ ...s, keysText: "" }));
    const ok = await saveStock(next, { silentSuccess: true });
    if (ok) {
      let msg = `${toAdd.length} keys adicionadas.`;
      if (skipped > 0) {
        msg = `${toAdd.length} adicionadas, ${skipped} ignoradas.`;
      }
      if (skippedOther > 0) {
        msg = `${msg} ${skippedOther} já estavam em outros buckets.`;
      }
      toast("Estoque atualizado", msg, "good");
    }
  };

  const clearStockBucket = async () => {
    const bucket = asString(stockEditor.bucket).trim() || "default";
    if (pendingClearBucket !== bucket) {
      setPendingClearBucket(bucket);
      return toast("Confirme limpeza", `Clique novamente em Limpar bucket para zerar "${bucket}".`, "bad");
    }
    const stock = stockEditor.stock && typeof stockEditor.stock === "object" ? stockEditor.stock : {};
    const next = { ...stock, [bucket]: [] };
    const saved = await saveStock(next, { silentSuccess: true });
    if (saved) {
      setPendingClearBucket("");
      toast("Bucket limpo", `Bucket "${bucket}" zerado com sucesso.`, "good");
    }
  };

  const openPost = async (product) => {
    const instId = asString(storeInstanceId).trim();
    const pid = asString(product?.id).trim();
    if (!instId || !pid) return;

    setStoreWorkspaceMode("post");
    setStoreSelectedProductId(pid);
    setPendingDeleteProductId("");
    setProductEditor(createEmptyProductEditor());
    setStockEditor(createEmptyStockEditor());
    setPostEditor({
      open: true,
      instanceId: instId,
      productId: pid,
      productName: asString(product?.name || pid),
      channelId: "",
      purge: true,
      loading: true,
      channels: []
    });

    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(instId)}/discord/channels`);
      const list = data.channels || [];
      setPostEditor((s) => ({ ...s, loading: false, channels: list, channelId: asString(list?.[0]?.id || "") }));
    } catch (err) {
      const msg = asString(err?.message);
      if (msg === "guild_id_required") {
        toast("Servidor pendente", "Vincule um servidor na instância antes de postar produto.", "bad");
      } else if (msg === "bot_not_ready") {
        toast("Bot offline", "O bot precisa estar online para carregar canais.", "bad");
      } else if (msg === "instance_requires_own_bot_token") {
        toast("Token/runtime divergente", "Esse servidor está com bot diferente do runtime ativo.", "bad");
      } else {
        toast("Falha ao carregar canais", msg || "Erro interno", "bad");
      }
      setPostEditor((s) => ({ ...s, loading: false }));
    }
  };

  const closePost = () => {
    setPostEditor(createEmptyPostEditor());
    setStoreWorkspaceMode((mode) => (mode === "post" ? "none" : mode));
  };

  const doPost = async () => {
    const instId = asString(postEditor.instanceId).trim();
    const pid = asString(postEditor.productId).trim();
    const channelId = asString(postEditor.channelId).trim();
    if (!instId || !pid) return;
    if (!channelId) return toast("Canal", "Selecione um canal para postar.", "bad");

    setPostEditor((s) => ({ ...s, loading: true }));
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(instId)}/discord/post-product`, {
        method: "POST",
        body: JSON.stringify({ productId: pid, channelId, purge: !!postEditor.purge })
      });
      toast("Produto postado", "Mensagem enviada no canal selecionado.", "good");
      closePost();
    } catch (err) {
      const msg = asString(err?.message);
      if (msg === "instance_requires_own_bot_token") {
        toast("Publicação bloqueada", "Bot da instância diferente do runtime ativo. Ajuste o token ou inicie o runtime correto.", "bad");
      } else if (msg === "bot_not_ready") {
        toast("Bot offline", "O bot precisa estar online para postar produto.", "bad");
      } else if (msg === "canal nao pertence ao servidor vinculado") {
        toast("Canal inválido", "Selecione um canal do servidor vinculado à instância.", "bad");
      } else {
        toast("Falha ao postar", msg || "Erro interno", "bad");
      }
      setPostEditor((s) => ({ ...s, loading: false }));
    }
  };

  const closeStoreWorkspace = () => {
    setStoreWorkspaceMode("none");
    setPendingDeleteProductId("");
    setPendingClearBucket("");
    setProductEditor(createEmptyProductEditor());
    setStockEditor(createEmptyStockEditor());
    setPostEditor(createEmptyPostEditor());
  };

  const storeWorkspaceTitle = (() => {
    if (storeWorkspaceMode === "product") {
      if (productEditor.mode === "create") return "Criar produto";
      return `Editar produto - ${asString(productEditor?.draft?.name || productEditor?.draft?.id || "").trim() || "sem nome"}`;
    }
    if (storeWorkspaceMode === "stock") {
      return `Estoque - ${stockEditor.productName || stockEditor.productId || "produto"}`;
    }
    if (storeWorkspaceMode === "post") {
      return `Postar no Discord - ${postEditor.productName || postEditor.productId || "produto"}`;
    }
    return "Workspace de produtos";
  })();

  const renderStoreWorkspaceContent = () => {
    if (storeWorkspaceMode === "product") {
      if (!productEditor.draft) return html`<div className="muted">Selecione um produto para editar.</div>`;
      return html`
        <div className="formGrid">
          <div className="label">ID</div>
          ${productEditor.mode === "create"
            ? html`
                <input
                  className="input mono"
                  value=${productEditor.draft.id || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, id: e.target.value } }))}
                  placeholder="ex: product1"
                />
                <div className="help">Use letras/numeros e . _ - (sem espacos).</div>
              `
            : html`<div className="code mono">${asString(productEditor.draft.id)}</div>`}

          <div className="label">Nome</div>
          <input
            className="input"
            value=${productEditor.draft.name || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, name: e.target.value } }))}
            placeholder="Nome do produto"
          />

          <div className="label">Short label</div>
          <input
            className="input"
            value=${productEditor.draft.shortLabel || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, shortLabel: e.target.value } }))}
            placeholder="Ex: BSRAGE"
          />

          <div className="label">Descricao</div>
          <textarea
            className="input"
            rows="5"
            value=${productEditor.draft.description || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, description: e.target.value } }))}
            placeholder="Texto do produto (markdown)"
          ></textarea>

          <div className="hr"></div>

          <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
            <div className="label" style=${{ margin: 0 }}>Variacoes</div>
            <${Button} variant="subtle" disabled=${productEditor.saving} onClick=${addVariantRow}>
              <${Plus} size=${14} style=${{ marginRight: "6px" }} />
              Adicionar variacao
            </${Button}>
          </div>
          ${Array.isArray(productEditor.draft.variants) && productEditor.draft.variants.length
            ? html`
                <div className="stack">
                  ${productEditor.draft.variants.map(
                    (v, idx) => html`
                      <div className="kpi">
                        <div className="row grow">
                          <input
                            className="input mono"
                            value=${v.id || ""}
                            onInput=${(e) => {
                              const value = e.target.value;
                              setProductEditor((s) => {
                                const list = Array.isArray(s.draft?.variants) ? [...s.draft.variants] : [];
                                list[idx] = { ...(list[idx] || {}), id: value };
                                return { ...s, draft: { ...s.draft, variants: list } };
                              });
                            }}
                            placeholder="id (ex: 30d)"
                          />
                          <input
                            className="input"
                            value=${v.label || ""}
                            onInput=${(e) => {
                              const value = e.target.value;
                              setProductEditor((s) => {
                                const list = Array.isArray(s.draft?.variants) ? [...s.draft.variants] : [];
                                list[idx] = { ...(list[idx] || {}), label: value };
                                return { ...s, draft: { ...s.draft, variants: list } };
                              });
                            }}
                            placeholder="label (ex: 30 dias)"
                          />
                        </div>
                        <div className="row grow" style=${{ marginTop: "10px" }}>
                          <input
                            className="input"
                            value=${v.duration || ""}
                            onInput=${(e) => {
                              const value = e.target.value;
                              setProductEditor((s) => {
                                const list = Array.isArray(s.draft?.variants) ? [...s.draft.variants] : [];
                                list[idx] = { ...(list[idx] || {}), duration: value };
                                return { ...s, draft: { ...s.draft, variants: list } };
                              });
                            }}
                            placeholder="duracao (ex: 30 dias)"
                          />
                          <input
                            className="input mono"
                            value=${String(v.price ?? "")}
                            onInput=${(e) => {
                              const value = e.target.value;
                              setProductEditor((s) => {
                                const list = Array.isArray(s.draft?.variants) ? [...s.draft.variants] : [];
                                list[idx] = { ...(list[idx] || {}), price: value };
                                return { ...s, draft: { ...s.draft, variants: list } };
                              });
                            }}
                            placeholder="preco (ex: 29.90)"
                          />
                          <input
                            className="input"
                            value=${v.emoji || ""}
                            onInput=${(e) => {
                              const value = e.target.value;
                              setProductEditor((s) => {
                                const list = Array.isArray(s.draft?.variants) ? [...s.draft.variants] : [];
                                list[idx] = { ...(list[idx] || {}), emoji: value };
                                return { ...s, draft: { ...s.draft, variants: list } };
                              });
                            }}
                            placeholder="emoji (opcional)"
                          />
                        </div>
                        <div style=${{ marginTop: "10px" }}>
                          <${Button} variant="danger" disabled=${productEditor.saving} onClick=${() => removeVariantRow(idx)}>
                            <${Trash2} size=${14} style=${{ marginRight: "6px" }} />
                            Remover
                          </${Button}>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`<div className="muted2">Nenhuma variacao ainda. Adicione pelo botao acima.</div>`}

          <div className="hr"></div>

          <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
            <div className="label" style=${{ margin: 0 }}>Blocos (opcional)</div>
            <${Button} variant="subtle" disabled=${productEditor.saving} onClick=${addSectionRow}>
              <${Plus} size=${14} style=${{ marginRight: "6px" }} />
              Adicionar bloco
            </${Button}>
          </div>
          ${Array.isArray(productEditor.draft.sections) && productEditor.draft.sections.length
            ? html`
                <div className="stack">
                  ${productEditor.draft.sections.map(
                    (sec, idx) => html`
                      <div className="kpi">
                        <input
                          className="input"
                          value=${sec.name || ""}
                          onInput=${(e) => {
                            const value = e.target.value;
                            setProductEditor((s) => {
                              const list = Array.isArray(s.draft?.sections) ? [...s.draft.sections] : [];
                              list[idx] = { ...(list[idx] || {}), name: value };
                              return { ...s, draft: { ...s.draft, sections: list } };
                            });
                          }}
                          placeholder="Titulo do bloco"
                        />
                        <textarea
                          className="input"
                          rows="4"
                          style=${{ marginTop: "10px" }}
                          value=${sec.value || ""}
                          onInput=${(e) => {
                            const value = e.target.value;
                            setProductEditor((s) => {
                              const list = Array.isArray(s.draft?.sections) ? [...s.draft.sections] : [];
                              list[idx] = { ...(list[idx] || {}), value };
                              return { ...s, draft: { ...s.draft, sections: list } };
                            });
                          }}
                          placeholder="Conteudo (markdown)"
                        ></textarea>
                        <div className="row" style=${{ marginTop: "10px", alignItems: "center", justifyContent: "space-between" }}>
                          <label className="muted2">
                            <input
                              type="checkbox"
                              checked=${!!sec.inline}
                              onChange=${(e) => {
                                const value = !!e.target.checked;
                                setProductEditor((s) => {
                                  const list = Array.isArray(s.draft?.sections) ? [...s.draft.sections] : [];
                                  list[idx] = { ...(list[idx] || {}), inline: value };
                                  return { ...s, draft: { ...s.draft, sections: list } };
                                });
                              }}
                            />
                            <span style=${{ marginLeft: "8px" }}>Inline</span>
                          </label>
                          <${Button} variant="danger" disabled=${productEditor.saving} onClick=${() => removeSectionRow(idx)}>
                            <${Trash2} size=${14} style=${{ marginRight: "6px" }} />
                            Remover
                          </${Button}>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`<div className="muted2">Use blocos para adicionar campos extras no embed (funcoes, infos, etc).</div>`}

          <div className="hr"></div>

          <div className="label">Midias (opcional)</div>
          <div className="label">Banner no topo do embed</div>
          <input
            className="input"
            value=${productEditor.draft.bannerImage || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, bannerImage: e.target.value } }))}
            placeholder="https://... ou assets/... (opcional)"
          />
          <div className="label">Imagem principal do produto</div>
          <input
            className="input"
            value=${productEditor.draft.previewImage || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, previewImage: e.target.value } }))}
            placeholder="https://... ou assets/... (opcional)"
          />
          <div className="label">GIF acima do produto (pre-post)</div>
          <input
            className="input"
            value=${productEditor.draft.prePostGif || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, prePostGif: e.target.value } }))}
            placeholder="https://...gif ou assets/...gif"
          />
          <div className="help">
            Esse GIF e enviado antes da mensagem principal do produto no canal.
          </div>
          ${isHttpMediaUrl(productEditor.draft.prePostGif)
            ? html`
                <img
                  src=${productEditor.draft.prePostGif}
                  alt="Preview do GIF pre-post"
                  style=${{
                    maxWidth: "100%",
                    maxHeight: "180px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.12)"
                  }}
                />
              `
            : null}
          <div className="label">Thumbnail do embed</div>
          <input
            className="input"
            value=${productEditor.draft.thumbnail || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, thumbnail: e.target.value } }))}
            placeholder="https://... ou assets/... (opcional)"
          />
          <div className="label">Imagem de rodape</div>
          <input
            className="input"
            value=${productEditor.draft.footerImage || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, footerImage: e.target.value } }))}
            placeholder="https://... ou assets/... (opcional)"
          />
          <div className="label">URL de demonstracao</div>
          <input
            className="input"
            value=${productEditor.draft.demoUrl || ""}
            onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, demoUrl: e.target.value } }))}
            placeholder="demoUrl (opcional)"
          />

          <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
            <label className="muted2">
              <input
                type="checkbox"
                checked=${!!productEditor.draft.disableThumbnail}
                onChange=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, disableThumbnail: !!e.target.checked } }))}
              />
              <span style=${{ marginLeft: "8px" }}>Desativar thumbnail</span>
            </label>
            <label className="muted2">
              <input
                type="checkbox"
                checked=${!!productEditor.draft.infiniteStock}
                onChange=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, infiniteStock: !!e.target.checked } }))}
              />
              <span style=${{ marginLeft: "8px" }}>Estoque infinito</span>
            </label>
          </div>
        </div>

        <div style=${{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
          <${Button} variant="primary" disabled=${productEditor.saving} onClick=${saveProductEditor}>
            <${Save} size=${16} style=${{ marginRight: "6px" }} />
            ${productEditor.saving ? "Salvando..." : productEditor.mode === "create" ? "Criar produto" : "Salvar produto"}
          </${Button}>
          <${Button} variant="ghost" disabled=${productEditor.saving} onClick=${closeProductEditor}>
            <${X} size=${16} style=${{ marginRight: "6px" }} />
            Fechar painel
          </${Button}>
        </div>
      `;
    }

    if (storeWorkspaceMode === "stock") {
      return stockEditor.loading
        ? html`<div className="muted">Carregando estoque...</div>`
        : html`
            <div className="formGrid stockWorkspace">
              <div className="stockHeaderSummary">
                <span className="badge none">Bucket atual: ${stockBucketCount}</span>
                <span className="badge none">Total de keys: ${stockTotalCount}</span>
                <span className="badge ${stockDraftKeys.length > 0 ? "pending" : "none"}">Fila para inserir: ${stockDraftKeys.length}</span>
              </div>

              <div className="label">Bucket</div>
              <select
                className="input"
                value=${stockEditor.bucket}
                onChange=${(e) => {
                  setPendingClearBucket("");
                  setStockEditor((s) => ({ ...s, bucket: e.target.value }));
                }}
              >
                ${stockBucketOptions.map((id) => html`<option value=${id}>${id}</option>`)}
              </select>

              <div className="stockBucketChips">
                ${stockBucketOptions.map((id) => {
                  const count = Array.isArray(stockEditor?.stock?.[id]) ? stockEditor.stock[id].length : 0;
                  const active = (asString(stockEditor.bucket).trim() || "default") === id;
                  return html`
                    <button
                      className=${`stockChip ${active ? "active" : ""}`}
                      onClick=${() => {
                        setPendingClearBucket("");
                        setStockEditor((s) => ({ ...s, bucket: id }));
                      }}
                    >
                      <span className="mono">${id}</span>
                      <span>${count}</span>
                    </button>
                  `;
                })}
              </div>
              <div className="help">Use default para fallback geral, shared para estoque comum e buckets por variacao para controle fino.</div>

              <div className="label">Inserção em lote (1 key por linha)</div>
              <textarea
                className="input mono stockInput"
                rows="10"
                value=${stockEditor.keysText}
                onInput=${(e) => setStockEditor((s) => ({ ...s, keysText: e.target.value }))}
                placeholder="Cole aqui suas keys:\nKEY-1\nKEY-2\nKEY-3"
              ></textarea>

              <div className="stockDraftInfo">
                <span>Linhas detectadas: <b>${stockDraftKeys.length}</b></span>
                ${stockDraftKeys.length
                  ? html`<span className="mono">Prévia: ${stockDraftKeys.slice(0, 3).join(" · ")}${stockDraftKeys.length > 3 ? " ..." : ""}</span>`
                  : html`<span className="muted2">Cole as keys para habilitar a inserção.</span>`}
              </div>

              <div className="stockActions">
                <${Button} variant="primary" disabled=${stockEditor.saving || stockDraftKeys.length === 0} onClick=${addStockKeys}>
                  <${Plus} size=${16} style=${{ marginRight: "6px" }} />
                  ${stockEditor.saving ? "Salvando..." : "Adicionar keys"}
                </${Button}>
                <${Button} variant="danger" disabled=${stockEditor.saving} onClick=${clearStockBucket}>
                  <${Trash2} size=${16} style=${{ marginRight: "6px" }} />
                  ${pendingClearBucket === (asString(stockEditor.bucket).trim() || "default") ? "Confirmar limpeza" : "Limpar bucket"}
                </${Button}>
                <${Button} variant="ghost" disabled=${stockEditor.saving} onClick=${closeStock}>
                  <${X} size=${16} style=${{ marginRight: "6px" }} />
                  Fechar painel
                </${Button}>
              </div>

              <div className="hr"></div>

              <div className="stockBucketsGrid">
                <div>
                  <div className="label">Keys no bucket atual</div>
                  <div className="stockBucketList mono">
                    ${stockActiveEntries.length
                      ? stockActiveEntries.slice(0, 120).map((key, idx) => html`<div className="stockKeyItem">${idx + 1}. ${asString(key)}</div>`)
                      : html`<div className="muted2">Bucket vazio.</div>`}
                    ${stockActiveEntries.length > 120
                      ? html`<div className="muted2">Mostrando 120 de ${stockActiveEntries.length} keys.</div>`
                      : null}
                  </div>
                </div>
                <div>
                  <div className="label">Resumo técnico</div>
                  <div className="code mono stockJsonPreview">${JSON.stringify(stockEditor.stock || {}, null, 2)}</div>
                </div>
              </div>
            </div>
          `;
    }

    if (storeWorkspaceMode === "post") {
      return postEditor.loading
        ? html`<div className="muted">Carregando canais...</div>`
        : html`
            <div className="formGrid">
              <div className="label">Canal</div>
              <select className="input" value=${postEditor.channelId} onChange=${(e) => setPostEditor((s) => ({ ...s, channelId: e.target.value }))}>
                <option value="">Selecionar...</option>
                ${(postEditor.channels || []).map((c) => html`<option value=${c.id}>${c.label || c.name}</option>`)}
              </select>

              <label className="muted2">
                <input type="checkbox" checked=${!!postEditor.purge} onChange=${(e) => setPostEditor((s) => ({ ...s, purge: !!e.target.checked }))} />
                <span style=${{ marginLeft: "8px" }}>Limpar canal antes de postar (requer permissao)</span>
              </label>

              <div style=${{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <${Button} variant="primary" disabled=${postEditor.loading} onClick=${doPost}>
                  <${Send} size=${16} style=${{ marginRight: "6px" }} />
                  Postar agora
                </${Button}>
                <${Button} variant="ghost" disabled=${postEditor.loading} onClick=${closePost}>
                  <${X} size=${16} style=${{ marginRight: "6px" }} />
                  Fechar painel
                </${Button}>
              </div>
            </div>
          `;
    }

    return html`
      <div className="emptyState storeWorkspaceEmpty">
        <div className="eTitle">Escolha uma ação para começar</div>
        <div className="eDesc">Selecione um produto no catálogo para editar, ajustar estoque ou publicar no Discord sem abrir popup.</div>
      </div>
      <div className="storeQuickActions">
        <${Button} variant="primary" disabled=${storeProducts.loading || !storeInstanceId} onClick=${openCreateProduct}>
          <${Plus} size=${16} style=${{ marginRight: "6px" }} />
          Novo produto
        </${Button}>
        <${Button} variant="ghost" disabled=${!selectedStoreProduct} onClick=${() => selectedStoreProduct && openEditProduct(selectedStoreProduct)}>
          <${Edit3} size=${16} style=${{ marginRight: "6px" }} />
          Editar selecionado
        </${Button}>
        <${Button} variant="subtle" disabled=${!selectedStoreProduct} onClick=${() => selectedStoreProduct && openStock(selectedStoreProduct)}>
          <${Package} size=${16} style=${{ marginRight: "6px" }} />
          Abrir estoque
        </${Button}>
        <${Button} variant="subtle" disabled=${!selectedStoreProduct || !canPostFromStore} onClick=${() => selectedStoreProduct && openPost(selectedStoreProduct)}>
          <${Send} size=${16} style=${{ marginRight: "6px" }} />
          Publicar no Discord
        </${Button}>
      </div>
    `;
  };

  const instanceWorkspaceTitle = (() => {
    if (instanceWorkspaceMode !== "edit") return "Workspace de instâncias";
    return `Editar instância - ${asString(edit.name || edit.id).trim() || "sem nome"}`;
  })();

  const renderInstanceWorkspaceContent = () => {
    if (instanceWorkspaceMode !== "edit" || !asString(edit.id).trim()) {
      return html`
        <div className="emptyState instanceWorkspaceEmpty">
          <div className="eTitle">Selecione uma instância</div>
          <div className="eDesc">Escolha uma instância na lista para editar vinculação, branding e canais sem popup.</div>
        </div>
      `;
    }

    const editId = asString(edit.id).trim();
    return html`
      <div className="formGrid">
        <div className="label">Nome da instância</div>
        <input className="input" value=${edit.name} onInput=${(e) => setEdit((s) => ({ ...s, name: e.target.value }))} placeholder="Ex: Minha Loja" />

        <div className="label">Servidor (Guild ID)</div>
        <input
          className="input mono"
          value=${edit.guildId}
          onInput=${(e) => setEdit((s) => ({ ...s, guildId: e.target.value }))}
          placeholder="Ex: 123456789012345678"
        />
        ${guilds?.length
          ? html`
              <div className="help">Ou escolha da lista (requer login com Discord):</div>
              <select
                className="input"
                value=${edit.guildId}
                onChange=${(e) => setEdit((s) => ({ ...s, guildId: e.target.value }))}
              >
                <option value="">Selecionar servidor...</option>
                ${guilds.map((g) => html`<option value=${g.id}>${g.name}</option>`)}
              </select>
            `
          : html`<div className="help">Para carregar a lista de servidores aqui, entre com Discord.</div>`}

        <div className="hr"></div>

        <div className="label">Branding</div>
        <input
          className="input"
          value=${edit.brandName}
          onInput=${(e) => setEdit((s) => ({ ...s, brandName: e.target.value }))}
          placeholder="Nome da marca (ex: AstraSystems)"
        />
        <input
          className="input mono"
          value=${edit.accent}
          onInput=${(e) => setEdit((s) => ({ ...s, accent: e.target.value }))}
          placeholder="Cor de destaque (ex: #E6212A)"
        />
        <input
          className="input"
          value=${edit.logoUrl}
          onInput=${(e) => setEdit((s) => ({ ...s, logoUrl: e.target.value }))}
          placeholder="URL do logo (opcional)"
        />
        <div className="help">
          Para vincular um servidor, selecione da lista abaixo (requer login Discord) ou cole o Guild ID manualmente.
        </div>

        <div className="hr"></div>

        <div className="row" style=${{ alignItems: "center", justifyContent: "space-between" }}>
          <div className="label" style=${{ margin: 0 }}>Canais do bot</div>
          <${Button}
            variant="subtle"
            disabled=${busy || editChannels.loading || !asString(edit.guildId).trim()}
            onClick=${onLoadInstanceChannels}
          >
            <${RefreshCw} size=${14} style=${{ marginRight: "6px" }} />
            ${editChannels.loading ? "Carregando..." : "Carregar canais"}
          </${Button}>
        </div>
        <div className="help">
          Configure onde o bot vai enviar logs, notificacoes de vendas e onde pedir avaliacao.
          <br />
          Para usar dropdown: vincule o servidor, convide o bot e clique em <b>Carregar canais</b>.
        </div>
        ${editChannels.error ? html`<div className="muted2">Erro ao carregar canais: <b>${editChannels.error}</b></div>` : null}

        <div className="label">Canal de logs</div>
        ${editChannels.channels?.length
          ? html`
              <select
                className="input"
                value=${edit.logsChannelId}
                onChange=${(e) => setEdit((s) => ({ ...s, logsChannelId: e.target.value }))}
              >
                <option value="">Nao configurado</option>
                ${editChannels.channels.map((c) => html`<option value=${c.id}>${c.label || c.name}</option>`)}
              </select>
            `
          : html`
              <input
                className="input mono"
                value=${edit.logsChannelId}
                onInput=${(e) => setEdit((s) => ({ ...s, logsChannelId: e.target.value }))}
                placeholder="ID do canal (opcional)"
              />
            `}
        <div className="help">Onde o bot envia alertas importantes (DM falhou, estoque, auditoria, etc).</div>

        <div className="label">Canal de vendas ao vivo</div>
        ${editChannels.channels?.length
          ? html`
              <select
                className="input"
                value=${edit.salesChannelId}
                onChange=${(e) => setEdit((s) => ({ ...s, salesChannelId: e.target.value }))}
              >
                <option value="">Nao configurar</option>
                ${editChannels.channels.map((c) => html`<option value=${c.id}>${c.label || c.name}</option>`)}
              </select>
            `
          : html`
              <input
                className="input mono"
                value=${edit.salesChannelId}
                onInput=${(e) => setEdit((s) => ({ ...s, salesChannelId: e.target.value }))}
                placeholder="ID do canal (opcional)"
              />
            `}
        <div className="help">O bot manda uma mensagem aqui sempre que uma compra for entregue com sucesso.</div>

        <div className="label">Canal de feedback/avaliacoes</div>
        ${editChannels.channels?.length
          ? html`
              <select
                className="input"
                value=${edit.feedbackChannelId}
                onChange=${(e) => setEdit((s) => ({ ...s, feedbackChannelId: e.target.value }))}
              >
                <option value="">Nao configurar</option>
                ${editChannels.channels.map((c) => html`<option value=${c.id}>${c.label || c.name}</option>`)}
              </select>
            `
          : html`
              <input
                className="input mono"
                value=${edit.feedbackChannelId}
                onInput=${(e) => setEdit((s) => ({ ...s, feedbackChannelId: e.target.value }))}
                placeholder="ID do canal (opcional)"
              />
            `}
        <div className="help">Apos a entrega, o bot manda uma DM pedindo para avaliar nesse canal.</div>
      </div>

      <div style=${{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
        <${Button} variant="primary" disabled=${busy} onClick=${onSaveInstance}>
          <${Save} size=${16} style=${{ marginRight: "6px" }} />
          ${busy ? "Salvando..." : "Salvar alterações"}
        </${Button}>
        <${Button}
          variant="subtle"
          disabled=${busy || !asString(edit.guildId).trim()}
          onClick=${() => onInvite(asString(edit.guildId).trim(), editId)}
        >
          <${Link2} size=${16} style=${{ marginRight: "6px" }} />
          Gerar invite
        </${Button}>
        <${Button} variant="danger" disabled=${busy} onClick=${() => onDeleteInstance(editId)}>
          <${Trash2} size=${16} style=${{ marginRight: "6px" }} />
          ${pendingDeleteInstanceId === editId ? "Confirmar exclusao" : "Excluir instância"}
        </${Button}>
        <${Button} variant="ghost" disabled=${busy} onClick=${closeEditInstance}>
          <${X} size=${16} style=${{ marginRight: "6px" }} />
          Fechar painel
        </${Button}>
      </div>
    `;
  };

  const avatarUrl = me?.profileAvatarUrl || me?.discordAvatarUrl || null;
  const displayName = me?.discordUsername || me?.displayName || (me?.email ? me.email.split("@")[0] : "Usuário");
  const initials = displayName.slice(0, 1).toUpperCase();
  const profileAvatarPreview = asString(profileAvatarDraft).trim() || avatarUrl;

  // Plan expiry warning
  const [expiryDismissed, setExpiryDismissed] = useState(false);
  const expiryWarning = (() => {
    if (expiryDismissed || !me?.plan?.expiresAt) return null;
    const msLeft = Date.parse(me.plan.expiresAt) - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return null;
    if (daysLeft > 3) return null;
    const hoursLeft = msLeft / (1000 * 60 * 60);
    const label = hoursLeft < 24
      ? `${Math.max(1, Math.ceil(hoursLeft))} hora${Math.ceil(hoursLeft) > 1 ? "s" : ""}`
      : `${Math.ceil(daysLeft)} dia${Math.ceil(daysLeft) > 1 ? "s" : ""}`;
    return label;
  })();

  return html`
    <div className="container">

      ${expiryWarning ? html`
        <div className="expiryBanner">
          <div className="expiryBannerLeft">
            <${Bell} size=${20} className="expiryBannerIcon" />
            <div>
              <div className="expiryBannerTitle">Plano expirando em breve!</div>
              <div className="expiryBannerDesc">Seu plano expira em <b>${expiryWarning}</b>. Renove agora para não perder acesso.</div>
            </div>
          </div>
          <div style=${{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            <${Button} variant="primary" onClick=${() => route.navigate("/plans")}>
              <${CreditCard} size=${16} style=${{ marginRight: "6px" }} />
              Renovar Agora
            </${Button}>
            <button className="expiryBannerDismiss" onClick=${() => setExpiryDismissed(true)} aria-label="Fechar">×</button>
          </div>
        </div>
      ` : null}

      <div className="userHero">
        <div className="userAvatarWrap">
          ${avatarUrl ? html`
            <img
              className="userAvatar"
              src=${avatarUrl}
              alt=${displayName}
              onError=${(e) => {
                e.currentTarget.style.display = "none";
                const fb = e.currentTarget.parentElement?.querySelector(".userAvatarFallback");
                if (fb) fb.style.display = "flex";
              }}
            />
          ` : null}
          <div className="userAvatarFallback" style=${{ display: avatarUrl ? "none" : "flex" }}>
            ${initials}
          </div>
          <div className="userOnlineDot" title="Online"></div>
        </div>

        <div className="userInfo">
          <div className="userName">${displayName}</div>
          ${me?.email ? html`<div className="userEmail">${me.email}</div>` : null}
          <div className="userMeta">
            <div className=${`pill ${me?.planActive ? "good" : "soon"}`} style=${{ fontSize: "11px", padding: "4px 9px" }}>
              ${me?.planActive ? planText : "Sem plano"}
            </div>
            ${me?.discordUserId ? html`
              <div className="pill" style=${{ fontSize: "11px", padding: "4px 9px" }}>
                Discord
              </div>
            ` : null}
            ${me?.isPortalAdmin ? html`
              <div className="pill good" style=${{ fontSize: "11px", padding: "4px 9px" }}>
                Admin
              </div>
            ` : null}
          </div>
        </div>

        <div className="userStats">
          <div className="userStat">
            <div className="userStatVal">${me?.planActive ? "Ativo" : "Inativo"}</div>
            <div className="userStatLabel">Plano</div>
          </div>
          <div className="userStatDivider"></div>
          <div className="userStat">
            <div className="userStatVal">${instances?.length || 0}</div>
            <div className="userStatLabel">Instancias</div>
          </div>
          <div className="userStatDivider"></div>
          <div className="userStat">
            <div className="userStatVal">${onlineInstancesCount}</div>
            <div className="userStatLabel">Bots online</div>
          </div>
        </div>
      </div>

      <div className="tabs" style=${{ marginTop: "16px" }}>
        <button className=${`tab ${tab === "overview" ? "active" : ""}`} onClick=${() => setTab("overview")}>
          <${LayoutDashboard} size=${15} strokeWidth=${1.9} aria-hidden="true" />
          <span>Painel</span>
        </button>
        <button className=${`tab ${tab === "instances" ? "active" : ""}`} onClick=${() => setTab("instances")}>
          <${Bot} size=${15} strokeWidth=${1.9} aria-hidden="true" />
          <span>Instancias</span>
        </button>
        <button className=${`tab ${tab === "store" ? "active" : ""}`} onClick=${() => setTab("store")}>
          <${ShoppingBag} size=${15} strokeWidth=${1.9} aria-hidden="true" />
          <span>Loja</span>
        </button>
        <button className=${`tab ${tab === "wallet" ? "active" : ""}`} onClick=${() => setTab("wallet")}>
          <${HandCoins} size=${15} strokeWidth=${1.9} aria-hidden="true" />
          <span>Carteira</span>
        </button>
        <button className=${`tab ${tab === "account" ? "active" : ""}`} onClick=${() => setTab("account")}>
          <${CircleUserRound} size=${15} strokeWidth=${1.9} aria-hidden="true" />
          <span>Conta</span>
        </button>
      </div>

      ${tab === "overview" && !me?.planActive && !(instances?.length > 0) ? html`
      <div className="dashWelcome">
        <div className="dashWelcomeInner">
          <div className="dashWelcomeIcon">
            <${Rocket} size=${32} strokeWidth=${1.6} />
          </div>
          <h2 className="dashWelcomeTitle">Configure seu <span style=${{ color: "var(--accent2)" }}>Bot</span>!</h2>
          <p className="dashWelcomeDesc">
            Você ainda não tem nenhum bot configurado.<br/>
            Ative o trial gratuito ou escolha um plano para começar.
          </p>
          <div style=${{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "8px" }}>
            <${Button} variant="primary" icon=${Rocket} onClick=${() => route.navigate("/trial")}>
              Ativar Trial Grátis
            </${Button}>
            <${Button} variant="ghost" icon=${CreditCard} onClick=${() => route.navigate("/plans")}>
              Ver Planos
            </${Button}>
          </div>
        </div>
      </div>
      ` : null}

      ${tab === "overview" ? html`
      <div className="card pad" style=${{ marginTop: "14px" }}>
        <div className="cardHead">
          <h3>Configuração</h3>
          <div className="row" style=${{ alignItems: "center", gap: "8px" }}>
            <div className=${`pill ${botStatus?.botReady ? "good" : "soon"}`}>
              <span className=${`dot ${botStatus?.botReady ? "on" : "off"}`} style=${{ marginRight: "5px" }}></span>
              ${botStatus?.botReady ? "Bot online" : "Bot offline"}
            </div>
            ${me?.planActive && (instances?.length || 0) > 0 && firstInstance?.discordGuildId
              ? html`<div className="pill good" style=${{ fontSize: "11px", padding: "4px 9px" }}>Setup completo</div>`
              : null}
          </div>
        </div>
        <div className="muted2" style=${{ marginBottom: "14px", fontSize: "13px" }}>
          Siga os 3 passos abaixo para colocar seu bot no ar e começar a vender.
        </div>
        ${me?.planActive && !(instances?.length > 0)
          ? html`<div className="pill reco" style=${{ marginBottom: "14px", display: "inline-flex" }}>Próximo passo: crie sua instância com o token do bot.</div>`
          : null}
        <div className="grid cols3">
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">1</span>
              <div className="label" style=${{ margin: 0 }}>Plano</div>
            </div>
            <div className="value" style=${{ color: me?.planActive ? "var(--good)" : "inherit" }}>${me?.planActive ? "Ativo" : "Pendente"}</div>
            <div className="hint">Trial 24h grátis ou plano Start a partir de R$ 5,97/mês.</div>
            <div style=${{ marginTop: "10px" }}>
              <div className="row grow" style=${{ gap: "8px" }}>
                <${Button} variant="ghost" icon=${CreditCard} disabled=${busy} onClick=${() => route.navigate("/plans")}>Gerenciar</${Button}>
                ${me?.planActive
                  ? null
                  : html`<${Button} variant="primary" icon=${Rocket} disabled=${busy} onClick=${() => route.navigate("/trial")}>Ativar trial</${Button}>`}
              </div>
            </div>
          </div>
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">2</span>
              <div className="label" style=${{ margin: 0 }}>Instância</div>
            </div>
            <div className="value" style=${{ color: (instances?.length || 0) > 0 ? "var(--good)" : "inherit" }}>
              ${(instances?.length || 0) > 0 ? "Criada" : "Pendente"}
            </div>
            <div className="hint">Cole o token do bot criado no Discord Developer Portal.</div>
            <div style=${{ marginTop: "10px" }}>
              <${Button}
                variant=${(instances?.length || 0) > 0 ? "ghost" : "primary"}
                icon=${Plus}
                disabled=${busy}
                onClick=${() => {
                  if (!me?.planActive) return route.navigate("/plans");
                  setTab("instances");
                  setCreating(true);
                }}
              >
                ${(instances?.length || 0) > 0 ? "Gerenciar" : "Criar instância"}
              </${Button}>
            </div>
          </div>
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">3</span>
              <div className="label" style=${{ margin: 0 }}>Invite</div>
            </div>
            <div className="value" style=${{ color: firstInstance?.discordGuildId ? "var(--good)" : "inherit" }}>
              ${firstInstance?.discordGuildId ? "Vinculado" : "Pendente"}
            </div>
            <div className="hint">Convide o bot ao servidor e vincule o Guild ID na instância.</div>
            <div style=${{ marginTop: "10px" }}>
              <${Button}
                variant="subtle"
                icon=${Link2}
                onClick=${() => {
                  if (!firstInstance) return toast("Crie uma instância", "Crie sua instância com token antes do invite.", "bad");
                  onInvite(firstInstance.discordGuildId || "", firstInstance.id);
                }}
              >
                Gerar invite
              </${Button}>
            </div>
          </div>
        </div>
      </div>
      ` : null}

      ${tab === "overview" ? html`
      <div className="card pad" style=${{ marginTop: "14px" }}>
        <div className="cardHead cardHeadCompact">
          <h3>Acessos rápidos</h3>
        </div>
        <div className="actionsRow" style=${{ marginTop: "10px", gap: "8px", flexWrap: "wrap" }}>
          <${Button} variant="subtle" icon=${Bot} onClick=${() => setTab("instances")}>Gerenciar instâncias</${Button}>
          <${Button} variant="subtle" icon=${ShoppingBag} onClick=${() => setTab("store")}>Abrir loja</${Button}>
          <${Button} variant="subtle" icon=${Wallet} onClick=${() => setTab("wallet")}>Abrir carteira</${Button}>
          <${Button} variant="ghost" icon=${Settings} onClick=${() => setTab("account")}>Perfil e segurança</${Button}>
        </div>
        <div className="help" style=${{ marginTop: "10px" }}>
          Saldo, vendas e transações ficam centralizados na aba <b>Carteira</b>. Perfil, email e segurança ficam na aba <b>Conta</b>.
        </div>
      </div>
      ` : null}

      ${tab === "wallet" ? html`
      <div className="grid cols3" style=${{ marginTop: "16px" }}>
        <div className="kpi">
          <div className="label">Saldo disponível</div>
          <div className="value">${formatBRLFromCents(me?.walletCents || 0)}</div>
          <div className="hint">Disponível para transferência via Pix</div>
        </div>
        <div className="kpi">
          <div className="label">Total vendido</div>
          <div className="value">${formatBRLFromCents(me?.salesCentsTotal || 0)}</div>
          <div className="hint">Líquido recebido: <b>94%</b> por venda</div>
        </div>
        <div className="kpi">
          <div className="label">Saques pendentes</div>
          <div className="value">${pendingWithdrawalsCount}</div>
          <div className="hint">Em processamento na fila de pagamento</div>
        </div>
      </div>

      <div className="walletSplitGrid" style=${{ marginTop: "14px" }}>
        <div className="card pad withdrawCard">
          <div className="cardHead cardHeadCompact">
            <h3>Solicitar saque</h3>
            <span className="badge none">Saldo: ${formatBRLFromCents(me?.walletCents || 0)}</span>
          </div>
          <div className="stack">
            <div className="row grow withdrawActionRow" style=${{ gap: "10px" }}>
              <input
                className="input"
                value=${withdrawAmount}
                disabled=${busy}
                onInput=${(e) => setWithdrawAmount(e.target.value)}
                placeholder="Valor (ex: 50,00)"
              />
              <${Button} variant="primary" icon=${HandCoins} disabled=${busy} onClick=${onRequestWithdrawal}>
                Solicitar saque
              </${Button}>
            </div>
            <input
              className="input mono"
              value=${pixKey}
              disabled=${busy}
              onInput=${(e) => setPixKey(e.target.value)}
              placeholder="Chave Pix (CPF / email / telefone / aleatória)"
            />
            <select className="input" value=${pixKeyType} disabled=${busy} onChange=${(e) => setPixKeyType(e.target.value)}>
              <option value="">Tipo da chave (opcional)</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">Email</option>
              <option value="phone">Telefone</option>
              <option value="random">Aleatória</option>
            </select>
            <div className="help">Saque mínimo: <b>R$ 10,00</b>. Ao solicitar, o valor sai do saldo e fica pendente até processamento.</div>
          </div>
        </div>

        <div className="card pad">
          <div className="cardHead cardHeadCompact">
            <h3>Transações recentes</h3>
            <span className="badge none">${recentTransactionsCount} registros</span>
          </div>
          ${txs?.length
            ? html`
                <table className="table tableCompact tableFinancial">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${txs.map(
                      (t) => {
                        const txType = getTransactionTypeMeta(t.type);
                        const txStatus = getTransactionStatusMeta(t.status);
                        return html`
                        <tr>
                          <td style=${{ fontWeight: 600 }}>${txType.label}</td>
                          <td><b>${t.amountFormatted}</b></td>
                          <td><span className=${`badge ${txStatus.className}`}>${txStatus.label}</span></td>
                          <td><span className="muted2" style=${{ fontSize: "12px" }}>${formatDateTime(t.createdAt)}</span></td>
                        </tr>
                      `;
                      }
                    )}
                  </tbody>
                </table>
              `
            : html`
                <div className="emptyState">
                  <div className="eTitle">Sem transações</div>
                  <div className="eDesc">Suas vendas e movimentações aparecerão aqui.</div>
                </div>
              `}
        </div>
      </div>

      <div className="card pad" style=${{ marginTop: "14px" }}>
        <div className="cardHead cardHeadCompact">
          <h3>Saques solicitados</h3>
          <span className=${`badge ${pendingWithdrawalsCount > 0 ? "pending" : "none"}`}>
            ${pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount} pendente(s)` : "Sem pendências"}
          </span>
        </div>
        ${withdrawals?.length
          ? html`
              <table className="table tableCompact tableFinancial">
                <thead>
                  <tr>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Chave Pix</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${withdrawals.map(
                    (w) => {
                      const status = getWithdrawalStatusMeta(w.status);
                      return html`
                      <tr>
                        <td><b>${w.amountFormatted}</b></td>
                        <td><span className=${`badge ${status.className}`}>${status.label}</span></td>
                        <td className="mono" style=${{ fontSize: "12px" }}>${maskSensitive(w.pixKey)}</td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${formatDateTime(w.createdAt)}</span></td>
                        <td>
                          ${status.key === "requested"
                            ? html`
                                <${Button} variant="danger" disabled=${busy} onClick=${() => onCancelWithdrawal(w.id)}>
                                  <${X} size=${14} style=${{ marginRight: "4px" }} />
                                  ${pendingCancelWithdrawalId === asString(w.id) ? "Confirmar" : "Cancelar"}
                                </${Button}>
                              `
                            : html`<span className="muted2">—</span>`}
                        </td>
                      </tr>
                    `;
                    }
                  )}
                </tbody>
              </table>
              <div className="help" style=${{ marginTop: "10px" }}>Saques são processados em fila. Mantenha sua chave Pix correta.</div>
            `
          : html`
              <div className="emptyState">
                <div className="eTitle">Sem saques</div>
                <div className="eDesc">Solicite um saque quando tiver saldo disponível.</div>
              </div>
            `}
      </div>
      ` : null}

      ${tab === "instances" ? html`
      <div className="instancesWorkspace" style=${{ marginTop: "18px" }}>
        <div className="card pad">
          <div className="cardHead cardHeadCompact">
            <h3>Instâncias</h3>
            <${Button}
              variant="primary"
              icon=${Plus}
              disabled=${busy || (me?.planActive && (instances?.length || 0) >= 1)}
              onClick=${() => {
                if (!me?.planActive) return route.navigate("/plans");
                setCreating((v) => !v);
              }}
            >
              ${creating ? "Fechar" : (instances?.length || 0) >= 1 ? "Limite atingido" : "Criar instância"}
            </${Button}>
          </div>

          ${me?.planActive
            ? null
            : html`<div className="muted2" style=${{ marginTop: "10px", marginBottom: "4px" }}>Ative um plano para criar instâncias e liberar o bot no seu servidor.</div>`}
          ${me?.planActive && (instances?.length || 0) >= 1
            ? html`<div className="muted2" style=${{ marginTop: "10px", marginBottom: "4px" }}>Seu plano permite 1 instância por assinatura. Exclua a instância atual para criar outra.</div>`
            : null}

          ${creating
            ? html`
                <div className="createInstanceForm" style=${{ marginTop: "16px", padding: "18px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(230,33,42,0.08), rgba(255,77,87,0.04))", border: "1px solid rgba(230,33,42,0.2)" }}>
                  <div style=${{ fontWeight: 800, fontSize: "14px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <${Rocket} size=${18} /> Nova Instância
                  </div>
                  <div className="stack" style=${{ gap: "10px" }}>
                    <div>
                      <div className="label" style=${{ marginBottom: "6px" }}>Nome da loja</div>
                      <input className="input" placeholder="Ex: Minha Loja Premium" value=${newName} onInput=${(e) => setNewName(e.target.value)} />
                    </div>
                    <div>
                      <div className="label" style=${{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <${Key} size=${12} /> Token do Bot
                      </div>
                      <input
                        className="input mono"
                        type="password"
                        placeholder="Cole o token do Discord Developer Portal"
                        value=${newBotToken}
                        onInput=${(e) => setNewBotToken(e.target.value)}
                      />
                    </div>
                    <div className="row" style=${{ gap: "10px", marginTop: "6px" }}>
                      <${Button}
                        variant="primary"
                        icon=${Bot}
                        disabled=${busy || !me?.planActive || (instances?.length || 0) >= 1}
                        onClick=${onCreateInstance}
                      >
                        ${busy ? "Validando..." : "Criar instância"}
                      </${Button}>
                      <${Button}
                        variant="ghost"
                        icon=${X}
                        onClick=${() => setCreating(false)}
                      >
                        Cancelar
                      </${Button}>
                    </div>
                    <div className="help" style=${{ marginTop: "4px" }}>
                      <${AlertCircle} size=${12} style=${{ marginRight: "4px", verticalAlign: "middle" }} />
                      Cada assinatura libera 1 instância. O token é validado na hora.
                    </div>
                  </div>
                </div>
              `
            : null}

          ${instances?.length
            ? html`
                <div className="stack" style=${{ marginTop: "14px" }}>
                  ${instances.map(
                    (inst) => {
                      const instId = asString(inst?.id);
                      const isSelectedInstance = asString(instanceWorkspaceId).trim() === instId;
                      const runtime = inst?.runtime || {};
                      const runtimeMeta = formatRuntimeStatus(runtime?.status);
                      const runtimeErrorLabel = formatDockerIssue(runtime?.lastError);
                      const messageContentEnabled = !!inst?.botProfile?.intents?.messageContentEnabled;
                      const textCommandsDisabled = !!inst?.hasBotToken && !messageContentEnabled;
                      const runtimeAction = asString(botActionByInstance?.[instId]).toLowerCase();
                      const runtimeBusy = !!runtimeAction;
                      return html`
                      <div className=${`kpi instanceListCard ${isSelectedInstance ? "selected" : ""}`}>
                        <div style=${{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <div>
                            <div style=${{ fontWeight: 900, fontSize: "16px", lineHeight: "1.2" }}>${inst.name || "Instância"}</div>
                            <div className="mono muted2" style=${{ fontSize: "11px", marginTop: "3px" }}>
                              ${inst?.botProfile?.username ? `@${inst.botProfile.username} · ` : ""}${inst.id}
                            </div>
                          </div>
                          <div style=${{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <span className=${`badge ${runtimeMeta.className}`}>
                              <span className=${`dot ${runtimeMeta.className === "active" ? "on" : "off"}`} style=${{ marginRight: "4px" }}></span>
                              ${runtimeMeta.label}
                            </span>
                            <span className=${`badge ${inst.discordGuildId ? "active" : "none"}`}>
                              ${inst.discordGuildId ? "Servidor OK" : "Sem servidor"}
                            </span>
                          </div>
                        </div>

                        <div className="hr"></div>

                        <div className="stack" style=${{ gap: "2px" }}>
                          <div className="infoItem">
                            <span className="iKey">Guild ID</span>
                            <span className="iVal mono">${inst.discordGuildId || "—"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">Bot</span>
                            <span className="iVal">${inst?.botProfile?.username ? `@${inst.botProfile.username}` : "—"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">Token</span>
                            <span className="iVal">${inst?.hasBotToken ? "Configurado" : "Pendente"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">Runtime</span>
                            <span className="iVal">${runtimeMeta.label}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">Comandos !</span>
                            <span className="iVal">${messageContentEnabled ? "Ativos" : "Desativados"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">Container</span>
                            <span className="iVal mono">${runtime?.containerName || "—"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">API Key</span>
                            <span className="iVal mono">${inst.apiKeyLast4 ? `****${inst.apiKeyLast4}` : "—"}</span>
                          </div>
                        </div>
                        ${runtimeErrorLabel
                          ? html`<div className="help" style=${{ marginTop: "8px", color: "rgba(239,68,68,0.9)" }}>${runtimeErrorLabel}</div>`
                          : null}
                        ${textCommandsDisabled
                          ? html`<div className="help" style=${{ marginTop: "6px", color: "rgba(251,191,36,0.9)" }}>
                              Message Content Intent desativada para este token. Os comandos com prefixo ! nao respondem ate ativar essa intent no Discord Developer Portal.
                            </div>`
                          : null}

                        <div className="instanceTokenSection" style=${{ marginTop: "14px", padding: "14px", borderRadius: "14px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="label" style=${{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <${Key} size=${14} /> Token do Bot
                          </div>
                          <div className="row" style=${{ gap: "8px", flexWrap: "wrap" }}>
                            <input
                              className="input mono"
                              type="password"
                              style=${{ flex: "1", minWidth: "200px" }}
                              placeholder=${inst?.hasBotToken ? "Atualizar token..." : "Cole o token do bot aqui"}
                              value=${asString(tokenDraftByInstance?.[asString(inst.id)] || "")}
                              onInput=${(e) =>
                                setTokenDraftByInstance((prev) => ({ ...prev, [asString(inst.id)]: asString(e.target.value) }))
                              }
                            />
                            <${Button}
                              variant="primary"
                              icon=${Save}
                              disabled=${busy || savingTokenFor === asString(inst.id)}
                              onClick=${() => onSaveBotToken(inst.id)}
                            >
                              ${savingTokenFor === asString(inst.id) ? "Validando..." : "Salvar"}
                            </${Button}>
                            <${Button}
                              variant="danger"
                              icon=${Trash2}
                              disabled=${busy || !inst?.hasBotToken || clearingTokenFor === asString(inst.id)}
                              onClick=${() => onClearBotToken(inst.id)}
                            >
                              ${clearingTokenFor === asString(inst.id) ? "..." : pendingClearTokenInstanceId === instId ? "Confirmar" : "Remover"}
                            </${Button}>
                          </div>
                        </div>

                        <div className="instanceRuntimeSection" style=${{ marginTop: "14px" }}>
                          <div className="label" style=${{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <${Server} size=${14} /> Controles do Bot
                          </div>
                          <div className="instanceActionsGrid" style=${{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                            <${Button}
                              variant="success"
                              icon=${Play}
                              disabled=${busy || runtimeBusy || !inst?.hasBotToken}
                              onClick=${() => onBotRuntimeAction(inst.id, "start")}
                            >
                              ${runtimeAction === "start" ? "Iniciando..." : "Iniciar"}
                            </${Button}>
                            <${Button}
                              variant="ghost"
                              icon=${RotateCcw}
                              disabled=${busy || runtimeBusy || !inst?.hasBotToken}
                              onClick=${() => onBotRuntimeAction(inst.id, "restart")}
                            >
                              ${runtimeAction === "restart" ? "..." : "Reiniciar"}
                            </${Button}>
                            <${Button}
                              variant="ghost"
                              icon=${Square}
                              disabled=${busy || runtimeBusy || !inst?.hasBotToken}
                              onClick=${() => onBotRuntimeAction(inst.id, "stop")}
                            >
                              ${runtimeAction === "stop" ? "..." : "Parar"}
                            </${Button}>
                            <${Button}
                              variant="subtle"
                              icon=${Settings}
                              disabled=${busy}
                              onClick=${() => openEditInstance(inst)}
                            >
                              ${isSelectedInstance ? "Editando" : "Configurar"}
                            </${Button}>
                            <${Button}
                              variant="subtle"
                              icon=${ExternalLink}
                              disabled=${busy}
                              onClick=${() => {
                                if (inst.discordGuildId) onInvite(inst.discordGuildId, inst.id);
                                else openEditInstance(inst);
                              }}
                            >
                              Invite
                            </${Button}>
                            <${Button}
                              variant="danger"
                              icon=${Trash2}
                              disabled=${busy}
                              onClick=${() => onDeleteInstance(inst.id)}
                            >
                              ${pendingDeleteInstanceId === instId ? "Confirmar" : "Excluir"}
                            </${Button}>
                          </div>
                        </div>
                      </div>
                    `;
                    }
                  )}
                </div>
              `
            : html`
                <div className="emptyState">
                  <div className="eTitle">Nenhuma instância criada</div>
                  <div className="eDesc">Crie sua primeira instância com o token do bot para começar a operar.</div>
                </div>
              `}
        </div>

        <div className="stack">
          <div className="card pad instanceWorkspacePanel">
            <div className="cardHead cardHeadCompact">
              <h3>${instanceWorkspaceTitle}</h3>
              <div className="row" style=${{ alignItems: "center", gap: "8px" }}>
                ${selectedInstance
                  ? html`<span className="badge none">Selecionada: ${selectedInstance?.name || selectedInstance?.id}</span>`
                  : null}
                <${Button} variant="ghost" disabled=${instanceWorkspaceMode === "none"} onClick=${closeEditInstance}>
                  <${X} size=${14} style=${{ marginRight: "6px" }} />
                  Fechar
                </${Button}>
              </div>
            </div>
            <div className="help" style=${{ marginBottom: "10px" }}>
              Edição sem popup: selecione uma instância e ajuste vínculo, branding e canais direto neste painel.
            </div>
            ${renderInstanceWorkspaceContent()}
          </div>

          <div className="card pad">
            <div className="cardHead cardHeadCompact">
              <h3>Servidores Discord</h3>
            </div>
            <div className="muted" style=${{ marginBottom: "12px" }}>
              Servidores onde você tem permissão de administrar. Use para gerar o invite já selecionando o servidor.
            </div>
            <div className="stack">
              ${guilds?.length
                ? guilds.slice(0, 12).map(
                    (g) => html`
                      <div className="row" style=${{ alignItems: "center", gap: "12px" }}>
                        <div className="guildIcon">
                          ${g.iconUrl
                            ? html`<img src=${g.iconUrl} alt=${g.name} className="guildIconImg" />`
                            : html`<div className="guildIconFallback">${(g.name || "?").slice(0, 1).toUpperCase()}</div>`
                          }
                        </div>
                        <div style=${{ flex: 2, minWidth: "140px" }}>
                          <div style=${{ fontWeight: 700 }}>${g.name}</div>
                          <div className="muted2 mono" style=${{ fontSize: "11px" }}>${g.id}</div>
                        </div>
                        <${Button}
                          variant="ghost"
                          onClick=${() => {
                            if (!firstInstance) return toast("Instância ausente", "Crie sua instância antes de convidar o bot.", "bad");
                            onInvite(g.id, firstInstance.id);
                          }}
                        >
                          Convidar bot
                        </${Button}>
                      </div>
                    `
                  )
                : html`
                    <div className="emptyState">
                      <div className="eTitle">Nenhum servidor</div>
                      <div className="eDesc">Para listar seus servidores aqui, entre com Discord. Login por email não acessa essa lista.</div>
                    </div>
                  `}
            </div>
          </div>
        </div>
      </div>
      ` : null}

      ${tab === "store" ? html`
      <div className="storeWorkspace" style=${{ marginTop: "18px" }}>
        <div className="card pad storeCatalogPanel">
          <!-- Store Header -->
          <div className="storeHeader" style=${{ marginBottom: "16px" }}>
            <div style=${{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style=${{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style=${{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(230,33,42,0.2), rgba(255,77,87,0.1))", border: "1px solid rgba(230,33,42,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <${Package} size=${22} style=${{ color: "var(--accent2)" }} />
                </div>
                <div>
                  <h3 style=${{ margin: 0, fontSize: "18px" }}>Catálogo de Produtos</h3>
                  <div className="muted2" style=${{ fontSize: "12px", marginTop: "2px" }}>Gerencie seus produtos e estoque</div>
                </div>
              </div>
              <div className="row" style=${{ gap: "8px", alignItems: "center" }}>
                <select
                  className="input"
                  style=${{ width: "180px", padding: "10px 12px" }}
                  value=${storeInstanceId}
                  onChange=${(e) => setStoreInstanceId(e.target.value)}
                  disabled=${storeProducts.loading || !instances?.length}
                >
                  ${instances?.length ? null : html`<option value="">Nenhuma instância</option>`}
                  ${(instances || []).map((inst) => html`<option value=${inst.id}>${inst.name || inst.id}</option>`)}
                </select>
                <${Button} variant="ghost" icon=${RefreshCw} disabled=${storeProducts.loading || !storeInstanceId} onClick=${() => loadStoreProducts(storeInstanceId)}>
                  Atualizar
                </${Button}>
                <${Button} variant="primary" icon=${Plus} disabled=${storeProducts.loading || !storeInstanceId} onClick=${openCreateProduct}>
                  Novo Produto
                </${Button}>
              </div>
            </div>
          </div>

          <!-- Search Bar -->
          <div className="storeSearchBar" style=${{ marginBottom: "14px", position: "relative" }}>
            <${Search} size=${16} style=${{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />
            <input
              className="input"
              style=${{ paddingLeft: "42px" }}
              value=${storeSearch}
              onInput=${(e) => setStoreSearch(e.target.value)}
              placeholder="Buscar produto por id, nome ou label..."
              disabled=${storeProducts.loading}
            />
          </div>

          <!-- Stats Grid - Compact -->
          <div className="storeStatsCompact" style=${{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
            <div className="storeStatMini" style=${{ padding: "12px 14px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style=${{ display: "flex", alignItems: "center", gap: "8px" }}>
                <${Boxes} size=${16} style=${{ color: "var(--accent2)" }} />
                <span className="label" style=${{ margin: 0 }}>Produtos</span>
              </div>
              <div style=${{ fontSize: "22px", fontWeight: 900, marginTop: "6px", fontFamily: "'Space Grotesk', sans-serif" }}>${storeCatalogSummary.total}</div>
            </div>
            <div className="storeStatMini" style=${{ padding: "12px 14px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style=${{ display: "flex", alignItems: "center", gap: "8px" }}>
                <${Search} size=${16} style=${{ color: "var(--muted)" }} />
                <span className="label" style=${{ margin: 0 }}>Resultados</span>
              </div>
              <div style=${{ fontSize: "22px", fontWeight: 900, marginTop: "6px", fontFamily: "'Space Grotesk', sans-serif" }}>${storeCatalogSummary.filtered}</div>
            </div>
            <div className="storeStatMini" style=${{ padding: "12px 14px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style=${{ display: "flex", alignItems: "center", gap: "8px" }}>
                <${Key} size=${16} style=${{ color: "var(--good)" }} />
                <span className="label" style=${{ margin: 0 }}>Estoque</span>
              </div>
              <div style=${{ fontSize: "22px", fontWeight: 900, marginTop: "6px", fontFamily: "'Space Grotesk', sans-serif", color: storeCatalogSummary.totalStock > 0 ? "var(--good)" : "var(--muted)" }}>${storeCatalogSummary.totalStock}</div>
            </div>
            <div className="storeStatMini" style=${{ padding: "12px 14px", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style=${{ display: "flex", alignItems: "center", gap: "8px" }}>
                <${AlertCircle} size=${16} style=${{ color: storeCatalogSummary.outOfStock > 0 ? "var(--warn)" : "var(--muted)" }} />
                <span className="label" style=${{ margin: 0 }}>Sem estoque</span>
              </div>
              <div style=${{ fontSize: "22px", fontWeight: 900, marginTop: "6px", fontFamily: "'Space Grotesk', sans-serif", color: storeCatalogSummary.outOfStock > 0 ? "var(--warn)" : "var(--muted)" }}>${storeCatalogSummary.outOfStock}</div>
            </div>
          </div>

          <!-- Instance Status Banner -->
          ${currentInstance
            ? html`
                <div className="instanceStatusBanner" style=${{ padding: "12px 14px", borderRadius: "12px", background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style=${{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <${Server} size=${16} style=${{ color: "var(--muted)" }} />
                    <span style=${{ fontSize: "13px", color: "var(--muted)" }}>${currentInstance?.name || "Instância"}</span>
                    <span className=${`badge ${formatRuntimeStatus(currentInstance?.runtime?.status).className}`} style=${{ padding: "4px 8px" }}>
                      ${formatRuntimeStatus(currentInstance?.runtime?.status).label}
                    </span>
                    ${currentInstance?.discordGuildId
                      ? html`<span className="badge active" style=${{ padding: "4px 8px" }}><${CheckCircle} size=${12} style=${{ marginRight: "4px" }} />Servidor OK</span>`
                      : html`<span className="badge none" style=${{ padding: "4px 8px" }}><${AlertCircle} size=${12} style=${{ marginRight: "4px" }} />Vincular servidor</span>`
                    }
                  </div>
                </div>
              `
            : null}
          ${currentInstance && !currentInstance?.hasBotToken
            ? html`<div className="help" style=${{ marginBottom: "12px", padding: "10px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(254,202,202,0.95)", display: "flex", alignItems: "center", gap: "8px" }}>
                <${XCircle} size=${16} /> Configure o token do bot antes de postar produtos.
              </div>`
            : null}

          <div className="storeProductList" style=${{ display: "flex", flexDirection: "column", gap: "10px" }}>
            ${storeProducts.loading
              ? html`<div className="muted" style=${{ padding: "24px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <${RefreshCw} size=${18} className="spin" /> Carregando produtos...
                </div>`
              : filteredStoreProducts?.length
                ? filteredStoreProducts.map((p) => {
                    const pid = asString(p?.id);
                    const variants = Array.isArray(p?.variants) ? p.variants.length : 0;
                    const stock = Number(storeProducts.stockCounts?.[pid] || 0);
                    const isSelected = asString(storeSelectedProductId).trim() === pid;
                    const shortDesc = asString(p?.description).replace(/\s+/g, " ").trim();
                    return html`
                      <article
                        className=${`storeProductCard ${isSelected ? "selected" : ""}`}
                        onClick=${() => setStoreSelectedProductId(pid)}
                        style=${{ padding: "14px 16px", borderRadius: "14px", background: isSelected ? "rgba(230,33,42,0.08)" : "rgba(0,0,0,0.15)", border: isSelected ? "1px solid rgba(230,33,42,0.3)" : "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.2s ease" }}
                      >
                        <div style=${{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                          <div style=${{ flex: 1, minWidth: "200px" }}>
                            <div style=${{ fontWeight: 800, fontSize: "15px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                              <${Box} size=${16} style=${{ color: isSelected ? "var(--accent2)" : "var(--muted)" }} />
                              ${p?.name || pid}
                            </div>
                            <div className="mono muted2" style=${{ fontSize: "11px", marginTop: "4px", marginLeft: "24px" }}>${pid}</div>
                            ${shortDesc
                              ? html`<div className="muted2" style=${{ fontSize: "12px", marginTop: "6px", marginLeft: "24px", lineHeight: "1.4" }}>${shortDesc.length > 100 ? `${shortDesc.slice(0, 100)}...` : shortDesc}</div>`
                              : null
                            }
                          </div>
                          <div style=${{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            <span className="badge none" style=${{ fontSize: "11px", padding: "4px 8px" }}>${variants} var.</span>
                            <span className=${`badge ${stock > 0 ? "active" : "pending"}`} style=${{ fontSize: "11px", padding: "4px 8px" }}>
                              <${Key} size=${11} style=${{ marginRight: "3px" }} />${stock}
                            </span>
                          </div>
                        </div>
                        <div style=${{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                          <${Button}
                            variant="ghost"
                            icon=${Edit3}
                            onClick=${(e) => { e.stopPropagation(); openEditProduct(p); }}
                          >
                            Editar
                          </${Button}>
                          <${Button}
                            variant="subtle"
                            icon=${Package}
                            onClick=${(e) => { e.stopPropagation(); openStock(p); }}
                          >
                            Estoque
                          </${Button}>
                          <${Button}
                            variant="primary"
                            icon=${Send}
                            disabled=${!canPostFromStore}
                            onClick=${(e) => { e.stopPropagation(); openPost(p); }}
                          >
                            Postar
                          </${Button}>
                          <${Button}
                            variant="danger"
                            icon=${Trash2}
                            onClick=${(e) => { e.stopPropagation(); deleteProduct(p); }}
                          >
                            ${pendingDeleteProductId === pid ? "Confirmar" : "Excluir"}
                          </${Button}>
                        </div>
                      </article>
                    `;
                  })
                : html`
                    <div className="emptyState" style=${{ padding: "40px 20px" }}>
                      <div style=${{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(230,33,42,0.1)", border: "1px solid rgba(230,33,42,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <${Package} size=${28} style=${{ color: "var(--accent2)" }} />
                      </div>
                      <div className="eTitle" style=${{ fontSize: "16px", marginBottom: "6px" }}>${storeSearch ? "Nenhum resultado" : "Nenhum produto"}</div>
                      <div className="eDesc" style=${{ maxWidth: "300px", margin: "0 auto" }}>
                        ${storeSearch
                          ? "Ajuste a busca para encontrar produtos."
                          : "Crie seu primeiro produto para começar a vender."}
                      </div>
                      ${!storeSearch ? html`
                        <${Button} variant="primary" icon=${Plus} style=${{ marginTop: "16px" }} onClick=${openCreateProduct}>
                          Criar primeiro produto
                        </${Button}>
                      ` : null}
                    </div>
                  `}
          </div>
        </div>

        <div className="card pad storeWorkspacePanel">
          <div className="cardHead cardHeadCompact">
            <h3>${storeWorkspaceTitle}</h3>
            <div className="row" style=${{ alignItems: "center", gap: "8px" }}>
              ${selectedStoreProduct
                ? html`<span className="badge none">Selecionado: ${selectedStoreProduct?.name || selectedStoreProduct?.id}</span>`
                : null}
              <${Button} variant="ghost" disabled=${storeWorkspaceMode === "none"} onClick=${closeStoreWorkspace}>
                <${X} size=${14} style=${{ marginRight: "6px" }} />
                Fechar
              </${Button}>
            </div>
          </div>
          <div className="help" style=${{ marginBottom: "10px" }}>
            Edite sem popup: escolha um produto no catálogo e trabalhe direto neste painel.
          </div>
          ${renderStoreWorkspaceContent()}
        </div>
      </div>
      ` : null}

      ${tab === "wallet" && me?.isPortalAdmin ? html`
      <div className="card pad walletAdminCard" style=${{ marginTop: "14px" }}>
        <div className="cardHead cardHeadCompact">
          <h3>Operações de saques (Admin)</h3>
          <span className=${`badge ${adminPendingWithdrawalsCount > 0 ? "pending" : "none"}`}>
            ${adminPendingWithdrawalsCount > 0 ? `${adminPendingWithdrawalsCount} pendente(s)` : "Fila vazia"}
          </span>
        </div>
        <div className="help" style=${{ marginBottom: "10px" }}>
          Conclua quando o Pix for enviado ou rejeite para devolver o saldo ao vendedor.
        </div>

        ${adminWithdrawals?.length
          ? html`
              <div className="walletAdminTableWrap">
              <table className="table tableCompact tableFinancial walletAdminTable">
                <thead>
                  <tr>
                    <th>Solicitante</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Pix</th>
                    <th>Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${adminWithdrawals.map((w) => {
                    const wid = asString(w?.id);
                    const status = getWithdrawalStatusMeta(w?.status);
                    const completeKey = `complete:${wid}`;
                    const rejectKey = `reject:${wid}`;
                    const isCompleting = adminWithdrawalActionKey === completeKey;
                    const isRejecting = adminWithdrawalActionKey === rejectKey;
                    const confirmingComplete =
                      asString(pendingAdminWithdrawalAction?.id) === wid &&
                      asString(pendingAdminWithdrawalAction?.action) === "complete";
                    const confirmingReject =
                      asString(pendingAdminWithdrawalAction?.id) === wid &&
                      asString(pendingAdminWithdrawalAction?.action) === "reject";
                    const ownerName = asString(w?.ownerDiscordUsername) || asString(w?.ownerDiscordUserId) || "Desconhecido";
                    const ownerId = asString(w?.ownerDiscordUserId);
                    const ownerEmail = asString(w?.ownerEmail);
                    return html`
                      <tr>
                        <td>
                          <div className="walletAdminRequester">
                            <span style=${{ fontWeight: 700 }}>${ownerName}</span>
                            ${ownerId ? html`<span className="mono muted2" style=${{ fontSize: "11px" }}>${ownerId}</span>` : null}
                            ${ownerEmail ? html`<span className="muted2" style=${{ fontSize: "11px" }}>${ownerEmail}</span>` : null}
                          </div>
                        </td>
                        <td><b>${w.amountFormatted}</b></td>
                        <td><span className=${`badge ${status.className}`}>${status.label}</span></td>
                        <td className="walletAdminPix">
                          <div className="mono">${asString(w.pixKey) || "—"}</div>
                          ${asString(w.pixKeyType)
                            ? html`<div className="muted2" style=${{ fontSize: "11px", marginTop: "3px" }}>Tipo: ${asString(w.pixKeyType).toUpperCase()}</div>`
                            : null}
                        </td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${formatDateTime(w.createdAt)}</span></td>
                        <td>
                          <div className="walletAdminActions">
                            <${Button}
                              variant="subtle"
                              disabled=${busy || !!adminWithdrawalActionKey}
                              onClick=${() => onAdminProcessWithdrawal(wid, "complete")}
                            >
                              ${isCompleting ? "Concluindo..." : confirmingComplete ? "Confirmar conclusão" : "Concluir"}
                            </${Button}>
                            <${Button}
                              variant="danger"
                              disabled=${busy || !!adminWithdrawalActionKey}
                              onClick=${() => onAdminProcessWithdrawal(wid, "reject")}
                            >
                              ${isRejecting ? "Rejeitando..." : confirmingReject ? "Confirmar rejeição" : "Rejeitar"}
                            </${Button}>
                          </div>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
              </div>
            `
          : html`
              <div className="emptyState">
                <div className="eTitle">Nenhum saque pendente</div>
                <div className="eDesc">Quando houver solicitações, elas aparecerão aqui para processamento.</div>
              </div>
            `}
      </div>
      ` : null}

      ${tab === "account" ? html`
      <div className="grid cols2" style=${{ marginTop: "18px" }}>
        <div className="card pad">
          <div className="cardHead">
            <h3>Perfil</h3>
          </div>

          <div style=${{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0 16px" }}>
            ${profileAvatarPreview
              ? html`
              <img
                src=${profileAvatarPreview}
                alt=${displayName}
                style=${{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover",
                          border: "2px solid rgba(255,255,255,0.14)", boxShadow: "0 0 0 3px rgb(var(--accent-rgb) / 0.22)" }}
              />
            `
              : html`
                <div
                  style=${{
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "2px solid rgba(255,255,255,0.14)"
                  }}
                >
                  ${initials}
                </div>
              `}
            <div>
              <div style=${{ fontWeight: 900, fontSize: "17px", fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.02em" }}>${displayName}</div>
              ${me?.email ? html`<div className="muted2" style=${{ fontSize: "12px", marginTop: "2px" }}>${me.email}</div>` : null}
            </div>
          </div>
          <div className="hr"></div>

          <div className="stack">
            <div className="infoItem">
              <span className="iKey">Discord ID</span>
              <span className="iVal mono">${me?.discordUserId || "—"}</span>
            </div>
            <div className="infoItem">
              <span className="iKey">Login</span>
              <span className="iVal">${me?.authProvider === "local" ? "Email / senha" : "Discord OAuth"}</span>
            </div>
            <div className="infoItem">
              <span className="iKey">Plano</span>
              <span className="iVal">
                ${planText}
                <span className=${`badge ${me?.planActive ? "active" : "none"}`} style=${{ marginLeft: "7px" }}>
                  ${me?.planActive ? "Ativo" : "Inativo"}
                </span>
              </span>
            </div>
            <div className="infoItem">
              <span className="iKey">Email</span>
              <span className="iVal">${me?.email || "—"}</span>
            </div>

            <div className="hr"></div>

            <div className="label">Nome de exibição</div>
            <input className="input" value=${profileName} onInput=${(e) => setProfileName(e.target.value)} placeholder="Seu nome" />
            <div className="label">Foto do perfil (URL)</div>
            <input
              className="input mono"
              value=${profileAvatarDraft}
              onInput=${(e) => setProfileAvatarDraft(e.target.value)}
              placeholder="https://exemplo.com/avatar.png"
            />
            <div className="row" style=${{ gap: "8px", flexWrap: "wrap" }}>
              <${Button} variant="subtle" disabled=${busy} onClick=${onUpdateProfile}>
                <${Save} size=${16} style=${{ marginRight: "6px" }} />
                Salvar perfil
              </${Button}>
              <${Button} variant="ghost" disabled=${busy} onClick=${() => setTab("wallet")}>
                <${Wallet} size=${16} style=${{ marginRight: "6px" }} />
                Ir para carteira
              </${Button}>
            </div>
            <div className="help">
              Dados financeiros (saldo, vendas, transações e saques) ficam na aba Carteira.
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="cardHead">
            <h3>Segurança e Email</h3>
          </div>
          ${me?.authProvider === "local"
            ? html`
                <div className="stack">
                  <div className="muted" style=${{ marginBottom: "4px" }}>Atualizar email de acesso</div>
                  <input
                    className="input"
                    type="email"
                    value=${emailDraft}
                    onInput=${(e) => setEmailDraft(e.target.value)}
                    placeholder="novo-email@exemplo.com"
                  />
                  <input
                    className="input"
                    type="password"
                    value=${emailPassword}
                    onInput=${(e) => setEmailPassword(e.target.value)}
                    placeholder="Senha atual (obrigatória)"
                  />
                  <div>
                    <${Button} variant="subtle" disabled=${busy} onClick=${onUpdateEmail}>
                      <${Mail} size=${16} style=${{ marginRight: "6px" }} />
                      Atualizar email
                    </${Button}>
                  </div>

                  <div className="hr"></div>

                  <div className="muted" style=${{ marginBottom: "4px" }}>Alterar senha</div>
                  <input
                    className="input"
                    type="password"
                    value=${pwCurrent}
                    onInput=${(e) => setPwCurrent(e.target.value)}
                    placeholder="Senha atual"
                  />
                  <input
                    className="input"
                    type="password"
                    value=${pwNew}
                    onInput=${(e) => setPwNew(e.target.value)}
                    placeholder="Nova senha (mínimo 6 caracteres)"
                  />
                  <input
                    className="input"
                    type="password"
                    value=${pwNew2}
                    onInput=${(e) => setPwNew2(e.target.value)}
                    placeholder="Confirmar nova senha"
                  />
                  <div>
                    <${Button} variant="subtle" disabled=${busy} onClick=${onChangePassword}>
                      <${Lock} size=${16} style=${{ marginRight: "6px" }} />
                      Salvar nova senha
                    </${Button}>
                  </div>
                  <div className="help">
                    Nunca compartilhe sua senha ou o token do bot. Em caso de acesso suspeito, troque as credenciais imediatamente.
                  </div>
                </div>
              `
            : html`
                <div className="stack">
                  <div className="infoItem">
                    <span className="iKey">Email</span>
                    <span className="iVal">${me?.email || "—"}</span>
                  </div>
                  <div className="muted">
                    Conta conectada via Discord OAuth. Troca de email e avatar oficial devem ser feitas no Discord.
                  </div>
                  <div>
                    <${Button}
                      variant="ghost"
                      onClick=${() => window.open("https://discord.com/settings/account", "_blank", "noopener,noreferrer")}
                    >
                      <${ExternalLink} size=${16} style=${{ marginRight: "6px" }} />
                      Gerenciar no Discord
                    </${Button}>
                  </div>
                  <div className="help">
                    Para reforçar a segurança, ative 2FA na sua conta Discord.
                  </div>
                </div>
              `}
        </div>
      </div>
      ` : null}

    </div>
  `;
}

function Tutorials({ route }) {
  const steps = [
    {
      icon: html`<${UserPlus} size=${22} />`,
      title: "Criar conta e entrar",
      desc: "Acesse a plataforma com Discord (recomendado) ou crie uma conta com email e senha.",
      details: [
        "Login com Discord permite ver a lista de seus servidores automaticamente",
        "Para login por email, use uma senha forte com pelo menos 6 caracteres",
        "Você pode conectar o Discord depois em Configurações"
      ]
    },
    {
      icon: html`<${CreditCard} size=${22} />`,
      title: "Escolher um plano",
      desc: "Ative o Trial gratuito para testar ou escolha um plano pago com mais recursos.",
      details: [
        "Trial: 24 horas grátis com acesso completo",
        "Start: A partir de R$ 5,97/mês com todas as funcionalidades",
        "A cada R$ 20 em vendas, você ganha +1 dia no plano automaticamente"
      ]
    },
    {
      icon: html`<${Bot} size=${22} />`,
      title: "Criar sua instância",
      desc: "Configure seu bot Discord com um token próprio para começar a vender.",
      details: [
        "Acesse discord.com/developers e crie uma Application",
        "Gere um Bot Token na seção Bot do Developer Portal",
        "Cole o token na criação da instância - ele é validado na hora"
      ]
    },
    {
      icon: html`<${Link2} size=${22} />`,
      title: "Convidar o bot",
      desc: "Adicione o bot ao seu servidor Discord com as permissões corretas.",
      details: [
        "Use o botão 'Gerar invite' na Dashboard ou na lista de instâncias",
        "Conceda permissões de Gerenciar Canais e Gerenciar Mensagens",
        "O bot precisa de acesso aos canais onde vai operar"
      ]
    },
    {
      icon: html`<${Store} size=${22} />`,
      title: "Cadastrar produtos",
      desc: "Crie seus produtos com variações, preços e estoque na aba Loja.",
      details: [
        "Defina nome, descrição e imagem do produto",
        "Adicione variações (ex: 30 dias, 60 dias, Lifetime)",
        "Gerencie estoque de keys/licenças por bucket"
      ]
    },
    {
      icon: html`<${Send} size=${22} />`,
      title: "Publicar no Discord",
      desc: "Envie o embed do produto para um canal e comece a receber pedidos.",
      details: [
        "Selecione o canal de destino no seu servidor",
        "O embed inclui botão de compra integrado",
        "Clientes pagam via PIX e recebem a key automaticamente"
      ]
    },
    {
      icon: html`<${Wallet} size=${22} />`,
      title: "Acompanhar vendas",
      desc: "Monitore seu saldo, transações e solicite saques via PIX.",
      details: [
        "Vendas aparecem em tempo real na Dashboard",
        "Taxa de apenas 6% por venda - a menor do mercado",
        "Saque mínimo de R$ 10,00 direto na sua chave PIX"
      ]
    },
    {
      icon: html`<${Shield} size=${22} />`,
      title: "Boas práticas",
      desc: "Mantenha sua conta e servidor seguros com estas recomendações.",
      details: [
        "Nunca compartilhe seu token do bot ou senha da conta",
        "Ative 2FA na sua conta Discord e email",
        "Configure um canal de logs para auditoria"
      ]
    }
  ];

  return html`
    <div className="container">
      <div className="hero" style=${{ paddingTop: "20px", paddingBottom: "10px" }}>
        <div className="pill" style=${{ margin: "0 auto 12px", width: "fit-content" }}>
          <${BookOpen} size=${14} style=${{ marginRight: "6px" }} />
          Central de Ajuda
        </div>
        <h1 style=${{ fontSize: "clamp(28px, 5vw, 42px)" }}>
          Tutoriais e <span className="accent">Guias</span>
        </h1>
        <p className="muted" style=${{ maxWidth: "600px", margin: "8px auto 0" }}>
          Aprenda a configurar e usar a AstraSystems em poucos minutos.
          Siga o passo a passo abaixo para começar a vender.
        </p>
      </div>

      <div className="tutorialSteps">
        ${steps.map((step, idx) => html`
          <div className="tutorialStep" key=${idx}>
            <div className="tutorialStepHeader">
              <div className="tutorialStepNumber">${idx + 1}</div>
              <div className="tutorialStepIcon">${step.icon}</div>
              <div className="tutorialStepInfo">
                <div className="tutorialStepTitle">${step.title}</div>
                <div className="tutorialStepDesc">${step.desc}</div>
              </div>
            </div>
            <div className="tutorialStepDetails">
              ${step.details.map((detail, i) => html`
                <div className="tutorialDetail" key=${i}>
                  <${Check} size=${14} style=${{ color: "var(--good)", flexShrink: 0 }} />
                  <span>${detail}</span>
                </div>
              `)}
            </div>
          </div>
        `)}
      </div>

      <div className="tutorialCTA">
        <div className="card pad" style=${{ textAlign: "center", background: "linear-gradient(135deg, rgba(230,33,42,0.08), rgba(255,77,87,0.04))", border: "1px solid rgba(230,33,42,0.2)" }}>
          <div style=${{ fontWeight: 900, fontSize: "18px", marginBottom: "8px" }}>Pronto para começar?</div>
          <div className="muted" style=${{ marginBottom: "16px" }}>Configure seu bot em menos de 5 minutos.</div>
          <div style=${{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <${Button} variant="primary" icon=${Rocket} onClick=${() => route.navigate("/dashboard")}>Acessar Dashboard</${Button}>
            <${Button} variant="ghost" icon=${HelpCircle} onClick=${() => window.open("https://discord.gg/5H7xhCptbX", "_blank")}>Suporte no Discord</${Button}>
          </div>
        </div>
      </div>
    </div>
  `;
}

function Terms() {
  const sections = [
    {
      icon: html`<${Package} size=${18} />`,
      title: "Serviços oferecidos",
      content: "A AstraSystems fornece uma plataforma SaaS para automação de vendas no Discord, incluindo: bot de vendas com integração PIX, dashboard de gerenciamento, sistema de estoque, carteira digital e ferramentas de configuração. Cada instância opera com o token de bot fornecido pelo cliente."
    },
    {
      icon: html`<${Shield} size=${18} />`,
      title: "Conta e segurança",
      content: "Você é responsável por manter suas credenciais seguras. Nunca compartilhe seu token de bot, senha ou dados de acesso. Em caso de suspeita de acesso não autorizado, altere imediatamente suas credenciais e contate o suporte. A AstraSystems não se responsabiliza por acessos indevidos causados por negligência do usuário."
    },
    {
      icon: html`<${CreditCard} size=${18} />`,
      title: "Pagamentos e planos",
      content: "Os pagamentos são processados via Mercado Pago (PIX). A confirmação ocorre em tempo real após aprovação do pagamento. O acesso aos recursos depende do status do plano ativo. Cada R$ 20 em vendas processadas adiciona automaticamente +1 dia ao plano. A taxa por venda é de 6% sobre o valor líquido."
    },
    {
      icon: html`<${Wallet} size=${18} />`,
      title: "Carteira e saques",
      content: "O saldo da carteira é atualizado em tempo real após cada venda confirmada. Saques podem ser solicitados a partir de R$ 10,00 via chave PIX. O processamento ocorre em até 24 horas úteis. A AstraSystems pode solicitar verificações adicionais para prevenir fraudes."
    },
    {
      icon: html`<${Receipt} size=${18} />`,
      title: "Reembolsos",
      content: "Solicitações de reembolso devem ser feitas em até 7 dias após a compra, mediante comprovação de falha técnica não resolvida pelo suporte. Reembolsos são analisados caso a caso. O Trial gratuito não gera direito a reembolso. Vendas realizadas através do bot não são passíveis de reembolso pela AstraSystems."
    },
    {
      icon: html`<${AlertTriangle} size=${18} />`,
      title: "Uso aceitável",
      content: "É proibido usar a plataforma para: fraude, spam, venda de produtos ilegais, violação de direitos autorais, discriminação, ou qualquer atividade que viole leis brasileiras ou os Termos de Serviço do Discord. Violações resultam em suspensão imediata sem direito a reembolso."
    },
    {
      icon: html`<${Server} size=${18} />`,
      title: "Disponibilidade",
      content: "A AstraSystems busca manter disponibilidade 24/7, mas pode haver interrupções para manutenção, atualizações ou problemas técnicos. Não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível."
    },
    {
      icon: html`<${FileText} size=${18} />`,
      title: "Alterações nos termos",
      content: "Estes termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas por email ou pela plataforma. O uso continuado após alterações implica aceitação dos novos termos."
    },
    {
      icon: html`<${Info} size=${18} />`,
      title: "Isenção de responsabilidade",
      content: "A AstraSystems não é afiliada, endossada ou patrocinada pelo Discord Inc. Discord é marca registrada de Discord Inc. Não nos responsabilizamos por ações do Discord que afetem o funcionamento dos bots, incluindo suspensões de conta ou alterações na API."
    }
  ];

  return html`
    <div className="container">
      <div className="hero" style=${{ paddingTop: "20px", paddingBottom: "10px" }}>
        <div className="pill" style=${{ margin: "0 auto 12px", width: "fit-content" }}>
          <${FileText} size=${14} style=${{ marginRight: "6px" }} />
          Documento Legal
        </div>
        <h1 style=${{ fontSize: "clamp(28px, 5vw, 42px)" }}>
          Termos de <span className="accent">Serviço</span>
        </h1>
        <p className="muted" style=${{ maxWidth: "600px", margin: "8px auto 0" }}>
          Última atualização: 27 de fevereiro de 2026
        </p>
      </div>

      <div className="legalIntro">
        <div className="card pad" style=${{ borderLeft: "3px solid var(--accent)" }}>
          <p className="muted" style=${{ margin: 0, lineHeight: 1.7 }}>
            Ao criar uma conta ou utilizar os serviços da AstraSystems, você concorda integralmente com estes Termos de Serviço.
            Se você não concordar com algum termo, não utilize a plataforma.
          </p>
        </div>
      </div>

      <div className="legalSections">
        ${sections.map((section, idx) => html`
          <div className="legalSection" key=${idx}>
            <div className="legalSectionHeader">
              <div className="legalSectionIcon">${section.icon}</div>
              <h3 className="legalSectionTitle">${idx + 1}. ${section.title}</h3>
            </div>
            <p className="legalSectionContent">${section.content}</p>
          </div>
        `)}
      </div>

      <div className="legalFooter">
        <div className="card pad" style=${{ textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
          <div className="muted" style=${{ marginBottom: "12px" }}>
            Dúvidas sobre os termos? Entre em contato pelo nosso Discord.
          </div>
          <${Button} variant="ghost" icon=${HelpCircle} onClick=${() => window.open("https://discord.gg/5H7xhCptbX", "_blank")}>
            Falar com Suporte
          </${Button}>
        </div>
      </div>
    </div>
  `;
}

function Privacy() {
  const dataTypes = [
    { label: "Email", desc: "Utilizado para login e comunicações importantes" },
    { label: "Discord ID", desc: "Identificador único da sua conta Discord" },
    { label: "Nome de usuário", desc: "Para personalização e identificação" },
    { label: "Avatar", desc: "Exibição no perfil da plataforma" },
    { label: "Servidores", desc: "Lista de servidores que você administra (com sua autorização)" },
    { label: "Transações", desc: "Histórico de vendas e movimentações financeiras" },
    { label: "Chave PIX", desc: "Para processamento de saques solicitados" }
  ];

  const sections = [
    {
      icon: html`<${Eye} size=${18} />`,
      title: "Dados coletados",
      content: "Coletamos apenas dados essenciais para operação da plataforma: informações de conta (email, Discord ID), dados de uso (plano, instâncias, configurações), dados financeiros (transações, saldo, chave PIX para saques) e logs técnicos (IP, navegador) para segurança."
    },
    {
      icon: html`<${Settings} size=${18} />`,
      title: "Como usamos seus dados",
      content: "Seus dados são utilizados para: autenticação e acesso à plataforma, processamento de pagamentos e saques, operação das instâncias de bot, prevenção de fraudes, comunicações sobre sua conta, melhorias no serviço e cumprimento de obrigações legais."
    },
    {
      icon: html`<${ExternalLink} size=${18} />`,
      title: "Compartilhamento",
      content: "Compartilhamos dados apenas com: Mercado Pago (processamento de pagamentos), Discord (autenticação OAuth e operação de bots), e autoridades quando exigido por lei. Nunca vendemos seus dados pessoais para terceiros."
    },
    {
      icon: html`<${Lock} size=${18} />`,
      title: "Segurança",
      content: "Implementamos medidas de segurança incluindo: criptografia em trânsito (HTTPS), hash de senhas (bcrypt), tokens de acesso com expiração, monitoramento de atividades suspeitas e backups regulares. Apesar dos esforços, nenhum sistema é 100% seguro."
    },
    {
      icon: html`<${Clock} size=${18} />`,
      title: "Retenção de dados",
      content: "Mantemos seus dados enquanto sua conta estiver ativa. Dados de transações são mantidos por 5 anos para fins legais/fiscais. Após exclusão da conta, dados pessoais são removidos em até 30 dias, exceto quando a retenção for obrigatória por lei."
    },
    {
      icon: html`<${User} size=${18} />`,
      title: "Seus direitos",
      content: "Você tem direito a: acessar seus dados pessoais, corrigir informações incorretas, solicitar exclusão da conta, exportar seus dados e revogar consentimentos. Para exercer esses direitos, entre em contato pelo suporte."
    },
    {
      icon: html`<${Bell} size=${18} />`,
      title: "Cookies e rastreamento",
      content: "Utilizamos cookies essenciais para autenticação e preferências. Não utilizamos cookies de rastreamento publicitário. Você pode gerenciar cookies nas configurações do navegador, mas isso pode afetar a funcionalidade da plataforma."
    }
  ];

  return html`
    <div className="container">
      <div className="hero" style=${{ paddingTop: "20px", paddingBottom: "10px" }}>
        <div className="pill" style=${{ margin: "0 auto 12px", width: "fit-content" }}>
          <${ShieldCheck} size=${14} style=${{ marginRight: "6px" }} />
          Documento Legal
        </div>
        <h1 style=${{ fontSize: "clamp(28px, 5vw, 42px)" }}>
          Política de <span className="accent">Privacidade</span>
        </h1>
        <p className="muted" style=${{ maxWidth: "600px", margin: "8px auto 0" }}>
          Última atualização: 27 de fevereiro de 2026
        </p>
      </div>

      <div className="legalIntro">
        <div className="card pad" style=${{ borderLeft: "3px solid var(--good)" }}>
          <p className="muted" style=${{ margin: 0, lineHeight: 1.7 }}>
            A AstraSystems respeita sua privacidade. Esta política explica como coletamos, usamos e protegemos seus dados pessoais
            em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>
      </div>

      <div className="privacyDataTypes">
        <div className="card pad">
          <h3 style=${{ margin: "0 0 16px", fontFamily: '"Space Grotesk", sans-serif', fontSize: "16px" }}>
            <${Eye} size=${16} style=${{ marginRight: "8px", verticalAlign: "middle" }} />
            Dados que podemos coletar
          </h3>
          <div className="dataTypeGrid">
            ${dataTypes.map((dt, i) => html`
              <div className="dataTypeItem" key=${i}>
                <div className="dataTypeLabel">${dt.label}</div>
                <div className="dataTypeDesc">${dt.desc}</div>
              </div>
            `)}
          </div>
        </div>
      </div>

      <div className="legalSections">
        ${sections.map((section, idx) => html`
          <div className="legalSection" key=${idx}>
            <div className="legalSectionHeader">
              <div className="legalSectionIcon">${section.icon}</div>
              <h3 className="legalSectionTitle">${idx + 1}. ${section.title}</h3>
            </div>
            <p className="legalSectionContent">${section.content}</p>
          </div>
        `)}
      </div>

      <div className="legalFooter">
        <div className="card pad" style=${{ textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
          <div className="muted" style=${{ marginBottom: "12px" }}>
            Para questões sobre privacidade ou exercer seus direitos, entre em contato.
          </div>
          <${Button} variant="ghost" icon=${Mail} onClick=${() => window.open("https://discord.gg/5H7xhCptbX", "_blank")}>
            Contatar sobre Privacidade
          </${Button}>
        </div>
      </div>
    </div>
  `;
}

function Toast({ toast }) {
  const dotColor = toast?.type === "good" ? "var(--good)" : toast?.type === "bad" ? "var(--bad)" : "var(--muted2)";
  return html`
    <div className=${`toast ${toast?.type || ""} ${toast?.show ? "show" : ""}`}>
      <div className="t" style=${{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style=${{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }}></span>
        ${toast?.title || ""}
      </div>
      <div className="d">${toast?.desc || ""}</div>
    </div>
  `;
}

function App() {
  const route = useRoute();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastState, setToastState] = useState({ show: false, title: "", desc: "", type: "" });
  const toastTimer = useRef(null);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), [route.path]);
  const loginError = asString(urlParams.get("error"));

  const showToast = (title, desc, type) => {
    clearTimeout(toastTimer.current);
    setToastState({ show: true, title, desc, type: type || "" });
    toastTimer.current = setTimeout(() => setToastState((t) => ({ ...t, show: false })), 3600);
  };

  const refreshMe = async () => {
    try {
      const data = await apiFetch("/api/me");
      setMe(data.user || null);
      return data.user || null;
    } catch (err) {
      setMe(null);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await refreshMe();
      if (!mounted) return;
      setLoading(false);

      const mp = new URLSearchParams(window.location.search).get("mp");
      if (mp === "success") {
        showToast("Pagamento aprovado", "Validando pagamento e liberando o plano. Isso pode levar alguns segundos.", "good");
        setTimeout(() => {
          refreshMe().catch(() => null);
        }, 2000);
        setTimeout(() => {
          refreshMe().catch(() => null);
        }, 7000);
      }
      if (mp === "failure") showToast("Pagamento falhou", "Tente novamente ou use outro metodo.", "bad");
      if (mp === "pending") showToast("Pagamento pendente", "Aguardando confirmacao do Mercado Pago.", "good");

      if (route.path === "/dashboard" && !user) {
        route.navigate("/login");
      }
    })();
    return () => {
      mounted = false;
      clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.path]);

  const onLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST", body: "{}" });
    } catch {}
    setMe(null);
    showToast("Saiu da conta", "Sessao encerrada.", "good");
    route.navigate("/");
  };

  let page = null;
  if (route.path === "/login") page = html`<${Login} error=${loginError} />`;
  else if (route.path === "/plans") page = html`<${Plans} route=${route} me=${me} toast=${showToast} />`;
  else if (route.path === "/trial") page = html`<${TrialPage} route=${route} me=${me} refreshMe=${refreshMe} toast=${showToast} />`;
  else if (route.path === "/dashboard") page = html`<${Dashboard} route=${route} me=${me} refreshMe=${refreshMe} toast=${showToast} />`;
  else if (route.path === "/tutorials") page = html`<${Tutorials} />`;
  else if (route.path === "/terms") page = html`<${Terms} />`;
  else if (route.path === "/privacy") page = html`<${Privacy} />`;
  else page = html`<${Home} route=${route} />`;

  return html`
    <div className="shell">
      <${TopBar} route=${route} me=${me} onLogout=${onLogout} />
      ${loading
        ? html`<div className="container" style=${{ paddingTop: "60px", textAlign: "center" }}>
            <div className="muted2" style=${{ fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>Carregando...</div>
          </div>`
        : page}
      <${Toast} toast=${toastState} />
    </div>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
