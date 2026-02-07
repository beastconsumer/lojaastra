# Bot DC - Vendas

## Setup rapido
1. Instale Node.js (versao LTS).
2. No terminal, dentro da pasta do projeto, rode: npm install
3. Crie o arquivo .env com o token do bot e a chave do Asaas.
4. Edite config.json com IDs do servidor e admin.
5. Coloque as imagens em assets/product1 (banner.png, preview.png, delivery.png, thumb.png, gif1.gif, gif2.gif).
6. Inicie com: npm start

## Painel web
- Configure ADMIN_PANEL_TOKEN no .env para proteger o painel.
- Inicie o bot e acesse http://127.0.0.1:3000/admin
- Para acessar fora do PC, defina ADMIN_PANEL_HOST=0.0.0.0 e libere a porta no firewall.
- O painel altera products.json e stock.json e o bot usa as mudancas na hora.
- O painel inclui cupons, pedidos, carrinhos, posts, entregas e clientes.
- Cada produto pode ter `DM title`, `DM template padrao`, `DM template PIX` e `DM template ADMIN` para personalizar a entrega.
- O estoque no painel agora valida key duplicada entre buckets (`default`, `shared` e variacoes).
- A postagem bloqueia se alguma variacao nao tiver cobertura de key (propria ou fallback).
- O estoque `shared` tambem e editavel no painel.
- O painel tem preview em tempo real da DM de entrega (PIX/Admin), com placeholders preenchidos antes de salvar.
- O painel mostra historico de confirmacoes manuais em cada pedido.
- O painel permite confirmar compra manualmente direto na tabela de carrinhos.
- O painel permite `retry waiting_stock` em lote para pedidos sem estoque apos reposicao.
- O painel tem checagem de saude dos posts (mensagem/canal) e repost por linha.
- O dashboard inclui diagnostico de consistencia entre produtos/estoque/pedidos/carrinhos/posts.
- Ao iniciar, o console mostra o link do painel.

## Comandos
- !produtos -> lista IDs de produtos e quantidade de variacoes
- !postar <productId> [channelId] [--purge|--no-purge] -> posta qualquer produto
- !postar1 -> compatibilidade (posta product1 no canal atual com limpeza)
- !repost <productId> [channelId] [--force] [--purge] -> re-posta produto salvo em posts.json
- !admin -> menu admin rapido (cupons + post do produto padrao)

## Confirmacao manual no carrinho
- O embed do carrinho tem o botao `Confirmar compra`.
- Apenas usuarios admin do bot podem confirmar.
- Ao confirmar, o bot cria/atualiza o pedido e roda o mesmo fluxo de entrega (estoque, DM, logs e fallback no canal).
- No painel admin, tambem existe acao de confirmacao manual na tabela de carrinhos.

## Placeholders da DM por produto
- `{{productName}}` `{{variantLabel}}` `{{orderValue}}` `{{couponCode}}` `{{discountPercent}}`
- `{{key}}` `{{sourceLabel}}` `{{orderId}}` `{{paymentId}}` `{{userId}}` `{{channelId}}`

## Observacoes
- Os dados ficam em JSON local dentro da pasta data/.
- O estoque de keys fica em data/stock.json (remova as chaves usadas do arquivo).
- Entrega automatica acontece quando o pagamento Pix for confirmado pelo Asaas.
- Para limpar o canal ao usar !postar1, o bot precisa de permissao Gerenciar mensagens.
- Nao compartilhe o token em chat.
- Logs completos podem ser controlados por LOG_LEVEL no .env (debug, info, warn, error).

## Estoque (exemplo)
```json
{
  "stock": {
    "product1": {
      "default": [],
      "1d": [],
      "7d": [],
      "30d": []
    }
  }
}
```

