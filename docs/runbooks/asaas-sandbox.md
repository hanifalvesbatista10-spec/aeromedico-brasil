# Pagamento com Asaas: sandbox, teste de ponta a ponta e produção

Roteiro para ligar o pagamento pelo site (Asaas Checkout) e o frete (Melhor Envio), testar
tudo com dinheiro de mentira e só então passar para a conta real. Desenho em
[`docs/superpowers/specs/2026-10-22-pedidos-pagamento-asaas-design.md`](../superpowers/specs/2026-10-22-pedidos-pagamento-asaas-design.md).

**Regra do projeto:** as contas (Asaas, Melhor Envio, e-mail, domínio) são do dono do site. Quem faz
cadastro com documento (conta real) é o próprio dono; quem implanta recebe só a chave ou o
token e coloca na Vercel. Nunca cole chave, token ou segredo em chat, issue ou Git.

## O que faz o pagamento aparecer no carrinho

O botão "Finalizar pedido" só aparece quando **todas** estas variáveis existem (função `isCheckoutEnabled`):

| Variável | O que é |
|---|---|
| `ASAAS_API_KEY` | Chave de API (sandbox ou real) |
| `ASAAS_WEBHOOK_TOKEN` | Texto que você inventa (32 a 255 caracteres) e cadastra no webhook |
| `ASAAS_ENV` | `production` só na conta real; qualquer outro valor ou vazio = sandbox |
| `ORDERS_RPC_SECRET` | Segredo que protege a gravação dos pedidos (hash no banco) |
| `NEXT_PUBLIC_SITE_URL` | Endereço público do site (volta do pagamento) |
| `MELHOR_ENVIO_TOKEN`, `STORE_ORIGIN_CEP`, `MELHOR_ENVIO_CONTACT_EMAIL` | Frete; sem ele não há cotação |

Faltando qualquer uma, o carrinho não finaliza: ele calcula o subtotal e o frete (se o frete estiver
ligado) e avisa que o pagamento ainda não está disponível. Não há compra por WhatsApp. Dá para ligar
aos poucos.

## 1. Banco (uma vez)

1. Aplicar, nesta ordem, no SQL Editor do Supabase do projeto (depois das migrations anteriores):
   `supabase/migrations/20261022120000_store_orders.sql`,
   `supabase/migrations/20261023120000_store_orders_hardening.sql` (coluna de ambiente do pedido,
   pagamento que chega depois de cancelado vira "Pago: conferir estoque" e trava das variações) e
   `supabase/migrations/20261024120000_store_pix_discount.sql` (desconto no Pix no lugar da taxa repassada).
2. Gerar o segredo: um texto aleatório de **64 caracteres** (o site recusa menos de 32, porque ele é
   a única proteção do "marcar como pago"). Guardar em `ORDERS_RPC_SECRET` (`.env.local` e Vercel,
   **o mesmo valor** nos dois).
3. Gravar no banco só o **hash** do segredo, calculado no seu computador, para o segredo nunca ficar em
   texto no histórico do SQL Editor. No PowerShell, com o segredo carregado só nessa sessão:

   ```powershell
   $env:ORDERS_RPC_SECRET = "<SEGREDO>"
   node -e "const c=require('crypto');console.log(c.createHash('sha256').update(process.env.ORDERS_RPC_SECRET.trim()).digest('hex'))"
   ```

   Copie o texto hexadecimal que sair e rode no SQL Editor (uma vez; pode rodar de novo para trocar o
   segredo):

   ```sql
   insert into private.app_secrets (name, secret_hash)
   values ('orders', decode('<HASH_HEXADECIMAL>', 'hex'))
   on conflict (name) do update set secret_hash = excluded.secret_hash;
   ```

   O banco guarda **um** segredo só. Se o valor da Vercel for diferente do gravado aqui, toda
   gravação de pedido é recusada ("não autorizado").
4. Conferir (esperado: `taxas = 1`, `segredo = 1`, `funcoes = 5`, `ambiente = 1`; depois da migration do Pix,
   `select pix_discount_bp from public.store_payment_settings` devolve `500`):

   ```sql
   select
     (select count(*) from public.store_payment_settings) as taxas,
     (select count(*) from private.app_secrets where name = 'orders') as segredo,
     (select count(*)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in ('create_store_order', 'attach_store_order_checkout',
                           'cancel_store_order_pending', 'apply_store_order_event',
                           'get_store_order_public')) as funcoes,
     (select count(*)
        from information_schema.columns
       where table_schema = 'public' and table_name = 'store_orders'
         and column_name = 'environment') as ambiente;
   ```

## 2. Asaas sandbox

1. Criar a conta em `sandbox.asaas.com` (separada da real; não mexe em dinheiro).
2. Gerar a chave de API do sandbox e colocar em `ASAAS_API_KEY`, com `ASAAS_ENV=sandbox`.
3. Cadastrar o webhook no painel do sandbox:
   - **URL:** `https://<endereço do site>/api/webhooks/asaas`
   - **Token de autenticação:** o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - **Eventos:** os de Checkout (`CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED`,
     `CHECKOUT_EXPIRED`)
   - A fila é **pausada** depois de 15 falhas seguidas; se isso acontecer, corrija a causa e
     reative a fila no painel.
4. O Asaas não alcança `localhost`. Para testar o pagamento completo no seu computador use um
   túnel público temporário, ou teste em um deploy. **Não** coloque chaves de sandbox no ambiente
   de Production da Vercel: o site passaria a aceitar pagamento de mentira.
5. **Teste e produção dividem o mesmo banco.** Todo pedido guarda em qual ambiente do Asaas foi criado, e
   o painel marca os de sandbox com "Teste (sandbox)" e avisa para não enviar. Mesmo assim, limpe os
   pedidos de teste antes de ir ao ar (cancele-os ou peça a remoção por SQL) e **troque o
   `ORDERS_RPC_SECRET`** antes do lançamento (ver "Passagem para produção"): o valor usado no
   desenvolvimento ficou no seu computador.

### Dúvidas que só o teste responde

Registre o resultado aqui quando descobrir.

- O Checkout está liberado para conta de **pessoa física (CPF)**? O sandbox pode liberar mesmo que
  a conta real não tenha. Confirmar com o suporte do Asaas, pela conta real.
- O comprador consegue escolher 1x dentro do parcelado?
- Formato do `imageBase64` do item (base64 puro ou com prefixo `data:`). Hoje enviamos o logo
  reduzido em base64 puro (`src/lib/payments/checkout-image.ts`).
- O evento `CHECKOUT_PAID` traz `checkout.id`? É por ele que o pedido é encontrado.

Se o Checkout não estiver disponível para CPF, o plano B é cobrar pela API de cobranças
(`POST /v3/payments`) com a página de fatura. Muda `src/lib/payments/asaas.ts` e a ação de checkout.

## 3. Teste de ponta a ponta (sandbox)

Pré-requisitos: migration e segredo aplicados, variáveis preenchidas, pelo menos um produto
publicado com **peso e medidas**, e o site (ou túnel) acessível pelo Asaas.

| # | Cenário | Como | Esperado |
|---|---|---|---|
| 1 | Frete | No carrinho, informar o CEP e escolher uma opção | Opções de Correios/Jadlog; frete e total no resumo |
| 2 | Formas de pagamento | Com o frete escolhido, olhar "Forma de pagamento" | Pix com selo "5% OFF", cartão à vista e cartão parcelado sem juros, cada um com o total; o resumo mostra "Total no Pix" e "ou R$ X nas outras formas" |
| 3 | Pix | Preencher entrega, escolher Pix, finalizar; no painel do sandbox, **confirmar o Pix à mão** | O valor cobrado no Asaas é o total do Pix (com os 5% sobre os produtos, sem mexer no frete); volta em `/pedido/<id>?t=...` com a linha "Desconto no Pix"; depois de confirmar, o status vira "Pagamento confirmado" |
| 4 | Cartão | Pagar com `4444 4444 4444 4444`, qualquer validade futura, CVV `123` | Pagamento confirmado; estoque da variação baixou |
| 5 | Cartão recusado | Usar um cartão de teste recusado da documentação do Asaas | O pedido segue "Aguardando pagamento"; nada baixa do estoque |
| 6 | Cupom | Aplicar um cupom antes de pagar | Desconto no total; depois de pago, "Usos" do cupom sobe 1 |
| 7 | Estoque insuficiente | Com estoque 1, dois pedidos do mesmo item; pagar os dois | O segundo vira "Pago, conferir" (nada é baixado) e aparece em destaque em `/admin/pedidos` |
| 8 | Pedido expirado | Abrir o checkout e não pagar por 30 minutos (ou cancelar no painel do sandbox) | Status "Expirado" ou "Cancelado" |
| 9 | Evento repetido | Reenviar o mesmo evento pelo painel do Asaas | Estoque e cupom **não** mudam de novo |
| 10 | Andamento | Em `/admin/pedidos`: separação, enviado (com código de rastreio), entregue | A página do pedido do cliente mostra o código |
| 11 | Total que mudou | Com o checkout aberto, mudar o preço do produto no painel e tentar pagar | Aviso "o valor do pedido mudou"; não cobra |

Para provar o webhook sem esperar o Asaas, é possível simular a chamada (use o seu
`ASAAS_WEBHOOK_TOKEN`; o `checkout.id` deve ser o de um pedido real em "Aguardando pagamento"):

```bash
curl -i -X POST https://<site>/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: <ASAAS_WEBHOOK_TOKEN>" \
  -d '{"id":"evt_teste_1","event":"CHECKOUT_PAID","checkout":{"id":"<id do checkout>"}}'
```

Sem o cabeçalho (ou com token errado) a resposta é `401`. Repetir o mesmo `id` de evento devolve
`200` sem mudar nada.

## 4. Passagem para produção

1. **O dono do site** abre e conclui a conta real do Asaas (a análise de documentos é do Asaas).
2. Confirmar com o suporte se o Checkout está liberado para a conta (CPF ou CNPJ).
3. Gerar a chave de API **da conta real**. Guardá-la só na Vercel (Production), nunca no `.env.local`.
4. Na Vercel (Production): `ASAAS_ENV=production`, `ASAAS_API_KEY` (real), `ASAAS_WEBHOOK_TOKEN`
   (um valor novo e longo), `ORDERS_RPC_SECRET` (o mesmo gravado no banco) e `NEXT_PUBLIC_SITE_URL`
   com o endereço definitivo.
5. Cadastrar o webhook na conta **real**, com o token novo e os eventos de Checkout.
6. Melhor Envio: token da conta real (só a permissão `shipping-calculate`), `MELHOR_ENVIO_ENV=production`,
   CEP de origem real e e-mail do cliente.
7. Conferir o desconto do Pix e o máximo de parcelas em `/admin/pedidos` (seção "Condições de pagamento"). Não há
   taxa repassada ao comprador: o custo do Asaas (Pix, cartão e parcelamento) precisa estar no preço dos produtos.
8. Antes de divulgar: política de privacidade
   atualizada (CEP, dados de entrega, Asaas, Melhor Envio) e a conferência com o contador do desconto de 5% no
   Pix.
9. **Troque o segredo dos pedidos**: gere um `ORDERS_RPC_SECRET` novo, coloque-o na Vercel (Production) e
   regrave o hash no banco (passo 3 de "Banco"), no mesmo momento. O valor do desenvolvimento não deve
   proteger a loja real.
10. **Limite de requisições (Vercel Firewall):** crie regras de rate limit por IP para as chamadas `POST`
    em `/carrinho` (as ações de frete, cotação e pedido) e em `/api/webhooks/asaas`. Sem isso, um script
    consegue criar milhares de pedidos "aguardando pagamento" (enche o banco com dados falsos, gasta a cota
    do Asaas e do Melhor Envio). Pedido aguardando pagamento não expira sozinho no banco: use o filtro
    "Aguardando pagamento" e cancele os órfãos (sem checkout) no painel.
11. Fazer **uma compra real de valor baixo** e conferir o pedido, a confirmação e o painel.
12. Só então `git push` na `main` (publica o site) e redeploy na Vercel com as variáveis novas.

## Operação do dia a dia

- **Etiqueta e rastreio:** o site só **cota** o frete. A etiqueta é comprada no painel do Melhor Envio
  (com saldo); o código de rastreio é colado em `/admin/pedidos` ao marcar "Enviado".
- **"Pago: conferir estoque":** o pagamento foi confirmado, mas o estoque não cobria a compra, então nenhum item foi
  descontado do estoque. Confira o estoque ou fale com o cliente antes de separar. O mesmo status aparece
  quando um pagamento chega **depois** de o pedido ter sido cancelado: o dinheiro entrou e é preciso estornar
  ou retomar o pedido.
- **Cancelar pedido pago:** mudar o andamento no painel **não devolve o dinheiro**. O estorno é feito no
  painel do Asaas e o estoque é ajustado à mão.
- **Trocar o segredo dos pedidos:** gere outro, atualize a Vercel e rode o `insert ... on conflict` do
  passo 1 com o novo valor, nessa ordem, no mesmo momento.

## Limitações conhecidas (decididas na revisão antes do lançamento)

Nenhuma bloqueia vender com acompanhamento do dono, mas todas pedem atenção:

- **Limite de usos do cupom.** O limite só é conferido na cotação. Vários compradores com o mesmo cupom e pedidos
  abertos ao mesmo tempo podem passar do limite, porque o uso só é contado quando o pagamento é confirmado.
  O prejuízo máximo é o valor do desconto.
- **Cancelar não desfaz nada.** Cancelar um pedido pago não devolve o dinheiro, não repõe o estoque e não
  desconta o uso do cupom: o estorno é no painel do Asaas e o resto é ajuste manual.
- **Estorno e contestação não chegam ao pedido.** O webhook só trata eventos de Checkout. Um pedido estornado ou
  contestado no Asaas continua "Pago" no painel: confira o painel do Asaas antes de enviar pedidos antigos.
- **O pagamento não é conferido na API do Asaas.** Quem confirma o pedido é o webhook, protegido pelo
  `ASAAS_WEBHOOK_TOKEN`. Se esse token vazar, troque-o no site e no Asaas na hora.
- **Pedidos aguardando pagamento ficam até alguém cancelar.** Os que o Asaas expira ou cancela se resolvem pelo
  webhook; os órfãos (sem checkout) podem ser cancelados no painel.
- **O painel mostra os 200 pedidos mais recentes.** O restante fica no banco.
- **Dados pessoais dos pedidos** (nome, e-mail, telefone, endereço) ficam guardados sem prazo e só o administrador
  lê. Não há rotina de exclusão: atender um pedido de exclusão do titular (LGPD) hoje exige SQL manual.
- **O dono confere o estoque do "Pago: conferir estoque" à mão.** Pedido resolvido pelo dono não baixa estoque
  nem conta cupom sozinho.
