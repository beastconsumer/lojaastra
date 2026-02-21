# AstraSystems - Update Log

## Visao Geral
Este arquivo registra a evolucao do produto em formato de changelog executivo.
Cada entrada resume o impacto funcional entregue no commit correspondente.

## Linha do Tempo

### `aee6950` - 2026-02-21
**Enhance dashboard micro-interactions and premium motion polish**
- Refinamento de UX com micro-interacoes premium no dashboard.
- Melhorias de hover, press, feedback visual e animacoes sutis de status.
- Polimento de leitura e resposta da interface sem alterar identidade visual.

### `d3fcce8` - 2026-02-21
**Redesign post-login dashboard and add per-instance bot token flow**
- Redesenho completo da experiencia pos-login para operacao profissional.
- Introducao do fluxo por instancia com token proprio do bot do cliente.
- Validacao e armazenamento seguro do token com perfil de bot associado.

### `486767d` - 2026-02-21
**Harden bot runtime and add Next.js+Tailwind+shadcn site scaffold**
- Correcao de pontos criticos de runtime do bot.
- Base web moderna adicionada com Next.js, Tailwind, shadcn/ui e TypeScript.
- Estrutura preparada para evolucao de painel e escalabilidade de frontend.

### `366e36d` - 2026-02-14
**feat(wallet): platform Mercado Pago + withdrawals**
- Implantacao de carteira financeira com operacao de saques.
- Fluxo de transacoes e governanca financeira para operacao de plataforma.
- Base para conciliacao e historico de movimentacoes.

### `d20e618` - 2026-02-14
**feat(portal): AstraSystems dashboard + multi-tenant store**
- Entrega do portal SaaS com dashboard principal.
- Estrutura multi-tenant para separar operacao por cliente/instancia.
- Fundacao do fluxo de assinatura, acesso e gestao operacional.

### `016cdbe` - 2026-02-06
**Initial push to lojaastra**
- Publicacao inicial do projeto.
- Estrutura base de bot, painel e dados persistidos localmente.

## Atualizacao Local em Andamento
- Fluxo de criacao de instancia ajustado para exigir token do bot ja na criacao.
- Dashboard com video de fundo permanente (`painel.mp4`) e layout levemente ampliado.
- Containerizacao separada de bot e site via Docker Compose para operacao online.
