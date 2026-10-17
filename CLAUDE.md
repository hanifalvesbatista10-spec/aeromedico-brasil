@AGENTS.md

# Aeromédico Brasil — orquestração do projeto

Site institucional + CMS de Lucio Macêdo. Next.js 16 (App Router), React 19, TypeScript estrito, Tailwind v4, shadcn/Base UI, `motion`, Zod, Vitest, Supabase (Auth/Postgres/Storage via `@supabase/ssr`). Idioma de trabalho e de interface: **português do Brasil**.

Referências: `README.md`, `docs/superpowers/specs/*` (design), `docs/superpowers/plans/*` (planos). O plano normativo do CMS é `docs/superpowers/plans/2026-09-05-cms-supabase.md`.

## Regras permanentes

- Trabalhar sempre na branch `main` do projeto, sem criar branches novas. Commits locais podem ser feitos. Não dar push e não fazer deploy sem aprovação explícita do usuário: na Vercel, push na `main` publica o site.
- Supabase: apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nunca `service_role`, secret key ou `ANON_KEY`. Autorização = RLS + `is_admin()`.
- Migrations e SQL remoto nunca são aplicados por agentes: entregue o arquivo em `supabase/migrations/` e o usuário executa. O projeto Supabase `hanif-alves-plataforma` é de outro produto: não recebe este schema.
- Nunca ler ou imprimir valores de `.env.local`; citar apenas nomes de variáveis.
- Não inventar cursos, depoimentos, estatísticas, certificações, preços ou credenciais. Dado ausente vira `[PREENCHER: ...]` e pergunta ao usuário.
- Preservar identidade visual, logo oficial (`public/brand/logo.jpg`), Hero em vídeo, preloader, paleta e textos oficiais da Hero. Mudança cirúrgica, sem redesenho do projeto.
- Mídia final em `public/videos/aeromedico/` e `public/images/video-posters/` não é reconvertida nem renomeada. `assets-source/` é local e ignorado pelo Git.
- Páginas continuam Server Components; `"use client"` só no menor componente necessário.
- Sem nova dependência sem checar `package.json`. Animação: somente `motion`.

## Skills instaladas (plugins de usuário)

| Plugin | Skills | Uso neste projeto |
|---|---|---|
| `impeccable` 4.2 | `impeccable:impeccable` | Auditoria visual, polimento, responsividade, remoção de aparência genérica |
| `superpowers` 7.0 | `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`, `using-git-worktrees`, `using-superpowers`, `writing-skills`, `diagnosing-superpowers` | Método de trabalho |
| `humanizer` 2.11 | `humanizer:humanizer` | Copy em pt-BR sem tom de IA |

Também disponíveis na sessão (conectores, exigem autorização quando listados como pendentes): `design:*`, `canva:*`, `adobe-for-creativity:*`.

## Agentes especializados (`.claude/agents/`)

| Agente | Quando usar | Escreve código? |
|---|---|---|
| `nextjs-architect` | Estrutura, Server/Client, rotas, cache, proxy, APIs do Next 16 | Sim |
| `supabase-cms-engineer` | Migrations (apenas arquivos), RLS, repositórios, Server Actions, uploads | Sim (nunca executa SQL remoto) |
| `ui-design-lead` | Auditoria e polimento visual, responsividade, marca | Sim |
| `motion-media-engineer` | `SiteIntro`, `HeroVideo`, poster, economia de dados, reduced-motion | Sim |
| `copy-editor-ptbr` | Revisão de texto e microcopy em pt-BR | Só texto |
| `a11y-seo-auditor` | WCAG, SEO técnico, desempenho percebido | Não (somente leitura) |
| `qa-verification-engineer` | Testes, lint/tsc/test/build, verificação em navegador | Testes |
| `security-release-reviewer` | Segredos, RLS, LGPD, prontidão de release | Não (somente leitura) |

Subagentes não criam outros subagentes. **A sessão principal é a orquestradora.**

## Protocolo de orquestração

1. **Entender:** ler o pedido, `git status`/`git log`, plano vigente. Trabalho criativo novo começa com `superpowers:brainstorming`.
2. **Planejar:** `superpowers:writing-plans` salva o plano em `docs/superpowers/plans/AAAA-MM-DD-<tema>.md`. Planos com mais de uma frente aguardam aprovação do usuário.
3. **Delegar:** um agente por responsabilidade. Tarefas independentes (sem estado compartilhado) rodam em paralelo via `superpowers:dispatching-parallel-agents`; tarefas dependentes rodam em sequência. Cada prompt de delegação é autocontido: objetivo, arquivos, restrições acima, formato de entrega.
4. **Ordem típica de uma feature:** `nextjs-architect` (estrutura) → `supabase-cms-engineer` (dados) → `ui-design-lead` / `motion-media-engineer` (interface) → `copy-editor-ptbr` (texto) → `qa-verification-engineer` (portões) → `a11y-seo-auditor` e `security-release-reviewer` (revisões, em paralelo).
5. **Verificar:** nada é declarado pronto sem `superpowers:verification-before-completion`. Portões: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, mais checagem em navegador quando houver mudança visual.
6. **Revisar:** `superpowers:requesting-code-review` antes de propor commit. Achados de agentes são conferidos pela orquestradora antes de aplicados.
7. **Integrar:** commits locais direto na `main` (sem branches de feature). Push e deploy só com aprovação do usuário; não usar `superpowers:finishing-a-development-branch` para criar PR ou branch.

## Comandos

```bash
npm run dev        # servidor local (http://localhost:3000)
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Reiniciar a abertura cinematográfica em desenvolvimento (console do navegador): `sessionStorage.removeItem("aeromedico:intro-seen")`.
