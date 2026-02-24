# Portfolio Case Study - AstraSystems

## Resumo executivo
O AstraSystems e um SaaS de vendas para Discord com foco em operacao real.
O sistema cobre o ciclo completo: onboarding, plano, instancia, publicacao, venda, entrega e saque.

## Problema
Operacoes de venda em Discord costumam ser fragmentadas:
- bot sem painel de operacao;
- pagamentos sem reconciliacao;
- pouca visibilidade de pedidos/estoque;
- baixo controle multi-tenant.

## Solucao
Construir uma plataforma integrada em Node.js com tres blocos:
1. Runtime do bot (comercial e entrega).
2. Portal do cliente (gestao de instancia, plano e wallet).
3. Painel admin (monitoramento, auditoria e operacao).

## Arquitetura aplicada
- Multi-tenant por `instanceId`.
- Runtime por instancia com Docker.
- Persistencia em JSON com escrita atomica.
- APIs separadas para portal/admin.
- Fluxo de pagamento e webhook integrado.

## Entregas tecnicas
- Cadastro/login local e OAuth Discord.
- Trial e plano pago com checkout.
- Wallet com creditos por venda e solicitacao de saque.
- Gestao de produtos, variacoes, estoque e cupons.
- Publicacao de produto no Discord e entrega automatica.
- Painel de observabilidade operacional e negocio.

## Decisoes de engenharia
### Por que JSON local?
- Setup simples para MVP/operacao inicial.
- Baixa friccao para evoluir produto.
- Facilidade de backup e debugging.

### Quando migrar para banco?
- Aumento forte de volume concorrente.
- Necessidade de consultas complexas/historicas.
- Requisitos de compliance/HA mais rigidos.

## Riscos mapeados
- Dependencia de integracoes externas (Discord, gateway de pagamento).
- Necessidade de governanca em runtime Docker por instancia.
- Necessidade de monitoramento de estoque para evitar `waiting_stock`.

## Resultado de produto
- Jornada end-to-end funcional.
- Camada administrativa pronta para operacao.
- Base organizada para escalar funcionalidades e observabilidade.

## Roadmap sugerido
1. Migrar persistencia para banco gerenciado.
2. Introduzir filas (pagamento/entrega/notificacao).
3. Adicionar testes automatizados de API e fluxo critico.
4. Criar painel de metricas em tempo real.
