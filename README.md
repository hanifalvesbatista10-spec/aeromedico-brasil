# Aeromédico Brasil

Site institucional do Aeromédico Brasil: landing page pública de alta
autoridade e conversão, páginas internas e um **CMS administrativo real**
(`/admin`) sobre Supabase, compartilhando a mesma base de layout, dados e SEO.

Decisões de arquitetura e planos de implementação ficam em
[`docs/superpowers/`](docs/superpowers):

- [`specs/2026-08-25-aeromedico-brasil-design.md`](docs/superpowers/specs/2026-08-25-aeromedico-brasil-design.md): design do site
- [`plans/2026-08-25-aeromedico-brasil.md`](docs/superpowers/plans/2026-08-25-aeromedico-brasil.md): plano da fase 1 (landing e painel estrutural)
- [`plans/2026-09-05-cms-supabase.md`](docs/superpowers/plans/2026-09-05-cms-supabase.md): plano do CMS sobre Supabase

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript estrito ·
Tailwind CSS v4 · shadcn/ui (Base UI) · `motion` · Zod · Vitest ·
Supabase (`@supabase/ssr`, Auth, Postgres, Storage).

> Este Next.js tem mudanças em relação às versões anteriores (por exemplo,
> `src/proxy.ts` substitui o antigo `middleware`). A documentação da versão
> instalada está em `node_modules/next/dist/docs/`.

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local`:

| Variável | Obrigatória? | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase do CMS. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave publicável (publishable) do projeto. É a **única** chave usada: o app nunca usa `service_role`/secret key nem `ANON_KEY`. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública do site (metadata, sitemap e JSON-LD). Local: `http://localhost:3000`. |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | Não | Os scripts de analytics só carregam se a variável existir. |

Sem as duas variáveis do Supabase, a leitura de conteúdo e o painel falham com
um erro explícito (`src/lib/supabase/env.ts`); não há fallback silencioso para
dados fictícios. Nunca versione `.env.local`.

## Banco de dados e primeiro administrador

O schema, as políticas RLS, os buckets de Storage e o seed estão em
[`supabase/migrations/`](supabase/migrations). **Nada é aplicado
automaticamente**; execute no SQL Editor do projeto Supabase correto, nesta
ordem:

1. `20260905120000_cms_schema.sql`
2. `20260905120100_cms_rls.sql`
3. `20260905120200_cms_storage.sql`
4. `20260905120300_cms_seed.sql`
5. `20261018120000_store_catalog.sql` (loja: categorias, produtos, variações e fotos; o catálogo nasce vazio)

**Aplique a migration 5 ANTES de publicar o site.** Sem as tabelas da loja, `/loja`
mostra "a loja abre em breve", `/loja/[slug]` dá 404 e o painel `/admin/loja` falha.

Depois, crie o usuário administrador em *Authentication → Users → Add user*
(o cadastro público é desativado) e autorize-o com
[`supabase/admin-bootstrap.sql`](supabase/admin-bootstrap.sql), trocando o
e-mail do script pelo e-mail real. Só quem estiver em `admin_users` acessa
`/admin/*`.

## Executando

```bash
npm run dev      # servidor de desenvolvimento em http://localhost:3000
npm test         # testes unitários (Vitest)
npm run lint     # ESLint
npx tsc --noEmit # checagem de tipos
npm run build    # build de produção
npm run start    # roda o build de produção
```

Acesse o painel em `/admin/login` com o e-mail e a senha do administrador.

## Estrutura

```text
src/
  app/
    (public)/        landing page e páginas públicas (Header/Footer compartilhados)
    admin/
      login/          login por e-mail/senha (Supabase Auth)
      (dashboard)/    dashboard e gestão: formações, conteúdos, depoimentos,
                      palestras, materiais, loja, leads e configurações (com FAQ)
    api/
      leads/          captação de leads (validação Zod + honeypot)
      cta/            registro de cliques em CTAs
    sitemap.ts, robots.ts
  proxy.ts            protege /admin/*: sessão Supabase + checagem de admin
  components/
    layout/           Header, Footer, MobileMenu
    sections/         seções da landing page
    site/             abertura (SiteIntro) e vídeo da Hero (HeroVideo)
    admin/            sidebar, header, tabelas e "managers" de cada entidade
    ui/               primitivos shadcn/ui
  config/media.ts     caminhos centralizados de vídeos e posters
  hooks/              use-intro-session, use-media-query, use-save-data
  data/               conteúdo demonstrativo (base dos repositórios mock dos testes; o seed SQL reproduz esse conteúdo)
  lib/
    types.ts          tipos de domínio
    supabase/         clientes (server, browser, proxy), env e tipos do banco
    repositories/     contrato em types.ts; supabase/* em produção, mock/* só nos testes
    actions/          Server Actions do painel (todas de escrita exigem admin)
    auth/             admin-guard
    storage/          upload validado para o Supabase Storage
    validation/       schemas Zod
    seo/json-ld.ts    JSON-LD (Person, Organization, Course, Article)
supabase/
  migrations/         schema, RLS, storage e seed
  admin-bootstrap.sql autorização do primeiro administrador
public/
  brand/              logomarca oficial e foto institucional
  videos/aeromedico/  hero-desktop.mp4 e hero-mobile.mp4
  images/video-posters/  posters .webp correspondentes
assets-source/        exports originais locais (ignorados pelo Git, não usados em produção)
```

## Abertura cinematográfica e vídeo da Hero

- **Preloader (`SiteIntro`)** aparece só na página inicial e uma vez por sessão
  (`sessionStorage`, chave `aeromedico:intro-seen`), com timeout de segurança.
  Respeita `prefers-reduced-motion`.
- **Vídeo (`HeroVideo`)** escolhe o arquivo por breakpoint
  (`min-width: 1024px` usa o desktop; abaixo, o mobile), baixando só um deles.
  Usa o poster no lugar do vídeo com movimento reduzido, economia de dados ou
  falha de carregamento. Vídeo decorativo é oculto para leitores de tela.
- **Trocar os vídeos:** edite apenas os caminhos em
  [`src/config/media.ts`](src/config/media.ts). Nenhum componente referencia
  `public/videos` diretamente.
- **Reiniciar a abertura em desenvolvimento:** no console do navegador, rode
  `sessionStorage.removeItem("aeromedico:intro-seen")` e recarregue.

## Trabalho com agentes

O [`CLAUDE.md`](CLAUDE.md) define as regras permanentes, o protocolo de
orquestração e os oito agentes especializados em
[`.claude/agents/`](.claude/agents). Commit, push e deploy dependem de
aprovação explícita. Os deploys de produção na Vercel saem de commits na
`main`, então um push para a `main` publica o site.

## Pendências — o que depende de você

Nada abaixo foi inventado; são lacunas deixadas propositalmente para serem
preenchidas com informação real antes de publicar.

**Conteúdo real** (hoje de demonstração, marcado com `is_demo_content`)
- Formações/cursos reais (títulos, descrições, carga horária, preços, links de
  inscrição). Os itens do seed são de demonstração.
- Artigos e vídeos reais em `/conteudos`.
- Depoimentos reais e autorizados. A seção fica vazia até existirem; um
  depoimento só pode ser publicado com autorização registrada.

**Loja** (fase do catálogo)
- O catálogo nasce vazio: o dono cadastra categorias, produtos (camisetas, bonés,
  patches e o que vier), tamanhos, cores, preço, peso e medidas em `/admin/loja`.
  Faltam as fotos reais de cada cor.
- A compra ainda é pelo WhatsApp do cliente. Carrinho, cupom, frete (Melhor Envio),
  pagamento e área do cliente são as próximas fases (ver `docs/superpowers/specs/`).
- As variações mantêm o `id` ao salvar o produto (atualização por `id`), base para
  carrinho e pedidos. Trocar tamanho/cor entre duas variações na mesma gravação pode
  esbarrar no índice único; nesse caso a mensagem aparece e a troca vai em dois
  salvamentos.

**Contato**
- `whatsapp_url` no seed (e em `src/data/settings.ts`) é o placeholder
  `https://wa.me/`: falta o número real.
- Confirmar o e-mail de contato (`contato@aeromedicobrasil.com.br` é
  placeholder).

**Textos jurídicos**
- `/politica-de-privacidade` e `/termos-de-uso` são modelos iniciais e
  precisam de revisão jurídica antes da publicação.

**Limitações conhecidas**
- Sem rate limiting de infraestrutura no endpoint de leads; hoje há apenas
  honeypot e validação Zod.
- A grade de posts do Instagram não usa a API do Instagram; os posts precisam
  ser cadastrados manualmente.
- Google Analytics e Meta Pixel só ativam com `NEXT_PUBLIC_GA_ID` /
  `NEXT_PUBLIC_META_PIXEL_ID`.
- Os testes automatizados cobrem validação, utilitários e os repositórios mock;
  não há testes para os repositórios Supabase, o `proxy` nem a abertura.

## Próximos passos sugeridos

1. Confirmar o projeto Supabase do CMS, aplicar as 5 migrations e autorizar o
   administrador (seção "Banco de dados e primeiro administrador").
2. Testar o painel de ponta a ponta contra o banco real (login, CRUD, uploads).
3. Substituir o conteúdo demonstrativo por formações, conteúdos e depoimentos
   reais via `/admin`.
4. Revisão jurídica das páginas legais.
