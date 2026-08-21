# Aeromédico Brasil — Landing Page + CMS Administrativo

Plataforma institucional e comercial construída com Next.js, TypeScript, Tailwind CSS, componentes no padrão shadcn/ui, Supabase e Stripe.

## Entregue nesta base

- Landing page responsiva com hero, atuação, biblioteca gratuita, cursos, prova social gerenciável, FAQ e páginas legais.
- Painel administrativo com dashboard, conteúdo, materiais, cursos, leads, relatórios e configurações.
- Autenticação administrativa preparada para Supabase Auth.
- RLS e estrutura SQL para administradores, conteúdo, materiais, cursos, leads e eventos.
- Captura de leads com fallback demonstrativo quando o Supabase ainda não está configurado.
- Checkout Stripe via API e suporte a link de checkout externo por produto.
- SEO técnico: metadata, Open Graph, sitemap e robots.

## Estrutura

```text
app/                 rotas públicas, administrativas e APIs
components/          componentes landing, admin e UI
context/             estado compartilhado do painel
data/                conteúdo inicial demonstrativo
hooks/               hooks reutilizáveis
lib/                 utilitários
services/            Supabase, Stripe e autorização
supabase/schema.sql  banco, RLS e políticas iniciais
types/               contratos TypeScript
```

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as credenciais.
3. Execute `supabase/schema.sql` no SQL Editor do seu projeto Supabase.
4. Cadastre o primeiro usuário no Supabase Auth e insira seu `id` em `admin_profiles`.
5. Rode `npm run dev`.

## Variáveis principais

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Nunca publique chaves secretas no GitHub. Configure-as no ambiente de hospedagem.

## Comandos

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — validação estática
- `npm test` — build e testes de HTML renderizado

## Conteúdo demonstrativo

Preços, cursos, leads e indicadores são dados de demonstração e devem ser substituídos pelo administrador antes do lançamento comercial. Depoimentos e logos não foram inventados: a interface reserva o espaço para conteúdo real e autorizado.
