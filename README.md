# AstraSystems | Discord Commerce SaaS

Plataforma de vendas para Discord com arquitetura SaaS multi-tenant:
- bot de comercio digital com checkout e entrega automatica
- portal para clientes criarem e operarem suas proprias instancias
- painel admin para operacao, auditoria e monitoramento

![Preview do projeto](./bemvindo.gif)

## Sumario
- [Visao geral](#visao-geral)
- [Por que este projeto e forte para portfolio](#por-que-este-projeto-e-forte-para-portfolio)
- [Arquitetura e fluxo de negocio](#arquitetura-e-fluxo-de-negocio)
- [Stack tecnica](#stack-tecnica)
- [Seguranca implementada](#seguranca-implementada)
- [Funcionalidades principais](#funcionalidades-principais)
- [Estrutura do repositorio](#estrutura-do-repositorio)
- [Como executar localmente](#como-executar-localmente)
- [Deploy e operacao](#deploy-e-operacao)
- [Documentacao](#documentacao)
- [Capturas de tela](#capturas-de-tela)

## Visao geral
O AstraSystems resolve um caso real de negocio: vender produtos digitais em comunidades Discord com operacao organizada, controle financeiro e escopo SaaS.

Cada cliente opera sua propria instancia, com runtime isolado e controle de ciclo de vida (`start`, `stop`, `restart`), enquanto o time operador enxerga tudo por um painel central.

## Por que este projeto e forte para portfolio
- Projeto full-stack com dominio de produto real (vendas, planos, wallet, saque).
- Arquitetura multi-tenant com separacao de dados por instancia.
- Integracao com Discord e pagamentos (Mercado Pago) com webhooks.
- Camada administrativa com diagnostico, auditoria e visao operacional.
- Hardening de acesso admin com autenticacao por sessao e controles anti-abuso.
- Documentacao tecnica completa para onboarding rapido de recrutador/cliente.

## Arquitetura e fluxo de negocio
```text
Cliente/Usuario
   |
   +--> Portal SaaS (porta 3100) ------------------+
   |        |                                       |
   |        +--> cadastro/login                     |
   |        +--> planos, checkout, wallet, saques  |
   |        +--> gestao de instancias              |
   |                                                v
   +--> Runtime Discord (src/index.js) <------> data/portal.json
            |
            +--> carrinho, pedidos, entrega automatica
            +--> publicacao de produtos no Discord
            +--> credito de receita na wallet
            |
            +--> Painel Admin (porta 3000)
                    +--> monitoramento de negocio e runtime
                    +--> operacao financeira (fila de saques)
                    +--> auditoria e diagnosticos
```

Fluxo resumido:
1. Cliente cria conta no portal e ativa trial/plano.
2. Configura instancia, token do bot e servidor Discord.
3. Publica catalogo e abre vendas.
4. Comprador finaliza pedido; sistema confirma pagamento e entrega.
5. Receita vai para wallet da instancia.
6. Saques entram em fila para operacao admin.

## Stack tecnica
- Backend: Node.js, Express, discord.js, axios, dotenv
- Frontend: React 18 via ESM/CDN (portal e admin SPA)
- Pagamentos: Mercado Pago (checkout e webhook), suporte operacional Asaas
- Infra: Docker Compose, healthcheck, volumes persistentes
- Persistencia: JSON local com escrita atomica (`data/*.json`, `data/instances/*`)

## Seguranca implementada
- Acesso admin protegido por login/senha e sessao HTTP-only.
- Cookies com `SameSite=Strict` e suporte a `Secure` em producao.
- Assinatura HMAC de sessao com secret dedicado.
- Rate limit de login com janela, tentativas maximas e lock temporario.
- Headers de seguranca (`X-Frame-Options`, `X-Content-Type-Options`, etc.).
- Endpoints de API com `Cache-Control: no-store`.

Importante:
- Credenciais padrao no `.env.example` sao apenas para ambiente local.
- Em producao, troque usuario/senha e defina secrets fortes.

## Funcionalidades principais
- Carrinho com expiracao e fechamento de pedido.
- Entrega automatica por DM/canal com fallback.
- Catalogo com estoque, variacoes e cupons.
- Trial + assinatura com renovacao via pagamento.
- Wallet por cliente com solicitacao/cancelamento de saque.
- Vinculo seguro de instancia ao servidor Discord.
- Operacao admin com painel de saude, auditoria e fila financeira.

## Estrutura do repositorio
```text
src/
  index.js            # runtime principal do bot e logica de comercio
  portalServer.js     # API + SPA do portal (3100)
  adminServer.js      # API + SPA admin (3000)
  portal/             # frontend do portal
  admin/              # frontend do admin
data/                 # base de dados local em JSON
docs/                 # documentacao tecnica e material de portfolio
scripts/              # utilitarios operacionais
docker-compose.yml    # ambiente containerizado
```

## Como executar localmente
### 1) Requisitos
- Node.js 20+
- npm 10+
- Docker (opcional)

### 2) Instalacao
```powershell
npm install
Copy-Item .env.example .env
```

### 3) Variaveis essenciais
Configure no `.env`:
- `DISCORD_TOKEN`
- `PORTAL_SESSION_SECRET`
- `DISCORD_OAUTH_CLIENT_ID`
- `DISCORD_OAUTH_CLIENT_SECRET`
- `DISCORD_OAUTH_REDIRECT_URI`
- `MERCADOPAGO_ACCESS_TOKEN` (quando usar checkout/webhook)
- `ADMIN_PANEL_AUTH_REQUIRED=true`
- `ADMIN_LOGIN_USER`
- `ADMIN_LOGIN_PASSWORD` (ou `ADMIN_LOGIN_PASSWORD_SHA256`)
- `ADMIN_SESSION_SECRET` (recomendado em producao)
- `ADMIN_PANEL_TOKEN` (opcional para automacao por bearer token)

### 4) Execucao
```powershell
npm start
```

URLs padrao:
- Portal: `http://127.0.0.1:3100`
- Admin: `http://127.0.0.1:3000/admin`
- Health: `http://127.0.0.1:3100/health`

### 5) Docker Compose
```powershell
docker compose up -d --build
```

## Deploy e operacao
- Checklist de producao: [docs/DEPLOY_CHECKLIST.md](./docs/DEPLOY_CHECKLIST.md)
- Runbook de operacao: [docs/OPERATIONS_RUNBOOK.md](./docs/OPERATIONS_RUNBOOK.md)
- Guia de seguranca: [docs/SECURITY.md](./docs/SECURITY.md)

## Documentacao
- Hub de documentacao: [docs/INDEX.md](./docs/INDEX.md)
- Arquitetura: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Configuracao: [docs/CONFIGURATION.md](./docs/CONFIGURATION.md)
- API Reference: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Case de portfolio: [docs/PORTFOLIO_CASE_STUDY.md](./docs/PORTFOLIO_CASE_STUDY.md)
- Changelog: [docs/CHANGELOG.md](./docs/CHANGELOG.md)

## Capturas de tela
### Home
![Home](./docs/screenshots/01-home-desktop.png)

### Dashboard
![Dashboard](./docs/screenshots/07-dashboard-overview-desktop.png)

### Admin
![Admin](./docs/screenshots/13-admin-resumo-desktop.png)

## Status
Projeto em evolucao continua, pronto para demonstracao tecnica e uso como case profissional de portfolio.
