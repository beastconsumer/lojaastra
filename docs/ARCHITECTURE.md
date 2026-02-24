# Arquitetura Tecnica - AstraSystems

## Objetivo
Documentar como o sistema esta organizado para facilitar manutencao, onboarding tecnico e apresentacao de portfolio.

## Visao geral
O projeto roda como uma aplicacao Node.js com tres blocos principais:
- `src/index.js`: runtime do bot Discord e logica de vendas.
- `src/portalServer.js`: API e frontend do portal SaaS (clientes).
- `src/adminServer.js`: API e frontend do painel administrativo.

Todos compartilham dados em arquivos JSON na pasta `data/`.

## Componentes
### 1) Bot runtime (`src/index.js`)
- Gerencia comandos e interacoes no Discord.
- Publica produtos nos canais.
- Abre carrinho, acompanha pagamento e entrega keys.
- Escreve eventos de pedidos, entregas e clientes na base local.
- Inicia `adminServer` e `portalServer` no runtime principal.

### 2) Portal SaaS (`src/portalServer.js`)
- Autenticacao local e OAuth Discord.
- Gestao de plano (trial/pago), checkout e webhook.
- Gestao de wallet e saques.
- Gestao de instancias por usuario (inclui runtime e token do bot por instancia).

### 3) Painel admin (`src/adminServer.js`)
- Operacao diaria (pedidos, carrinhos, entregas, cupons e catalogo).
- Monitoramento (runtime, solicitacoes pendentes, logs).
- Diagnostico e visao executiva de negocio.

## Multi-tenant
Cada cliente possui sua propria instancia com isolamento por `instanceId`.

Arquivos por instancia:
- `data/instances/<instanceId>/products.json`
- `data/instances/<instanceId>/stock.json`

Dados globais:
- `data/portal.json` (usuarios, instancias, transacoes, saques)
- `data/orders.json`, `data/carts.json`, `data/deliveries.json`, etc.

## Runtime por instancia (Docker)
Fluxo resumido:
1. Cliente cria instancia e define token do bot.
2. Portal valida token no Discord e salva hash/perfil.
3. Acao de start/restart executa container da instancia.
4. Monitor periodico atualiza status de runtime (`online`, `offline`, `erro`, `suspenso`).

Isso permite escalar bots por cliente sem misturar estado operacional.

## Persistencia e consistencia
- Escrita atomica em JSON (`*.tmp` + rename) para reduzir corrupcao.
- Operacoes criticas no store do portal usam `runExclusive` para serializar escrita concorrente.
- Modelo prioriza simplicidade operacional e debugging local.

## Seguranca aplicada
- Sessao do portal depende de `PORTAL_SESSION_SECRET`.
- Painel admin pode exigir `ADMIN_PANEL_TOKEN`.
- Token de bot de instancia e armazenado com hash.
- Webhook Mercado Pago pode validar assinatura (`MERCADOPAGO_WEBHOOK_SECRET`).

## Portas e servicos
- `3100`: Portal SaaS (`/`, `/dashboard`, `/api/*`, `/health`)
- `3000`: Painel admin (`/admin`, `/api/*`)
- Bot Discord: conectado via gateway (sem porta HTTP dedicada para comandos)

## Tradeoffs tecnicos
- Praticidade: JSON local facilita deploy simples e iteracao rapida.
- Limite natural: para alto volume, migracao para banco relacional/documental e recomendada.
- Evolucao prevista: extrair filas/worker para partes de pagamento e entrega em larga escala.
