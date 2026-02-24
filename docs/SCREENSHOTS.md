# Galeria de Telas - AstraSystems

Capturas oficiais em padrao desktop, com descricao profissional de contexto e objetivo de cada tela.

## Portal publico (desktop)
### 01 - Home
Descricao: landing principal com proposta comercial, comparativo de margens e CTA direto para conversao.
![Home Desktop](./screenshots/01-home-desktop.png)

### 02 - Login
Descricao: entrada de autenticacao para clientes com foco em acesso rapido ao dashboard.
![Login Desktop](./screenshots/02-login-desktop.png)

### 03 - Plans
Descricao: pagina de planos com trial e assinatura paga, mostrando oferta e beneficios operacionais.
![Plans Desktop](./screenshots/03-plans-desktop.png)

### 04 - Tutorials
Descricao: onboarding guiado para reduzir friccao entre cadastro, configuracao e primeira venda.
![Tutorials Desktop](./screenshots/04-tutorials-desktop.png)

### 05 - Terms
Descricao: termos de servico para enquadramento de uso, pagamento e responsabilidade da plataforma.
![Terms Desktop](./screenshots/05-terms-desktop.png)

### 06 - Privacy
Descricao: politica de privacidade com transparencia sobre coleta e uso de dados.
![Privacy Desktop](./screenshots/06-privacy-desktop.png)

## Dashboard do cliente (desktop autenticado)
### 07 - Overview
Descricao: cockpit principal do cliente com status de plano, saude da operacao e atalhos de acao.
![Dashboard Overview](./screenshots/07-dashboard-overview-desktop.png)

### 08 - Instances
Descricao: gestao de instancias, controle de runtime e comandos start/stop/restart do bot.
![Dashboard Instances](./screenshots/08-dashboard-instances-desktop.png)

### 09 - Store
Descricao: workspace de catalogo e estoque por instancia, incluindo produtos e variacoes.
![Dashboard Store](./screenshots/09-dashboard-store-desktop.png)

### 10 - Wallet
Descricao: centro financeiro do cliente com saldo, extrato e fluxo de saque.
![Dashboard Wallet](./screenshots/10-dashboard-wallet-desktop.png)

### 11 - Account
Descricao: configuracoes de conta e resumo de identidade/plano do usuario.
![Dashboard Account](./screenshots/11-dashboard-account-desktop.png)

## Painel Admin (desktop)
### 12 - Admin full page
Descricao: visao completa da pagina administrativa para analise de densidade informacional e estrutura.
![Admin Full Desktop](./screenshots/12-admin-full-desktop.png)

### 13 - Resumo
Descricao: quadro executivo com KPIs e indicadores centrais de operacao.
![Admin Resumo Desktop](./screenshots/13-admin-resumo-desktop.png)

### 14 - Operacao
Descricao: painel de negocio com recortes de vendas, instancias e performance operacional.
![Admin Operacao Desktop](./screenshots/14-admin-operacao-desktop.png)

### 15 - Solicitacoes
Descricao: fila de pendencias operacionais para tratamento priorizado (pedidos, saques e runtime).
![Admin Solicitacoes Desktop](./screenshots/15-admin-solicitacoes-desktop.png)

### 16 - Contas
Descricao: gestao administrativa de usuarios com controle de status, bloqueio e historico.
![Admin Contas Desktop](./screenshots/16-admin-contas-desktop.png)

### 17 - Auditoria
Descricao: trilha de eventos e logs para investigacao tecnica e governanca de operacao.
![Admin Auditoria Desktop](./screenshots/17-admin-auditoria-desktop.png)

### 18 - Pedidos
Descricao: visao de pedidos com suporte a acao manual, reprocessamento e acompanhamento de entrega.
![Admin Pedidos Desktop](./screenshots/18-admin-pedidos-desktop.png)

## Regenerar capturas
1. Suba o app local (`npm start` ou `scripts/run-bot.ps1`).
2. Execute:

```powershell
npm run docs:screenshots
```

O script gera automaticamente os arquivos `.png` em `docs/screenshots/`.
