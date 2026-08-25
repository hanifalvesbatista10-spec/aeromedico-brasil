# Aeromédico Brasil — Design Doc

## 1. Objetivo

Construir o esqueleto profissional do site institucional Aeromédico Brasil: uma
landing page pública de alta autoridade e conversão (rota `/`), páginas internas
públicas, e um painel administrativo estruturalmente conectado à mesma fonte de
dados. Esta é a primeira entrega — base sólida e escalável, não um produto
finalizado com integrações reais (Supabase, Instagram API, analytics) ligadas.

Marca: projeto educacional liderado por Lucio Macêdo — enfermeiro, Mestre em
Ensino na Saúde, palestrante, professor universitário, especialista em APH e
transporte aeromédico. +120 mil seguidores no Instagram
(@aeromedico.brasil). Público: profissionais e estudantes de saúde (enfermeiros,
técnicos, médicos, socorristas, bombeiros, SAMU) interessados em aviação médica.

## 2. Tech stack

- **Next.js 14+ (App Router) + TypeScript** — SSR/SEO nativo, rotas de arquivo
  encaixam bem no número de páginas públicas + admin, `generateMetadata` por
  rota.
- **Tailwind CSS** — tokens de design como variáveis CSS mapeadas no
  `tailwind.config`, para permitir troca de paleta a partir da logomarca oficial
  sem tocar em componentes.
- **shadcn/ui** — apenas para primitivos onde reduz esforço real e mantém
  acessibilidade (dialog/confirm, tabela, form fields, select, tabs no admin).
  Não usado na landing pública além de `button`/`input` quando fizer sentido —
  a composição editorial da landing é feita com Tailwind puro para evitar a
  "cara de template".
- **motion** (Framer Motion) — animações discretas, com fallback total quando
  `prefers-reduced-motion: reduce`.
- **lucide-react** — ícones, usados com moderação (não "dezenas de ícones
  genéricos").
- **next/font** — Sora (títulos) + Inter (texto), self-hosted via Google Fonts
  loader do Next (sem CDN externo, sem layout shift).
- **next/image** — todas as imagens de conteúdo.
- **Vitest** — testes unitários para código com lógica real (repositórios de
  dados, auth guard, validação de formulário, utilitários). Componentes
  visuais são verificados por build + revisão manual no navegador, não por
  testes de snapshot (baixo valor para conteúdo que ainda é placeholder).
- **ESLint + Prettier** — config padrão do `create-next-app` mais regras de
  import order.
- **Supabase** — não configurado nesta fase. Camada de repositório desenhada
  para receber uma implementação Supabase depois sem alterar componentes
  (ver §5).

## 3. Sistema visual (tokens)

Definidos como CSS variables em `src/styles/tokens.css`, consumidos pelo
`tailwind.config.ts` via `hsl(var(--...))`:

- `--navy-950/900/700` — azul-marinho profundo (cor principal, fundos de
  seções de autoridade, header).
- `--sky-600/500` — azul técnico/aeronáutico (apoio, links, ícones ativos).
- `--white`, `--gray-50/100/300/600/900` — base neutra, muito espaço em
  branco.
- `--alert-600` — vermelho, só para CTAs estratégicos de emergência/urgência
  ou estados de erro. Não usado como cor decorativa.
- `--accent-amber` — reservado, só entra se a logomarca oficial confirmar essa
  cor; caso contrário permanece não utilizado.

Se um arquivo de logomarca for fornecido antes da implementação, a paleta acima
é ajustada para bater com as cores extraídas dela; do contrário o wordmark
tipográfico "Aeromédico Brasil" usa azul-marinho + branco.

Tipografia: `--font-heading` (Sora, peso 600–800, tracking levemente negativo
em títulos grandes) e `--font-body` (Inter, 400–500). Escala tipográfica
definida em `tailwind.config.ts` (`text-hero`, `text-h1`...`text-h4`,
`text-body`, `text-small`).

Motivo visual recorrente: linhas técnicas finas (1px, `--gray-300` ou
`--sky-600` a 40% de opacidade) evocando rotas/instrumentos, usadas como
divisores de seção e detalhes no hero — nunca como decoração isolada sem
função de leitura.

## 4. Arquitetura de rotas

```
/                              landing page
/sobre                         trajetória completa de Lucio Macêdo
/formacoes                     lista de formações
/formacoes/[slug]               detalhe de uma formação
/conteudos                     lista de conteúdo científico/educacional
/conteudos/[slug]                detalhe de um conteúdo
/palestras                     formatos de contratação de palestras
/contato                       formulário de contato geral
/politica-de-privacidade
/termos-de-uso
/admin/login                   login do administrador (única conta: admin)
/admin                         dashboard
/admin/formacoes               CRUD de formações
/admin/conteudos                CRUD de conteúdos
/admin/depoimentos              CRUD de depoimentos
/admin/palestras                gestão de temas/solicitações de palestra
/admin/leads                    lista de leads capturados
/admin/configuracoes            dados do perfil, redes, CTAs, SEO global
```

Todas as rotas têm layout real, navegação funcional e estado vazio — não
placeholders "em breve" sem estrutura.

## 5. Modelo de dados e camada de repositório

Tipos centrais em `src/lib/types.ts`: `Profile`, `SiteSettings`, `Program`,
`ContentPost`, `Testimonial`, `SpeakingTopic`, `Lead`, `SocialProofStat`,
`FAQItem`, `CTAConfig`.

Padrão repositório: cada entidade tem uma interface
(`src/lib/repositories/types.ts`, ex.: `ProgramsRepository`) e uma
implementação em memória lendo de `src/data/*.ts`
(`src/lib/repositories/mock/*.ts`). Um único ponto de composição
(`src/lib/repositories/index.ts`) exporta as instâncias ativas; trocar para
Supabase depois significa escrever `src/lib/repositories/supabase/*.ts` e
mudar esse arquivo — nenhum componente importa a implementação mock
diretamente.

Dados demonstrativos ficam centralizados em `src/data/` (não espalhados pelos
componentes) e cada arquivo demonstrativo tem um comentário `// Conteúdo de
exemplo — substituir por dados reais` no topo. `testimonials.ts` começa como
array vazio (nenhum depoimento inventado); a seção correspondente renderiza o
`EmptyState`.

## 6. Autenticação do admin (fase 1)

Sem Supabase configurado, a autenticação do admin usa uma sessão simulada e
desacoplada: `src/lib/auth/session.ts` expõe `createSession`,
`verifySession`, `destroySession` sobre um cookie HTTP-only assinado
(HMAC com `ADMIN_SESSION_SECRET`), e `src/lib/auth/credentials.ts` compara a
senha enviada em `/admin/login` com `ADMIN_PASSWORD` (variável de ambiente).
`middleware.ts` protege todas as rotas `/admin/*` exceto `/admin/login`,
redirecionando para login se a sessão for inválida. Essa camada é a única
que muda quando o Supabase Auth entrar — o restante do admin consome apenas
`getCurrentAdmin()`.

`.env.example` documenta `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (não usadas ainda),
`NEXT_PUBLIC_SITE_URL`. Nenhuma credencial real é commitada.

## 7. Formulários e leads

Três formulários (contato geral, interesse em curso, solicitação de palestra)
compartilham um schema Zod base (`src/lib/validation/lead.ts`) com campo
`interesse` variando por origem. Submissão vai a uma Route Handler
(`src/app/api/leads/route.ts`) que hoje grava no repositório mock de leads
(visível em `/admin/leads`) — a função está isolada para ser trocada por
inserts no Supabase depois. Estados de loading/erro/sucesso no client via
`useFormState`/estado local; validação client e server.

## 8. Landing page — seções (rota `/`)

Ordem e componentes (`src/components/sections/*`), consumindo dados via
repositórios: `HeroSection`, `AuthorityStrip`, `AboutSection`,
`ExpertisePillars`, `FeaturedPrograms` (+ `ProgramCard`), `SpeakingSection`,
`ContentHighlights`, `InstagramCommunity`, `TestimonialsSection` (com
`EmptyState`), `FAQSection`, `FinalCTA`. Copy definitiva (headline, sub-head,
CTAs) segue exatamente o texto fornecido no briefing; demais textos (pilares,
FAQ inicial, descrições de formação demo) são escritos seguindo os princípios
do `humanizer` — sem clichês de marketing, sem promessas não confirmadas.

`Header`/`Footer` (`src/components/layout/*`) compartilhados por todo o site
público, incluindo `MobileMenu` acessível e comportamento de scroll discreto.

## 9. Painel administrativo (fase 1 — esqueleto)

Layout: `AdminSidebar` + `AdminHeader` (`src/components/admin/*`), navegação
real para as 7 rotas do admin. Dashboard com `MetricCard` para leads totais,
cliques em CTA (contador simulado), formações publicadas, conteúdos
publicados, solicitações de palestra, e uma lista de atividade recente lida
do repositório mock. CRUDs (formações, conteúdos, depoimentos, palestras)
usam `DataTable` + formulário de criar/editar + `ConfirmDialog` para exclusão
— operando sobre os repositórios mock (persistência apenas em memória do
processo nesta fase; isso é declarado no dashboard). `MediaUploader` é um
componente de UI funcional (drag-and-drop, preview) que hoje apenas retorna
uma URL de objeto local — a integração de upload real (Supabase Storage) é
não-objetivo desta fase e fica marcada como tal no componente.

## 10. SEO e performance

`generateMetadata` por rota pública (title/description únicos),
`app/sitemap.ts`, `app/robots.ts`, Open Graph + Twitter Card via metadata API,
JSON-LD (`Person` para Lucio, `Organization` para Aeromédico Brasil, `Course`
por formação, `Article` por conteúdo) populados só com dados reais/definidos
— nenhum campo obrigatório do schema é preenchido com placeholder inventado.
Slots preparados (não ativados) para Google Analytics/GTM e Meta Pixel via
variável de ambiente opcional — se a env var não existir, o script não
renderiza.

## 11. Acessibilidade e motion

Mobile-first, 320px+, navegação por teclado, foco visível (`:focus-visible`
com anel consistente), contraste AA mínimo (texto sobre navy-950 sempre
branco/gray-50, nunca navy sobre navy), HTML semântico (`nav`, `main`,
`header`, `footer`, `section` com `aria-label` quando o título não é
adjacente), labels em todos os inputs, alt text obrigatório em toda imagem de
conteúdo. Animações via `motion`: entrada suave no scroll (`whileInView`,
uma vez, sem repetição infinita), transições de CTA e menu mobile; tudo
condicionado a `useReducedMotion()` do próprio `motion`, retornando variantes
sem transform quando ativo.

## 12. Não-objetivos desta fase

- Integração real com Supabase (a camada está pronta, mas não conectada).
- API do Instagram (posts cadastrados manualmente pelo admin).
- Autenticação real multi-usuário (só uma conta admin, sessão simulada).
- Upload de mídia para storage real.
- Analytics/Pixel ativos (só os slots preparados).
- Fluxo de inscrição/pagamento em cursos (CTA leva a link externo
  configurável ou WhatsApp).

## 13. Critérios de aceitação

Ver briefing do usuário, seção 17 — reproduzidos e rastreados task-a-task no
plano de implementação (`docs/superpowers/plans/2026-08-25-aeromedico-brasil.md`).
