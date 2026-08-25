# Aeromédico Brasil

Site institucional do Aeromédico Brasil: landing page pública de alta
autoridade e conversão, páginas internas e painel administrativo,
compartilhando a mesma base de layout, dados e SEO.

Este é o esqueleto da **fase 1** do projeto — ver
[`docs/superpowers/specs/2026-08-25-aeromedico-brasil-design.md`](docs/superpowers/specs/2026-08-25-aeromedico-brasil-design.md)
para as decisões de arquitetura e
[`docs/superpowers/plans/2026-08-25-aeromedico-brasil.md`](docs/superpowers/plans/2026-08-25-aeromedico-brasil.md)
para o plano de implementação completo, tarefa a tarefa.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI)
· `motion` · Zod · Vitest.

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local`:

| Variável | Obrigatória nesta fase? | Descrição |
|---|---|---|
| `ADMIN_PASSWORD` | Sim | Senha da única conta de administrador (login em `/admin/login`). |
| `ADMIN_SESSION_SECRET` | Sim | Segredo usado para assinar o cookie de sessão do admin (HMAC). Use uma string longa e aleatória. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública do site, usada em metadata, sitemap e JSON-LD. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Não | Preparadas para a próxima fase — não usadas ainda. |
| `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | Não | Opcionais — os scripts só carregam se a variável existir. |

## Executando

```bash
npm run dev      # servidor de desenvolvimento em http://localhost:3000
npm test         # testes unitários (Vitest)
npm run lint     # ESLint
npx tsc --noEmit # checagem de tipos
npm run build    # build de produção
npm run start    # roda o build de produção
```

Acesse o painel em `/admin/login` com a senha definida em
`ADMIN_PASSWORD`.

## Estrutura

```text
src/
  app/
    (public)/        landing page e páginas públicas (Header/Footer compartilhados)
    admin/
      login/          página de login (fora do shell do painel)
      (dashboard)/    dashboard e telas de gestão (protegidas por src/proxy.ts)
    api/              rotas de login/logout do admin e de captação de leads
    sitemap.ts, robots.ts
  components/
    layout/           Header, Footer, MobileMenu
    sections/         seções da landing page
    admin/             AdminSidebar, AdminHeader, DataTable, ConfirmDialog,
                        MediaUploader e os "managers" de cada entidade (CRUD)
    ui/               primitivos shadcn/ui
  data/               conteúdo demonstrativo centralizado (ver "Pendências")
  lib/
    types.ts          tipos de domínio (Profile, Program, Lead, ...)
    repositories/      camada de repositório (mock em memória hoje;
                        único ponto a trocar quando o Supabase entrar)
    actions/           Server Actions usadas pelo painel administrativo
    auth/               sessão do admin (cookie HMAC) e verificação de senha
    validation/         schemas Zod (formulário de lead)
    seo/json-ld.ts     JSON-LD (Person, Organization, Course, Article)
```

## Pendências — o que depende de você

Nada abaixo foi inventado; são lacunas deixadas propositalmente para
serem preenchidas com informação real antes de publicar o site.

**Identidade visual**
- Logomarca oficial (arquivo) — o site usa um wordmark tipográfico
  "Aeromédico Brasil" até você enviar o arquivo.
- Confirmar se a paleta azul-marinho/técnica definida em
  `src/app/globals.css` bate com a identidade oficial, ou ajustar a
  partir do arquivo da logo.

**Conteúdo real** (hoje em `src/data/*.ts`, marcado como
`isDemoContent: true` onde se aplica)
- Formações/cursos reais (títulos, descrições, carga horária, preços,
  links de inscrição) — os 3 itens atuais são de demonstração.
- Artigos/vídeos reais em `/conteudos`.
- Depoimentos reais e autorizados — a seção está propositalmente vazia
  (nenhum depoimento foi inventado).
- Fotografias profissionais de Lucio Macêdo e de campo — `photoUrl` está
  `null` em todo o projeto.

**Contato**
- `whatsappUrl` em `src/data/settings.ts` está com placeholder
  (`https://wa.me/`) — falta o número real.
- Confirmar e-mail de contato (`contato@aeromedicobrasil.com.br` é um
  placeholder).

**Textos jurídicos**
- `/politica-de-privacidade` e `/termos-de-uso` são modelos iniciais e
  precisam de revisão jurídica antes da publicação.

**Integrações não ativadas nesta fase** (estrutura pronta, não conectada)
- Supabase (auth, banco, storage) — a camada de repositório e o
  `.env.example` já estão preparados; hoje os dados vivem em memória do
  processo (reiniciar o servidor limpa qualquer alteração feita pelo
  admin).
- Upload de mídia real — `MediaUploader` funciona na interface mas hoje
  gera apenas uma URL de objeto local, não persistida.
- Google Analytics / Meta Pixel — os slots existem em
  `src/components/analytics-scripts.tsx` e só ativam se
  `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` forem definidos.
- Grade de posts do Instagram — a seção `InstagramCommunity` não usa a
  API do Instagram; posts precisariam ser cadastrados manualmente em uma
  fase futura.

## Próximos passos sugeridos

1. Enviar logomarca oficial e fotos reais.
2. Substituir o conteúdo demonstrativo por formações, conteúdos e
   depoimentos reais via `/admin`.
3. Configurar Supabase e trocar as implementações em
   `src/lib/repositories/mock/*` por equivalentes Supabase (a interface
   em `src/lib/repositories/types.ts` já define o contrato).
4. Revisão jurídica das páginas legais.
