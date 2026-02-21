"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ExternalLink, KeyRound, LogOut, Plus, RefreshCcw, Server, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PortalUser = {
  discordUserId: string;
  discordUsername: string;
  discordAvatarUrl: string;
  email: string;
  walletCents: number;
  walletFormatted: string;
  salesCentsTotal: number;
  payout: {
    pixKey: string;
    pixKeyType: string;
  };
  plan: {
    tier: string;
    status: string;
    expiresAt: string;
  };
  planActive: boolean;
  authProvider: "local" | "discord";
  mercadoPagoConfigured: boolean;
};

type Instance = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  discordGuildId?: string;
  discordGuildName?: string;
  apiKeyLast4?: string;
  botInGuild?: boolean;
  hasBotToken?: boolean;
  botProfile?: {
    applicationId?: string;
    botUserId?: string;
    username?: string;
    discriminator?: string;
    avatar?: string;
    avatarUrl?: string;
    verified?: boolean;
    updatedAt?: string;
  };
  channels?: {
    logsChannelId?: string;
    salesChannelId?: string;
    feedbackChannelId?: string;
  };
};

type WalletTx = {
  id: string;
  type: string;
  planId: string;
  amountCents: number;
  amountFormatted: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
};

type Withdrawal = {
  id: string;
  amountCents: number;
  amountFormatted: string;
  status: string;
  method: string;
  pixKey: string;
  pixKeyType: string;
  createdAt: string;
  updatedAt: string;
};

type BotStatus = {
  ok: boolean;
  botReady: boolean;
  oauthEnabled: boolean;
  mercadoPagoEnabled: boolean;
  localAuthEnabled: boolean;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    ...init
  });

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(payload?.error || `HTTP ${res.status}`, res.status);
  }
  return payload as T;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function amountToCents(input: string) {
  const clean = String(input || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(clean);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100));
}

function asString(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function shortId(id: string) {
  if (!id) return "-";
  return id.length <= 16 ? id : `${id.slice(0, 8)}...${id.slice(-6)}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [me, setMe] = useState<PortalUser | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);

  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceToken, setNewInstanceToken] = useState("");
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [savingBotTokenId, setSavingBotTokenId] = useState("");
  const [clearingBotTokenId, setClearingBotTokenId] = useState("");
  const [botTokenDraft, setBotTokenDraft] = useState<Record<string, string>>({});
  const [rotatingInstanceId, setRotatingInstanceId] = useState("");
  const [deletingInstanceId, setDeletingInstanceId] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("50,00");
  const [withdrawPixKey, setWithdrawPixKey] = useState("");
  const [withdrawPixType, setWithdrawPixType] = useState("cpf");
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [cancelingWithdrawalId, setCancelingWithdrawalId] = useState("");

  const kpis = useMemo(() => {
    const activePlan = me?.planActive ? "Ativo" : "Inativo";
    return [
      { label: "Saldo em carteira", value: me?.walletFormatted || "R$ 0,00", icon: Wallet },
      {
        label: "Vendas acumuladas",
        value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((me?.salesCentsTotal || 0) / 100),
        icon: Bot
      },
      { label: "Instancias", value: String(instances.length), icon: Server },
      { label: "Plano", value: `${me?.plan?.tier || "free"} (${activePlan})`, icon: RefreshCcw }
    ];
  }, [me, instances.length]);

  async function loadDashboard() {
    setError("");
    const [meRes, instRes, txRes, wdRes, botRes] = await Promise.all([
      apiJson<{ ok: true; user: PortalUser }>("/api/me"),
      apiJson<{ ok: true; instances: Instance[] }>("/api/instances"),
      apiJson<{ ok: true; transactions: WalletTx[] }>("/api/wallet/transactions"),
      apiJson<{ ok: true; withdrawals: Withdrawal[] }>("/api/wallet/withdrawals"),
      apiJson<BotStatus>("/api/bot/status")
    ]);

    setMe(meRes.user);
    setInstances(instRes.instances || []);
    setTransactions(txRes.transactions || []);
    setWithdrawals(wdRes.withdrawals || []);
    setBotStatus(botRes);
    setWithdrawPixKey(meRes.user?.payout?.pixKey || "");
    setWithdrawPixType(meRes.user?.payout?.pixKeyType || "cpf");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadDashboard();
      } catch (err: any) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err?.message || "Falha ao carregar dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refreshAll() {
    try {
      setNotice("Atualizando dados...");
      await loadDashboard();
      setNotice("Dashboard atualizado.");
    } catch (err: any) {
      setError(err?.message || "Falha ao atualizar");
    }
  }

  async function handleLogout() {
    try {
      await apiJson("/auth/logout", { method: "POST", body: "{}" });
    } catch {}
    router.replace("/login");
  }

  async function handleCreateInstance() {
    const name = newInstanceName.trim();
    const token = newInstanceToken.trim();
    if (!name) return setError("Informe o nome da instancia.");
    if (!token) return setError("Informe o token do bot do cliente para criar a instancia.");
    try {
      setCreatingInstance(true);
      setError("");
      const data = await apiJson<{ ok: true; instance: Instance }>("/api/instances", {
        method: "POST",
        body: JSON.stringify({ name, token })
      });
      setNewInstanceName("");
      setNewInstanceToken("");
      await loadDashboard();
      const botName = asString(data?.instance?.botProfile?.username);
      setNotice(botName ? `Instancia criada com token validado (${botName}).` : "Instancia criada com token validado.");
    } catch (err: any) {
      setError(err?.message || "Falha ao criar instancia");
    } finally {
      setCreatingInstance(false);
    }
  }

  async function handleSaveBotToken(instanceId: string) {
    const token = asString(botTokenDraft[instanceId]).trim();
    if (!token) return setError("Cole o token do bot para salvar.");
    try {
      setSavingBotTokenId(instanceId);
      setError("");
      await apiJson(`/api/instances/${instanceId}/bot-token`, {
        method: "PUT",
        body: JSON.stringify({ token })
      });
      setBotTokenDraft((prev) => ({ ...prev, [instanceId]: "" }));
      await loadDashboard();
      setNotice("Token do bot validado e salvo na instancia.");
    } catch (err: any) {
      setError(err?.message || "Falha ao salvar token do bot");
    } finally {
      setSavingBotTokenId("");
    }
  }

  async function handleClearBotToken(instanceId: string) {
    const ok = window.confirm("Remover o token do bot desta instancia?");
    if (!ok) return;
    try {
      setClearingBotTokenId(instanceId);
      setError("");
      await apiJson(`/api/instances/${instanceId}/bot-token`, {
        method: "DELETE"
      });
      await loadDashboard();
      setNotice("Token do bot removido da instancia.");
    } catch (err: any) {
      setError(err?.message || "Falha ao limpar token do bot");
    } finally {
      setClearingBotTokenId("");
    }
  }

  async function handleRotateKey(instanceId: string) {
    try {
      setRotatingInstanceId(instanceId);
      setError("");
      const data = await apiJson<{ ok: true; apiKey: string }>(`/api/instances/${instanceId}/rotate-key`, {
        method: "POST",
        body: "{}"
      });
      const rotated = asString(data?.apiKey);
      if (rotated) {
        try {
          await navigator.clipboard.writeText(rotated);
          setNotice("API key rotacionada e copiada para a area de transferencia.");
        } catch {
          setNotice("API key rotacionada. Copie e armazene com seguranca.");
        }
      }
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Falha ao rotacionar API key");
    } finally {
      setRotatingInstanceId("");
    }
  }

  async function handleDeleteInstance(instanceId: string) {
    const ok = window.confirm("Excluir esta instancia? Esta acao nao pode ser desfeita.");
    if (!ok) return;
    try {
      setDeletingInstanceId(instanceId);
      setError("");
      await apiJson(`/api/instances/${instanceId}`, { method: "DELETE" });
      await loadDashboard();
      setNotice("Instancia removida.");
    } catch (err: any) {
      setError(err?.message || "Falha ao excluir instancia");
    } finally {
      setDeletingInstanceId("");
    }
  }

  async function handleOpenInvite(instanceId: string, guildId?: string) {
    try {
      const params = new URLSearchParams({ instanceId });
      if (guildId) params.set("guildId", guildId);
      const query = `?${params.toString()}`;
      const data = await apiJson<{ ok: true; url: string }>(`/api/bot/invite${query}`);
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setError(err?.message || "Falha ao gerar invite do bot");
    }
  }

  async function handleRequestWithdrawal() {
    const amountCents = amountToCents(withdrawAmount);
    if (amountCents < 1000) return setError("Valor minimo para saque: R$ 10,00.");
    if (!withdrawPixKey.trim()) return setError("Informe a chave Pix.");
    try {
      setRequestingWithdrawal(true);
      setError("");
      await apiJson("/api/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          pixKey: withdrawPixKey.trim(),
          pixKeyType: withdrawPixType
        })
      });
      await loadDashboard();
      setNotice("Solicitacao de saque criada.");
    } catch (err: any) {
      setError(err?.message || "Falha ao solicitar saque");
    } finally {
      setRequestingWithdrawal(false);
    }
  }

  async function handleCancelWithdrawal(withdrawalId: string) {
    try {
      setCancelingWithdrawalId(withdrawalId);
      setError("");
      await apiJson(`/api/wallet/withdrawals/${withdrawalId}/cancel`, {
        method: "POST",
        body: "{}"
      });
      await loadDashboard();
      setNotice("Solicitacao cancelada e valor devolvido.");
    } catch (err: any) {
      setError(err?.message || "Falha ao cancelar saque");
    } finally {
      setCancelingWithdrawalId("");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060b] px-6 py-14 text-white">
        <div className="mx-auto max-w-[90rem]">
          <div className="astra-fade-up rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <p className="text-lg font-semibold">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#06060b] text-white">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.2]"
        src="/media/painel.mp4"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(230,33,42,0.26),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(255,77,87,0.22),transparent_37%),radial-gradient(circle_at_40%_90%,rgba(185,28,28,0.18),transparent_45%)]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between px-6 py-4">
          <div className="astra-fade-up">
            <p className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight">
              Astra<span className="text-red-400">Systems</span>
            </p>
            <p className="text-sm text-white/60">Dashboard profissional do cliente</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={botStatus?.botReady ? "good" : "warn"}>
              {botStatus?.botReady ? <span className="astra-live-dot" /> : null}
              <Bot className="mr-1 h-3.5 w-3.5 astra-icon-float" />
              {botStatus?.botReady ? "Bot online" : "Bot iniciando"}
            </Badge>
            <Badge variant={me?.planActive ? "good" : "warn"}>
              Plano {me?.plan?.tier || "free"} {me?.planActive ? "ativo" : "inativo"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={refreshAll}>
              <RefreshCcw className="astra-icon-spin-hover mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/plans">Planos</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-6 py-8">
        <section className="astra-fade-up grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className={`astra-hover-lift astra-fade-up astra-delay-${Math.min(index + 1, 4)}`}>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between text-white/70">
                    <span className="text-xs uppercase tracking-[0.14em]">{item.label}</span>
                    <Icon className="astra-icon-float h-4 w-4" />
                  </div>
                  <p className="font-['Space_Grotesk'] text-[1.8rem] font-semibold tracking-tight">{item.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="astra-fade-up astra-delay-2">
            <CardHeader>
              <CardTitle>Conta e acesso</CardTitle>
              <CardDescription>Dados principais do cliente autenticado no portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="astra-interactive rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/55">Usuario</p>
                  <p className="mt-1 text-sm font-medium">{me?.discordUsername || "-"}</p>
                </div>
                <div className="astra-interactive rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/55">E-mail</p>
                  <p className="mt-1 text-sm font-medium">{me?.email || "-"}</p>
                </div>
                <div className="astra-interactive rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/55">Expira em</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(me?.plan?.expiresAt || "")}</p>
                </div>
                <div className="astra-interactive rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-white/55">Autenticacao</p>
                  <p className="mt-1 text-sm font-medium">{me?.authProvider || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="astra-fade-up astra-delay-3">
            <CardHeader>
              <CardTitle>Criar e ativar instancia</CardTitle>
              <CardDescription>
                Fluxo de producao: a instancia ja nasce com o token do bot do cliente validado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="Nome da instancia (ex: Loja Principal)"
              />
              <Input
                type="password"
                value={newInstanceToken}
                onChange={(e) => setNewInstanceToken(e.target.value)}
                placeholder="Token do bot do cliente (Discord Developer)"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateInstance} disabled={creatingInstance}>
                  <Plus className="mr-2 h-4 w-4" />
                  {creatingInstance ? "Validando e criando..." : "Criar com token"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/tutorials">Ver tutoriais</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="astra-fade-up astra-delay-3">
          <CardHeader>
            <CardTitle>Instancias</CardTitle>
            <CardDescription>
              Cada instancia opera com o token do bot do cliente (nome/foto/ID do proprio app).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-xl border border-amber-400/35 bg-amber-500/12 p-3 text-sm text-amber-100">
              Fluxo recomendado: 1) crie com token valido, 2) gere o invite desse bot, 3) adicione no servidor certo.
              Sempre rode o processo do bot com o mesmo token da instancia ativa para liberar postagens e canais.
            </div>
            {instances.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-sm text-white/70">
                Nenhuma instancia criada ainda.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {instances.map((instance, idx) => (
                  <div
                    key={instance.id}
                    className={`astra-fade-up astra-hover-lift rounded-2xl border border-white/10 bg-black/20 p-4 transition-all astra-delay-${
                      (idx % 4) + 1
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-['Space_Grotesk'] text-lg font-semibold">{instance.name || "Instancia"}</p>
                        <p className="text-xs text-white/55">{shortId(instance.id)}</p>
                      </div>
                      {instance.botProfile?.avatarUrl ? (
                        <img
                          src={instance.botProfile.avatarUrl}
                          alt="Avatar do bot"
                          className="astra-interactive h-10 w-10 rounded-full border border-white/20 object-cover"
                        />
                      ) : null}
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={instance.botInGuild ? "good" : "muted"}>
                          {instance.botInGuild ? "Bot no servidor" : "Nao vinculado"}
                        </Badge>
                        <Badge variant={instance.hasBotToken ? "good" : "warn"}>
                          {instance.hasBotToken ? "Token do bot OK" : "Token pendente"}
                        </Badge>
                      </div>
                    </div>

                    <div className="mb-3 space-y-1 text-sm text-white/70">
                      <p>
                        Guild: <span className="text-white/90">{instance.discordGuildName || instance.discordGuildId || "-"}</span>
                      </p>
                      <p>
                        Integracao API: <span className="text-white/90">...{instance.apiKeyLast4 || "----"}</span>
                      </p>
                      <p>
                        Bot:{" "}
                        <span className="text-white/90">
                          {instance.botProfile?.username
                            ? `${instance.botProfile.username}${instance.botProfile.discriminator ? `#${instance.botProfile.discriminator}` : ""}`
                            : "-"}
                        </span>
                      </p>
                    </div>

                    <div className="mb-3 space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/55">Token do bot do cliente</p>
                      <Input
                        type="password"
                        value={botTokenDraft[instance.id] || ""}
                        onChange={(e) => setBotTokenDraft((prev) => ({ ...prev, [instance.id]: e.target.value }))}
                        placeholder={instance.hasBotToken ? "Atualizar token do bot" : "Cole aqui o token do bot criado no Discord Developer"}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingBotTokenId === instance.id}
                          onClick={() => handleSaveBotToken(instance.id)}
                        >
                          {savingBotTokenId === instance.id ? "Validando..." : "Validar e salvar token"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!instance.hasBotToken || clearingBotTokenId === instance.id}
                          onClick={() => handleClearBotToken(instance.id)}
                        >
                          {clearingBotTokenId === instance.id ? "Limpando..." : "Remover token"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!instance.hasBotToken}
                        onClick={() => handleOpenInvite(instance.id, instance.discordGuildId)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Invite do bot do cliente
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rotatingInstanceId === instance.id}
                        onClick={() => handleRotateKey(instance.id)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {rotatingInstanceId === instance.id ? "Rotacionando..." : "Rotacionar key"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingInstanceId === instance.id}
                        onClick={() => handleDeleteInstance(instance.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingInstanceId === instance.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <section>
          <Card className="astra-fade-up astra-delay-4">
            <CardHeader>
              <CardTitle>Saque via Pix</CardTitle>
              <CardDescription>Solicite saque do saldo acumulado para sua chave Pix.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="50,00" />
                <Input
                  className="md:col-span-2"
                  value={withdrawPixKey}
                  onChange={(e) => setWithdrawPixKey(e.target.value)}
                  placeholder="Chave Pix"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input value={withdrawPixType} onChange={(e) => setWithdrawPixType(e.target.value)} placeholder="Tipo (cpf/email/aleatoria)" />
                <Button onClick={handleRequestWithdrawal} disabled={requestingWithdrawal}>
                  {requestingWithdrawal ? "Enviando..." : "Solicitar saque"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="astra-fade-up">
            <CardHeader>
              <CardTitle>Transacoes recentes</CardTitle>
              <CardDescription>Historico financeiro da conta (entradas/saidas).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.12em] text-white/55">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-white/60" colSpan={5}>
                          Nenhuma transacao encontrada.
                        </td>
                      </tr>
                    ) : (
                      transactions.slice(0, 15).map((tx) => (
                        <tr key={tx.id} className="astra-table-row border-t border-white/8">
                          <td className="px-3 py-2 font-mono text-xs">{shortId(tx.id)}</td>
                          <td className="px-3 py-2">{tx.type || "-"}</td>
                          <td className={`px-3 py-2 font-semibold ${tx.amountCents < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                            {tx.amountFormatted}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                tx.status === "paid"
                                  ? "good"
                                  : tx.status === "pending"
                                    ? "warn"
                                    : tx.status === "failed"
                                      ? "bad"
                                      : "muted"
                              }
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-white/65">{formatDate(tx.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="astra-fade-up astra-delay-2">
            <CardHeader>
              <CardTitle>Saques</CardTitle>
              <CardDescription>Solicitacoes de saque e status operacional.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.12em] text-white/55">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Pix</th>
                      <th className="px-3 py-2">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-white/60" colSpan={5}>
                          Nenhum saque encontrado.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.slice(0, 15).map((wd) => (
                        <tr key={wd.id} className="astra-table-row border-t border-white/8">
                          <td className="px-3 py-2 font-mono text-xs">{shortId(wd.id)}</td>
                          <td className="px-3 py-2 font-semibold">{wd.amountFormatted}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                wd.status === "paid"
                                  ? "good"
                                  : wd.status === "requested"
                                    ? "warn"
                                    : wd.status === "cancelled"
                                      ? "muted"
                                      : "bad"
                              }
                            >
                              {wd.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-white/70">{wd.pixKey || "-"}</td>
                          <td className="px-3 py-2">
                            {wd.status === "requested" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={cancelingWithdrawalId === wd.id}
                                onClick={() => handleCancelWithdrawal(wd.id)}
                              >
                                {cancelingWithdrawalId === wd.id ? "Cancelando..." : "Cancelar"}
                              </Button>
                            ) : (
                              <span className="text-white/45">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {(error || notice) && (
          <div className="fixed bottom-6 right-6 z-30 max-w-md space-y-2">
            {notice && (
              <div className="astra-toast-enter rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            )}
            {error && (
              <div className="astra-toast-enter rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
