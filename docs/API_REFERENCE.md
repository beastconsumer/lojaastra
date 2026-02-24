# API Reference - AstraSystems

## Base URLs
- Portal: `http://127.0.0.1:3100`
- Admin: `http://127.0.0.1:3000`

## Autenticacao
### Portal
- Sessao por cookie HTTP-only.
- Login local (`/auth/local/*`) ou Discord OAuth (`/auth/discord`).

### Admin
- Header `Authorization: Bearer <ADMIN_PANEL_TOKEN>` quando habilitado.
- Em modo monitor, endpoints de edicao podem ficar bloqueados.

## Health e status
- `GET /health` (portal): healthcheck basico.
- `GET /api/bot/status` (portal): status de integracoes e runtime.
- `GET /api/status` (admin): status do bot/painel.

## Portal - autenticacao e conta
- `GET /auth/discord`
- `GET /auth/discord/callback`
- `POST /auth/local/register`
- `POST /auth/local/login`
- `POST /auth/local/change-password`
- `POST /auth/logout`
- `GET /api/me`
- `PUT /api/me/profile`

## Portal - instancias
- `GET /api/instances`
- `POST /api/instances`
- `PUT /api/instances/:id`
- `DELETE /api/instances/:id`
- `PUT /api/instances/:id/bot-token`
- `DELETE /api/instances/:id/bot-token`
- `POST /api/instances/:id/bot/start`
- `POST /api/instances/:id/bot/stop`
- `POST /api/instances/:id/bot/restart`
- `POST /api/instances/:id/rotate-key`

## Portal - Discord por instancia
- `GET /api/instances/:id/discord/channels`
- `POST /api/instances/:id/discord/post-product`
- `GET /api/discord/guilds`
- `GET /api/bot/invite`

## Portal - catalogo e estoque por instancia
- `GET /api/instances/:id/products`
- `POST /api/instances/:id/products`
- `PUT /api/instances/:id/products/:productId`
- `DELETE /api/instances/:id/products/:productId`
- `GET /api/instances/:id/stock/:productId`
- `PUT /api/instances/:id/stock/:productId`

## Portal - planos, checkout e wallet
- `GET /api/plans/catalog`
- `POST /api/plans/trial`
- `POST /api/checkout/plan`
- `POST /webhooks/mercadopago`
- `GET /api/wallet/transactions`
- `GET /api/wallet/withdrawals`
- `POST /api/wallet/withdrawals`
- `POST /api/wallet/withdrawals/:id/cancel`
- `GET /api/admin/withdrawals` (admin portal)
- `POST /api/admin/withdrawals/:id/complete`
- `POST /api/admin/withdrawals/:id/reject`

## Admin - operacao comercial
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/stock`
- `PUT /api/stock/:productId`
- `GET /api/coupons`
- `POST /api/coupons`
- `POST /api/coupons/:code/toggle`
- `DELETE /api/coupons/:code`
- `GET /api/orders`
- `GET /api/carts`
- `GET /api/deliveries`
- `GET /api/customers`

## Admin - monitoramento e diagnostico
- `GET /api/diagnostics`
- `GET /api/business/overview`
- `GET /api/logs/recent`
- `GET /api/monitor/requests`
- `GET /api/admin/users`
- `POST /api/admin/users/:discordUserId/block`
- `POST /api/admin/users/:discordUserId/unblock`

## Admin - operacoes manuais
- `POST /api/orders/:id/resync`
- `POST /api/orders/:id/manual-deliver`
- `POST /api/orders/retry-waiting-stock`
- `POST /api/carts/:id/confirm-manual`
- `POST /api/carts/:id/cancel`
- `POST /api/discord/post-product`
- `POST /api/discord/repost-product`

## Observacoes
- Muitos endpoints retornam `error` em texto curto para facilitar tratamento no frontend.
- Fluxos financeiros e de runtime dependem das variaveis de ambiente corretas.
- Para exemplos de payload, use as chamadas reais feitas pelos frontends:
  - `src/portal/app.js`
  - `src/admin/app.js`
