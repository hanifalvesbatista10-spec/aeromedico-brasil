# Pedidos e pagamento com Asaas — plano de implementação

> **Para quem executa:** use `superpowers:executing-plans` (ou `subagent-driven-development`). Os passos usam caixas `- [ ]`.

**Objetivo:** o comprador escolhe Pix, cartão à vista ou cartão de 2x a 6x (com a taxa do Asaas repassada ao preço), informa contato e endereço, é levado à página de pagamento do Asaas e o dono vê o pedido, pago ou não, no painel.

**Arquitetura:** o servidor refaz todo o cálculo (itens, cupom, frete cotado de novo, taxa) e grava o pedido por **funções SQL `security definer` que exigem um segredo do servidor** (`ORDERS_RPC_SECRET`). Cria o Asaas Checkout com um item só (o total já com taxa) e recebe a confirmação por webhook autenticado e idempotente, que baixa estoque e conta o cupom numa única operação do banco. O visitante não lê nada das tabelas de pedido; o dono lê e atualiza o andamento por RLS (`is_admin()`).

**Tech Stack:** Next.js 16, TypeScript, Zod, `fetch` nativo, Supabase (migration manual), Vitest + Testing Library. **Sem dependência nova.**

**Spec:** `docs/superpowers/specs/2026-10-22-pedidos-pagamento-asaas-design.md` (aprovada). Planos anteriores: carrinho, cupom e frete (`2026-10-20-*.md`).

**Documentação do Asaas a consultar** (cada tarefa de integração começa por ela; a doc é a verdade, este plano só resume): autenticação e cabeçalhos `https://docs.asaas.com/docs/autenticação-1.md`; criar checkout `https://docs.asaas.com/docs/introdução-1.md` e `https://docs.asaas.com/reference/criar-novo-checkout`; eventos `https://docs.asaas.com/docs/eventos-para-checkout`; webhook `https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook.md`; sandbox `https://docs.asaas.com/docs/faq-sandbox.md`.

## Restrições globais

- **Sem `service_role`.** Escrita de pedido e confirmação só pelas funções com segredo; o segredo nunca vai ao navegador nem a log.
- Valores em **centavos**; o navegador **nunca** define preço, frete, taxa ou total: ele só diz qual forma de pagamento escolheu e qual opção de frete.
- Variáveis só de servidor: `ASAAS_API_KEY`, `ASAAS_ENV` (`production` ou `sandbox`; ausente = sandbox), `ASAAS_WEBHOOK_TOKEN`, `ORDERS_RPC_SECRET`. Nunca ler/imprimir valores; citar só os nomes. `.env.example` ganha os nomes sem valor.
- Pedido só vira **pago** por webhook com `asaas-access-token` válido. Retorno do navegador **não** confirma pagamento.
- Erros esperados voltam como valor `{ ok, ... }`; mensagem do Asaas ou do banco **nunca** chega ao cliente.
- Interface em pt-BR; textos novos marcados **[copy]** passam pelo `copy-editor-ptbr`.
- Sem dado inventado. Migrations são arquivos; o responsável executa; o SQL completo vai também no chat.
- Trabalhar na `main`; commits locais; **sem push** sem aprovação.

## Foco de revisão

1. Navegador manda forma, frete ou valor adulterado: o servidor usa só o que ele mesmo calcula; total cobrado = total do servidor. (Tasks 4 e 6)
2. Webhook forjado, repetido ou fora de ordem: token inválido não muda nada; o mesmo evento duas vezes baixa estoque e cupom **uma vez só**. (Tasks 2, 3 e 7)
3. Estoque insuficiente na hora da confirmação: pedido vai para `pago_revisar`, estoque nunca fica negativo. (Task 2)
4. Preço do frete mudou entre o que o cliente viu e a criação do pedido: nada é cobrado, o cliente é avisado e confirma de novo. (Task 4)
5. Asaas fora do ar ou lento ao criar o checkout: o cliente recebe mensagem clara e **nenhum pedido pendente fica pendurado**; tentar de novo cria um pedido novo, sem cobrança dupla. (Tasks 5 e 6)
6. Alguém tenta ver o pedido de outro: sem a chave certa a resposta é igual à de pedido inexistente. (Tasks 2 e 8)

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/payments/fees.ts` | taxa repassada: `feeFor`, `paymentOptions`, padrões |
| `supabase/migrations/20261022120000_store_orders.sql` | tabelas, RLS, segredo, funções |
| `src/lib/types.ts`, `src/lib/supabase/types.ts` | `StoreOrder*`, `PaymentFees`, linhas do banco |
| `src/lib/repositories/**/orders*`, `**/payment-settings*` | repositórios de pedido e de taxas |
| `src/lib/orders/buyer.ts`, `src/lib/orders/quote.ts` | validação do comprador; recálculo no servidor |
| `src/lib/payments/asaas.ts` | cliente do Asaas Checkout |
| `src/lib/actions/checkout.ts` | `quoteCheckoutAction`, `placeOrderAction` |
| `src/app/api/webhooks/asaas/route.ts` | webhook |
| `src/components/store/cart-checkout.tsx`, `cart-view.tsx`, `src/app/(public)/carrinho/page.tsx` | pagamento no carrinho |
| `src/app/(public)/pedido/[id]/page.tsx` | página do pedido |
| `src/components/admin/orders-manager.tsx`, `payment-fees-panel.tsx`, `src/app/admin/(dashboard)/pedidos/page.tsx` | painel |

---

### Task 1: Taxa repassada (função pura)

**Files:** Create `src/lib/payments/fees.ts`; Test `src/lib/payments/__tests__/fees.test.ts`.

**Interfaces:**
- Produces:
  ```ts
  export type PaymentMethod = "pix" | "card_single" | "card_installments";
  export interface FeeRule { fixedCents: number; percentBp: number }          // 349 = 3,49%
  export interface PaymentFees { pix: FeeRule; cardSingle: FeeRule; cardInstallments: FeeRule; maxInstallments: number }
  export const DEFAULT_PAYMENT_FEES: PaymentFees  // pix {199,0} · cardSingle {49,299} · cardInstallments {49,349} · maxInstallments 6
  export function feeFor(orderCents: number, rule: FeeRule): { feeCents: number; totalCents: number }
  export interface PaymentOption { method: PaymentMethod; label: string; feeCents: number; totalCents: number; installments: number | null; installmentCents: number | null }
  export function paymentOptions(orderCents: number, fees: PaymentFees): PaymentOption[]   // ordem: pix, card_single, card_installments
  ```
  `totalCents = ceil((orderCents + fixedCents) × 10000 / (10000 − percentBp))`, **em inteiros** (sem `Math.ceil` de divisão decimal); `feeCents = totalCents − orderCents`. Rótulos **[copy]**: "Pix", "Cartão à vista", "Cartão em até {N}x". Parcelado: `installments = maxInstallments`, `installmentCents = ceil(total / N)`.

- [ ] **Step 1: Testes que falham.** Pedido de 10000: Pix → total 10199; cartão à vista → 10359; 2x a 6x → 10413 (fee 413). Propriedade: para 200 valores de pedido (1 a 500000) e cada regra, `total − (floor(total × percentBp / 10000) + fixedCents)` ≥ `orderCents` (a taxa do Asaas descontada do total nunca deixa o dono com menos) e o total anterior (`total − 1`) deixaria o dono com menos (o arredondamento é o mínimo). Pedido 0 → só a taxa fixa; percentual 0 → só a fixa; `percentBp: 10000` rejeitado (erro). `paymentOptions` devolve 3 opções na ordem certa, com `installments: 6` e `installmentCents: ceil(10413/6) = 1736` no parcelado, e `null` nos outros.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/payments/__tests__/fees.test.ts` — esperado: FALHA.
- [ ] **Step 3: Implementar** (`feeFor` lança `Error` se `percentBp` ≥ 10000 ou valores não inteiros/negativos).
- [ ] **Step 4: Rodar** — PASSA. **Step 5: Commit** `feat: taxa do meio de pagamento repassada ao cliente (funcao pura)`.

---

### Task 2: Migration do banco

**Files:** Create `supabase/migrations/20261022120000_store_orders.sql`.

**Interfaces:**
- Produces (nomes que os repositórios usam):
  - `public.store_payment_settings` (singleton `id boolean`): `pix_fixed_cents`, `pix_percent_bp`, `card_single_fixed_cents`, `card_single_percent_bp`, `card_installments_fixed_cents`, `card_installments_percent_bp` (inteiros ≥ 0; `*_percent_bp` < 10000), `max_installments` (1 a 21, padrão 6), `updated_at`; linha inicial com os padrões da Task 1. RLS: **todos leem** (não é segredo), só `is_admin()` escreve.
  - `public.store_orders`: `id uuid`, `number bigint` (identity, único), `access_token text` (gerado na criação), `status` com CHECK em `awaiting_payment, paid, paid_review, preparing, shipped, delivered, canceled, expired`, comprador (`customer_name`, `customer_email`, `customer_phone`), entrega (`ship_cep`, `ship_street`, `ship_number`, `ship_complement`, `ship_district`, `ship_city`, `ship_state`), frete (`ship_option_id`, `ship_label`), valores em centavos (`subtotal_cents`, `discount_cents`, `coupon_code`, `shipping_cents`, `fee_cents`, `total_cents`, todos ≥ 0 e `total_cents = subtotal_cents − discount_cents + shipping_cents + fee_cents`), `payment_method` (CHECK nas 3 formas), `asaas_checkout_id` (único parcial), `asaas_checkout_url`, `tracking_code`, `notes`, `created_at`, `paid_at`, `updated_at`.
  - `public.store_order_items`: `order_id` (cascade), `product_id`/`variant_id` (`on delete set null`), retrato do item (`name`, `size`, `color_name`, `unit_price_cents`, `quantity` > 0, `weight_grams`).
  - `public.store_order_events`: `event_id text` **único**, `type`, `order_id`, `payload jsonb`, `created_at`.
  - `private.app_secrets (name text primary key, secret_hash bytea)` no schema `private` (não exposto pela API). Função interna `private.check_secret(p_name text, p_secret text) returns boolean` (`sha256(convert_to(p_secret,'utf8')) = secret_hash`, tempo constante não exigido). Instrução, em comentário, para o responsável gravar o hash do segredo: `insert into private.app_secrets values ('orders', sha256(convert_to('<SEGREDO>','utf8')))`.
  - Funções `security definer`, `set search_path = ''`, `revoke all ... from public`, `grant execute ... to anon, authenticated`, **todas começam conferindo o segredo** (exceto `get_store_order_public`, que confere a chave do pedido):
    - `create_store_order(p_secret text, p_order jsonb) returns jsonb` → grava pedido + itens (valida soma do total e quantidades) e devolve `{id, number, access_token}`.
    - `attach_store_order_checkout(p_secret text, p_order_id uuid, p_checkout_id text, p_checkout_url text) returns void`.
    - `apply_store_order_event(p_secret text, p_event_id text, p_type text, p_checkout_id text, p_payload jsonb) returns text` → grava o evento (se o `event_id` já existe devolve `'duplicate'` e não faz mais nada); `CHECKOUT_PAID` em pedido `awaiting_payment` ou `expired`: marca `paid`/`paid_at`, baixa estoque (`stock = stock − qty` só onde `stock` não é nulo; **se alguma variação não tiver estoque suficiente**, nada é baixado dessa linha, o pedido fica `paid_review` e a função devolve `'paid_review'`), soma 1 em `store_coupons.uses_count` do `coupon_code`, devolve `'paid'`; `CHECKOUT_CANCELED` e `CHECKOUT_EXPIRED` só mudam pedido `awaiting_payment` (para `canceled`/`expired`); qualquer outro tipo ou pedido desconhecido devolve `'ignored'`.
    - `cancel_store_order_pending(p_secret text, p_order_id uuid) returns void` → cancela o pedido **só se** ainda estiver `awaiting_payment` e sem `asaas_checkout_id` (usada quando o Asaas falha ao criar o checkout).
    - `get_store_order_public(p_order_id uuid, p_token text) returns jsonb` → resumo (número, status, valores, itens, forma de pagamento, rastreio) **sem** e-mail, telefone nem endereço completo; chave errada = `null`.
  - RLS: `store_orders`, `store_order_items`, `store_order_events` — `revoke all ... from anon`, `revoke truncate ... from authenticated`; `select` para `is_admin()`; `update` em `store_orders` só para `is_admin()`. Triggers `set_updated_at`.

- [ ] **Step 1: Escrever o SQL** conforme acima, com cabeçalho no padrão das migrations anteriores (pré-requisitos, como aplicar, segurança) e a instrução do segredo.
- [ ] **Step 2: Revisão mecânica:** reler o arquivo conferindo (a) `search_path` vazio e nomes qualificados em todas as funções, (b) segredo conferido **antes** de qualquer leitura/escrita, (c) nenhuma coluna de dados pessoais em `get_store_order_public`, (d) `revoke all from public` + `grant` em todas as funções, (e) baixa de estoque e uso de cupom no **mesmo** corpo da função que muda para `paid`, (f) `event_id` único antes de qualquer efeito. Registrar o resultado no ledger.
- [ ] **Step 3: Commit** `feat: migration de pedidos, taxas e funcoes protegidas por segredo`.

---

### Task 3: Tipos e repositórios

**Files:** Modify `src/lib/types.ts`, `src/lib/supabase/types.ts`, `src/lib/repositories/types.ts`, `src/lib/repositories/index.ts`; Create `src/lib/repositories/mock/orders.ts`, `mock/payment-settings.ts`, `supabase/orders.ts`, `supabase/orders-mapping.ts`, `supabase/payment-settings.ts`; Test `src/lib/repositories/__tests__/orders.test.ts`, `orders-mapping.test.ts`, `payment-settings.test.ts`.

**Interfaces:**
- Consumes: `PaymentFees`, `PaymentMethod` (Task 1).
- Produces:
  ```ts
  export type OrderStatus = "awaiting_payment" | "paid" | "paid_review" | "preparing" | "shipped" | "delivered" | "canceled" | "expired";
  export interface OrderDraft {            // montado pelo servidor
    customer: { name: string; email: string; phone: string };
    address: { cep: string; street: string; number: string; complement: string | null; district: string; city: string; state: string };
    shipping: { optionId: string; label: string; cents: number };
    items: { productId: string; variantId: string | null; name: string; size: string | null; colorName: string | null; unitPriceCents: number; quantity: number; weightGrams: number }[];
    subtotalCents: number; discountCents: number; couponCode: string | null; feeCents: number; totalCents: number;
    paymentMethod: PaymentMethod;
  }
  export interface StoreOrder extends Omit<OrderDraft, "items"> { id: string; number: number; status: OrderStatus; items: OrderDraft["items"]; checkoutId: string | null; trackingCode: string | null; notes: string | null; createdAt: string; paidAt: string | null }
  export interface PublicOrder { id: string; number: number; status: OrderStatus; items: { name: string; size: string | null; colorName: string | null; quantity: number; unitPriceCents: number }[]; subtotalCents: number; discountCents: number; shippingCents: number; feeCents: number; totalCents: number; paymentMethod: PaymentMethod; trackingCode: string | null }
  export type ApplyEventResult = "paid" | "paid_review" | "duplicate" | "ignored" | "canceled" | "expired";
  export interface OrderRepository {
    create(draft: OrderDraft): Promise<{ id: string; number: number; accessToken: string }>;      // servidor, com segredo
    attachCheckout(orderId: string, checkout: { id: string; url: string }): Promise<void>;
    cancelPending(orderId: string): Promise<void>;          // cancela pedido sem checkout (Asaas falhou)
    applyEvent(event: { eventId: string; type: string; checkoutId: string; payload: unknown }): Promise<ApplyEventResult>;
    getPublic(orderId: string, token: string): Promise<PublicOrder | null>;
    list(): Promise<StoreOrder[]>;                                                               // admin (RLS)
    updateFulfillment(id: string, patch: { status?: OrderStatus; trackingCode?: string | null; notes?: string | null }): Promise<StoreOrder | null>;
  }
  export interface PaymentSettingsRepository { get(): Promise<PaymentFees>; update(fees: PaymentFees): Promise<PaymentFees> }   // get cai em DEFAULT_PAYMENT_FEES se a tabela não existir
  ```
  `getRepositories().orders` e `.paymentSettings`. A implementação Supabase de `create`/`attachCheckout`/`cancelPending`/`applyEvent` chama `supabase.rpc(...)` passando `process.env.ORDERS_RPC_SECRET` (lança `Error` claro se ausente, sem o valor).

- [ ] **Step 1: Testes que falham.** Mock de pedidos: `create` devolve id/número crescente e token longo; `applyEvent`: `CHECKOUT_PAID` marca pago e baixa estoque do mock de variações **uma vez**; o mesmo `eventId` de novo → `duplicate` sem repetir; estoque insuficiente → `paid_review` e estoque intacto; `CHECKOUT_CANCELED` só afeta `awaiting_payment`; tipo desconhecido → `ignored`; `cancelPending` cancela só pedido `awaiting_payment` sem checkout (pedido com checkout ou já pago não muda); `getPublic` com token errado e com id inexistente → `null` (mesma resposta); `updateFulfillment` troca status e rastreio. Mapeamento (linha ↔ domínio, JSON do `get_store_order_public`). `PaymentSettings`: padrão quando a tabela falha; `update` valida (percentual < 10000, parcelas 1 a 21).
- [ ] **Step 2: Rodar** `npx vitest run src/lib/repositories/__tests__/orders.test.ts src/lib/repositories/__tests__/orders-mapping.test.ts src/lib/repositories/__tests__/payment-settings.test.ts` — FALHA.
- [ ] **Step 3: Implementar** tipos, mock (espelhando as regras das funções SQL), mapeamento e Supabase.
- [ ] **Step 4: Rodar** + `npx tsc --noEmit` — PASSA. **Step 5: Commit** `feat: tipos e repositorios de pedidos e taxas`.

---

### Task 4: Dados do comprador e recálculo no servidor

**Files:** Create `src/lib/orders/buyer.ts`, `src/lib/orders/quote.ts`; Test `src/lib/orders/__tests__/buyer.test.ts`, `quote.test.ts`.

**Interfaces:**
- Consumes: `priceCart`, `evaluateCoupon`, `normalizeCouponCode`, `getShippingProvider`/`ShippingProvider`, `paymentOptions`, `PaymentFees`, `OrderDraft`, `CouponRepository.findActiveByCode`, repositório `store`.
- Produces:
  ```ts
  export const buyerSchema   // Zod: { name, email, phone, cep, street, number, complement?, district, city, state }
  export type BuyerInput = z.input<typeof buyerSchema>
  export interface CheckoutSelection { lines: CartLine[]; couponCode: string | null; shipping: { optionId: string; cep: string; expectedCents: number }; method: PaymentMethod }
  export type CheckoutQuote =
    | { ok: true; subtotalCents: number; discountCents: number; couponCode: string | null; shipping: { optionId: string; label: string; cents: number; cep: string }; orderCents: number; options: PaymentOption[]; chosen: PaymentOption }
    | { ok: false; code: "invalid-input" | "empty-cart" | "shipping-unavailable" | "shipping-changed" | "unavailable"; error: string; newShippingCents?: number }
  export async function computeCheckoutQuote(selection: unknown, deps: { store: StoreRepository; coupons: CouponRepository; shippingProvider: ShippingProvider | null; fees: PaymentFees; now: Date }): Promise<CheckoutQuote>
  ```
  Regras: valida `selection` (Zod; método ∈ 3 formas; CEP normalizado); `priceCart` com o catálogo; sem item válido → `empty-cart`; cupom reavaliado com o subtotal **do servidor** (cupom inválido não impede: segue sem desconto, e o desconto some); **frete cotado de novo** pelo provedor para o CEP e `optionId`: opção não encontrada ou provedor ausente/falho → `shipping-unavailable`; preço diferente de `expectedCents` → `shipping-changed` com `newShippingCents`; `orderCents = subtotal − desconto + frete`; `options = paymentOptions(orderCents, fees)`; `chosen` = a do método. Mensagens **[copy]**: "O valor do frete mudou para R$ X. Confira e confirme de novo." / "Não foi possível confirmar o frete agora. Tente de novo."
  `buyerSchema`: nome 2..120; e-mail válido; telefone com 10 ou 11 dígitos (aceita máscara); CEP 8 dígitos; rua, bairro, cidade não vazios; número obrigatório (aceita "S/N"); UF de 2 letras maiúsculas válida; complemento opcional.

- [ ] **Step 1: Testes que falham.** `buyer`: e-mail inválido, telefone curto, UF "xx"/"SP "→"SP", CEP com hífen normaliza, número "S/N" ok, complemento vazio → `null`. `quote` (mocks): total do servidor ignora campos extras e qualquer total vindo no `selection`; frete refeito: opção inexistente → `shipping-unavailable`; preço diferente → `shipping-changed` com `newShippingCents`; provedor `null` → `shipping-unavailable`; desconto de cupom válido reduz `orderCents` e cupom expirado/inexistente segue **sem** desconto; item esgotado fora do total; `options` bate com `paymentOptions`; `chosen.method` = método pedido; carrinho vazio → `empty-cart`; método inválido → `invalid-input`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/orders` — FALHA. **Step 3: Implementar.** **Step 4: Rodar** — PASSA.
- [ ] **Step 5: Commit** `feat: dados do comprador e recalculo do pedido no servidor`.

---

### Task 5: Cliente do Asaas Checkout

**Files:** Create `src/lib/payments/asaas.ts`; Test `src/lib/payments/__tests__/asaas.test.ts`.

**Interfaces:**
- Produces:
  ```ts
  export interface AsaasConfig { apiKey: string; environment: "sandbox" | "production"; webhookToken: string }
  export function readAsaasConfig(env: Record<string, string | undefined>): AsaasConfig | null     // exige ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN (>= 32 caracteres); ASAAS_ENV === "production" → produção, senão sandbox
  export function asaasBaseUrl(environment): string          // https://api-sandbox.asaas.com/v3 | https://api.asaas.com/v3
  export function buildCheckoutRequest(config: AsaasConfig, input: { orderId: string; orderNumber: number; totalCents: number; method: PaymentMethod; maxInstallments: number; itemsSummary: string; siteUrl: string; accessToken: string }): { url: string; init: RequestInit }
  export function checkoutLink(config: AsaasConfig, checkoutId: string): string   // https://asaas.com/checkoutSession/show?id=<id> (sandbox: host do sandbox, conforme a doc)
  export function createAsaasCheckout(config: AsaasConfig, input, fetchImpl?: typeof fetch): Promise<{ ok: true; id: string; url: string } | { ok: false; reason: "unavailable" | "rejected" }>
  export function getAsaasConfig(): AsaasConfig | null       // process.env
  ```
  **Antes de codar, consultar as páginas de autenticação e de criação de checkout** e conferir: nome do cabeçalho da chave (`access_token`), se o `User-Agent` é exigido, host do link no sandbox. Corpo: `billingTypes` e `chargeTypes` por método (Pix → `["PIX"]`+`["DETACHED"]`; cartão à vista → `["CREDIT_CARD"]`+`["DETACHED"]`; parcelado → `["CREDIT_CARD"]`+`["INSTALLMENT"]` com `installment.maxInstallmentCount = maxInstallments`), **um item** `{ name: "Pedido AB-000123", description: itemsSummary (≤ 200 caracteres, cortado com "…"), quantity: 1, value: totalCents/100 }`, `minutesToExpire: 30`, `externalReference: orderId`, `callback`: `successUrl` = `${siteUrl}/pedido/${orderId}?t=${accessToken}`, `cancelUrl` = `${siteUrl}/carrinho`, `expiredUrl` = `${siteUrl}/carrinho`. Sem `customer` e sem `customerData`. Timeout de 10 s (AbortController). Status 4xx → `rejected`; 5xx, rede, timeout, corpo sem `id` → `unavailable`; **chave nunca em log** (só status e `error.name`).

- [ ] **Step 1: Testes que falham.** Config: completa → objeto; `ASAAS_WEBHOOK_TOKEN` curto, chave vazia → `null`; `production` só quando exato. Pedido: URL do sandbox e de produção; cabeçalhos exatos (conforme a doc lida); corpo dos 3 métodos (com `maxInstallmentCount: 6` só no parcelado); valor em reais com 2 casas (`10413 → 104.13`); item único e descrição cortada; `minutesToExpire` 30; `externalReference`; URLs de retorno. Cliente (fetch falso): 200 com `{id}` → `ok` + link; 400 → `rejected`; 500/rede/`AbortError`/corpo sem id → `unavailable`; a chave **não** aparece em `console.error`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/payments/__tests__/asaas.test.ts` — FALHA. **Step 3: Implementar.** **Step 4: Rodar** — PASSA.
- [ ] **Step 5: Commit** `feat: cliente do Asaas Checkout (pedido, resposta e config)`.

---

### Task 6: Ações do checkout

**Files:** Create `src/lib/actions/checkout.ts`; Test `src/lib/actions/__tests__/checkout.test.ts`.

**Interfaces:**
- Consumes: `computeCheckoutQuote`, `buyerSchema`, `createAsaasCheckout`, `getAsaasConfig`, `getShippingProvider`, repositórios (`orders`, `paymentSettings`, `store`, `coupons`).
- Produces:
  ```ts
  export type CheckoutEnabled = boolean                       // Asaas configurado E frete configurado E ORDERS_RPC_SECRET presente
  export function isCheckoutEnabled(): boolean
  export async function quoteCheckoutAction(selection: unknown): Promise<CheckoutQuote>
  export type PlaceOrderResult = { ok: true; checkoutUrl: string } | { ok: false; code: "disabled" | "invalid-buyer" | "quote" | "unavailable"; error: string; quote?: Extract<CheckoutQuote, { ok: false }> }
  export async function placeOrderAction(selection: unknown, buyer: unknown): Promise<PlaceOrderResult>
  ```
  `placeOrderAction`: (1) checkout desligado → `disabled` **[copy]** "O pagamento pelo site ainda não está disponível. Finalize pelo WhatsApp."; (2) valida o comprador (primeira mensagem do Zod); (3) `computeCheckoutQuote` de novo (nunca confia na cotação anterior); falha → `quote` com o objeto; (4) `orders.create(draft)` — `draft.feeCents/totalCents` vêm da cotação do servidor, `couponCode` só se o desconto foi aplicado; (5) `createAsaasCheckout`; falha (`rejected` ou `unavailable`) → `orders.cancelPending(orderId)` e devolve `unavailable` **[copy]** "Não foi possível abrir o pagamento agora. Tente de novo."; (6) `attachCheckout`; devolve `checkoutUrl`. `unstable_rethrow` nos catches.

- [ ] **Step 1: Testes que falham** (dependências mockadas). Desligado → `disabled`, nada criado. Comprador inválido → `invalid-buyer` sem criar pedido. Total enviado pelo navegador é **ignorado**: com `selection` trazendo `totalCents: 1`, o rascunho criado usa o total do servidor. `shipping-changed` volta como `quote` e **nenhum pedido é criado**. Caminho feliz: `orders.create` recebe itens e valores do servidor, `createAsaasCheckout` recebe `totalCents` com taxa, `attachCheckout` é chamado, devolve a URL. Asaas `rejected` ou `unavailable` → `cancelPending` chamado com o id e **nenhum** `attachCheckout`; resposta `unavailable`. Erro do repositório → `unavailable` sem vazar a mensagem original. `quoteCheckoutAction` repassa `computeCheckoutQuote`.
- [ ] **Step 2: Rodar** `npx vitest run src/lib/actions/__tests__/checkout.test.ts` — FALHA. **Step 3: Implementar.**
- [ ] **Step 4: Rodar** — PASSA. **Step 5: Commit** `feat: acoes do checkout (cotacao e criacao do pedido)`.

---

### Task 7: Webhook do Asaas

**Files:** Create `src/app/api/webhooks/asaas/route.ts`; Test `src/app/api/webhooks/asaas/__tests__/route.test.ts`.

**Interfaces:**
- Consumes: `getAsaasConfig`, `orders.applyEvent` (Task 3).
- Produces: `POST /api/webhooks/asaas`. **Antes de codar, ler as páginas de webhook e de eventos de checkout** (cabeçalho `asaas-access-token`, formato do corpo: `id`, `event`, `checkout.id`). Regras: `ASAAS_WEBHOOK_TOKEN` ausente → 503 sem processar; cabeçalho ausente ou diferente (comparação em tempo constante) → **401** sem tocar no banco; corpo que não é JSON ou sem `id`/`event` → 400; evento com `checkout.id` → `applyEvent({ eventId: body.id, type: body.event, checkoutId: body.checkout.id, payload: body })`; resultado qualquer (`paid`, `duplicate`, `ignored`...) → **200** `{ ok: true }`; erro do repositório → **500** (para o Asaas tentar de novo) e `console.error` só com o nome do erro. Resposta rápida: nenhuma chamada de rede além do banco.

- [ ] **Step 1: Testes que falham** (repositório mockado): sem token configurado → 503; token errado/ausente → 401 e `applyEvent` não chamado; JSON inválido → 400; `CHECKOUT_PAID` válido → `applyEvent` com `eventId`, `type` e `checkoutId` certos e resposta 200; resultado `duplicate` também 200; evento sem `checkout.id` (ex.: outro tipo) → 200 sem chamar o repositório; `applyEvent` lançando → 500; o token nunca aparece em `console.error`.
- [ ] **Step 2: Rodar** `npx vitest run src/app/api/webhooks` — FALHA. **Step 3: Implementar.** **Step 4: Rodar** — PASSA.
- [ ] **Step 5: Commit** `feat: webhook do Asaas autenticado e idempotente`.

---

### Task 8: Página do pedido

**Files:** Create `src/app/(public)/pedido/[id]/page.tsx`, `src/components/store/order-summary.tsx`; Test `src/components/store/__tests__/order-summary.test.tsx`.

**Interfaces:**
- Consumes: `orders.getPublic`, `PublicOrder`, `formatBRL`.
- Produces: `OrderSummary({ order }: { order: PublicOrder })` (Server Component puro): título "Pedido AB-000123", status em texto **[copy]** ("Aguardando pagamento", "Pagamento confirmado", "Pagamento em análise do dono da loja", "Em separação", "Enviado", "Entregue", "Cancelado", "Expirado"), lista de itens (nome, tamanho/cor, quantidade, preço), linhas Subtotal, Desconto (se houver), Frete, **Taxa do meio de pagamento** (se houver), Total, e rastreio quando existir. A página lê `?t=` e chama `getPublic(id, t)`; `null` → `notFound()`; `robots: { index: false }`; **não** diz "pago" por causa do retorno: só pelo status do banco; enquanto `awaiting_payment` mostra "Aguardando pagamento. Esta página atualiza quando o pagamento for confirmado." com um link "Atualizar".

- [ ] **Step 1: Testes que falham:** cada status mostra o texto certo; Desconto e Taxa só aparecem quando maiores que zero; rastreio aparece só quando existe; total e linhas em reais; `awaiting_payment` mostra o aviso e o link "Atualizar" e **não** a palavra "confirmado".
- [ ] **Step 2: Rodar** — FALHA. **Step 3: Implementar** componente e página. **Step 4: Rodar** + `npx tsc --noEmit` — PASSA.
- [ ] **Step 5: Commit** `feat: pagina do pedido com chave de acesso`.

---

### Task 9: Pagamento no carrinho

**Files:** Create `src/components/store/cart-checkout.tsx`; Modify `src/components/store/cart-view.tsx`, `src/app/(public)/carrinho/page.tsx`; Test `src/components/store/__tests__/cart-checkout.test.tsx`, `cart-view.test.tsx`.

**Interfaces:**
- Consumes: `quoteCheckoutAction`, `placeOrderAction`, `PaymentOption`, `ShippingSelection` (já existe em `cart-shipping.tsx`), `CartLine`, `formatBRL`.
- Produces: `CartCheckout({ lines, couponCode, shipping }: { lines: CartLine[]; couponCode: string | null; shipping: ShippingSelection })` — só é renderizado quando há frete escolhido **e** `checkoutEnabled`. Mostra: grupo de opções de pagamento (`fieldset` "Forma de pagamento", radio por opção com **total e taxa**: "Pix · R$ 101,99 (inclui taxa de R$ 1,99)", "Cartão à vista · R$ 103,59 (taxa R$ 3,59)", "Cartão em até 6x · R$ 104,13 (taxa R$ 4,13), 6x de R$ 17,36" **[copy]**), formulário do comprador (nome, e-mail, telefone, CEP já preenchido e travado, rua, número, complemento, bairro, cidade, UF) e o botão **"Pagar"**. Ao mudar carrinho, cupom, frete ou CEP a cotação é refeita (`quoteCheckoutAction`) e os totais atualizam; `shipping-changed` mostra o novo frete em `role="alert"` e pede para confirmar de novo; clicar em Pagar chama `placeOrderAction` e, com sucesso, `window.location.assign(checkoutUrl)`; erro vira `role="alert"` e o botão volta (`aria-disabled` durante o envio, sem `disabled`). `CartView` ganha a prop `checkoutEnabled: boolean`; com ela e frete escolhido renderiza `CartCheckout` **no lugar** do botão "Finalizar pelo WhatsApp", que continua quando `checkoutEnabled` é falso (com o texto atual). A página `carrinho/page.tsx` calcula `checkoutEnabled` com `isCheckoutEnabled()` e passa. O resumo do carrinho continua mostrando Subtotal, Desconto, Frete; o **Total com taxa** aparece na opção escolhida.

- [ ] **Step 1: Testes que falham** (ações mockadas): sem frete escolhido não há bloco de pagamento; com frete, mostra as 3 opções com os totais da cotação do servidor (valores vindos do mock, não calculados na tela); trocar a opção atualiza o total destacado; Pagar sem preencher mostra o erro do comprador e não chama `placeOrderAction`; preenchido, chama com `{ lines, couponCode, shipping: { optionId, cep, expectedCents }, method }` e o comprador, e redireciona para `checkoutUrl`; `shipping-changed` mostra o novo valor em `role="alert"` e **não** redireciona; erro `unavailable` mostra a mensagem; durante o envio o botão tem `aria-disabled` e um segundo clique não envia de novo; com `checkoutEnabled` falso o botão do WhatsApp continua e `CartCheckout` não aparece; desconto e total anunciados na região de status existente; alvos de toque de 44 px e contorno de foco próprio.
- [ ] **Step 2: Rodar** `npx vitest run src/components/store` — FALHAM os casos novos. **Step 3: Implementar.** **Step 4: Rodar** + `npm test` — PASSA.
- [ ] **Step 5: Commit** `feat: pagamento com Asaas no carrinho (forma, dados e redirecionamento)`.

---

### Task 10: Painel de pedidos e das taxas

**Files:** Create `src/components/admin/orders-manager.tsx`, `payment-fees-panel.tsx`, `src/app/admin/(dashboard)/pedidos/page.tsx`, `src/lib/actions/orders.ts`, `src/lib/validation/payment-fees.ts`; Modify `src/components/admin/admin-nav-items.ts` (item "Pedidos", ícone `ClipboardList`); Test `src/components/admin/__tests__/orders-manager.test.tsx`, `payment-fees-panel.test.tsx`, `src/lib/actions/__tests__/orders.test.ts`, `src/lib/validation/__tests__/payment-fees.test.ts`.

**Interfaces:**
- Consumes: `orders.list`, `orders.updateFulfillment`, `paymentSettings.get/update`, `requireAdmin`.
- Produces: ações `updateOrderFulfillment(id, patch)` e `savePaymentFees(input)` (ambas `requireAdmin()` primeiro, retorno `{ ok, ... }`); `paymentFeesSchema` (percentual em **%** com vírgula, ex. "2,99" → 299 bp; fixa em reais, ex. "0,49" → 49; parcelas 1 a 21; percentual < 100); `OrdersManager({ initialOrders })` — lista (número, data, comprador, total, forma, status) com filtro por status, destaque para `paid_review`, detalhe em diálogo (comprador, telefone, e-mail, endereço completo, itens, valores, cupom, frete, forma, link para copiar do rastreio) e troca de andamento: em separação, enviado (com código de rastreio), entregue, cancelado; só permite transições coerentes (pago → separação → enviado → entregue; cancelar em qualquer um exceto entregue); `PaymentFeesPanel({ initialFees })` com os 3 meios e o máximo de parcelas, explicando que são as taxas do contrato do Asaas. A página tolera falha de leitura (tabelas ainda não criadas) com `EmptyState` explicativo. Ações anunciam o resultado em região de status; o foco não se perde.

- [ ] **Step 1: Testes que falham.** Validação das taxas: "2,99" → 299; "0,49" → 49; percentual "100" e "abc" recusados; parcelas 0 e 22 recusadas. Ações: sem admin → rejeita e não toca o repositório; transição inválida (entregue → separação) recusada; enviado sem código recusado. Painel: lista vazia mostra o aviso; pedido `paid_review` aparece destacado; abrir o detalhe mostra endereço e itens; marcar "Enviado" com código chama a ação e atualiza a linha, anunciando o resultado; salvar taxas converte e envia centavos/pontos-base; erro da ação em `role="alert"`.
- [ ] **Step 2: Rodar** `npx vitest run src/components/admin src/lib/actions/__tests__/orders.test.ts src/lib/validation` — FALHA. **Step 3: Implementar** (modelo: `coupons-manager.tsx`, `coupon-dialog.tsx`, ações de cupom). **Step 4: Rodar** + `npx tsc --noEmit` — PASSA.
- [ ] **Step 5: Commit** `feat: painel de pedidos e das taxas do Asaas`.

---

### Task 11: Portões, documentação, SQL no chat e revisão final

**Files:** Modify `.env.example`, `README.md`; Create `docs/runbooks/asaas-sandbox.md`.

- [ ] **Step 1:** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — limpos; `/admin/pedidos`, `/pedido/[id]` e `/api/webhooks/asaas` listadas.
- [ ] **Step 2:** *Mutation check*: quebrar (a) o arredondamento da taxa, (b) a checagem do token do webhook, (c) a idempotência de `applyEvent` no mock, (d) a releitura do frete no servidor; ao menos um teste falha em cada; desfazer.
- [ ] **Step 3:** Documentar as quatro variáveis no `.env.example` e escrever `docs/runbooks/asaas-sandbox.md`: criar a conta e a chave no sandbox, configurar o webhook (URL `https://<site>/api/webhooks/asaas`, `authToken` igual a `ASAAS_WEBHOOK_TOKEN`, eventos de Checkout), gerar `ORDERS_RPC_SECRET` e gravar o hash no banco, roteiro de teste de ponta a ponta (Pix confirmado à mão no sandbox, cartão `4444 4444 4444 4444`, cartão recusado, estoque, cupom, pedido expirado) e a passagem para produção.
- [ ] **Step 4:** Revisão por subagentes em paralelo sobre todo o intervalo do plano: revisor de código (modelo mais capaz), `security-release-reviewer` (funções `security definer`, segredo, webhook, ação pública, LGPD), `a11y-seo-auditor` (formulário de entrega, opções de pagamento, painel), `copy-editor-ptbr` (textos **[copy]**). Reclassificar por efeito; **uma** passada de correções, cada uma com teste que falha antes.
- [ ] **Step 5:** Commits de docs e correções; colar o **SQL completo no chat**; listar os commits e as pendências do dono (contas sandbox, chave, segredo, número de WhatsApp, política de privacidade para dados pessoais, parecer do contador sobre repasse de taxa). **Sem push** sem aprovação.

---

## Autoavaliação

- **Cobertura da spec:** formas e taxa repassada (Task 1); pedido gravado e segredo restrito (Tasks 2-3); recálculo no servidor, frete refeito, cupom (Task 4); Asaas Checkout, expiração de 30 min, item único, `externalReference` (Task 5); criação do pedido e falha do Asaas sem pedido pendurado (Task 6); webhook autenticado, idempotente, estoque e cupom na confirmação, `pago_revisar` (Tasks 2, 3, 7); página do pedido por chave (Task 8); pagamento e dados no carrinho com WhatsApp como plano B (Task 9); painel de pedidos e taxas editáveis (Task 10); documentação do sandbox, privacidade e parecer do contador (Task 11).
- **Consistência de tipos:** `PaymentMethod`, `PaymentFees`, `PaymentOption` (Task 1) → `OrderDraft`/`OrderRepository` (Task 3) → `CheckoutQuote` (Task 4) → `createAsaasCheckout` (Task 5) → `placeOrderAction` (Task 6) usam os mesmos nomes. `cancelPending` e `cancel_store_order_pending` nascem já nas Tasks 2 e 3 e são consumidos na Task 6.
- **Tarefas que dependem do responsável:** 1, 2 (arquivo), 3, 4, 8 e 10 não precisam de conta Asaas. **5 a 7 e 9** são testáveis por mocks, mas o teste ponta a ponta no sandbox (Task 11) exige a chave de API de sandbox, o `ASAAS_WEBHOOK_TOKEN`, o `ORDERS_RPC_SECRET`, a migration aplicada e o token do Melhor Envio.
- **Decisões minhas (podem ser trocadas):** sem CPF no nosso banco; item único no Asaas; estoque baixa na confirmação; taxas editáveis no painel; página do pedido por chave na URL.
