# Aeromédico Brasil

Site institucional do Aeromédico Brasil: landing page pública de alta
autoridade e conversão, páginas internas e um **CMS administrativo real**
(`/admin`) sobre Supabase, compartilhando a mesma base de layout, dados e SEO.

Decisões de arquitetura e planos de implementação ficam em
[`docs/superpowers/`](docs/superpowers):

- [`specs/2026-08-25-aeromedico-brasil-design.md`](docs/superpowers/specs/2026-08-25-aeromedico-brasil-design.md): design do site
- [`plans/2026-08-25-aeromedico-brasil.md`](docs/superpowers/plans/2026-08-25-aeromedico-brasil.md): plano da fase 1 (landing e painel estrutural)
- [`plans/2026-09-05-cms-supabase.md`](docs/superpowers/plans/2026-09-05-cms-supabase.md): plano do CMS sobre Supabase
- [`specs/2026-10-22-pedidos-pagamento-asaas-design.md`](docs/superpowers/specs/2026-10-22-pedidos-pagamento-asaas-design.md) e [`plans/2026-10-22-pedidos-pagamento-asaas.md`](docs/superpowers/plans/2026-10-22-pedidos-pagamento-asaas.md): pedidos e pagamento com Asaas
- [`docs/runbooks/asaas-sandbox.md`](docs/runbooks/asaas-sandbox.md): roteiro do sandbox, teste de ponta a ponta e passagem para produção

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
| `MELHOR_ENVIO_TOKEN`, `STORE_ORIGIN_CEP`, `MELHOR_ENVIO_CONTACT_EMAIL`, `MELHOR_ENVIO_ENV` | Não | Frete automático do carrinho (Melhor Envio). **Só servidor** (sem `NEXT_PUBLIC`). Precisam estar as três primeiras para o frete calcular; `MELHOR_ENVIO_ENV=production` liga a conta real (qualquer outro valor usa o sandbox). Passo a passo na seção da loja. |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV`, `ORDERS_RPC_SECRET` | Não | Pagamento pelo site (Asaas Checkout). **Só servidor.** O botão "Pagar" só aparece com as quatro definidas **mais** o frete e `NEXT_PUBLIC_SITE_URL`; senão o carrinho segue pelo WhatsApp. `ASAAS_ENV=production` liga a conta real (qualquer outro valor usa o sandbox). `ORDERS_RPC_SECRET` deve ser o mesmo valor cujo hash está no banco. Roteiro em [`docs/runbooks/asaas-sandbox.md`](docs/runbooks/asaas-sandbox.md). |

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
6. `20261020120000_store_coupons.sql` (cupons de desconto; sem ela o carrinho funciona e o campo de cupom responde "Não foi possível verificar o cupom agora.")
7. `20261022120000_store_orders.sql` (pedidos, taxas do Asaas e funções protegidas por segredo; depois dela, grave o hash do `ORDERS_RPC_SECRET` — ver o runbook do Asaas. Sem ela, `/admin/pedidos` mostra um aviso e o pagamento pelo site não funciona)

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
- **Carrinho pronto** (`/carrinho`, ícone no cabeçalho, botão "Adicionar ao carrinho"
  em cada produto). O navegador guarda só ids e quantidades; nome, foto, preço e
  estoque vêm do servidor. A finalização é pelo WhatsApp do cliente, com o pedido
  escrito na mensagem.
- **Atenção do dono:** o texto que chega no WhatsApp é editável pelo cliente antes de
  enviar. Confira sempre preço e estoque no painel antes de cobrar. Quando existirem
  pedidos gravados no servidor, a mensagem passa a levar só um código de referência.
- **Cupons** (`/admin/cupons`): percentual ou valor fixo, validade, pedido mínimo e
  limite de usos; um cupom por pedido. O visitante não consegue listar cupons: o
  código é validado por uma função SQL que devolve um único cupom ativo. O
  contador de usos só sobe quando existirem pedidos gravados; até lá, o dono pode
  ajustar "Usos já feitos" à mão. **Cupom privado (para alunos, parceiros) precisa
  de código longo e difícil de adivinhar** (o painel exige pelo menos 6 caracteres; use
  algo como `PARCEIRO-7K2Q9X`): a consulta de código é pública e pode ser testada por
  tentativa. O dono sempre confere cupom, frete e total antes de cobrar.
- **Frete automático (Melhor Envio)**: o cliente digita o CEP no carrinho e escolhe a
  entrega; o cálculo usa peso e medidas de cada produto (cadastrados no painel) e o
  valor declarado é o preço de venda. Para ligar:
  1. Crie o token na conta do Melhor Envio (primeiro no **sandbox**, depois na conta real).
  2. Na Vercel (Settings → Environment Variables), defina `MELHOR_ENVIO_TOKEN`,
     `STORE_ORIGIN_CEP` (CEP de onde a loja despacha), `MELHOR_ENVIO_CONTACT_EMAIL` e,
     na conta real, `MELHOR_ENVIO_ENV=production`. Refaça o deploy.
  3. Sem as variáveis o carrinho continua funcionando e o frete segue combinado no
     WhatsApp (não há tabela de frete inventada).
  A ação de cotação é pública e consome a cota da conta do Melhor Envio: se houver
  abuso, adicione limite de requisições (WAF/Firewall da Vercel).
- **Pagamento pelo site (Asaas Checkout)**: com o frete escolhido, o cliente vê Pix, cartão à vista e
  cartão em até 6x, cada um com o total já com a taxa do meio de pagamento (as taxas do contrato são
  editáveis em `/admin/pedidos`), informa os dados de entrega e é levado ao checkout do Asaas. O servidor
  refaz preço, cupom e frete e só entrega o link se o total ainda for o que o cliente viu. O pedido só muda
  para "pago" pelo webhook do Asaas (`/api/webhooks/asaas`); a volta do checkout não prova pagamento.
  O dono acompanha e muda o andamento em `/admin/pedidos` (separação, envio com código de rastreio,
  entrega). O comprador acompanha em `/pedido/<id>?t=<chave>`. **Ligar**: ver
  [`docs/runbooks/asaas-sandbox.md`](docs/runbooks/asaas-sandbox.md).
- Ainda não existem: e-mails automáticos ao comprador, etiqueta/rastreio automáticos e área do cliente.
  O site só **cota** o frete; a etiqueta é comprada no painel do Melhor Envio.
- **Pedido pago com estoque insuficiente** vira "Pago, conferir" (nada é baixado) e aparece em destaque no
  painel. **Cancelar um pedido pago no painel não devolve o dinheiro**: o estorno é feito no painel do
  Asaas e o estoque é ajustado à mão.
- Limites do carrinho: 99 unidades por item e 50 itens diferentes. Cada ação do
  carrinho consulta o catálogo inteiro; com catálogo grande, trocar por consulta
  filtrada e adicionar limite de requisições (WAF) antes de crescer.
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
- **Antes de cobrar pelo site:** parecer do contador sobre repassar a taxa do meio de pagamento ao
  comprador, e a política de privacidade cobrindo os dados do pedido (nome, e-mail, telefone, endereço),
  gravados no banco do site e enviados ao Asaas e ao Melhor Envio.
- **A política de privacidade ainda não cobre a loja**: o CEP de entrega é enviado ao
  Melhor Envio (cálculo do frete) e entra na mensagem do WhatsApp, os dados do pedido
  seguem pelo WhatsApp e o carrinho (só ids e quantidades) fica no navegador. O CEP
  não é gravado no servidor. Incluir esses pontos na revisão jurídica antes de divulgar
  a loja.

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

1. Confirmar o projeto Supabase do CMS, aplicar as 7 migrations e autorizar o
   administrador (seção "Banco de dados e primeiro administrador").
2. Testar o painel de ponta a ponta contra o banco real (login, CRUD, uploads).
3. Substituir o conteúdo demonstrativo por formações, conteúdos e depoimentos
   reais via `/admin`.
4. Revisão jurídica das páginas legais.
