# Loja — catálogo, vitrine e painel do dono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à marca principal um catálogo de produtos físicos (camisetas com tamanhos e cores, bonés, patches e o que vier depois) com vitrine pública e painel onde o dono cadastra, edita, organiza e exclui tudo sozinho.

**Architecture:** Mesmo padrão do CMS existente: tipos de domínio, contrato de repositório com implementação mock (testes) e Supabase (produção), Server Actions com Zod e `requireAdmin()`, painel em `/admin/loja` e páginas públicas `/loja` e `/loja/[slug]`. Lógica de preço e de variações em funções puras testadas. Esta fase **não** inclui carrinho, cupom, frete, pagamento nem pedidos: o botão de compra usa o WhatsApp do cliente, como a mentoria.

**Tech Stack:** Next.js 16, TypeScript, Zod, Vitest, Supabase (Postgres + RLS + bucket `site-media` já existente).

**Spec:** `docs/superpowers/specs/2026-10-17-loja-mentoria-area-cliente-design.md` (seções 3 e 5). Este é o segundo de quatro planos: carrinho/cupom/frete, pagamento/pedidos e área do cliente virão depois.

## Global Constraints

- Migrations são **arquivos SQL** em `supabase/migrations/`; nenhum agente os aplica. O responsável executa no SQL Editor **antes** de qualquer deploy desta fase; sem as tabelas, `/loja` falha.
- Somente chave publicável; nunca `service_role`. Autorização por RLS + `is_admin()` (padrão de `20260905120100_cms_rls.sql`).
- Dinheiro em **centavos (inteiros)**; exibição em reais pt-BR (`R$ 49,90`).
- Não inventar produto, preço, cor, tamanho, peso ou foto. O catálogo nasce **vazio**; o dono cadastra. Nenhum dado de demonstração no banco.
- Imagens sobem pelo `MediaUploader` existente para o bucket público `site-media`.
- Sem push, sem deploy; commits locais na branch `feat/loja-mentoria-area-cliente`.
- Textos em português do Brasil. Preservar identidade visual e as rotas existentes.

## Review Focus

1. Produto não publicado, variação não publicada ou categoria não publicada nunca aparece em `/loja`, nem para administrador logado.
2. Preço digitado como `"49,90"`, `"49.90"`, `"R$ 49,90"`, `""` e `"abc"`: valores válidos viram 4990 centavos, vazio e lixo são rejeitados (nunca `NaN` nem 0 silencioso).
3. Produto sem variações: vende o produto único; produto com variações sem nenhuma publicada: aparece como indisponível, sem botão de compra.
4. Estoque: variação com `stock = 0` aparece esgotada; `stock = null` significa sem limite.
5. Slug duplicado ao criar produto: erro claro em português, não erro bruto do banco.

## File Structure

- Create `supabase/migrations/20261018120000_store_catalog.sql` — tabelas `store_categories`, `store_products`, `store_variants`, `store_product_images`, índices e RLS.
- Create `src/lib/money.ts` — `formatBRL`, `parseBRLToCents`.
- Create `src/lib/store/variants.ts` — opções e resolução de variação, disponibilidade.
- Modify `src/lib/types.ts` — tipos `StoreCategory`, `StoreProduct`, `StoreVariant`, `StoreProductImage`.
- Modify `src/lib/supabase/types.ts` — linhas do banco correspondentes.
- Modify `src/lib/repositories/types.ts` — `StoreRepository`.
- Create `src/lib/repositories/mock/store.ts`, `src/lib/repositories/supabase/store.ts`; modify `src/lib/repositories/index.ts`.
- Create `src/lib/validation/store.ts` — schemas Zod de produto, variação e categoria.
- Create `src/lib/actions/store.ts` — Server Actions do painel.
- Create `src/app/admin/(dashboard)/loja/page.tsx`, `src/components/admin/store-manager.tsx`; modify `src/components/admin/admin-nav-items.ts`.
- Create `src/app/(public)/loja/page.tsx`, `src/app/(public)/loja/[slug]/page.tsx`, `src/components/store/product-card.tsx`, `src/components/store/variant-picker.tsx`.
- Modify `src/components/layout/nav-links.ts`, `src/app/sitemap.ts`.
- Tests ao lado de cada módulo de `src/lib/**/__tests__/`.

---

### Task 1: Dinheiro em centavos

**Files:** Create `src/lib/money.ts`; Test `src/lib/__tests__/money.test.ts`

**Interfaces:**
- Produces: `formatBRL(cents: number): string`; `parseBRLToCents(input: string): number | null`

- [ ] **Step 1: Write the failing tests:** `formatBRL(4990)` → `"R$ 49,90"` (com espaço sem quebra aceito: comparar após `.replace(/ /g, " ")`); `formatBRL(0)` → `"R$ 0,00"`; `formatBRL(123456)` → `"R$ 1.234,56"`. `parseBRLToCents`: `"49,90"`, `"49.90"`, `"R$ 49,90"`, `"R$ 1.234,56"` → `4990`, `4990`, `4990`, `123456`; `"50"` → `5000`; `""`, `"abc"`, `"-5"`, `"49,999"` → `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/money.test.ts` — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** as duas funções (`Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`; o parser aceita no máximo duas casas decimais e nunca devolve `NaN`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: utilitarios de dinheiro em centavos`

### Task 2: Variações e disponibilidade

**Files:** Create `src/lib/store/variants.ts`; Modify `src/lib/types.ts`; Test `src/lib/store/__tests__/variants.test.ts`

**Interfaces:**
- Consumes: `formatBRL` não é necessário aqui.
- Produces (tipos em `src/lib/types.ts`): `StoreVariant { id: string; productId: string; sku: string | null; size: string | null; colorName: string | null; colorHex: string | null; priceCents: number | null; weightGrams: number | null; stock: number | null; published: boolean; sortOrder: number }` e `StoreProduct { id: string; slug: string; categoryId: string | null; name: string; description: string; basePriceCents: number; weightGrams: number; lengthCm: number; widthCm: number; heightCm: number; featured: boolean; published: boolean; sortOrder: number; seoTitle: string | null; seoDescription: string | null }`.
- Produces (funções): `publishedVariants(variants: StoreVariant[]): StoreVariant[]`; `variantOptions(variants: StoreVariant[]): { sizes: string[]; colors: { name: string; hex: string | null }[] }`; `resolveVariant(variants: StoreVariant[], size: string | null, colorName: string | null): StoreVariant | null`; `variantPriceCents(product: Pick<StoreProduct, "basePriceCents">, variant: StoreVariant | null): number`; `variantAvailability(variant: StoreVariant | null): "available" | "sold-out"`; `productAvailability(variants: StoreVariant[]): "available" | "sold-out" | "unavailable"`.

- [ ] **Step 1: Write the failing tests:** `publishedVariants` exclui `published:false`; `variantOptions` devolve tamanhos únicos na ordem de `sortOrder` e cores únicas por nome; `resolveVariant` acha a combinação exata e devolve `null` se não existe; `variantPriceCents` usa `priceCents` da variação quando não nulo e `basePriceCents` caso contrário (variação `null` → base); `variantAvailability`: `stock: 0` → `"sold-out"`, `stock: null` → `"available"`, `stock: 3` → `"available"`; `productAvailability`: `[]` → `"unavailable"`, todas esgotadas → `"sold-out"`, alguma disponível → `"available"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/store/__tests__/variants.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as funções acima e adicionar `StoreCategory { id: string; slug: string; name: string; published: boolean; sortOrder: number }` e `StoreProductImage { id: string; productId: string; url: string; alt: string; colorName: string | null; sortOrder: number }` aos tipos.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: regras de variacao e disponibilidade da loja`

### Task 3: Migration SQL do catálogo (arquivo, não aplicado)

**Files:** Create `supabase/migrations/20261018120000_store_catalog.sql`

- [ ] **Step 1: Write** as tabelas `store_categories`, `store_products` (preço e dimensões com `check > 0`, `slug unique`), `store_variants` (`unique (product_id, size, color_name)` tratando nulos, `stock integer check (stock is null or stock >= 0)`), `store_product_images`, com `created_at/updated_at` e o trigger de `updated_at` já existente no schema do CMS, índices por `(published, sort_order)` e chaves com `on delete cascade`.
- [ ] **Step 2: Write** a RLS no padrão do CMS: leitura pública apenas de linhas `published = true` (variações e imagens somente quando o produto também está publicado); `is_admin()` para tudo.
- [ ] **Step 3: Verify** sem executar no banco: reler contra `20260905120100_cms_rls.sql` (nomes das funções e políticas) e conferir que nenhum `grant` expõe tabela a `anon` além de `select`.
- [ ] **Step 4: Commit** `feat: migration do catalogo da loja (nao aplicada)`

### Task 4: Contrato de repositório e mock

**Files:** Modify `src/lib/repositories/types.ts`; Create `src/lib/repositories/mock/store.ts`; Test `src/lib/repositories/__tests__/store.test.ts`

**Interfaces:**
- Produces `StoreRepository`: `listCategories(): Promise<StoreCategory[]>`; `listProducts(): Promise<StoreProduct[]>`; `getProductBySlug(slug: string): Promise<{ product: StoreProduct; variants: StoreVariant[]; images: StoreProductImage[] } | null>`; `createProduct(input: Omit<StoreProduct, "id">): Promise<StoreProduct>`; `updateProduct(id: string, patch: Partial<StoreProduct>): Promise<StoreProduct | null>`; `removeProduct(id: string): Promise<void>`; `saveVariants(productId: string, variants: Omit<StoreVariant, "id" | "productId">[]): Promise<StoreVariant[]>` (substitui o conjunto); `saveImages(productId: string, images: Omit<StoreProductImage, "id" | "productId">[]): Promise<StoreProductImage[]>`; `createCategory(input: Omit<StoreCategory, "id">): Promise<StoreCategory>`; `updateCategory(id: string, patch: Partial<StoreCategory>): Promise<StoreCategory | null>`; `removeCategory(id: string): Promise<void>`.
- Consumido por: Tasks 5, 6, 7, 8.

- [ ] **Step 1: Write the failing tests** (mock): começa vazio; `createProduct` + `getProductBySlug` devolve produto com `variants: []`; `saveVariants` substitui o conjunto anterior; `removeProduct` apaga produto, variações e imagens; slug duplicado em `createProduct` lança `Error("Já existe um produto com este endereço (slug).")`; sem vazamento de mutação entre instâncias.
- [ ] **Step 2: Run** `npx vitest run src/lib/repositories/__tests__/store.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** o mock em memória (mesmo estilo de `mock/programs.ts`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: repositorio da loja (contrato e mock)`

### Task 5: Repositório Supabase e mapeamento

**Files:** Create `src/lib/repositories/supabase/store.ts`; Modify `src/lib/supabase/types.ts`, `src/lib/repositories/index.ts`; Test `src/lib/repositories/__tests__/store-mapping.test.ts`

**Interfaces:**
- Consumes: `StoreRepository` (Task 4), `createServerSupabaseClient`.
- Produces: `createSupabaseStoreRepository(): StoreRepository`; mapeadores puros exportados `storeProductToDomain(row: StoreProductRow): StoreProduct`, `storeProductToRow(input: Omit<StoreProduct, "id">)`, `storeVariantToDomain(row)`, idem para categoria e imagem.

- [ ] **Step 1: Write the failing tests:** os mapeadores convertem `snake_case`↔`camelCase` sem perder `null`; `storeProductToRow` nunca inclui `id`; violação de unicidade do Postgres (código `23505`) vira a mensagem em português do Task 4.
- [ ] **Step 2: Run** `npx vitest run src/lib/repositories/__tests__/store-mapping.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** o repositório no padrão de `supabase/programs.ts`, registrar `store` em `getRepositories()` e adicionar as linhas em `supabase/types.ts`. `listProducts` e `getProductBySlug` aplicam `published = true` para visitantes e deixam o painel pedir tudo.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: repositorio supabase da loja`

### Task 6: Validação e Server Actions do painel

**Files:** Create `src/lib/validation/store.ts`, `src/lib/actions/store.ts`; Test `src/lib/validation/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `parseBRLToCents` (Task 1), `StoreRepository` (Task 4), `requireAdmin` de `src/lib/auth/admin-guard.ts`, `slugify`.
- Produces: `storeProductSchema` (Zod): nome obrigatório, preço via `parseBRLToCents` (inválido → erro "Informe um preço válido, por exemplo 49,90."), peso e dimensões inteiros positivos; `storeVariantSchema`: tamanho ou cor obrigatório, `stock` inteiro ≥ 0 ou vazio; Server Actions `saveStoreProduct`, `deleteStoreProduct`, `saveStoreVariants`, `saveStoreImages`, `saveStoreCategory`, `deleteStoreCategory`, todas chamando `requireAdmin()` primeiro e `revalidatePath("/loja")`, `revalidatePath("/loja/[slug]", "page")`, `revalidatePath("/admin/loja")`.

- [ ] **Step 1: Write the failing tests:** produto sem nome rejeitado; preço `"abc"` rejeitado com a mensagem acima; preço `"49,90"` vira `basePriceCents: 4990`; peso `0` ou negativo rejeitado; variação sem tamanho e sem cor rejeitada; `stock: ""` vira `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/validation/__tests__/store.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** os schemas e as actions (padrão de `src/lib/actions/programs.ts`).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: validacao e actions da loja`

### Task 7: Painel `/admin/loja`

**Files:** Create `src/app/admin/(dashboard)/loja/page.tsx`, `src/components/admin/store-manager.tsx`; Modify `src/components/admin/admin-nav-items.ts`

- [ ] **Step 1:** Criar a página do painel (Server Component) listando categorias e produtos; `store-manager.tsx` (Client Component, padrão de `programs-manager.tsx`) com: lista com busca, criar/editar/excluir produto (com confirmação), publicar/despublicar, destaque, ordenar, editor de variações (tamanho, cor com seletor de cor, preço opcional, estoque opcional), galeria de imagens via `MediaUploader` e gestão de categorias. Preço digitado em reais.
- [ ] **Step 2:** Adicionar o item "Loja" (ícone `ShoppingBag` do `lucide-react`) a `adminNavItems`.
- [ ] **Step 3: Verify** `npx tsc --noEmit` e `npm run lint` — Expected: sem erros.
- [ ] **Step 4: Commit** `feat: painel da loja`

### Task 8: Vitrine pública `/loja` e `/loja/[slug]`

**Files:** Create `src/app/(public)/loja/page.tsx`, `src/app/(public)/loja/[slug]/page.tsx`, `src/components/store/product-card.tsx`, `src/components/store/variant-picker.tsx`; Modify `src/components/layout/nav-links.ts`, `src/app/sitemap.ts`

**Interfaces:** Consumes `variants.ts` (Task 2), `formatBRL` (Task 1), `buildWhatsappLink` (plano anterior), `getRepositories().store`.

- [ ] **Step 1:** `/loja` agrupa por categoria publicada, cartão com foto, nome, "a partir de R$ x" (menor preço entre variações publicadas) e selo "Esgotado" quando `productAvailability` for `"sold-out"`; estado vazio com `EmptyState` quando não há produtos.
- [ ] **Step 2:** `/loja/[slug]`: galeria, descrição, `variant-picker` (Client Component: tamanhos e cores, atualiza preço e disponibilidade, troca a foto pela cor quando houver imagem com `colorName`), botão "Comprar pelo WhatsApp" com mensagem `Olá! Quero comprar: <produto> (<tamanho>, <cor>).` via `buildWhatsappLink`; sem WhatsApp válido, botão desabilitado "Compra em breve"; produto não publicado → `notFound()`.
- [ ] **Step 3:** Link "Loja" em `nav-links.ts` e `/loja` + produtos publicados em `sitemap.ts`.
- [ ] **Step 4: Verify** `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` — Expected: tudo passa.
- [ ] **Step 5: Commit** `feat: vitrine publica da loja`

### Task 9: Verificação da fase

- [ ] **Step 1:** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] **Step 2:** Com a migration aplicada pelo responsável: criar um produto de teste no painel, conferir `/loja` e `/loja/<slug>` em desktop e 375px, depois excluí-lo.
- [ ] **Step 3:** Revisão final independente (código, segurança, acessibilidade) antes de propor merge.

---

## Self-Review

- **Cobertura da spec (seções 3 e 5):** catálogo com camisetas, bonés, patches e produtos futuros (Tasks 2-5, painel Task 7); tamanhos e cores (Tasks 2 e 8); autonomia do dono para adicionar, editar e excluir (Tasks 6-7); fotos pelo painel (Task 7). **Fora desta fase, no plano seguinte:** carrinho, cupom, frete Melhor Envio, pagamento, pedidos.
- **Consistência de tipos:** `StoreProduct`, `StoreVariant`, `StoreCategory`, `StoreProductImage` definidos na Task 2 e usados com os mesmos nomes nas Tasks 4 a 8; `parseBRLToCents` (Task 1) usado na Task 6; `buildWhatsappLink` vem do plano `2026-10-17-mentoria-e-area-gratuita.md`.
- **Dependência externa:** o responsável precisa aplicar a migration da Task 3 antes de qualquer deploy.
