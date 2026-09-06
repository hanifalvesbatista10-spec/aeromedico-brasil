# CMS Supabase (Aeromédico Brasil) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os mocks em memória do painel `/admin` por um CMS real sobre Supabase (Postgres + Auth + Storage), com autenticação de administrador, CRUD persistente para todas as entidades de conteúdo e leitura pública sem novo deploy.

**Architecture:** Camada de repositório (`src/lib/repositories/*`) troca a implementação `mock/*` por uma implementação `supabase/*` que fala com o Postgres via `@supabase/ssr`, sempre usando a sessão do usuário autenticado (nunca `service_role`/secret key) e confiando em RLS + `is_admin()` para autorização. Server Components leem dados publicados; Server Actions/Route Handlers escrevem e chamam `revalidatePath`. `src/proxy.ts` passa a validar sessão Supabase real (não mais HMAC customizado) e checar `admin_users`.

**Tech Stack:** Next.js 16 (App Router, TS estrito, já em uso) · Supabase Postgres/Auth/Storage · `@supabase/supabase-js` + `@supabase/ssr` (novos) · Zod (já em uso) · Tailwind + shadcn/Base UI existentes.

**Spec:** Missão descrita pelo usuário no chat em 2026-09-05 ("Transforme o painel administrativo estrutural... em um CMS real, seguro e persistente, conectado ao Supabase"), 18 seções. Este plano é a decomposição técnica dessa missão; a mensagem original é a fonte normativa para qualquer ambiguidade.

## Global Constraints

- Usar **obrigatoriamente** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (não `ANON_KEY`, não `service_role`/secret key) — em nenhum lugar do código, nem em Server Actions/Route Handlers.
- Toda leitura/escrita no Supabase passa pela sessão do usuário (cookies via `@supabase/ssr`); autorização é 100% via RLS + `is_admin()`, nunca via bypass de service role.
- Não criar cadastro público de usuários; apenas o administrador previamente autorizado (linha em `admin_users`) acessa `/admin/*`.
- Preservar a identidade visual do painel e da landing já aprovadas (Hero em vídeo, preloader, paleta, componentes shadcn) — nenhum redesign.
- Não inventar produtos, depoimentos ou métricas; migrar apenas o conteúdo de demonstração já existente em `src/data/*`, marcado (`is_demo_content`) onde aplicável.
- Nenhuma dependência nova sem antes checar `package.json` (feito — não há `@supabase/*` instalado ainda).
- Parar após gerar as migrations SQL completas e aguardar o usuário executá-las no SQL Editor do Supabase antes de prosseguir com o restante da implementação.
- Não commitar, não dar push, até aprovação explícita do usuário.

---

## Diagnóstico da auditoria (arquivos lidos, nenhum alterado)

- **Persistência:** todos os repositórios (`src/lib/repositories/mock/*.ts`) são arrays em memória de módulo — perdem dados a cada reinício/instância serverless. Não há banco real.
- **Campos ausentes vs. missão:** nenhuma entidade de conteúdo (`Program`, `ContentPost`, `SpeakingTopic`, `FAQItem`) tem `published`/`sort_order`/SEO hoje. `Testimonial` já tem `authorizedForDisplay` (bom, mantido), mas não tem `published` nem `sort_order`. `ContentPost` não tem corpo de texto (`body`) — só resumo.
- **Rota/tabela ausente:** `/admin/materiais` e a tabela `materials` não existem em nenhum lugar do código atual (nenhum mock, nenhuma action, nenhum item de navegação).
- **FAQ sem CRUD:** existe `FAQRepository`/mock/tipo, mas nenhuma página admin, nenhuma Server Action e nenhum componente `*Manager` consomem — hoje só é editável trocando `src/data/faq.ts` no código. Será anexado como seção dentro de `/admin/configuracoes` (não é uma rota separada na lista auditada pelo usuário).
- **Botão/ação apenas visual identificado:** `src/components/admin/settings-manager.tsx:123-129` — o `MediaUploader` da "Logomarca oficial" tem `onChange={() => {/* troca de arquivo nesta fase não persiste */}}`, ou seja, o botão não faz nada. `src/components/admin/media-uploader.tsx:25` usa `URL.createObjectURL`, que nunca persiste (nem em disco, nem em Storage) — todo upload em todo formulário é cosmético hoje.
- **Export CSV de leads, busca/filtro em qualquer tabela, ordenação manual (drag) em qualquer entidade:** não existem em nenhum `*-manager.tsx` atual.
- **Autenticação atual:** `src/proxy.ts` + cookie HMAC (`src/lib/auth/session.ts`) com uma única senha global em `ADMIN_PASSWORD` (`src/lib/auth/credentials.ts`) — sem Supabase Auth, sem RLS, sem identidade individual. Será substituída por completo (seção 3 da missão).
- **Consumo público:** todas as páginas públicas (`src/app/(public)/**`, `src/app/layout.tsx`) leem via `getRepositories()` (`src/lib/repositories/index.ts`), um único ponto de composição — é exatamente o ponto de troca para a implementação Supabase, sem tocar em componentes visuais.
- **Dependências:** nenhum pacote `@supabase/*` instalado — precisa ser adicionado.

---

## File Structure

```
supabase/
  migrations/           # SQL versionado (schema, RLS, storage, seed)
  admin-bootstrap.sql   # template para autorizar o 1º admin (não é migration)

src/lib/supabase/
  server.ts             # createServerClient (Server Components / Server Actions / Route Handlers) — usa cookies()
  proxy.ts              # createServerClient variante para o Proxy (request/response mutável)
  types.ts              # tipos gerados/manuais das tabelas (Database)

src/lib/auth/
  session.ts            # NOVO conteúdo: getSession(), getAdminUser() via Supabase Auth
  admin-guard.ts         # helper usado nas Server Actions para checar admin antes de mutar

src/lib/repositories/
  supabase/*.ts          # uma implementação por entidade, mesma interface de src/lib/repositories/types.ts
  index.ts               # MODIFICADO: escolhe supabase/* sempre, exceto testes (mock/* só em vitest)

src/lib/actions/*.ts      # MODIFICADOS: adicionam published/sortOrder/seo, checam admin, tratam erro de storage
src/lib/actions/materials.ts   # NOVO
src/lib/actions/faq.ts         # NOVO

src/app/admin/login/page.tsx        # MODIFICADO: login por e-mail/senha via Supabase Auth
src/app/admin/(dashboard)/materiais/page.tsx   # NOVO
src/components/admin/materials-manager.tsx      # NOVO
src/components/admin/faq-manager.tsx            # NOVO (embutido em Configurações)
src/components/admin/*-manager.tsx              # MODIFICADOS: publicar/despublicar, ordenar, busca/filtro
src/components/admin/csv-export-button.tsx      # NOVO (leads)

src/proxy.ts               # REESCRITO: sessão Supabase real + checagem admin_users, cookies atualizados

src/app/api/admin/login/route.ts    # REMOVIDO (login passa a ser Server Action + Supabase Auth)
src/app/api/admin/logout/route.ts   # MODIFICADO: supabase.auth.signOut()
src/app/api/leads/route.ts          # MODIFICADO: honeypot, origem, grava via Supabase (RLS pública de insert)
src/app/api/cta/route.ts            # NOVO: registra cta_events

.env.example                        # MODIFICADO: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (não ANON_KEY)
```

---

## Task 1 — Schema, RLS, Storage (SQL) — **executar agora, parar após esta task**

**Files:**
- Create: `supabase/migrations/20260905120000_cms_schema.sql`
- Create: `supabase/migrations/20260905120100_cms_rls.sql`
- Create: `supabase/migrations/20260905120200_cms_storage.sql`
- Create: `supabase/migrations/20260905120300_cms_seed.sql`
- Create: `supabase/admin-bootstrap.sql`

Cobre a Seção 4 (banco), 5 (RLS) e 6 (storage) da missão. Ver arquivos gerados nesta mesma entrega — descritos linha a linha no relatório final.

- [x] Escrever schema (tabelas, enums, índices, triggers `updated_at`)
- [x] Escrever RLS (`is_admin()`, políticas mínimas por tabela)
- [x] Escrever buckets + políticas de storage
- [x] Escrever seed do conteúdo de demonstração existente (marcado `is_demo_content`)
- [x] Escrever template de bootstrap do primeiro admin (por e-mail, sem inventar UUID)
- [ ] **PARAR — aguardar o usuário rodar as 4 migrations no SQL Editor do Supabase, na ordem, e confirmar**

---

## Task 2 — Clientes Supabase e variáveis de ambiente

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/lib/supabase/types.ts`
- Modify: `.env.example`
- Modify: `package.json` (adicionar `@supabase/supabase-js`, `@supabase/ssr`)

**Interfaces:**
- Produces: `createServerSupabaseClient(): Promise<SupabaseClient<Database>>` (Server Components/Actions, cookies read-only via `next/headers`)
- Produces: `createProxySupabaseClient(request: NextRequest): { supabase, response: NextResponse }` (usado só dentro de `src/proxy.ts`, cookies mutáveis)

Sem `service_role`/secret key em nenhum client. `NEXT_PUBLIC_SITE_URL` continua só local conforme instrução do usuário (não adicionar na Vercel a partir daqui).

## Task 3 — Autenticação administrativa real

**Files:**
- Rewrite: `src/proxy.ts` (matcher continua `/admin/:path*`, exceto `/admin/login`; troca HMAC por `supabase.auth.getUser()` + checagem em `admin_users`)
- Rewrite: `src/app/admin/login/page.tsx` (formulário e-mail+senha)
- Create: `src/lib/actions/auth.ts` (`signInAdmin`, `signOutAdmin` — Server Actions)
- Delete: `src/lib/auth/credentials.ts`, `src/app/api/admin/login/route.ts` (substituídos)
- Modify: `src/app/api/admin/logout/route.ts` ou substituir por Server Action equivalente
- Modify: `src/lib/auth/session.ts` → vira `getAdminSession()` (lê Supabase Auth, não HMAC)

**Interfaces:**
- Produces: `signInAdmin(email: string, password: string): Promise<{ error: string | null }>`
- Produces: `getAdminSession(): Promise<{ user: User } | null>` — usado pelas páginas admin/layout para exibir nome do admin logado

Comportamento: sessão válida + sem linha em `admin_users` ⇒ `supabase.auth.signOut()` e redirect para `/admin/login?erro=sem-permissao` (mission 3.7 — "sessão encerrada"). Estados de loading/erro acessíveis no formulário (mission 3.14). Recuperação de senha: botão "Esqueci minha senha" chamando `supabase.auth.resetPasswordForEmail`, sem fluxo de definição de nova senha custom (usa o e-mail padrão do Supabase) — mission 3.15 pede "preparar, não incompleto/inseguro".

## Task 4 — Camada de repositório Supabase

**Files:**
- Create: `src/lib/repositories/supabase/{programs,content-posts,testimonials,speaking-topics,faq,leads,materials,settings}.ts`
- Modify: `src/lib/repositories/index.ts` — troca `mock/*` por `supabase/*`; lança erro operacional explícito (não fallback silencioso) se `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ausentes (mission 11.6)
- Keep: `src/lib/repositories/mock/*.ts` — usados **apenas** pelos testes existentes em `__tests__` (mission 11.4)
- Modify: `src/lib/repositories/types.ts` — adiciona `published`, `sortOrder`, campos SEO e `list({ includeUnpublished })` para uso admin vs. público

Cada repositório implementa a mesma interface já existente em `types.ts` (mantendo os nomes de método `list/getBySlug/create/update/remove` para não quebrar quem já consome `getRepositories()`), adicionando parâmetros opcionais quando necessário.

## Task 5 — CRUD: Formações (`/admin/formacoes`)

**Files:** `src/lib/actions/programs.ts`, `src/components/admin/programs-manager.tsx`, `src/app/(public)/formacoes/**`

Adiciona ao formulário existente: publicar/despublicar (switch), destaque (já existe), ordenar (drag ou campos ↑/↓ simples — sem lib nova), busca por título/categoria, upload real de imagem via `MediaUploader` (Task 9), `full_description`, `cta_label`, SEO (título/descrição). Página pública `/formacoes` e `/formacoes/[slug]` passam a filtrar `published = true` (a RLS já impede ver rascunho, mas o filtro também evita 404 incorreto).

## Task 6 — CRUD: Conteúdos (`/admin/conteudos`)

Igual ao Task 5, mais campo `body` (Textarea simples — mission proíbe editor complexo sem dependência adequada) e preview (abrir `/conteudos/[slug]` em nova aba antes de publicar, usando um preview autenticado ou renderizando o rascunho só para admin via RLS `is_admin()`).

## Task 7 — CRUD: Depoimentos, Palestras, FAQ, Materiais, Leads, Configurações

Mesmo padrão dos Tasks 5/6, um por entidade:
- Depoimentos: mantém authorizedForDisplay + published (não deixa publicar sem autorização — reforçado pelo CHECK do banco).
- Palestras: adiciona `themes`, `hireUrl`, published/ordenar; mantém lista de solicitações (leads com `origin = 'palestra'`) na mesma tela.
- FAQ: novo `faq-manager.tsx` embutido em `/admin/configuracoes`.
- Materiais: rota nova `/admin/materiais` + nav item; upload PDF/imagem ou link externo; público/privado.
- Leads: adiciona busca/filtro por status/origem, exportar CSV (gerado no cliente a partir da lista já carregada, sem lib nova), excluir com confirmação.
- Configurações: liga a `profiles` + `site_settings` reais; upload de foto/logo real; adiciona campos SEO globais.

## Task 8 — Uploads reais (Supabase Storage)

**Files:** `src/components/admin/media-uploader.tsx` (reescrito para fazer upload real), `src/lib/storage/upload.ts` (novo helper: valida MIME/tamanho, gera nome seguro, chama `supabase.storage.from(bucket).upload`)

Validações: MIME whitelist (`image/webp`,`image/png`,`image/jpeg`,`application/pdf` só no bucket `materials`), tamanho máx. (5MB imagens / 20MB PDFs — limites definidos no bucket via migration, revalidados no cliente), nome de arquivo via `crypto.randomUUID()` + extensão original (nunca o nome enviado pelo usuário), estados de progresso/sucesso/erro, exclusão verifica se outro registro ainda referencia o `file_path` antes de apagar do bucket.

## Task 9 — Integração pública + revalidação

Todos os componentes de seção (`hero-section`, `featured-programs`, etc.) continuam recebendo props já prontas de Server Components — nenhuma chamada Supabase direta em componente visual (mission 9.6). Cada Server Action de mutação chama `revalidatePath` nos mesmos caminhos já usados hoje (ver `src/lib/actions/*.ts` atuais) mais `/materiais` quando aplicável.

## Task 10 — Formulários públicos (contato, interesse, palestra)

`src/app/api/leads/route.ts`: adiciona campo honeypot (`website` oculto, se preenchido descarta silenciosamente com 201 falso — não alerta o bot), grava `origin` real, nenhuma PII em log. Sem rate limiting de infraestrutura externa disponível — documentar essa limitação no relatório final (mission 10 — "documente claramente a limitação sem inventar proteção").

## Task 11 — Testes

Atualizar `src/lib/repositories/__tests__/*` para continuar rodando contra os mocks (Task 4 preserva `mock/*`). Novos testes: validação Zod de `programs`/`content_posts`/`materials`, `is_admin()`-dependent guard em Server Actions (teste unitário do helper `admin-guard.ts` com sessão simulada), regra "testimonial não publica sem autorização" replicada em Zod no cliente (a garantia real é o CHECK do banco). Testes manuais de fluxo completo só são possíveis após a Task 1 ser aplicada no Supabase real — serão executados e relatados depois da aprovação do usuário.

## Task 12 — Verificação final e relatório

`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; `git status` sem segredos; relatório completo (formato da Seção 18 da missão).

---

## Self-Review

- **Cobertura da spec:** todas as 18 seções da missão têm task correspondente acima; Storage (6) e RLS (5) estão na Task 1; Auth (3) na Task 3; UX (8) é transversal às Tasks 5-8; Segurança (14) é transversal e revisada na Task 12.
- **Sem placeholders:** a SQL da Task 1 (entregue agora) está completa, sem TODO. As Tasks 2-12 são intencionalmente descritas em nível de arquivo/interface, não em passos TDD linha-a-linha, porque a execução delas só começa após o usuário validar o schema no Supabase (ponto de parada explícito desta missão) — serão detalhadas com o mesmo rigor de "no placeholders" no momento de cada execução.
- **Consistência de tipos:** `list/getBySlug/create/update/remove` mantidos idênticos a `src/lib/repositories/types.ts` atual; novas propriedades (`published`, `sortOrder`, `seoTitle`, `seoDescription`) serão adicionadas a essa interface na Task 4, não antes.
