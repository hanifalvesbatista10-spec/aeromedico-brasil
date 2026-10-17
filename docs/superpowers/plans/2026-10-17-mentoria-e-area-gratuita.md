# Mentoria, destaques e área gratuita — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a mentoria e os cursos aparecerem como produtos de vitrine com botão de compra no WhatsApp do cliente, e criar a página `/gratuito` que leva o visitante aos produtos.

**Architecture:** Funções puras e testadas (`buildWhatsappLink`, `resolveProgramCta`, seletores de materiais) isoladas em `src/lib`; as páginas só as consomem. Nenhuma mudança de schema: a tabela `programs` já tem `type = 'mentoria'` e `enroll_url`; o público-alvo ("médicos e enfermeiros") entra pelo painel em `category`/descrição.

**Tech Stack:** Next.js 16 (App Router, Server Components), TypeScript, Vitest, Supabase (leitura via repositórios existentes).

**Spec:** `docs/superpowers/specs/2026-10-17-loja-mentoria-area-cliente-design.md` (seções 1 e 2). Este é o primeiro de três planos; os planos da loja e da área do cliente serão escritos ao iniciar cada fase.

## Global Constraints

- Sem migrations, sem alterar o banco, sem push, sem deploy. Commits locais na branch `feat/loja-mentoria-area-cliente`.
- Não inventar preço, descrição ou público da mentoria: o conteúdo real entra pelo `/admin/formacoes`.
- WhatsApp: o botão só aparece se `settings.whatsappUrl` tiver número real; o placeholder atual é `https://wa.me/`.
- Páginas continuam Server Components; sem nova dependência.
- Preservar identidade visual (tokens `navy-*`, `brand-red`, componentes `Badge` e `buttonVariants`) e as rotas existentes.
- Textos de interface em português do Brasil.

## Review Focus

1. `whatsappUrl` placeholder (`https://wa.me/`) ou lixo: nenhum link quebrado; a página mostra o estado "Inscrições em breve" já existente.
2. Mentoria sem `enrollUrl` e com WhatsApp válido: botão abre o WhatsApp com mensagem pré-preenchida, acentos codificados corretamente.
3. Material não publicado ou não público nunca aparece em `/gratuito`, mesmo se o repositório devolver todas as linhas (sessão de administrador).
4. `/gratuito` sem nenhum material, conteúdo ou programa: mostra estado vazio, não quebra.
5. Rascunhos de conteúdo e de formação não vazam para `/gratuito` quando quem visita é administrador logado.

## File Structure

- Create `src/lib/utils/whatsapp.ts` — monta o link do WhatsApp a partir da URL das configurações.
- Create `src/lib/programs/cta.ts` — decide o botão de compra de um programa e o rótulo do tipo.
- Create `src/lib/free-area/select.ts` — filtra e ordena materiais e conteúdos públicos.
- Create `src/app/(public)/gratuito/page.tsx` — página da área gratuita.
- Modify `src/app/(public)/formacoes/[slug]/page.tsx` — usa `resolveProgramCta`.
- Modify `src/components/program-card.tsx` — selo do tipo (Mentoria, Curso…).
- Modify `src/components/layout/header.tsx` e `src/components/layout/footer.tsx` — link "Gratuito".
- Modify `src/app/sitemap.ts` — inclui `/gratuito` e filtra programas publicados.
- Tests: `src/lib/utils/__tests__/whatsapp.test.ts`, `src/lib/programs/__tests__/cta.test.ts`, `src/lib/free-area/__tests__/select.test.ts`.

---

### Task 1: Link do WhatsApp

**Files:**
- Create: `src/lib/utils/whatsapp.ts`
- Test: `src/lib/utils/__tests__/whatsapp.test.ts`

**Interfaces:**
- Produces: `buildWhatsappLink(whatsappUrl: string, message: string): string | null` — `null` quando não há número válido.

- [ ] **Step 1: Write the failing tests** (`whatsapp.test.ts`), todos com `buildWhatsappLink`:
  - `"https://wa.me/5585999998888"` + `"Olá! Quero a mentoria."` → `"https://wa.me/5585999998888?text=Ol%C3%A1!%20Quero%20a%20mentoria."`
  - `"https://wa.me/"` → `null` (placeholder atual)
  - `""` e `"não é url"` → `null`
  - `"https://wa.me/5585999998888?text=antigo"` → mantém o número e **substitui** o texto pela mensagem nova
  - `"https://api.whatsapp.com/send?phone=5585999998888"` → `"https://wa.me/5585999998888?text=..."`
  - número com menos de 10 dígitos (`"https://wa.me/123"`) → `null`
- [ ] **Step 2: Run** `npx vitest run src/lib/utils/__tests__/whatsapp.test.ts` — Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `buildWhatsappLink` em `src/lib/utils/whatsapp.ts`: extrai dígitos do caminho (`wa.me/<n>`) ou do parâmetro `phone`; aceita só 10 a 15 dígitos; devolve sempre `https://wa.me/<dígitos>?text=<encodeURIComponent(message)>`.
- [ ] **Step 4: Run** o mesmo comando — Expected: PASS.
- [ ] **Step 5: Commit** `feat: adiciona buildWhatsappLink`

### Task 2: Botão de compra do programa e rótulo do tipo

**Files:**
- Create: `src/lib/programs/cta.ts`
- Test: `src/lib/programs/__tests__/cta.test.ts`

**Interfaces:**
- Consumes: `buildWhatsappLink` (Task 1); tipo `Program` de `src/lib/types.ts`.
- Produces:
  - `type ProgramCta = { kind: "enroll" | "whatsapp" | "unavailable"; href: string | null; label: string }`
  - `resolveProgramCta(program: Pick<Program, "title" | "enrollUrl" | "ctaLabel">, whatsappUrl: string): ProgramCta`
  - `programTypeLabel(type: ProgramType): string`

- [ ] **Step 1: Write the failing tests:**
  - `enrollUrl` presente → `{ kind: "enroll", href: enrollUrl, label: ctaLabel }`, mesmo com WhatsApp válido.
  - sem `enrollUrl` + WhatsApp válido → `kind: "whatsapp"`, `label: "Falar no WhatsApp"`, `href` começando por `https://wa.me/5585999998888?text=` e contendo `encodeURIComponent` de `Olá! Tenho interesse em <title>.`
  - sem `enrollUrl` + placeholder `https://wa.me/` → `{ kind: "unavailable", href: null, label: "Inscrições em breve" }`
  - `enrollUrl` vazio (`""`) é tratado como ausente.
  - `programTypeLabel`: `curso→"Curso"`, `mentoria→"Mentoria"`, `treinamento→"Treinamento"`, `produto→"Produto"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/programs/__tests__/cta.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as duas funções em `src/lib/programs/cta.ts`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: resolve botao de compra e rotulo do tipo de programa`

### Task 3: Páginas de formação e cartão usam o CTA

**Files:**
- Modify: `src/app/(public)/formacoes/[slug]/page.tsx` (bloco do botão, linhas 83-104; busca de `settings`)
- Modify: `src/components/program-card.tsx` (selo do tipo antes da categoria)

**Interfaces:**
- Consumes: `resolveProgramCta`, `programTypeLabel` (Task 2); `getRepositories().settings.get()`.

- [ ] **Step 1:** Na página, ler `settings` junto com o programa (`Promise.all`) e renderizar o botão conforme `cta.kind`: `enroll`/`whatsapp` como `<a target="_blank" rel="noopener noreferrer">` com `buttonVariants({ size: "lg" })`; `unavailable` mantém o `<span aria-disabled>` atual com o texto de `cta.label`.
- [ ] **Step 2:** No cartão, exibir `<Badge variant="outline">{programTypeLabel(program.type)}</Badge>` junto da categoria.
- [ ] **Step 3: Verify** `npx tsc --noEmit` e `npm run lint` — Expected: sem erros.
- [ ] **Step 4: Commit** `feat: botao de compra via WhatsApp e selo de tipo nos programas`

### Task 4: Seletores da área gratuita

**Files:**
- Create: `src/lib/free-area/select.ts`
- Test: `src/lib/free-area/__tests__/select.test.ts`

**Interfaces:**
- Consumes: tipos `Material`, `ContentPost`, `Program`.
- Produces:
  - `selectPublicMaterials(materials: Material[]): Material[]` — só `published && isPublic`, ordenado por `sortOrder`.
  - `selectRecentPosts(posts: ContentPost[], limit: number): ContentPost[]` — só `published`, mais recentes primeiro por `publishedAt`.
  - `selectProductHighlights(programs: Program[], limit: number): Program[]` — só `published`, destaque (`featured`) primeiro, depois `sortOrder`.

- [ ] **Step 1: Write the failing tests:** material com `published:false` ou `isPublic:false` é excluído; ordem por `sortOrder`; `selectRecentPosts` respeita `limit` e a ordem decrescente de data e exclui rascunho; `selectProductHighlights` põe `featured` antes e exclui não publicado; listas vazias devolvem `[]`.
- [ ] **Step 2: Run** `npx vitest run src/lib/free-area/__tests__/select.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** as três funções, sem mutar a lista recebida.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: seletores da area gratuita`

### Task 5: Página `/gratuito`, navegação e sitemap

**Files:**
- Create: `src/app/(public)/gratuito/page.tsx`
- Modify: `src/components/layout/header.tsx`, `src/components/layout/footer.tsx`, `src/app/sitemap.ts`

**Interfaces:**
- Consumes: seletores (Task 4), `ProgramCard`, `Reveal`, `getRepositories()`.

- [ ] **Step 1:** Criar a página (Server Component) com `metadata` (título "Área gratuita"), buscando materiais, conteúdos e programas em paralelo. Seções: introdução curta, "Materiais gratuitos" (links; PDF e imagem via URL assinada de 1 hora do bucket `materials`, só para materiais selecionados por `selectPublicMaterials`), "Conteúdos recentes" (até 3, links para `/conteudos/[slug]`) e "Conheça os produtos" (até 3 `ProgramCard`). Cada seção vazia mostra o `EmptyState` existente.
- [ ] **Step 2:** Adicionar o link "Gratuito" (`/gratuito`) à navegação do header e do footer, seguindo o array de links existente.
- [ ] **Step 3:** No sitemap, incluir `/gratuito` em `staticRoutes` e passar a listar só programas com `published`.
- [ ] **Step 4: Verify** `npx tsc --noEmit`, `npm run lint`, `npm test` — Expected: tudo passa.
- [ ] **Step 5: Commit** `feat: pagina /gratuito levando aos produtos`

### Task 6: Verificação da fase

- [ ] **Step 1:** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` — Expected: todos passam.
- [ ] **Step 2:** Subir `npm run dev` e conferir no navegador: `/gratuito` (desktop e 375px, sem overflow horizontal), `/formacoes/<slug>` (botão correto com o placeholder atual de WhatsApp), header com o novo link.
- [ ] **Step 3:** Revisão final por agente independente (segurança e QA) antes de qualquer proposta de merge.

---

## Self-Review

- **Cobertura da spec:** mentoria com página e botão WhatsApp (Tasks 1-3); destaques com selo de tipo (Task 3); área gratuita levando aos produtos (Tasks 4-5); estrutura pronta para pagamento por API: o `kind: "enroll"` já abre qualquer URL de checkout, e a interface de pagamento entra no plano da loja.
- **Consistência de tipos:** `buildWhatsappLink` (Task 1) é consumida só por `resolveProgramCta` (Task 2); `ProgramCta`, `resolveProgramCta` e `programTypeLabel` usados com os mesmos nomes na Task 3; seletores da Task 4 usados na Task 5.
- **Fora desta fase:** link para a loja no `/gratuito` (entra com o plano da loja); migrations; checkout.
