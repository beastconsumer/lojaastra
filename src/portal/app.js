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
  ShoppingBag
} from "https://esm.sh/lucide-react@0.468.0?deps=react@18.2.0";

const html = htm.bind(React.createElement);

function asString(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function formatBRLFromCents(cents) {
  const value = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
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
  return html`<button className=${`btn ${variant}`} disabled=${disabled} onClick=${onClick}>
    ${Icon ? html`<${Icon} className="btnIcon" size=${16} strokeWidth=${1.9} aria-hidden="true" />` : null}
    <span>${children}</span>
  </button>`;
}

function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return html`
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      onClick=${(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal">
        <div className="modalHeader">
          <h3 className="modalTitle">${title || "Modal"}</h3>
          <button className="modalClose" onClick=${onClose} aria-label="Fechar">×</button>
        </div>
        <div className="hr"></div>
        ${children}
      </div>
    </div>
  `;
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
              <${Button} variant="subtle" onClick=${() => route.navigate("/dashboard")}>Dashboard</${Button}>
              ${me.discordAvatarUrl
                ? html`<img
                    src=${me.discordAvatarUrl}
                    alt=${me.discordUsername || "avatar"}
                    className="topbarAvatar"
                    onClick=${() => route.navigate("/dashboard")}
                    title=${me.discordUsername || "Dashboard"}
                  />`
                : null}
              <${Button} variant="ghost" onClick=${onLogout}>Sair</${Button}>
            `
          : html`<${Button} variant="primary" onClick=${() => route.navigate("/login")}>Entrar</${Button}>`}
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
      icon: "⚡",
      iconBg: "rgba(230,33,42,0.18)",
      title: "Taxa imbatível: apenas 6%",
      desc: html`A menor taxa do mercado. Concorrentes cobram até <b style=${{ color: "var(--accent2)" }}>19%</b>. Você fica com mais do que vendeu.`
    },
    {
      icon: "💸",
      iconBg: "rgba(16,185,129,0.15)",
      title: "PIX cai na hora",
      desc: "Aprovação do pagamento confirmada em segundos. Zero espera, zero burocracia."
    },
    {
      icon: "🤖",
      iconBg: "rgba(99,102,241,0.18)",
      title: "Bot 100% seu",
      desc: "Use o token do seu próprio bot Discord. Nome, avatar e identidade são seus."
    },
    {
      icon: "🏪",
      iconBg: "rgba(245,158,11,0.15)",
      title: "Loja embutida no Discord",
      desc: "Produtos com variações, estoque, embed rico e botão de compra — tudo dentro do servidor."
    },
    {
      icon: "🔒",
      iconBg: "rgba(239,68,68,0.15)",
      title: "Proteção anti-fraude",
      desc: "Entrega automática só após confirmação do pagamento. Stock zerado nunca entrega."
    },
    {
      icon: "🎁",
      iconBg: "rgba(168,85,247,0.18)",
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
          <${Button} variant="primary" onClick=${() => route.navigate("/dashboard")}>Começar agora</${Button}>
          <${Button} variant="ghost" onClick=${() => route.navigate("/plans")}>Ver Planos</${Button}>
        </div>
      </div>

      <div className="homeGrid">
        <div className="homeFeaturesCol">
          <div className="homeSectionLabel">Por que usar a AstraSystems?</div>
          <div className="featureList">
            ${features.map((f) => html`
              <div className="featureItem">
                <div className="featureIcon" style=${{ background: f.iconBg }}>${f.icon}</div>
                <div className="featureText">
                  <div className="featureTitle">${f.title}</div>
                  <div className="featureDesc">${f.desc}</div>
                </div>
              </div>
            `)}
          </div>

          <div className="bonusBox">
            <span style=${{ fontSize: "18px" }}>✨</span>
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
      const msg = err?.message || "Falha ao entrar. Tente novamente.";
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
              Continuar com Discord
            </${Button}>
            ${status?.oauthEnabled
              ? null
              : html`<div className="muted2" style=${{ fontSize: "12px" }}>Login com Discord ainda nao esta configurado.</div>`}
            <div className="divider">ou</div>

            <div className="row grow" style=${{ marginTop: "4px" }}>
              <${Button} variant=${mode === "login" ? "primary" : "ghost"} disabled=${busy} onClick=${() => setMode("login")}>
                Entrar com Email
              </${Button}>
              <${Button}
                variant=${mode === "register" ? "primary" : "ghost"}
                disabled=${busy}
                onClick=${() => setMode("register")}
              >
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
  const mpEnabled = !!status?.mercadoPagoEnabled;

  const onTrial = async () => {
    if (!me) return route.navigate("/login");
    setBusy(true);
    try {
      await apiFetch("/api/plans/trial", { method: "POST", body: "{}" });
      toast("Plano Trial ativado", "Voce ganhou 24 horas para testar.", "good");
      route.navigate("/dashboard");
    } catch (err) {
      toast("Falha ao ativar trial", err.message || "Erro interno", "bad");
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
      if (msg === "mercadopago_not_configured") {
        toast("Pagamento indisponivel", "Pagamentos nao estao configurados no servidor.", "bad");
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
                <${Button} variant="ghost" onClick=${() => route.navigate("/dashboard")}>Ir para Dashboard</${Button}>
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
                <${Button} variant="ghost" onClick=${() => route.navigate("/dashboard")}>Abrir Dashboard</${Button}>
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
            <${Button} variant="ghost" disabled=${busy || (me && planActive)} onClick=${onTrial}>
              ${me && planActive ? "Plano ativo" : "Testar Gratis"}
            </${Button}>
            ${me && planActive
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
            <${Button} variant="primary" disabled=${busy || !mpEnabled} onClick=${onStart}>Comecar Agora</${Button}>
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
            <${Button} variant="ghost" disabled=${true}>Em Breve</${Button}>
          </div>
        </div>
      </div>
    </div>
  `;
}

function TrialPage({ route, me, refreshMe, toast }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | done

  const alreadyHasPlan = me?.planActive;
  const alreadyUsedTrial = me?.trialClaimedAt;

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
            <div className="trialIconBox">🎁</div>
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
                <span className="trialCheck">✓</span>
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
              ${alreadyHasPlan ? html`
                <div className="trialStatusIcon trialStatusIconWarn">⚡</div>
                <div className="trialStatusTitle">Plano já ativo</div>
                <div className="trialStatusDesc">Você já possui um plano ativo. Gerencie seu plano ou acesse a dashboard.</div>
              ` : alreadyUsedTrial ? html`
                <div className="trialStatusIcon trialStatusIconWarn">⚠️</div>
                <div className="trialStatusTitle">Trial já utilizado</div>
                <div className="trialStatusDesc">Você já usou o trial gratuito. Escolha um plano para continuar.</div>
              ` : html`
                <div className="trialStatusIcon trialStatusIconGood">✓</div>
                <div className="trialStatusTitle">Você está elegível!</div>
                <div className="trialStatusDesc">Sua conta está apta para receber o trial gratuito. Clique no botão abaixo para ativar.</div>
              `}

              ${!alreadyHasPlan && !alreadyUsedTrial ? html`
                <div className="trialChecks">
                  <div className="trialCheckLine">
                    <span style=${{ color: "var(--good)" }}>✓</span>
                    Primeira vez usando o trial
                  </div>
                  <div className="trialCheckLine">
                    <span style=${{ color: "var(--good)" }}>✓</span>
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
                <span className="spin" style=${{ fontSize: "22px" }}>⟳</span>
              </div>
              <div className="trialStatusTitle">Preparando seu bot...</div>
              <div className="trialStatusDesc">Estamos configurando sua conta trial. Isso pode levar alguns instantes.</div>
              <div className="trialLoadingBox">
                <span style=${{ opacity: 0.6, fontSize: "13px" }}>⏳</span>
                <div>
                  <div style=${{ fontWeight: 800, fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>Aguarde...</div>
                  <div style=${{ fontSize: "12px", color: "var(--muted2)", marginTop: "2px" }}>O trial será ativado automaticamente</div>
                </div>
              </div>
            </div>
          ` : html`
            <div className="trialStatusBody">
              <div className="trialStatusIcon trialStatusIconGood">✓</div>
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
          </div>
        </div>

      </div>
    </div>
  `;
}

function Dashboard({ route, me, refreshMe, toast }) {
  const [instances, setInstances] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [txs, setTxs] = useState([]);
  const [botStatus, setBotStatus] = useState({ ok: false, botReady: false, oauthEnabled: false, mercadoPagoEnabled: false });
  const [tab, setTab] = useState(() => {
    try {
      return window.localStorage.getItem("as_dash_tab") || "overview";
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
  const [tokenDraftByInstance, setTokenDraftByInstance] = useState({});
  const [savingTokenFor, setSavingTokenFor] = useState("");
  const [clearingTokenFor, setClearingTokenFor] = useState("");
  const [editChannels, setEditChannels] = useState({ loading: false, error: "", channels: [] });
  const [edit, setEdit] = useState({
    open: false,
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
  const [profileName, setProfileName] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");

  const [storeInstanceId, setStoreInstanceId] = useState("");
  const [storeProducts, setStoreProducts] = useState({ loading: false, products: [], stockCounts: {}, bucketCounts: {} });
  const [productEditor, setProductEditor] = useState({ open: false, mode: "create", instanceId: "", saving: false, draft: null });
  const [stockEditor, setStockEditor] = useState({
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
  const [postEditor, setPostEditor] = useState({
    open: false,
    instanceId: "",
    productId: "",
    productName: "",
    channelId: "",
    purge: true,
    loading: false,
    channels: []
  });

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
    loadStoreProducts(storeInstanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInstanceId]);

  useEffect(() => {
    setProfileName(asString(me?.discordUsername || ""));
  }, [me?.discordUsername]);

  useEffect(() => {
    setPixKey(asString(me?.payout?.pixKey || ""));
    setPixKeyType(asString(me?.payout?.pixKeyType || ""));
  }, [me?.discordUserId]);

  useEffect(() => {
    try {
      window.localStorage.setItem("as_dash_tab", tab);
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
    const ok = window.confirm("Cancelar este saque? O valor volta para seu saldo.");
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch(`/api/wallet/withdrawals/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}" });
      toast("Saque cancelado", "O valor foi devolvido para seu saldo.", "good");
      await refreshMe();
      await load();
    } catch (err) {
      toast("Falha ao cancelar", err.message || "Erro interno", "bad");
    } finally {
      setBusy(false);
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
      toast("Instancia criada", botName ? `Token validado para @${botName}.` : "Token validado com sucesso.", "good");
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
      await apiFetch(`/api/instances/${encodeURIComponent(id)}/bot-token`, {
        method: "PUT",
        body: JSON.stringify({ token })
      });
      setTokenDraftByInstance((prev) => ({ ...prev, [id]: "" }));
      await load();
      toast("Token atualizado", "Bot da instancia validado com sucesso.", "good");
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
    const ok = window.confirm("Remover token do bot desta instancia?");
    if (!ok) return;

    setClearingTokenFor(id);
    setBusy(true);
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(id)}/bot-token`, { method: "DELETE" });
      await load();
      toast("Token removido", "A instancia ficou sem token configurado.", "good");
    } catch (err) {
      toast("Falha ao remover token", err.message || "Erro interno", "bad");
    } finally {
      setClearingTokenFor("");
      setBusy(false);
    }
  };

  const openEditInstance = (inst) => {
    const branding = inst?.branding || {};
    const channels = inst?.channels || {};
    setEditChannels({ loading: false, error: "", channels: [] });
    setEdit({
      open: true,
      id: asString(inst?.id),
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
    setEdit((s) => ({ ...s, open: false }));
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
      closeEditInstance();
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
      } else {
        toast("Falha ao carregar canais", msg, "bad");
      }
    }
  };

  const onDeleteInstance = async (instId) => {
    const ok = window.confirm("Excluir esta instancia? Isso remove o vinculo e o token configurado.");
    if (!ok) return;

    setBusy(true);
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(instId)}`, { method: "DELETE" });
      if (asString(edit.id) === asString(instId)) closeEditInstance();
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
    if (!name) return toast("Nome obrigatorio", "Digite um nome para exibir.", "bad");

    setBusy(true);
    try {
      await apiFetch("/api/me/profile", { method: "PUT", body: JSON.stringify({ name }) });
      await refreshMe();
      toast("Perfil atualizado", "Seu nome foi atualizado.", "good");
    } catch (err) {
      toast("Falha ao atualizar perfil", err.message || "Erro interno", "bad");
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

  const firstInstance = useMemo(() => {
    return (instances || [])[0] || null;
  }, [instances]);

  const openCreateProduct = () => {
    if (!storeInstanceId) return toast("Instancia", "Selecione uma instancia para criar produtos.", "bad");
    setProductEditor({
      open: true,
      mode: "create",
      instanceId: storeInstanceId,
      saving: false,
      draft: {
        id: "",
        name: "",
        shortLabel: "",
        description: "",
        sections: [],
        variants: [],
        bannerImage: "",
        previewImage: "",
        prePostGif: "",
        thumbnail: "",
        footerImage: "",
        demoUrl: "",
        disableThumbnail: false,
        infiniteStock: false
      }
    });
  };

  const openEditProduct = (product) => {
    if (!storeInstanceId) return;
    const clone = JSON.parse(JSON.stringify(product || {}));
    if (!Array.isArray(clone.sections)) clone.sections = [];
    if (!Array.isArray(clone.variants)) clone.variants = [];
    setProductEditor({ open: true, mode: "edit", instanceId: storeInstanceId, saving: false, draft: clone });
  };

  const closeProductEditor = () => setProductEditor({ open: false, mode: "create", instanceId: "", saving: false, draft: null });

  const saveProductEditor = async () => {
    const instId = asString(productEditor.instanceId).trim();
    const draft = productEditor.draft || null;
    if (!instId || !draft) return;

    const id = asString(draft.id).trim();
    const name = asString(draft.name).trim();
    if (productEditor.mode === "create" && !id) return toast("ID obrigatorio", "Defina um id para o produto.", "bad");
    if (!name) return toast("Nome obrigatorio", "Defina um nome para o produto.", "bad");

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
    const ok = window.confirm(`Excluir o produto ${pid}? Isso tambem apaga o estoque dele.`);
    if (!ok) return;

    setStoreProducts((s) => ({ ...s, loading: true }));
    try {
      await apiFetch(`/api/instances/${encodeURIComponent(instId)}/products/${encodeURIComponent(pid)}`, { method: "DELETE" });
      await loadStoreProducts(instId);
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

  const closeStock = () =>
    setStockEditor({
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

  const saveStock = async (nextStock) => {
    const instId = asString(stockEditor.instanceId).trim();
    const pid = asString(stockEditor.productId).trim();
    if (!instId || !pid) return;

    setStockEditor((s) => ({ ...s, saving: true }));
    try {
      const data = await apiFetch(`/api/instances/${encodeURIComponent(instId)}/stock/${encodeURIComponent(pid)}`, {
        method: "PUT",
        body: JSON.stringify({ stock: nextStock })
      });
      setStockEditor((s) => ({ ...s, stock: data.stock || nextStock }));
      await loadStoreProducts(instId);
      toast("Estoque salvo", "Atualizado com sucesso.", "good");
    } catch (err) {
      toast("Falha ao salvar estoque", err.message || "Erro interno", "bad");
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
    const next = { ...stock, [bucket]: [...current, ...lines] };

    setStockEditor((s) => ({ ...s, keysText: "" }));
    await saveStock(next);
  };

  const clearStockBucket = async () => {
    const bucket = asString(stockEditor.bucket).trim() || "default";
    const ok = window.confirm(`Limpar o bucket "${bucket}"?`);
    if (!ok) return;
    const stock = stockEditor.stock && typeof stockEditor.stock === "object" ? stockEditor.stock : {};
    const next = { ...stock, [bucket]: [] };
    await saveStock(next);
  };

  const openPost = async (product) => {
    const instId = asString(storeInstanceId).trim();
    const pid = asString(product?.id).trim();
    if (!instId || !pid) return;

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
      toast("Falha ao carregar canais", err.message || "Erro interno", "bad");
      setPostEditor((s) => ({ ...s, loading: false }));
    }
  };

  const closePost = () => setPostEditor({ open: false, instanceId: "", productId: "", productName: "", channelId: "", purge: true, loading: false, channels: [] });

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
      toast("Falha ao postar", err.message || "Erro interno", "bad");
      setPostEditor((s) => ({ ...s, loading: false }));
    }
  };

  const avatarUrl = me?.discordAvatarUrl || null;
  const displayName = me?.discordUsername || me?.displayName || (me?.email ? me.email.split("@")[0] : "Usuário");
  const initials = displayName.slice(0, 1).toUpperCase();

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
            <span className="expiryBannerIcon">🔔</span>
            <div>
              <div className="expiryBannerTitle">Plano expirando em breve!</div>
              <div className="expiryBannerDesc">Seu plano expira em <b>${expiryWarning}</b>. Renove agora para não perder acesso.</div>
            </div>
          </div>
          <div style=${{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            <${Button} variant="primary" onClick=${() => route.navigate("/plans")}>Renovar Agora</${Button}>
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
          </div>
        </div>

        <div className="userStats">
          <div className="userStat">
            <div className="userStatVal">${formatBRLFromCents(me?.walletCents || 0)}</div>
            <div className="userStatLabel">Saldo</div>
          </div>
          <div className="userStatDivider"></div>
          <div className="userStat">
            <div className="userStatVal">${formatBRLFromCents(me?.salesCentsTotal || 0)}</div>
            <div className="userStatLabel">Total vendido</div>
          </div>
          <div className="userStatDivider"></div>
          <div className="userStat">
            <div className="userStatVal">${instances?.length || 0}</div>
            <div className="userStatLabel">Instâncias</div>
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
          <h3>Onboarding</h3>
          <div className=${`pill ${botStatus?.botReady ? "good" : "soon"}`}>
            <span className=${`dot ${botStatus?.botReady ? "on" : "off"}`} style=${{ marginRight: "5px" }}></span>
            ${botStatus?.botReady ? "Bot online" : "Bot offline"}
          </div>
        </div>
        <div className="muted" style=${{ marginBottom: "14px" }}>
          Fluxo: <b>Plano</b> → <b>Instância</b> → <b>Vincular servidor</b> → <b>Invite</b> → <b>Loja</b> → <b>Testar compra</b>
        </div>
        ${me?.planActive && !(instances?.length > 0)
          ? html`<div className="pill reco" style=${{ marginBottom: "14px" }}>Próximo passo: criar sua instância com o token do bot.</div>`
          : null}
        <div className="grid cols3">
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">1</span>
              <div className="label" style=${{ margin: 0 }}>Plano</div>
            </div>
            <div className="value">${me?.planActive ? "Ativo" : "Inativo"}</div>
            <div className="hint">Trial 24h ou Start R$ 5,97/m. Reembolso em até 7 dias.</div>
            <div style=${{ marginTop: "10px" }}>
              <div className="row grow" style=${{ gap: "8px" }}>
                <${Button} variant="ghost" icon=${CreditCard} disabled=${busy} onClick=${() => route.navigate("/plans")}>Gerenciar plano</${Button}>
                ${me?.planActive
                  ? null
                  : html`<${Button} variant="subtle" icon=${Rocket} disabled=${busy} onClick=${() => route.navigate("/trial")}>Ativar trial</${Button}>`}
              </div>
            </div>
          </div>
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">2</span>
              <div className="label" style=${{ margin: 0 }}>Instância</div>
            </div>
            <div className="value">${(instances?.length || 0) > 0 ? "Criada" : "Pendente"}</div>
            <div className="hint">Crie sua instância com o token do bot para começar a operar no Discord.</div>
            <div style=${{ marginTop: "10px" }}>
              <${Button}
                variant="primary"
                icon=${Plus}
                disabled=${busy}
                onClick=${() => {
                  if (!me?.planActive) return route.navigate("/plans");
                  setTab("instances");
                  setCreating(true);
                }}
              >
                Criar instância
              </${Button}>
            </div>
          </div>
          <div className="kpi">
            <div style=${{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <span className="stepBadge">3</span>
              <div className="label" style=${{ margin: 0 }}>Invite</div>
            </div>
            <div className="value">Adicionar bot</div>
            <div className="hint">Gere o link de convite e adicione o bot ao seu servidor Discord.</div>
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
      <div className="grid cols3" style=${{ marginTop: "16px" }}>
        <div className="kpi">
          <div className="label">Saldo de vendas</div>
          <div className="value">${formatBRLFromCents(me?.walletCents || 0)}</div>
          <div className="hint">Total vendido: <b>${formatBRLFromCents(me?.salesCentsTotal || 0)}</b></div>
        </div>
        <div className="kpi">
          <div className="label">Plano</div>
          <div className="value">${planText}</div>
          <div className="hint">
            ${me?.plan?.expiresAt ? html`Expira em: <b>${String(me.plan.expiresAt).slice(0, 10)}</b>` : html`Sem expiração`}
          </div>
          <div style=${{ marginTop: "12px" }}>
            <${Button} variant="ghost" icon=${CreditCard} onClick=${() => route.navigate("/plans")}>Ver planos</${Button}>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Instâncias ativas</div>
          <div className="value">${instances?.length || 0}</div>
          <div className="hint">Cada plano ativo libera 1 instância. Configure token e convide o bot.</div>
          <div style=${{ marginTop: "12px" }}>
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

      <div className="card pad" style=${{ marginTop: "14px" }}>
        <div className="cardHead">
          <h3>Solicitar saque</h3>
        </div>
        <div className="stack">
          <div className="row grow" style=${{ gap: "10px" }}>
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
      ` : null}

      ${tab === "instances" ? html`
      <div className="grid cols2" style=${{ marginTop: "18px" }}>
        <div className="card pad">
          <div className="cardHead">
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
                <div className="stack" style=${{ marginTop: "12px" }}>
                  <input className="input" placeholder="Nome da sua loja / bot" value=${newName} onInput=${(e) => setNewName(e.target.value)} />
                  <input
                    className="input mono"
                    type="password"
                    placeholder="Token do bot (Discord Developer Portal)"
                    value=${newBotToken}
                    onInput=${(e) => setNewBotToken(e.target.value)}
                  />
                  <${Button}
                    variant="primary"
                    icon=${Bot}
                    disabled=${busy || !me?.planActive || (instances?.length || 0) >= 1}
                    onClick=${onCreateInstance}
                  >
                    ${busy ? "Validando..." : "Criar instância"}
                  </${Button}>
                  <div className="help">Cada assinatura libera 1 instância. O token é validado na hora.</div>
                </div>
              `
            : null}

          ${instances?.length
            ? html`
                <div className="stack" style=${{ marginTop: "14px" }}>
                  ${instances.map(
                    (inst) => html`
                      <div className="kpi">
                        <div style=${{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <div>
                            <div style=${{ fontWeight: 900, fontSize: "16px", lineHeight: "1.2" }}>${inst.name || "Instância"}</div>
                            <div className="mono muted2" style=${{ fontSize: "11px", marginTop: "3px" }}>${inst.id}</div>
                          </div>
                          <div className=${`pill ${inst.discordGuildId ? "good" : "soon"}`}>
                            <span className=${`dot ${inst.discordGuildId ? "on" : "off"}`} style=${{ marginRight: "5px" }}></span>
                            ${inst.discordGuildId ? "Servidor vinculado" : "Sem servidor"}
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
                            <span className="iVal">${inst?.hasBotToken ? "✓ Configurado" : "Pendente"}</span>
                          </div>
                          <div className="infoItem">
                            <span className="iKey">API Key</span>
                            <span className="iVal mono">${inst.apiKeyLast4 ? `****${inst.apiKeyLast4}` : "—"}</span>
                          </div>
                        </div>

                        <div className="stack" style=${{ marginTop: "12px", gap: "8px" }}>
                          <input
                            className="input mono"
                            type="password"
                            placeholder=${inst?.hasBotToken ? "Atualizar token do bot" : "Colar token do bot"}
                            value=${asString(tokenDraftByInstance?.[asString(inst.id)] || "")}
                            onInput=${(e) =>
                              setTokenDraftByInstance((prev) => ({ ...prev, [asString(inst.id)]: asString(e.target.value) }))
                            }
                          />
                          <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <${Button}
                              variant="subtle"
                              disabled=${busy || savingTokenFor === asString(inst.id)}
                              onClick=${() => onSaveBotToken(inst.id)}
                            >
                              ${savingTokenFor === asString(inst.id) ? "Validando..." : "Salvar token"}
                            </${Button}>
                            <${Button}
                              variant="danger"
                              disabled=${busy || !inst?.hasBotToken || clearingTokenFor === asString(inst.id)}
                              onClick=${() => onClearBotToken(inst.id)}
                            >
                              ${clearingTokenFor === asString(inst.id) ? "Removendo..." : "Remover token"}
                            </${Button}>
                          </div>
                        </div>

                        <div className="hr"></div>

                        <div style=${{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <${Button} variant="ghost" disabled=${busy} onClick=${() => openEditInstance(inst)}>Editar / Vincular</${Button}>
                          <${Button}
                            variant="subtle"
                            disabled=${busy}
                            onClick=${() => {
                              if (inst.discordGuildId) onInvite(inst.discordGuildId, inst.id);
                              else openEditInstance(inst);
                            }}
                          >
                            Gerar invite
                          </${Button}>
                          <${Button} variant="danger" disabled=${busy} onClick=${() => onDeleteInstance(inst.id)}>Excluir</${Button}>
                        </div>
                      </div>
                    `
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

        <div className="card pad">
          <div className="cardHead">
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
      ` : null}

      ${tab === "store" ? html`
      <div className="card pad" style=${{ marginTop: "18px" }}>
        <div className="cardHead">
          <h3>Produtos e Estoque</h3>
          <div className="row" style=${{ alignItems: "center", gap: "10px" }}>
            <select
              className="input"
              style=${{ width: "min(280px, 100%)" }}
              value=${storeInstanceId}
              onChange=${(e) => setStoreInstanceId(e.target.value)}
              disabled=${storeProducts.loading || !instances?.length}
            >
              ${instances?.length ? null : html`<option value="">Nenhuma instância</option>`}
              ${(instances || []).map((inst) => html`<option value=${inst.id}>${inst.name || inst.id}</option>`)}
            </select>
            <${Button} variant="primary" disabled=${storeProducts.loading || !storeInstanceId} onClick=${openCreateProduct}>Criar produto</${Button}>
          </div>
        </div>
        <div className="help" style=${{ marginBottom: "14px" }}>
          ${currentInstance?.discordGuildId
            ? html`Servidor: <span className="mono"><b>${currentInstance.discordGuildId}</b></span> · Crie produtos, adicione estoque e poste nos canais.`
            : html`<b>Atenção:</b> vincule um servidor na instância e convide o bot para conseguir postar produtos no Discord.`}
        </div>

        ${storeProducts.loading
          ? html`<div className="muted" style=${{ padding: "16px 0" }}>Carregando produtos...</div>`
          : storeProducts.products?.length
            ? html`
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Variações</th>
                      <th>Estoque</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${storeProducts.products.map((p) => {
                      const pid = asString(p?.id);
                      const variants = Array.isArray(p?.variants) ? p.variants.length : 0;
                      const stock = Number(storeProducts.stockCounts?.[pid] || 0);
                      return html`
                        <tr>
                          <td className="mono" style=${{ fontSize: "12px" }}><b>${pid}</b></td>
                          <td style=${{ fontWeight: 600 }}>${p?.name || pid}</td>
                          <td>${variants}</td>
                          <td><b style=${{ color: stock > 0 ? "var(--good)" : "var(--muted2)" }}>${stock}</b></td>
                          <td>
                            <div className="actionsRow">
                              <${Button} variant="ghost" disabled=${false} onClick=${() => openEditProduct(p)}>Editar</${Button}>
                              <${Button} variant="subtle" disabled=${false} onClick=${() => openStock(p)}>Estoque</${Button}>
                              <${Button} variant="subtle" disabled=${!currentInstance?.discordGuildId} onClick=${() => openPost(p)}>Postar</${Button}>
                              <${Button} variant="danger" disabled=${false} onClick=${() => deleteProduct(p)}>Excluir</${Button}>
                            </div>
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              `
            : html`
                <div className="emptyState">
                  <div className="eTitle">Nenhum produto cadastrado</div>
                  <div className="eDesc">Crie seu primeiro produto para começar a vender na sua instância.</div>
                </div>
              `}
      </div>
      ` : null}

      ${tab === "overview" ? html`
      <div className="card pad" style=${{ marginTop: "18px" }}>
        <div className="cardHead">
          <h3>Transações recentes</h3>
        </div>
        ${txs?.length
          ? html`
              <table className="table">
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
                    (t) => html`
                      <tr>
                        <td style=${{ fontWeight: 600 }}>${
                          t.type === "sale_credit"
                            ? "Venda"
                            : t.type === "plan_purchase"
                              ? "Plano"
                              : t.type === "withdrawal_request"
                                ? "Saque solicitado"
                                : t.type === "withdrawal_cancelled"
                                  ? "Saque cancelado"
                                  : t.type
                        }</td>
                        <td><b>${t.amountFormatted}</b></td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${t.status}</span></td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${String(t.createdAt || "").slice(0, 19).replace("T", " ")}</span></td>
                      </tr>
                    `
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

      <div className="card pad" style=${{ marginTop: "14px" }}>
        <div className="cardHead">
          <h3>Saques solicitados</h3>
        </div>
        ${withdrawals?.length
          ? html`
              <table className="table">
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
                    (w) => html`
                      <tr>
                        <td><b>${w.amountFormatted}</b></td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${w.status}</span></td>
                        <td className="mono" style=${{ fontSize: "12px" }}>${asString(w.pixKey).slice(0, 3)}...${asString(w.pixKey).slice(-3)}</td>
                        <td><span className="muted2" style=${{ fontSize: "12px" }}>${String(w.createdAt || "").slice(0, 19).replace("T", " ")}</span></td>
                        <td>
                          ${asString(w.status).toLowerCase() === "requested"
                            ? html`<${Button} variant="danger" disabled=${busy} onClick=${() => onCancelWithdrawal(w.id)}>Cancelar</${Button}>`
                            : html`<span className="muted2">—</span>`}
                        </td>
                      </tr>
                    `
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

      ${tab === "account" ? html`
      <div className="grid cols2" style=${{ marginTop: "18px" }}>
        <div className="card pad">
          <div className="cardHead">
            <h3>Conta</h3>
          </div>

          ${avatarUrl ? html`
            <div style=${{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0 16px" }}>
              <img
                src=${avatarUrl}
                alt=${displayName}
                style=${{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover",
                          border: "2px solid rgba(255,255,255,0.14)", boxShadow: "0 0 0 3px rgb(var(--accent-rgb) / 0.22)" }}
              />
              <div>
                <div style=${{ fontWeight: 900, fontSize: "17px", fontFamily: '"Space Grotesk", sans-serif', letterSpacing: "-0.02em" }}>${displayName}</div>
                ${me?.email ? html`<div className="muted2" style=${{ fontSize: "12px", marginTop: "2px" }}>${me.email}</div>` : null}
              </div>
            </div>
            <div className="hr"></div>
          ` : null}

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
              <span className="iVal">${planText}</span>
            </div>
            <div className="infoItem">
              <span className="iKey">Saldo</span>
              <span className="iVal">${formatBRLFromCents(me?.walletCents || 0)}</span>
            </div>

            <div className="hr"></div>

            <div className="label">Nome de exibição</div>
            <input className="input" value=${profileName} onInput=${(e) => setProfileName(e.target.value)} placeholder="Seu nome" />
            <div>
              <${Button} variant="subtle" disabled=${busy} onClick=${onUpdateProfile}>Salvar nome</${Button}>
            </div>
            <div className="help">
              Nome exibido na dashboard. Se usar Discord, atualiza no próximo login.
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="cardHead">
            <h3>Segurança</h3>
          </div>
          ${me?.authProvider === "local"
            ? html`
                <div className="stack">
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
                    <${Button} variant="subtle" disabled=${busy} onClick=${onChangePassword}>Salvar nova senha</${Button}>
                  </div>
                  <div className="help">
                    Nunca compartilhe sua senha ou o token do bot. Em caso de acesso suspeito, troque as credenciais imediatamente.
                  </div>
                </div>
              `
            : html`
                <div className="muted">
                  Conta conectada via Discord OAuth. Para reforçar a segurança, ative 2FA na sua conta Discord e mantenha seu servidor protegido.
                </div>
              `}
        </div>
      </div>
      ` : null}

      <${Modal} open=${edit.open} title="Editar instância" onClose=${closeEditInstance}>
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
          <${Button} variant="primary" disabled=${busy} onClick=${onSaveInstance}>${busy ? "Salvando..." : "Salvar alterações"}</${Button}>
          <${Button}
            variant="subtle"
            disabled=${busy || !asString(edit.guildId).trim()}
            onClick=${() => onInvite(asString(edit.guildId).trim(), asString(edit.id).trim())}
          >
            Gerar invite
          </${Button}>
          <${Button} variant="danger" disabled=${busy} onClick=${() => onDeleteInstance(edit.id)}>Excluir instância</${Button}>
        </div>
      </${Modal}>

      <${Modal}
        open=${productEditor.open}
        title=${productEditor.mode === "create" ? "Criar produto" : "Editar produto"}
        onClose=${closeProductEditor}
      >
        ${productEditor.draft
          ? html`
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
                  <${Button} variant="subtle" disabled=${productEditor.saving} onClick=${addVariantRow}>Adicionar variacao</${Button}>
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
                                <${Button} variant="danger" disabled=${productEditor.saving} onClick=${() => removeVariantRow(idx)}>Remover</${Button}>
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
                  <${Button} variant="subtle" disabled=${productEditor.saving} onClick=${addSectionRow}>Adicionar bloco</${Button}>
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
                                <${Button} variant="danger" disabled=${productEditor.saving} onClick=${() => removeSectionRow(idx)}>Remover</${Button}>
                              </div>
                            </div>
                          `
                        )}
                      </div>
                    `
                  : html`<div className="muted2">Use blocos para adicionar campos extras no embed (funcoes, infos, etc).</div>`}

                <div className="hr"></div>

                <div className="label">Midias (opcional)</div>
                <input
                  className="input"
                  value=${productEditor.draft.bannerImage || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, bannerImage: e.target.value } }))}
                  placeholder="bannerImage (ex: assets/product1/banner.gif)"
                />
                <input
                  className="input"
                  value=${productEditor.draft.previewImage || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, previewImage: e.target.value } }))}
                  placeholder="previewImage (opcional)"
                />
                <input
                  className="input"
                  value=${productEditor.draft.prePostGif || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, prePostGif: e.target.value } }))}
                  placeholder="prePostGif (opcional)"
                />
                <input
                  className="input"
                  value=${productEditor.draft.thumbnail || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, thumbnail: e.target.value } }))}
                  placeholder="thumbnail (opcional)"
                />
                <input
                  className="input"
                  value=${productEditor.draft.footerImage || ""}
                  onInput=${(e) => setProductEditor((s) => ({ ...s, draft: { ...s.draft, footerImage: e.target.value } }))}
                  placeholder="footerImage (opcional)"
                />
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
                  ${productEditor.saving ? "Salvando..." : productEditor.mode === "create" ? "Criar produto" : "Salvar produto"}
                </${Button}>
                <${Button} variant="ghost" disabled=${productEditor.saving} onClick=${closeProductEditor}>Cancelar</${Button}>
              </div>
            `
          : null}
      </${Modal}>

      <${Modal} open=${stockEditor.open} title=${`Estoque - ${stockEditor.productName || stockEditor.productId}`} onClose=${closeStock}>
        ${stockEditor.loading
          ? html`<div className="muted">Carregando estoque...</div>`
          : html`
              <div className="formGrid">
                <div className="label">Bucket</div>
                <select className="input" value=${stockEditor.bucket} onChange=${(e) => setStockEditor((s) => ({ ...s, bucket: e.target.value }))}>
                  <option value="default">default</option>
                  <option value="shared">shared</option>
                  ${(stockEditor.variants || [])
                    .map((v) => asString(v?.id).trim())
                    .filter(Boolean)
                    .map((id) => html`<option value=${id}>${id}</option>`)}
                </select>
                <div className="help">Voce pode separar estoque por variacao (bucket = id da variacao).</div>

                <div className="label">Adicionar keys (1 por linha)</div>
                <textarea
                  className="input mono"
                  rows="6"
                  value=${stockEditor.keysText}
                  onInput=${(e) => setStockEditor((s) => ({ ...s, keysText: e.target.value }))}
                  placeholder="KEY-1\nKEY-2\nKEY-3"
                ></textarea>

                <div style=${{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <${Button} variant="primary" disabled=${stockEditor.saving} onClick=${addStockKeys}>
                    ${stockEditor.saving ? "Salvando..." : "Adicionar e salvar"}
                  </${Button}>
                  <${Button} variant="danger" disabled=${stockEditor.saving} onClick=${clearStockBucket}>Limpar bucket</${Button}>
                </div>

                <div className="hr"></div>

                <div className="label">Resumo</div>
                <div className="code mono">${JSON.stringify(stockEditor.stock || {}, null, 2)}</div>
              </div>
            `}
      </${Modal}>

      <${Modal} open=${postEditor.open} title=${`Postar - ${postEditor.productName || postEditor.productId}`} onClose=${closePost}>
        ${postEditor.loading
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
                  <${Button} variant="primary" disabled=${postEditor.loading} onClick=${doPost}>Postar agora</${Button}>
                  <${Button} variant="ghost" disabled=${postEditor.loading} onClick=${closePost}>Cancelar</${Button}>
                </div>
              </div>
            `}
      </${Modal}>
    </div>
  `;
}

function Tutorials() {
  return html`
    <div className="container">
      <h2 className="sectionTitle">Tutoriais</h2>
      <div className="grid cols2">
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>1) Criar conta e entrar</h3>
          <div className="muted">
            Voce pode entrar com Discord (recomendado) ou criar uma conta com email e senha.
            <br />
            <span className="muted2">Obs: a lista de servidores so aparece para quem entrou com Discord.</span>
          </div>
        </div>
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>2) Escolher um plano</h3>
          <div className="muted">
            Va em <b>Planos</b> e ative o <b>Trial</b> para testar ou escolha um plano pago.
            <br />
            O status e a data de expiracao aparecem na Dashboard.
          </div>
        </div>
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>3) Vendas e saques</h3>
          <div className="muted">
            Na Dashboard, acompanhe seu <b>Saldo de vendas</b> e solicite <b>saques via Pix</b>.
            <br />
            Assim que uma venda for entregue pelo bot, seu saldo e as transacoes sao atualizados.
          </div>
        </div>
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>4) Criar sua instancia</h3>
          <div className="muted">
            Em <b>Instancias</b>, clique em <b>Criar instancia</b>, defina um nome e informe o token do bot do cliente.
            <br />
            O token e validado na hora. Cada assinatura ativa libera <b>1 bot/instancia</b>.
          </div>
        </div>
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>5) Convidar o bot</h3>
          <div className="muted">
            Na Dashboard, use <b>Gerar invite</b> (ou <b>Convidar Bot</b> na lista de servidores).
            <br />
            Garanta permissao de <b>Gerenciar Canais</b> e <b>Gerenciar Mensagens</b> para o bot funcionar corretamente.
          </div>
        </div>
        <div className="card pad">
          <h3 className="sectionTitle" style=${{ marginTop: 0 }}>6) Boas praticas</h3>
          <div className="muted">
            Crie uma categoria para carrinhos/atendimento, defina uma role de staff e mantenha um canal de logs.
            <br />
            Evite compartilhar token/senha e ative 2FA na conta do Discord.
          </div>
        </div>
      </div>
    </div>
  `;
}

function Terms() {
  return html`
    <div className="container">
      <h2 className="sectionTitle">Termos de Servico</h2>
      <div className="card pad">
        <div className="muted">
          <b>Ultima atualizacao:</b> 14/02/2026
          <br />
          Ao criar uma conta ou usar a plataforma AstraSystems, voce concorda com os termos abaixo.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>1) O que entregamos</h3>
        <div className="muted">
          A AstraSystems fornece um portal (Dashboard) e integracoes para ajudar voce a operar automacoes e fluxos no Discord, incluindo recursos de
          onboarding, carteira, planos e ferramentas de configuracao.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>2) Conta e seguranca</h3>
        <div className="muted">
          Voce e responsavel por manter sua conta segura, incluindo senha (quando usar login por email) e acesso ao Discord.
          Nao compartilhe token do bot ou credenciais. Se suspeitar de acesso indevido, troque suas credenciais e contate o suporte.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>3) Pagamentos, planos e carteira</h3>
        <div className="muted">
          Planos e pagamentos (ex: Pix) podem ser processados por provedores terceiros (ex: Mercado Pago). Prazos de confirmacao podem variar.
          O acesso a recursos pode depender do status do pagamento e do plano ativo. Saques podem levar algum tempo e podem exigir validacoes.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>4) Reembolsos e cancelamento</h3>
        <div className="muted">
          Politicas de reembolso e cancelamento dependem do tipo de plano, do metodo de pagamento e do caso (ex: falha tecnica comprovada).
          Quando aplicavel, solicitacoes devem ser feitas em prazo razoavel e com os dados da transacao.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>5) Privacidade e dados</h3>
        <div className="muted">
          Podemos armazenar dados como email, identificadores do Discord (quando voce usa login via Discord), plano, saldo, transacoes e instancias.
          Usamos esses dados para operar a plataforma, prevenir fraude e oferecer suporte.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>6) Limitacoes</h3>
        <div className="muted">
          Nenhum sistema e livre de falhas. A AstraSystems pode alterar, suspender ou descontinuar recursos para manutencao, seguranca ou melhorias,
          buscando minimizar impacto quando possivel.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>7) Suporte</h3>
        <div className="muted">
          Para suporte, fale com a equipe pelo canal oficial de atendimento (Discord) ou pelo meio indicado no momento da compra.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>8) Uso aceitavel</h3>
        <div className="muted">
          Voce concorda em nao usar a plataforma para fraude, spam, conteudo ilegal, violacao de direitos autorais ou qualquer atividade que viole
          leis aplicaveis ou regras do Discord.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>9) Nao afiliacao</h3>
        <div className="muted">
          Discord e uma marca de terceiros. A AstraSystems nao e afiliada, endossada ou patrocinada pelo Discord.
        </div>
      </div>
    </div>
  `;
}

function Privacy() {
  return html`
    <div className="container">
      <h2 className="sectionTitle">Politica de Privacidade</h2>
      <div className="card pad">
        <div className="muted">
          <b>Ultima atualizacao:</b> 14/02/2026
          <br />
          Esta politica explica quais dados coletamos e como usamos para operar a AstraSystems.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>1) Dados que podemos armazenar</h3>
        <div className="muted">
          Podemos armazenar email (quando voce cria conta por email), identificadores do Discord (quando voce entra com Discord), dados de plano,
          saldo/carteira, transacoes, instancias, guild ID (quando vincula) e informacoes de configuracao basica.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>2) Finalidades</h3>
        <div className="muted">
          Usamos esses dados para autenticar usuarios, operar o dashboard, processar pagamentos (quando habilitado), prevenir fraude, melhorar a
          plataforma e prestar suporte.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>3) Terceiros</h3>
        <div className="muted">
          Quando habilitado, pagamentos podem ser processados por provedores terceiros (ex: Mercado Pago). Tambem podemos usar a API do Discord para
          login e listagem de servidores (quando voce autoriza).
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>4) Retencao e seguranca</h3>
        <div className="muted">
          Mantemos dados apenas pelo tempo necessario para operar a plataforma e cumprir obrigacoes legais. Aplicamos medidas razoaveis de seguranca
          para proteger dados, incluindo hash de senha em contas locais.
        </div>

        <div style=${{ height: "12px" }}></div>

        <h3 className="sectionTitle" style=${{ marginTop: 0 }}>5) Seus direitos</h3>
        <div className="muted">
          Voce pode solicitar correcao ou exclusao de dados quando aplicavel. Para isso, contate o suporte pelo canal oficial.
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
      if (mp === "success") showToast("Pagamento aprovado", "Assim que o webhook confirmar, sua carteira sera atualizada.", "good");
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
