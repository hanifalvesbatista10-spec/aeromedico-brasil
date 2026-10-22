# Pedidos e pagamento com Asaas — desenho

Data: 2026-10-22 · Continua `2026-10-17-loja-mentoria-area-cliente-design.md` (seções 3 e 4). Onde a conversa decidiu, está marcado **[decidido]**. Onde foi escolha minha, **[minha escolha]** (pode ser trocada). Onde a documentação não confirma, **[a confirmar]**.

## Intenção

Hoje o carrinho calcula subtotal, cupom e frete e termina numa mensagem de WhatsApp. O cliente quer vender de verdade: o comprador paga produto + frete no site, o dono recebe um **pedido gravado** (itens, preços, endereço, status) e o dinheiro cai na conta do Asaas. Este desenho cobre só **gravar o pedido e cobrar**; despachar (etiqueta Melhor Envio) e a área do cliente vêm depois.

## Decidido

- **[decidido]** O dono do site é **pessoa física (CPF)**.
- **[decidido]** O pagamento geral usa o **Asaas**. Mercado Pago, Pagar.me e Stripe ficam de fora.
- **[decidido]** O frete continua pelo **Melhor Envio** (cotação já implementada; token a configurar).

## Pesquisado na documentação do Asaas

- **Asaas Checkout** é uma página de pagamento hospedada: `POST /v3/checkouts` devolve um `id`; o link é `https://asaas.com/checkoutSession/show?id=<id>`. `billingTypes` aceita **`PIX` e `CREDIT_CARD`** (não boleto). `chargeTypes`: `DETACHED` (à vista), `INSTALLMENT`, `RECURRENT`. `items[]` com `name`, `description`, `quantity`, `value`; `callback` com `successUrl`, `cancelUrl`, `expiredUrl`; `minutesToExpire` de 10 a 1440; `externalReference` liga o checkout ao pedido; `customerData` é opcional (o pagador preenche na página).
- **Confirmação só por webhook**: o redirecionamento do navegador **não** prova pagamento. Eventos de checkout: `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`. Entrega "pelo menos uma vez" (pode repetir): usar o `id` do evento como chave de idempotência.
- **Autenticação do webhook**: se o webhook tem `authToken`, o Asaas manda o valor no cabeçalho `asaas-access-token` (32 a 255 caracteres, diferente da chave de API). Responder `200` logo, sem processar devagar; **15 falhas seguidas podem pausar a fila**. Sandbox e produção têm webhooks independentes.
- **Sandbox**: conta separada em `sandbox.asaas.com`, API em `https://api-sandbox.asaas.com/v3` (produção `https://api.asaas.com/v3`), chave de API própria de cada ambiente. Pagamentos Pix/boleto de teste são confirmados **à mão**; cartão aprovado de teste `4444 4444 4444 4444`, CVV `123`.
- **[a confirmar]** A documentação lida não diz se o **Checkout e a API estão liberados para conta de pessoa física**, nem se o evento `CHECKOUT_PAID` carrega `externalReference` e os ids de pagamento (o exemplo documentado traz só `checkout.id`). O desenho se protege: guardamos o `checkout.id` no pedido e casamos por ele. Plano B, se o Checkout não estiver disponível para CPF: cobrança avulsa `POST /v3/payments` com a página da fatura (também é do Asaas, mesmo webhook por `PAYMENT_*`).

## O que será construído

1. **Dados do comprador e entrega** no carrinho, depois de escolher o frete: nome, e-mail, telefone/WhatsApp e endereço completo (CEP já vem da cotação). **[minha escolha]** Sem CPF: o próprio Asaas pede os dados do pagador na página de pagamento e não os guardamos.
2. **Pedido gravado** antes de cobrar, com um **retrato** dos preços (itens, cupom, frete, total) e status `aguardando_pagamento`. Número legível sequencial (ex.: `AB-000123`).
3. **Checkout Asaas**: o servidor cria o checkout com **um único item** "Pedido AB-000123" no valor do total (descrição resume os itens). **[minha escolha]** Um item só evita arredondar desconto e frete linha a linha. À vista, Pix + cartão, expira em 60 minutos, `externalReference` = id do pedido. O cliente é levado ao link do Asaas.
4. **Webhook** `POST /api/webhooks/asaas`: confere `asaas-access-token`, grava o evento (idempotente) e muda o pedido: pago, cancelado ou expirado. Ao ficar **pago**: baixa o estoque e conta o uso do cupom, tudo numa única operação do banco.
5. **Página do pedido** `/pedido/<id>?t=<chave>` (chave aleatória longa, sem login): mostra número, itens, total e status; é o destino de sucesso do checkout.
6. **Painel `/admin/pedidos`**: lista e detalhe (comprador, endereço, itens, cupom, frete, status do pagamento) e mudança manual de andamento: em separação, enviado (com código de rastreio digitado), entregue, cancelado.
7. **Convivência com o WhatsApp**: o botão "Finalizar pelo WhatsApp" continua como plano B. O botão "Pagar" só aparece quando Asaas **e** frete estão configurados.

## Objetivos, não objetivos, antiobjetivos

**Objetivos:** o valor cobrado é sempre o que o servidor calculou; pedido só vira "pago" por webhook autenticado; estoque e cupom não ficam inconsistentes; o dono enxerga tudo no painel.

**Não objetivos (ficam para depois):** comprar etiqueta e rastrear pelo Melhor Envio; conta do comprador e "área do cliente" (repetir pedido, endereço salvo); e-mail transacional; reembolso por API (o dono estorna no painel do Asaas); nota fiscal; parcelamento; boleto; cursos e mentoria pagos.

**Antiobjetivos (falha mesmo funcionando):** cobrar valor errado ou aceitar preço vindo do navegador; marcar pago sem confirmação autenticada; pedido pago e estoque negativo sem aviso; um comprador ver o pedido de outro; chave do Asaas ou segredo no código ou no navegador; webhook forjado alterar pedido.

## Restrições

- Sem `service_role`. **[minha escolha]** Quem grava pedido e confirma pagamento é o servidor, por **funções SQL `security definer` que exigem um segredo do servidor** (`ORDERS_RPC_SECRET`, guardado no banco em tabela sem acesso público e conferido dentro da função). É uma credencial restrita a poucas operações, não a chave-mestra. Alternativa descartada por ora: liberar `service_role` só no servidor (mais simples, porém poder total).
- Tabelas de pedido: RLS ligada, administrador (`is_admin()`) lê e atualiza o andamento; visitante não lê nada. A página do pedido lê por função que confere a chave.
- Valores em centavos. O servidor **refaz tudo** ao criar o pedido: itens e preços (`priceCart`), cupom (`evaluateCoupon`), e **cota o frete de novo** com o provedor, escolhendo a mesma opção por id. Se o preço do frete mudou desde que o cliente viu, devolve aviso e pede para confirmar.
- Variáveis só de servidor: `ASAAS_API_KEY`, `ASAAS_ENV` (`sandbox`/`production`, padrão sandbox), `ASAAS_WEBHOOK_TOKEN`, `ORDERS_RPC_SECRET`. `NEXT_PUBLIC_SITE_URL` já existe e define os retornos.
- Migrations são arquivos; o responsável executa. SQL completo também no chat.
- Sem push nem deploy sem aprovação; trabalho na `main`.

## Decisões do estoque e do cupom **[minha escolha]**

- Estoque baixa **quando o pagamento é confirmado**, não ao criar o pedido (sem reserva). Se ao confirmar faltar estoque, o pedido fica `pago_revisar` e o painel destaca: o dono resolve (troca ou estorno). Evita travar estoque com Pix que ninguém paga.
- Uso do cupom conta **no pagamento confirmado**. O limite de usos é conferido ao criar o pedido.

## Privacidade (LGPD)

Passamos a guardar nome, e-mail, telefone e endereço de entrega. Isso precisa entrar na política de privacidade (texto jurídico, já pendente de revisão) antes de divulgar. Sem CPF no nosso banco. Definir prazo de guarda dos pedidos com o contador.

## O que fica para quem constrói

Nomes de tabelas e colunas, forma exata das funções SQL, layout do formulário de entrega e das telas do painel, mapeamento dos campos do webhook depois de observar o payload real no sandbox.

## Perguntas que são suas

1. **Parcelamento**: lançar só à vista? (padrão deste desenho) Parcelar é política de preço do dono e custa taxa maior.
2. **Aviso de pedido novo**: sem e-mail transacional, o dono vê no painel. Aceita assim por enquanto, ou quer um aviso por WhatsApp/e-mail na próxima fase?
3. **Credencial restrita por segredo** (acima) em vez de `service_role`: de acordo?
4. **Prazo do Pix**: 60 minutos serve?

## Antes de construir (da sua parte)

- Criar a conta no **sandbox do Asaas** (`sandbox.asaas.com`) e a chave de API de sandbox; testar se o **Asaas Checkout** está liberado para a sua conta de CPF.
- Gerar o **token do sandbox do Melhor Envio** e confirmar o tipo (token do painel, validade de 1 ano, ou OAuth de 30 dias) para eu tratar a renovação.
- O **número real de WhatsApp** do cliente (o botão atual depende dele).
