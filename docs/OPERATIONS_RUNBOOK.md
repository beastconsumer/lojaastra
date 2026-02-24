# Operations Runbook

Manual de operacao diaria para ambiente local ou servidor.

## Comandos base
### Runtime direto (Node)
```powershell
npm start
```

### Scripts auxiliares (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-bot.ps1
powershell -ExecutionPolicy Bypass -File scripts/stop-bot.ps1
```

### Docker
```powershell
docker compose up -d --build
docker compose ps
docker compose logs bot --tail=120
```

## Health checks
### Portal
```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3100/health
```

### Admin
```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/status
```

## Operacao diaria
1. Verificar status dos servicos (portal/admin/runtime).
2. Revisar fila de solicitacoes no admin (`/api/monitor/requests`).
3. Revisar pedidos `waiting_stock` e saques pendentes.
4. Validar erros de runtime por instancia.
5. Validar webhook/pagamentos do periodo.

## Rotina semanal
1. Backup de `data/` e `logs/`.
2. Revisao de contas bloqueadas e pendencias.
3. Auditoria de transacoes e saques.
4. Revisao de alertas de crash recorrente.

## Runbook de incidente
### Cenario A: Portal fora do ar
1. Validar processo Node/container.
2. Conferir porta `3100` e logs.
3. Revisar `.env` (especialmente `PORTAL_SESSION_SECRET` e OAuth).
4. Reiniciar servico.

### Cenario B: Runtime de instancia com erro
1. Verificar `runtime.lastError` no dashboard/admin.
2. Validar token do bot da instancia.
3. Confirmar intents no Discord Developer Portal.
4. Executar `restart` da instancia.

### Cenario C: Pagamento nao confirmou
1. Verificar `MERCADOPAGO_ACCESS_TOKEN`.
2. Verificar webhook e assinatura (`MERCADOPAGO_WEBHOOK_SECRET`).
3. Consultar transacao no portal/admin.
4. Rodar resync manual no admin quando aplicavel.

### Cenario D: Sem entrega por falta de estoque
1. Encontrar pedidos `waiting_stock`.
2. Repor estoque do produto/variacao.
3. Executar retry pelo admin (`/api/orders/retry-waiting-stock`).

## Indicadores operacionais recomendados
- Quantidade de instancias `online` vs `erro/suspenso`.
- Volume de pedidos `pending` e `waiting_stock`.
- Tempo medio de saque `requested -> completed`.
- Taxa de sucesso de webhook de pagamento.
- Taxa de entrega automatica (DM/canal).

## Backups e recovery
### O que salvar
- `data/` (estado de negocio)
- `logs/` (auditoria operacional)

### Recovery
1. Parar processos.
2. Restaurar `data/` e `logs/`.
3. Subir servicos.
4. Executar health check e validacao de pedidos recentes.
