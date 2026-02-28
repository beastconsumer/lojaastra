# Configuracao de Ambiente

Guia consolidado das variaveis de ambiente usadas pelo runtime, portal e painel admin.

## Como configurar
1. Copie `.env.example` para `.env`.
2. Preencha os campos obrigatorios.
3. Reinicie o processo (`npm start` ou container).

```powershell
Copy-Item .env.example .env
```

## Variaveis obrigatorias
Sem estas variaveis o fluxo principal nao funciona.

| Variavel | Obrigatoria | Default | Usada em | Descricao |
|---|---|---|---|---|
| `DISCORD_TOKEN` | Sim | - | Bot runtime | Token do bot principal Discord. |
| `PORTAL_SESSION_SECRET` | Sim | - | Portal | Segredo de sessao/cookie do portal. |
| `DISCORD_OAUTH_CLIENT_ID` | Recomendada | - | Portal | OAuth Discord (login e guilds). |
| `DISCORD_OAUTH_CLIENT_SECRET` | Recomendada | - | Portal | OAuth Discord (troca de token). |
| `DISCORD_OAUTH_REDIRECT_URI` | Recomendada | `http://127.0.0.1:3100/auth/discord/callback` | Portal | Callback OAuth configurado no app Discord. |
| `ADMIN_PANEL_TOKEN` | Recomendada | vazio | Admin | Protege o painel `/admin`. |

## Financeiro e planos
| Variavel | Obrigatoria | Default | Descricao |
|---|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Para checkout/webhook | vazio | Access token da conta Mercado Pago da plataforma. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Opcional | vazio | Se definido, webhook exige assinatura valida. |
| `PLATFORM_FEE_PERCENT` | Opcional | `6` | Taxa percentual da plataforma sobre vendas. |
| `ASAAS_API_KEY` | Opcional | vazio | Chave Asaas para fluxo de resync/suporte legado. |
| `ASAAS_ENV` | Opcional | `sandbox` | Ambiente Asaas. |

## Portal e admin (host/porta)
| Variavel | Default | Descricao |
|---|---|---|
| `PORTAL_HOST` | `127.0.0.1` | Host de bind do portal. |
| `PORTAL_PORT` | `3100` | Porta do portal. |
| `PORTAL_BASE_URL` | `http://127.0.0.1:3100` | URL base do portal. Em producao use dominio publico com `https://` para webhook Mercado Pago. |
| `ADMIN_PANEL_HOST` | `127.0.0.1` | Host de bind do admin. |
| `ADMIN_PANEL_PORT` | `3000` | Porta do admin. |
| `ADMIN_PANEL_MODE` | `monitor` | `monitor` bloqueia edicao de catalogo/config; `full` libera edicao. |

## Controle de acesso
| Variavel | Default | Descricao |
|---|---|---|
| `ADMIN_IDS` | vazio | IDs Discord com privilegio administrativo (portal e runtime). |
| `LICENSE_MODE` | `auto` | Modo de enforce de licenca no bot (`auto`/`on`/`off`). |

## Runtime por instancia (Docker)
| Variavel | Default | Descricao |
|---|---|---|
| `INSTANCE_DOCKER_ENABLED` | `true` | Habilita operacao de container por instancia. |
| `INSTANCE_BOT_IMAGE` | `botdc-bot:latest` | Imagem usada para containers de instancia. |
| `INSTANCE_MONITOR_INTERVAL_MS` | `30000` | Intervalo de monitoramento de runtime. |
| `PLAN_RECONCILE_COOLDOWN_MS` | `15000` | Intervalo minimo para reconciliar pagamentos pendentes de plano via API Mercado Pago. |
| `INSTANCE_CRASH_THRESHOLD` | `3` | Threshold para marcar crash repetido/suspensao. |
| `INSTANCE_START_PROBE_MS` | `4500` | Espera minima apos start para probe de status. |
| `INSTANCE_PARENT_CONTAINER` | auto | Nome do container pai (modo docker-in-docker). |
| `INSTANCE_RUNTIME` | vazio | Liga modo runtime de instancia no processo atual. |
| `INSTANCE_ID` | vazio | ID da instancia amarrada ao processo atual. |
| `INSTANCE_ENABLE_MESSAGE_CONTENT` | `true` | Controle de intent `MessageContent` no runtime de instancia. |
| `INSTANCE_ENABLE_GUILD_MEMBERS` | `false` | Controle de intent `GuildMembers` no runtime de instancia. |

## Comportamento do bot
| Variavel | Default | Descricao |
|---|---|---|
| `LOG_LEVEL` | `info` | Nivel de log (`debug`, `info`, `warn`, `error`). |
| `PRODUCT_POST_MODE` | `embed` | Modo de postagem de produto no Discord. |

## Perfil de ambiente sugerido
### Desenvolvimento local
- `PORTAL_HOST=127.0.0.1`
- `ADMIN_PANEL_HOST=127.0.0.1`
- `ADMIN_PANEL_MODE=monitor`
- `LOG_LEVEL=debug`

### Producao
- `PORTAL_BASE_URL` com dominio/HTTPS real.
- `PORTAL_SESSION_SECRET` forte.
- `ADMIN_PANEL_TOKEN` ativo.
- `MERCADOPAGO_WEBHOOK_SECRET` ativo.
- `LOG_LEVEL=info` (ou `warn`).
