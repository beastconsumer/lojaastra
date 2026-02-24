# Deploy Checklist - AstraSystems

Checklist objetivo para deploy profissional em producao.

## 1) Pre-deploy
- [ ] Confirmar branch e commit final aprovados.
- [ ] Validar `.env` com todas as variaveis obrigatorias.
- [ ] Garantir que `DISCORD_TOKEN` e tokens de pagamento sao os de producao.
- [ ] Revisar portas liberadas (3000/3100) e regras de firewall.

## 2) Seguranca minima
- [ ] Definir `PORTAL_SESSION_SECRET` forte (minimo 32 chars).
- [ ] Definir `ADMIN_PANEL_TOKEN`.
- [ ] Definir `MERCADOPAGO_WEBHOOK_SECRET` (se webhook ativo).
- [ ] Nao commitar segredos no repositorio.

## 3) Build e subida
- [ ] Rodar `docker compose up -d --build`.
- [ ] Conferir status: `docker compose ps`.
- [ ] Conferir logs iniciais: `docker compose logs bot --tail=120`.

## 4) Smoke tests
- [ ] `GET /health` responde `ok: true`.
- [ ] `GET /api/status` (admin) responde com bot ativo/starting.
- [ ] Login portal funciona.
- [ ] Criacao de instancia funciona.
- [ ] Start do runtime por instancia funciona.
- [ ] Postagem de produto em canal funciona.

## 5) Financeiro
- [ ] Checkout de plano cria transacao pendente.
- [ ] Webhook muda status para `paid` quando aprovado.
- [ ] Credito de venda atualiza wallet.
- [ ] Solicitacao de saque aparece na fila admin.

## 6) Backup e recuperacao
- [ ] Backup periodico da pasta `data/`.
- [ ] Backup periodico da pasta `logs/`.
- [ ] Teste de restore em ambiente de homologacao.

## 7) Observabilidade
- [ ] Monitorar erros recorrentes no runtime (`runtime.lastError`).
- [ ] Monitorar fila de solicitacoes (`/api/monitor/requests`).
- [ ] Monitorar saques pendentes e pedidos `waiting_stock`.

## 8) Runbook rapido de incidente
1. Identificar impacto (portal, admin, runtime ou pagamento).
2. Ver logs (`docker compose logs bot --tail=200`).
3. Validar integracoes externas (Discord/Mercado Pago).
4. Aplicar mitigacao (restart runtime/servico, bloqueio temporario de fluxo).
5. Registrar causa e acao corretiva no changelog interno.
