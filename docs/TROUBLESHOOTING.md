# Troubleshooting

Guia rapido para os problemas mais comuns do projeto.

## Portal nao inicia
### Sintoma
- Processo encerra cedo.
- `/health` indisponivel.

### Causa comum
- `PORTAL_SESSION_SECRET` vazio.

### Acao
1. Defina `PORTAL_SESSION_SECRET` no `.env`.
2. Reinicie o processo.

## Bot nao loga no Discord
### Sintoma
- Log: `DISCORD_TOKEN nao configurado no .env`.
- Processo finaliza no startup.

### Causa comum
- `DISCORD_TOKEN` ausente ou invalido.

### Acao
1. Atualize `DISCORD_TOKEN`.
2. Reinicie e valide `bot:ready` nos logs.

## Runtime de instancia falha ao iniciar
### Sintoma
- Status da instancia em `erro`.
- Mensagens como `docker_unavailable`, `docker_permission_denied`, `docker_image_missing`.

### Causa comum
- Docker indisponivel/permissao negada/imagem nao buildada.

### Acao
1. Verifique Docker ativo.
2. Rode build da imagem `INSTANCE_BOT_IMAGE`.
3. Valide acesso ao daemon Docker pelo processo.

## Erro de intents no bot da instancia
### Sintoma
- `crash_exit_78` ou `crash_repetido_exit_78`.
- Mensagens sobre `Message Content Intent`.

### Causa comum
- Intent nao habilitada no Discord Developer Portal.

### Acao
1. Abrir app do bot no Discord Developer Portal.
2. Ativar `Message Content Intent`.
3. Reiniciar runtime da instancia.

## `plano_inativo` ao operar instancia
### Sintoma
- APIs de start/restart retornam `plano_inativo`.

### Causa comum
- Usuario sem trial/plano ativo.

### Acao
1. Ativar trial em `/plans` ou comprar plano.
2. Repetir acao no dashboard.

## Publicacao bloqueada por token divergente
### Sintoma
- Erro: `instance_requires_own_bot_token`.

### Causa comum
- Bot em execucao nao corresponde ao bot configurado na instancia.

### Acao
1. Atualizar token da instancia.
2. Reiniciar runtime da instancia.
3. Tentar postar novamente.

## Checkout nao funciona
### Sintoma
- Erro `mercadopago_not_configured`.

### Causa comum
- `MERCADOPAGO_ACCESS_TOKEN` ausente.

### Acao
1. Configurar token no `.env`.
2. Reiniciar processo.
3. Repetir checkout.

## Webhook Mercado Pago rejeitado
### Sintoma
- `invalid_signature` no endpoint `/webhooks/mercadopago`.

### Causa comum
- Segredo de assinatura divergente.

### Acao
1. Validar `MERCADOPAGO_WEBHOOK_SECRET`.
2. Confirmar valor configurado no provedor.

## Admin sem autenticacao
### Sintoma
- Console: `ADMIN_PANEL_TOKEN nao configurado. Painel sem autenticacao.`

### Causa comum
- Token nao definido.

### Acao
1. Definir `ADMIN_PANEL_TOKEN`.
2. Reiniciar admin.

## Painel em modo somente monitoramento
### Sintoma
- Edicoes de catalogo/config bloqueadas.

### Causa comum
- `ADMIN_PANEL_MODE=monitor` (padrao).

### Acao
1. Definir `ADMIN_PANEL_MODE=full` quando quiser liberar edicoes.
2. Reiniciar processo.

## Pedido preso em `waiting_stock`
### Sintoma
- Pagamento confirmado sem entrega.

### Causa comum
- Estoque insuficiente para produto/variacao.

### Acao
1. Repor estoque.
2. Executar retry em `/api/orders/retry-waiting-stock`.

## Saque pendente por muito tempo
### Sintoma
- `withdrawals` acumulando em `requested`.

### Causa comum
- Fila admin nao processada.

### Acao
1. Revisar `/api/admin/withdrawals`.
2. Completar ou rejeitar saques pendentes.

## Comandos de diagnostico util
```powershell
docker compose ps
docker compose logs bot --tail=200
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3100/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/status
```
