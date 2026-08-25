# Aeromédico Brasil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Adaptação de escopo:** este plano é executado inline, pelo mesmo agente que
> o escreveu, na mesma sessão — não há handoff para um engenheiro sem
> contexto. Por isso, tarefas de UI puramente apresentacional especificam
> conteúdo, props e estrutura com precisão, mas não reproduzem o JSX completo
> inline (ele é escrito durante a execução, task a task, seguindo esta
> especificação). Tarefas com lógica real (tipos, repositórios, auth,
> validação, utilitários) trazem código completo, pois erros ali se propagam.

**Goal:** Construir o esqueleto completo do site Aeromédico Brasil — landing
page pública de alta conversão, páginas internas públicas, e painel
administrativo estruturalmente conectado à mesma fonte de dados — pronto para
receber conteúdo real e, depois, integração Supabase.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind. Camada de
repositório desacoplada (`src/lib/repositories`) sobre dados mock
centralizados (`src/data`), consumida igualmente pela landing, páginas
internas e admin. Auth do admin via sessão HMAC em cookie, sem Supabase nesta
fase.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
(seletivo), motion, lucide-react, next/font, next/image, Zod, Vitest, ESLint.

**Spec:** [docs/superpowers/specs/2026-08-25-aeromedico-brasil-design.md](../specs/2026-08-25-aeromedico-brasil-design.md)

## Global Constraints

- Não inventar depoimentos, números de prova social, parceiros ou
  certificações. Único número confirmado: "+120 mil seguidores no Instagram",
  editável via `SiteSettings`.
- Nenhum dado sensível (senhas, secrets) commitado; tudo via `.env.example`
  documentando as chaves sem valores reais.
- Logomarca oficial ainda não fornecida → usar wordmark tipográfico
  "Aeromédico Brasil", componente pronto para receber arquivo depois.
- Paleta: azul-marinho profundo como principal, azul técnico de apoio,
  branco/cinza claro, vermelho só para ações de emergência/erro.
- Tipografia: Sora (títulos) + Inter (texto), via `next/font`.
- Mobile-first, 320px+, sem overflow horizontal, `prefers-reduced-motion`
  respeitado em toda animação.
- Nenhum componente da landing pode importar diretamente um repositório mock
  — sempre via `src/lib/repositories/index.ts`.
- `pnpm lint` e `pnpm build` devem passar sem erros ao final de cada fase que
  altera código compilável.

---

## Fase 0 — Scaffold do projeto

### Task 0.1: Inicializar projeto Next.js

**Files:**
- Create: projeto inteiro via `create-next-app` na raiz atual
  (`C:\Users\hanif\OneDrive\Desktop\projeto aeromedico`)

- [ ] **Step 1:** Rodar
  ```bash
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --use-pnpm
  ```
  Se `pnpm` não estiver disponível, repetir sem `--use-pnpm` (usa npm).
- [ ] **Step 2:** Confirmar que `src/app/page.tsx`, `tailwind.config.ts`,
  `tsconfig.json` foram criados.
- [ ] **Step 3:** Rodar o dev server (`pnpm dev` ou `npm run dev`) e confirmar
  que a página padrão sobe em `http://localhost:3000` sem erro.

### Task 0.2: Instalar dependências adicionais

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Instalar dependências de produção:
  ```bash
  npm install motion lucide-react zod clsx tailwind-merge
  ```
- [ ] **Step 2:** Instalar dependências de dev (testes):
  ```bash
  npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
  ```
- [ ] **Step 3:** Adicionar script em `package.json`:
  ```json
  "scripts": {
    "test": "vitest run"
  }
  ```
- [ ] **Step 4:** Criar `vitest.config.ts`:
  ```typescript
  import { defineConfig } from "vitest/config";
  import react from "@vitejs/plugin-react";
  import path from "node:path";

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
  });
  ```

### Task 0.3: shadcn/ui — inicializar e adicionar primitivos usados no admin

**Files:**
- Create: `components.json`, `src/components/ui/{button,input,textarea,select,dialog,table,badge,tabs,label}.tsx`

- [ ] **Step 1:** Rodar `npx shadcn@latest init` com base color "slate",
  aceitando CSS variables.
- [ ] **Step 2:** Rodar
  `npx shadcn@latest add button input textarea select dialog table badge tabs label`.
- [ ] **Step 3:** Confirmar build sem erro (`npm run build`).

### Task 0.4: `.env.example` e `.gitignore`

**Files:**
- Create: `.env.example`

- [ ] **Step 1:** Criar `.env.example`:
  ```bash
  # Admin (sessão simulada — fase 1, sem Supabase)
  ADMIN_PASSWORD=
  ADMIN_SESSION_SECRET=

  # Supabase (preparado, não usado nesta fase)
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=

  # Site
  NEXT_PUBLIC_SITE_URL=http://localhost:3000

  # Analytics (opcional — script só renderiza se definido)
  NEXT_PUBLIC_GA_ID=
  NEXT_PUBLIC_META_PIXEL_ID=
  ```
- [ ] **Step 2:** Confirmar que `.gitignore` gerado pelo `create-next-app` já
  ignora `.env*.local` e `node_modules`; adicionar `.env` explicitamente se
  ausente.

---

## Fase 1 — Tokens de design e estilos globais

### Task 1.1: Tokens de cor, tipografia e espaçamento

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/app/globals.css` (importar tokens)
- Modify: `tailwind.config.ts`

**Interfaces:**
- Produces: classes utilitárias Tailwind `bg-navy-950`, `text-sky-600`,
  `text-hero`, `text-h1`...`text-h4`, `font-heading`, `font-body`,
  `border-alert-600`, consumidas por todos os componentes das fases
  seguintes.

- [ ] **Step 1:** Criar `src/styles/tokens.css`:
  ```css
  :root {
    --navy-950: 222 47% 8%;
    --navy-900: 222 45% 12%;
    --navy-700: 222 35% 22%;
    --sky-600: 201 90% 40%;
    --sky-500: 201 85% 48%;
    --white: 0 0% 100%;
    --gray-50: 210 20% 98%;
    --gray-100: 210 16% 93%;
    --gray-300: 210 10% 78%;
    --gray-600: 215 12% 42%;
    --gray-900: 220 20% 14%;
    --alert-600: 358 72% 45%;
  }
  ```
- [ ] **Step 2:** Em `src/app/globals.css`, adicionar
  `@import "../styles/tokens.css";` antes das diretivas `@tailwind`.
- [ ] **Step 3:** Em `tailwind.config.ts`, estender `theme.extend.colors`:
  ```typescript
  colors: {
    navy: { 950: "hsl(var(--navy-950))", 900: "hsl(var(--navy-900))", 700: "hsl(var(--navy-700))" },
    sky: { 600: "hsl(var(--sky-600))", 500: "hsl(var(--sky-500))" },
    gray: { 50: "hsl(var(--gray-50))", 100: "hsl(var(--gray-100))", 300: "hsl(var(--gray-300))", 600: "hsl(var(--gray-600))", 900: "hsl(var(--gray-900))" },
    alert: { 600: "hsl(var(--alert-600))" },
  },
  fontSize: {
    hero: ["clamp(2.5rem, 5vw, 4.25rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
    h1: ["clamp(2rem, 3.5vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
    h2: ["clamp(1.5rem, 2.5vw, 2.25rem)", { lineHeight: "1.15" }],
    h3: ["1.5rem", { lineHeight: "1.25" }],
    h4: ["1.125rem", { lineHeight: "1.3" }],
  },
  ```
- [ ] **Step 4:** Rodar `npm run build` e confirmar que classes novas
  compilam sem erro (criar uma div de teste temporária em `page.tsx`, depois
  remover).

### Task 1.2: Fontes via `next/font`

**Files:**
- Create: `src/lib/fonts.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1:** Criar `src/lib/fonts.ts`:
  ```typescript
  import { Sora, Inter } from "next/font/google";

  export const fontHeading = Sora({
    subsets: ["latin"],
    weight: ["600", "700", "800"],
    variable: "--font-heading",
    display: "swap",
  });

  export const fontBody = Inter({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-body",
    display: "swap",
  });
  ```
- [ ] **Step 2:** Em `tailwind.config.ts`, adicionar
  `fontFamily: { heading: ["var(--font-heading)"], body: ["var(--font-body)"] }`.
- [ ] **Step 3:** Em `src/app/layout.tsx`, aplicar
  `className={`${fontHeading.variable} ${fontBody.variable} font-body`}` na
  tag `<html>` ou `<body>`.
- [ ] **Step 4:** `npm run build` sem erro; inspecionar visualmente que a
  fonte body mudou.

---

## Fase 2 — Tipos e camada de dados

### Task 2.1: Tipos centrais

**Files:**
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: todos os tipos abaixo, importados por `src/data/*`,
  `src/lib/repositories/*` e componentes de todas as fases seguintes.

- [ ] **Step 1:** Criar `src/lib/types.ts`:
  ```typescript
  export interface Profile {
    name: string;
    role: string;
    credentials: string[]; // ex.: ["Enfermeiro", "Mestre em Ensino na Saúde"]
    shortBio: string;
    longBio: string;
    photoUrl: string | null;
    instagramHandle: string;
  }

  export interface SocialProofStat {
    id: string;
    label: string;
    value: string; // string para permitir "+120 mil" sem parsing
  }

  export interface SiteSettings {
    profile: Profile;
    stats: SocialProofStat[];
    whatsappUrl: string;
    email: string;
    instagramUrl: string;
    primaryCta: CTAConfig;
    secondaryCta: CTAConfig;
    footerNote: string;
  }

  export type ProgramFormat = "presencial" | "online" | "hibrido";
  export type ProgramStatus = "disponivel" | "proximas-turmas" | "em-breve";

  export interface Program {
    slug: string;
    title: string;
    category: string;
    shortDescription: string;
    imageUrl: string | null;
    durationHours: number | null;
    format: ProgramFormat;
    status: ProgramStatus;
    enrollUrl: string | null;
    featured: boolean;
    isDemoContent: boolean;
  }

  export type ContentKind = "artigo" | "video" | "link-externo";

  export interface ContentPost {
    slug: string;
    kind: ContentKind;
    title: string;
    category: string;
    summary: string;
    coverUrl: string | null;
    author: string;
    publishedAt: string; // ISO date
    externalUrl: string | null;
    isDemoContent: boolean;
  }

  export interface Testimonial {
    id: string;
    name: string;
    profession: string;
    photoUrl: string | null;
    programOrEvent: string;
    quote: string;
    authorizedForDisplay: boolean;
  }

  export interface SpeakingTopic {
    id: string;
    kind: "palestra" | "treinamento" | "evento" | "aula" | "mentoria";
    title: string;
    description: string;
  }

  export interface FAQItem {
    id: string;
    question: string;
    answer: string;
  }

  export interface CTAConfig {
    label: string;
    href: string;
  }

  export interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    profession: string;
    interest: string;
    message: string;
    origin: "contato" | "formacao" | "palestra";
    consentGiven: boolean;
    createdAt: string;
    status: "novo" | "em-contato" | "convertido" | "descartado";
    notes: string | null;
  }
  ```
- [ ] **Step 2:** `npx tsc --noEmit` sem erros.

### Task 2.2: Dados demonstrativos centralizados

**Files:**
- Create: `src/data/profile.ts`, `src/data/settings.ts`,
  `src/data/programs.ts`, `src/data/content-posts.ts`,
  `src/data/testimonials.ts`, `src/data/speaking-topics.ts`,
  `src/data/faq.ts`

**Interfaces:**
- Consumes: tipos de `src/lib/types.ts` (Task 2.1)
- Produces: `profile`, `siteSettings`, `programs`, `contentPosts`,
  `testimonials`, `speakingTopics`, `faqItems` — únicos pontos de leitura
  usados pelos repositórios mock (Task 2.3).

- [ ] **Step 1:** `src/data/profile.ts`:
  ```typescript
  import type { Profile } from "@/lib/types";

  export const profile: Profile = {
    name: "Lucio Macêdo",
    role: "Enfermeiro · Especialista em APH e Transporte Aeromédico",
    credentials: [
      "Enfermeiro",
      "Mestre em Ensino na Saúde",
      "Palestrante",
      "Professor universitário",
      "Especialista em Atendimento Pré-Hospitalar (APH)",
      "Especialista em Transporte Aeromédico",
    ],
    shortBio:
      "Enfermeiro, mestre em Ensino na Saúde e professor universitário, dedicado a formar profissionais para o atendimento pré-hospitalar e o transporte aeromédico.",
    longBio:
      "Lucio Macêdo atua na formação de profissionais de saúde e emergência, com foco no transporte aeromédico e no atendimento pré-hospitalar. Produz conteúdo educacional e científico voltado a enfermeiros, técnicos, médicos, socorristas, bombeiros e integrantes do SAMU, e é professor universitário e palestrante.",
    photoUrl: null,
    instagramHandle: "@aeromedico.brasil",
  };
  ```
- [ ] **Step 2:** `src/data/settings.ts`:
  ```typescript
  import type { SiteSettings } from "@/lib/types";
  import { profile } from "./profile";

  export const siteSettings: SiteSettings = {
    profile,
    stats: [
      { id: "followers", label: "Comunidade no Instagram", value: "+120 mil seguidores" },
      { id: "focus", label: "Área de atuação", value: "Transporte aeromédico e APH" },
      { id: "content", label: "Conteúdo", value: "Ciência aplicada à prática" },
    ],
    whatsappUrl: "https://wa.me/",
    email: "contato@aeromedicobrasil.com.br",
    instagramUrl: "https://www.instagram.com/aeromedico.brasil/",
    primaryCta: { label: "Conheça as formações", href: "/formacoes" },
    secondaryCta: { label: "Fale com a equipe", href: "/contato" },
    footerNote:
      "Os conteúdos educacionais deste site não substituem protocolos institucionais, regulamentações vigentes ou treinamento prático supervisionado.",
  };
  ```
  *(nota: `whatsappUrl` e `email` são placeholders explícitos — ver §7 do
  relatório final: dependem de dado real do administrador.)*
- [ ] **Step 3:** `src/data/programs.ts` — array `programs: Program[]` com 3
  itens, todos `isDemoContent: true`, cobrindo os três `format` e os três
  `status` (para exercitar a UI), slugs `curso-transporte-aeromedico-basico`,
  `mentoria-carreira-aeromedica`, `treinamento-equipes-resgate`.
- [ ] **Step 4:** `src/data/content-posts.ts` — array `contentPosts:
  ContentPost[]` com 3 itens (`artigo`, `video`, `link-externo`),
  `isDemoContent: true`.
- [ ] **Step 5:** `src/data/testimonials.ts`:
  ```typescript
  import type { Testimonial } from "@/lib/types";

  // Nenhum depoimento real cadastrado ainda — não inventar conteúdo aqui.
  export const testimonials: Testimonial[] = [];
  ```
- [ ] **Step 6:** `src/data/speaking-topics.ts` — array `speakingTopics:
  SpeakingTopic[]` com os 5 tipos do briefing (palestra, treinamento, evento,
  aula, mentoria), descrições curtas e factuais (sem números inventados).
- [ ] **Step 7:** `src/data/faq.ts` — array `faqItems: FAQItem[]` com as 6
  perguntas do briefing (§6.11), respostas que não prometem condições não
  confirmadas (ex.: certificação — responder que os detalhes de carga
  horária e certificado são informados na página de cada formação, sem
  afirmar entidade certificadora não confirmada).
- [ ] **Step 8:** `npx tsc --noEmit` sem erros.

### Task 2.3: Camada de repositório (mock, pronta para Supabase)

**Files:**
- Create: `src/lib/repositories/types.ts`, `src/lib/repositories/mock/*.ts`,
  `src/lib/repositories/index.ts`
- Test: `src/lib/repositories/__tests__/programs.test.ts`

**Interfaces:**
- Consumes: `src/data/*` (Task 2.2), tipos de `src/lib/types.ts` (Task 2.1)
- Produces: `getRepositories()` retornando `{ programs, contentPosts,
  testimonials, speakingTopics, faq, leads, settings }`, cada um com métodos
  `list()`, `getBySlug(slug: string)` (quando aplicável), e para `programs`/
  `contentPosts`/`testimonials`/`leads` também `create`, `update`, `remove`.
  Todas as fases seguintes importam **somente** `getRepositories` de
  `@/lib/repositories`.

- [ ] **Step 1:** Criar `src/lib/repositories/types.ts` com as interfaces
  (`ProgramsRepository`, `ContentRepository`, `TestimonialsRepository`,
  `SpeakingRepository`, `FAQRepository`, `LeadsRepository`,
  `SettingsRepository`), cada uma tipada sobre os tipos de `src/lib/types.ts`.
- [ ] **Step 2:** Escrever o teste primeiro,
  `src/lib/repositories/__tests__/programs.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach } from "vitest";
  import { createMockProgramsRepository } from "../mock/programs";

  describe("mock programs repository", () => {
    it("lists seeded programs", async () => {
      const repo = createMockProgramsRepository();
      const items = await repo.list();
      expect(items.length).toBeGreaterThan(0);
    });

    it("finds a program by slug", async () => {
      const repo = createMockProgramsRepository();
      const [first] = await repo.list();
      const found = await repo.getBySlug(first.slug);
      expect(found?.slug).toBe(first.slug);
    });

    it("creates, updates and removes a program", async () => {
      const repo = createMockProgramsRepository();
      const created = await repo.create({
        slug: "teste-slug",
        title: "Teste",
        category: "Categoria",
        shortDescription: "Descrição",
        imageUrl: null,
        durationHours: null,
        format: "online",
        status: "em-breve",
        enrollUrl: null,
        featured: false,
        isDemoContent: true,
      });
      expect(created.slug).toBe("teste-slug");

      const updated = await repo.update("teste-slug", { title: "Atualizado" });
      expect(updated?.title).toBe("Atualizado");

      await repo.remove("teste-slug");
      const afterRemove = await repo.getBySlug("teste-slug");
      expect(afterRemove).toBeNull();
    });
  });
  ```
- [ ] **Step 3:** Rodar `npm test` e confirmar falha (`createMockProgramsRepository`
  não existe).
- [ ] **Step 4:** Implementar `src/lib/repositories/mock/programs.ts` com
  `createMockProgramsRepository(): ProgramsRepository`, estado em memória
  (`let items = [...programs]`), métodos assíncronos (retornam Promises,
  para bater com a futura implementação Supabase).
- [ ] **Step 5:** Rodar `npm test` e confirmar que os 3 testes passam.
- [ ] **Step 6:** Repetir o mesmo padrão (sem reescrever teste completo aqui,
  seguir a estrutura do Step 2) para `content-posts.ts`, `testimonials.ts`,
  `speaking-topics.ts`, `faq.ts`, `leads.ts` (este último sem seed inicial,
  array vazio), `settings.ts` (`get()`/`update()` sobre um único registro).
- [ ] **Step 7:** Criar `src/lib/repositories/index.ts`:
  ```typescript
  import { createMockProgramsRepository } from "./mock/programs";
  import { createMockContentRepository } from "./mock/content-posts";
  import { createMockTestimonialsRepository } from "./mock/testimonials";
  import { createMockSpeakingRepository } from "./mock/speaking-topics";
  import { createMockFAQRepository } from "./mock/faq";
  import { createMockLeadsRepository } from "./mock/leads";
  import { createMockSettingsRepository } from "./mock/settings";

  // Módulo singleton: mesma instância em toda a app (dev server).
  // Trocar por implementações Supabase aqui quando disponíveis.
  const repositories = {
    programs: createMockProgramsRepository(),
    contentPosts: createMockContentRepository(),
    testimonials: createMockTestimonialsRepository(),
    speaking: createMockSpeakingRepository(),
    faq: createMockFAQRepository(),
    leads: createMockLeadsRepository(),
    settings: createMockSettingsRepository(),
  };

  export function getRepositories() {
    return repositories;
  }
  ```
- [ ] **Step 8:** `npm test` e `npx tsc --noEmit` sem erros.

### Task 2.4: Commit da fundação

- [ ] **Step 1:** `git init` (o projeto ainda não é um repositório git).
- [ ] **Step 2:**
  ```bash
  git add -A
  git commit -m "chore: scaffold Next.js project with design tokens, types and mock data layer"
  ```

---

## Fase 3 — Layout compartilhado (Header, Footer, root layout)

### Task 3.1: Utilitário `cn`

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1:**
  ```typescript
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
  *(shadcn já costuma gerar este arquivo no Task 0.3 — se existir, pular.)*

### Task 3.2: `Header` + `MobileMenu`

**Files:**
- Create: `src/components/layout/header.tsx`,
  `src/components/layout/mobile-menu.tsx`

**Interfaces:**
- Consumes: `getRepositories().settings` (Task 2.3) para `primaryCta`;
  navegação é lista estática local (não depende de dado externo).
- Produces: `<Header />`, usado em `src/app/layout.tsx` (Task 3.4).

- [ ] **Step 1:** `Header` client component (`"use client"`): fixo no topo,
  fundo transparente sobre o hero e `bg-navy-950/95 backdrop-blur` após
  `scrollY > 24` (via `useEffect` + listener em `scroll`, passivo). Contém
  wordmark "Aeromédico Brasil" (link para `/`), nav horizontal (Início,
  Sobre, Formação, Conteúdos, Palestras, Contato) visível a partir de `md:`,
  botão primário "Conheça as formações", e botão hambúrguer visível abaixo de
  `md:` que abre `MobileMenu`.
- [ ] **Step 2:** `MobileMenu`: painel deslizante (`motion.div`,
  `x: "100%" → 0`) cobrindo a viewport, `role="dialog"` `aria-modal="true"`,
  fecha com `Escape` e com botão de fechar, foco movido para o primeiro link
  ao abrir (`useEffect` + `ref.focus()`), trap de foco simples (Tab cíclico
  entre os itens do menu).
- [ ] **Step 3:** Confirmar com `prefers-reduced-motion`: se ativo, o painel
  aparece/desaparece sem transição de posição (`transition: { duration: 0 }`).

### Task 3.3: `Footer`

**Files:**
- Create: `src/components/layout/footer.tsx`

**Interfaces:**
- Consumes: `getRepositories().settings` (`footerNote`, `instagramUrl`,
  `email`).

- [ ] **Step 1:** Seções: wordmark + descrição resumida (1–2 frases, do
  `profile.shortBio`), navegação (mesmos links do header), Instagram
  (`instagramUrl`), contato (`email`), links `/politica-de-privacidade` e
  `/termos-de-uso`, linha de copyright com ano corrente
  (`new Date().getFullYear()`), e o aviso de `footerNote` (§12 do design doc)
  em texto pequeno, sempre visível — não escondido em tooltip.

### Task 3.4: Root layout

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `Header` (3.2), `Footer` (3.3), `fontHeading`/`fontBody` (Task
  1.2).
- Produces: `<RootLayout>` envolvendo todas as páginas públicas com
  `<Header />` + `{children}` + `<Footer />`; `metadata` base
  (`title.template`, `description`, `metadataBase` a partir de
  `NEXT_PUBLIC_SITE_URL`).

- [ ] **Step 1:** Implementar, com `<main id="main-content">{children}</main>`
  e um link "Pular para o conteúdo" (`sr-only focus:not-sr-only`) antes do
  header, apontando para `#main-content` (acessibilidade por teclado).
- [ ] **Step 2:** `npm run build` sem erros; abrir `/` no navegador e
  confirmar header fixo, menu mobile funcional em viewport estreita
  (devtools), footer renderizando.

---

## Fase 4 — Seções da landing page

Cada task abaixo cria um componente de seção em `src/components/sections/`,
consumindo dados via `getRepositories()`/`src/data` conforme indicado, e é
importado em ordem por `src/app/page.tsx` (Task 4.12).

### Task 4.1: `HeroSection`

**Interfaces:** Consumes `profile`, `siteSettings.stats[0]` (contador de
seguidores), `siteSettings.primaryCta`/`secondaryCta`.

- [ ] Headline exata: "Conhecimento que prepara profissionais para os
  desafios do transporte aeromédico." Subheadline exata: "Educação, ciência e
  experiência aplicadas à formação de profissionais que atuam na urgência,
  emergência e aviação médica." Dois CTAs: "Conheça os cursos" (→
  `/formacoes`) e "Contrate uma palestra" (→ `/palestras`). Nome e cargo
  resumido de Lucio Macêdo, indicador "Comunidade com mais de 120 mil
  seguidores", wordmark integrado à composição (não avião genérico), detalhe
  gráfico de linhas técnicas (SVG inline leve, `aria-hidden`). Layout
  editorial: texto à esquerda, composição visual à direita (foto quando
  houver `profile.photoUrl`, senão um painel gráfico com o wordmark e as
  linhas técnicas — nunca um placeholder cinza vazio).

### Task 4.2: `AuthorityStrip`

**Interfaces:** Consumes `siteSettings.stats: SocialProofStat[]`.

- [ ] Faixa de fundo `navy-950`, 3–4 estatísticas em grid horizontal
  (`grid-cols-2 md:grid-cols-3`), cada uma `value` em destaque tipográfico +
  `label`. Sem ícones genéricos — tipografia carrega o peso visual.

### Task 4.3: `AboutSection`

**Interfaces:** Consumes `profile`.

- [ ] Título "Experiência, educação e propósito no atendimento aeromédico.".
  Lista de credenciais (`profile.credentials`) como linha de texto
  técnica (não badges arredondados em excesso — usar separador `·`).
  `profile.shortBio`, espaço para foto (`next/image` se `photoUrl`, senão
  painel com wordmark), botão "Conheça a trajetória" → `/sobre`.

### Task 4.4: `ExpertisePillars`

**Interfaces:** Consumes lista estática local de 6 pilares (texto do
briefing §6.5) — não depende de repositório (conteúdo institucional fixo).

- [ ] Grid editorial (não cards com sombra): colunas com divisores de linha
  fina (`border-l border-gray-300`), número do pilar em algarismo grande e
  discreto (`text-gray-300`), título + 1 frase por pilar.

### Task 4.5: `ProgramCard` + `FeaturedPrograms`

**Interfaces:** Consumes `getRepositories().programs.list()`, filtra
`featured: true` (máximo 3).

- [ ] `ProgramCard`: imagem (`next/image`, `aspect-video`), categoria
  (badge de texto, não pílula colorida chamativa), título, descrição curta,
  linha de metadados (carga horária se houver, formato, status com rótulo
  em `pt-BR`: "Disponível" / "Próximas turmas" / "Em breve"), botão "Ver
  formação" (→ `/formacoes/[slug]`) e, se `enrollUrl`, botão secundário de
  inscrição (`target="_blank" rel="noopener noreferrer"`).
- [ ] `FeaturedPrograms`: título de seção, grid de `ProgramCard`s, link
  "Ver todas as formações" → `/formacoes`. Se a lista filtrada vier vazia,
  renderizar `EmptyState` (não esconder a seção silenciosamente).

### Task 4.6: `SpeakingSection`

**Interfaces:** Consumes `getRepositories().speaking.list()`.

- [ ] Lista os `SpeakingTopic[]` (palestra, treinamento, evento, aula,
  mentoria) em formato editorial (lista com títulos grandes, não ícones +
  card). CTA "Solicitar proposta" → `/palestras` (a página `/palestras` é
  quem hospeda o formulário real — aqui é só o link).

### Task 4.7: `ContentHighlights`

**Interfaces:** Consumes `getRepositories().contentPosts.list()`, mostra os
3 mais recentes por `publishedAt`.

- [ ] Card com capa, categoria, título, resumo, data formatada (`pt-BR`,
  `Intl.DateTimeFormat`), autor. Link "Ver conteúdo" → `/conteudos/[slug]`
  (interno) ou `externalUrl` quando `kind === "link-externo"`.

### Task 4.8: `InstagramCommunity`

**Interfaces:** Consumes `profile.instagramHandle`,
`siteSettings.instagramUrl`, `siteSettings.stats` (seguidores).

- [ ] Seção com `@aeromedico.brasil`, "+120 mil seguidores", 1–2 frases
  descrevendo o tipo de conteúdo publicado (educacional, científico, bastidor
  operacional — sem inventar detalhes além do briefing), botão "Acompanhar no
  Instagram" (`target="_blank"`). Grade de posts fica **fora de escopo** desta
  fase (não-objetivo — API do Instagram não integrada); se houver posts
  cadastrados manualmente no repositório de conteúdo com `kind` compatível,
  a seção pode listá-los, senão mostra só o CTA — sem grade vazia fingindo
  ser feed ao vivo.

### Task 4.9: `TestimonialsSection`

**Interfaces:** Consumes `getRepositories().testimonials.list()`, filtra
`authorizedForDisplay`.

- [ ] Se lista vazia (caso atual — `src/data/testimonials.ts` começa vazio):
  renderizar `EmptyState` (Task 6.7) com mensagem "Em breve, depoimentos de
  profissionais formados." — nunca um depoimento inventado. Se houver itens,
  carrossel simples ou grid de citações com nome, profissão, curso/evento.

### Task 4.10: `FAQSection`

**Interfaces:** Consumes `getRepositories().faq.list()`.

- [ ] Accordion acessível (shadcn `Accordion` se disponível, ou
  implementação própria com `<button aria-expanded>` + `aria-controls`),
  uma pergunta aberta por vez.

### Task 4.11: `FinalCTA`

**Interfaces:** Consumes `siteSettings.primaryCta`.

- [ ] Fundo `navy-950`, headline exata: "Eleve sua preparação para atuar
  onde conhecimento, precisão e decisão salvam vidas.", dois botões:
  "Conheça as formações" (→ `/formacoes`) e "Fale com a equipe" (→
  `/contato`).

### Task 4.12: Montagem da landing page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:** Consumes todos os componentes 4.1–4.11, na ordem do design
doc §8.

- [ ] **Step 1:** `page.tsx` como Server Component `async function Page()`,
  buscando os dados necessários via `getRepositories()` uma vez no topo e
  passando como props (evita cada seção repetir a chamada).
- [ ] **Step 2:** `generateMetadata` com title "Aeromédico Brasil — Educação
  em transporte aeromédico e APH" e description baseada em
  `profile.shortBio`.
- [ ] **Step 3:** `npm run build` e revisão visual no navegador (desktop e
  mobile, via devtools) — landing completa, sem overflow horizontal, header
  fixo funcionando, menu mobile abrindo.
- [ ] **Step 4:** Commit:
  ```bash
  git add -A
  git commit -m "feat: build landing page sections and assemble home route"
  ```

---

## Fase 5 — Páginas públicas internas

### Task 5.1: `/sobre`

**Interfaces:** Consumes `profile.longBio`, `profile.credentials`.

- [ ] Página com `AboutSection` expandida (não reimportar o componente da
  home — criar composição própria com `longBio` completo e timeline simples
  de credenciais). `generateMetadata` própria.

### Task 5.2: `/formacoes` e `/formacoes/[slug]`

**Interfaces:** Consumes `getRepositories().programs.list()` /
`getBySlug(slug)`.

- [ ] `/formacoes`: grid completo de `ProgramCard` (reuso do componente da
  Task 4.5), sem limite de 3.
- [ ] `/formacoes/[slug]`: `generateStaticParams` a partir de
  `programs.list()`; se slug não encontrado, `notFound()`. Conteúdo:
  imagem, categoria, título, descrição, metadados completos, CTA de
  inscrição (`enrollUrl` ou, se nulo, botão desabilitado com texto
  "Inscrições em breve").

### Task 5.3: `/conteudos` e `/conteudos/[slug]`

**Interfaces:** Consumes `getRepositories().contentPosts.list()` /
`getBySlug(slug)`. Mesmo padrão da Task 5.2.

### Task 5.4: `/palestras`

**Interfaces:** Consumes `getRepositories().speaking.list()`,
`LeadForm` (Task 7.1).

- [ ] Lista completa de `SpeakingTopic[]`, seguida do `LeadForm` configurado
  com `origin: "palestra"`.

### Task 5.5: `/contato`

**Interfaces:** Consumes `siteSettings` (email, whatsappUrl), `LeadForm`
(`origin: "contato"`).

### Task 5.6: `/politica-de-privacidade` e `/termos-de-uso`

- [ ] Conteúdo estrutural real (não Lorem Ipsum): texto genérico porém
  correto de política/termos para um site educacional que coleta leads via
  formulário, marcado claramente como **modelo inicial a ser validado
  juridicamente** pelo administrador antes de publicação real (comentário no
  topo do arquivo `.tsx`, não visível ao usuário final, mais uma nota de
  rodapé discreta na própria página).

- [ ] **Commit da Fase 5:**
  ```bash
  git add -A
  git commit -m "feat: add internal public routes (sobre, formacoes, conteudos, palestras, contato, legal)"
  ```

---

## Fase 6 — Auth do admin e layout do painel

### Task 6.1: Validação de credenciais

**Files:**
- Create: `src/lib/auth/credentials.ts`
- Test: `src/lib/auth/__tests__/credentials.test.ts`

**Interfaces:** Produces `verifyPassword(input: string): boolean`.

- [ ] **Step 1:** Teste:
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from "vitest";
  import { verifyPassword } from "../credentials";

  describe("verifyPassword", () => {
    const original = process.env.ADMIN_PASSWORD;
    beforeEach(() => { process.env.ADMIN_PASSWORD = "senha-teste-123"; });
    afterEach(() => { process.env.ADMIN_PASSWORD = original; });

    it("accepts the correct password", () => {
      expect(verifyPassword("senha-teste-123")).toBe(true);
    });

    it("rejects an incorrect password", () => {
      expect(verifyPassword("errada")).toBe(false);
    });
  });
  ```
- [ ] **Step 2:** `npm test` → falha (`verifyPassword` não existe).
- [ ] **Step 3:** Implementar:
  ```typescript
  export function verifyPassword(input: string): boolean {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return false;
    return input === expected;
  }
  ```
- [ ] **Step 4:** `npm test` → passa.

### Task 6.2: Sessão assinada (cookie HMAC)

**Files:**
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/__tests__/session.test.ts`

**Interfaces:** Produces `signSession(): string`,
`verifySessionToken(token: string): boolean`.

- [ ] **Step 1:** Teste:
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from "vitest";
  import { signSession, verifySessionToken } from "../session";

  describe("session token", () => {
    const original = process.env.ADMIN_SESSION_SECRET;
    beforeEach(() => { process.env.ADMIN_SESSION_SECRET = "segredo-teste"; });
    afterEach(() => { process.env.ADMIN_SESSION_SECRET = original; });

    it("verifies a token it signed", () => {
      const token = signSession();
      expect(verifySessionToken(token)).toBe(true);
    });

    it("rejects a tampered token", () => {
      const token = signSession();
      expect(verifySessionToken(token + "x")).toBe(false);
    });

    it("rejects an empty token", () => {
      expect(verifySessionToken("")).toBe(false);
    });
  });
  ```
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar com `node:crypto`:
  ```typescript
  import { createHmac, timingSafeEqual } from "node:crypto";

  const PAYLOAD = "admin-session";

  function getSecret(): string {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
    return secret;
  }

  export function signSession(): string {
    const signature = createHmac("sha256", getSecret()).update(PAYLOAD).digest("hex");
    return `${PAYLOAD}.${signature}`;
  }

  export function verifySessionToken(token: string): boolean {
    if (!token) return false;
    const [payload, signature] = token.split(".");
    if (payload !== PAYLOAD || !signature) return false;
    let secret: string;
    try { secret = getSecret(); } catch { return false; }
    const expected = createHmac("sha256", secret).update(PAYLOAD).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  ```
- [ ] **Step 4:** `npm test` → passa.

### Task 6.3: Route handlers de login/logout

**Files:**
- Create: `src/app/api/admin/login/route.ts`,
  `src/app/api/admin/logout/route.ts`

**Interfaces:** Consumes `verifyPassword` (6.1), `signSession` (6.2).
Cookie: nome `admin_session`, `httpOnly`, `secure` em produção, `sameSite:
"lax"`, `path: "/"`.

- [ ] **Step 1:** `POST /api/admin/login`: lê `{ password }` do body, se
  `verifyPassword(password)` for `false` retorna 401 `{ error: "Senha
  inválida." }`; se `true`, seta cookie `admin_session` com `signSession()`
  e retorna 200 `{ ok: true }`.
- [ ] **Step 2:** `POST /api/admin/logout`: remove o cookie
  (`maxAge: 0`), retorna 200.

### Task 6.4: Middleware de proteção do `/admin`

**Files:**
- Create: `middleware.ts` (raiz do projeto, ao lado de `src/`)

**Interfaces:** Consumes `verifySessionToken` (6.2).

- [ ] **Step 1:**
  ```typescript
  import { NextResponse, type NextRequest } from "next/server";
  import { verifySessionToken } from "@/lib/auth/session";

  export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname === "/admin/login") return NextResponse.next();

    const token = request.cookies.get("admin_session")?.value ?? "";
    if (!verifySessionToken(token)) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  export const config = { matcher: ["/admin/:path*"] };
  ```
- [ ] **Step 2:** Testar manualmente: acessar `/admin` sem login →
  redireciona para `/admin/login`; após login (Task 6.5) com senha correta →
  acesso liberado.

### Task 6.5: Página `/admin/login`

**Files:**
- Create: `src/app/admin/login/page.tsx`

**Interfaces:** Consumes `POST /api/admin/login` (6.3).

- [ ] Formulário client-side: campo senha, submit via `fetch("/api/admin/login")`,
  estado de loading/erro (mensagem exibida se 401), em sucesso
  `router.push("/admin")` + `router.refresh()`. Layout simples, sem
  `Header`/`Footer` públicos (rota fora do grupo `(public)` — ver Task 6.6).

### Task 6.6: Layout do admin (sidebar + header + guarda visual)

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/components/admin/admin-sidebar.tsx`,
  `src/components/admin/admin-header.tsx`
- Modify: mover rotas públicas para `src/app/(public)/...` **ou** manter
  `/admin` como árvore irmã de `page.tsx` — decisão: usar route group
  `src/app/(public)/` para todas as rotas das Fases 4–5 (não muda a URL,
  `page.tsx` continua servindo `/`), para que `src/app/admin/layout.tsx` não
  herde `Header`/`Footer` do layout público.

**Interfaces:** Consumes `getRepositories().settings` (nome do admin no
header).

- [ ] **Step 1:** Mover `src/app/page.tsx` e as rotas da Fase 5 para dentro
  de `src/app/(public)/`, ajustando imports relativos se necessário
  (aliases `@/` não mudam). Confirmar `npm run build` continua servindo `/`,
  `/sobre`, etc.
- [ ] **Step 2:** `AdminSidebar`: navegação para as 7 rotas do admin, ícones
  `lucide-react` (um por item, com moderação), indicador de rota ativa.
- [ ] **Step 3:** `AdminHeader`: título da página atual, botão "Sair"
  (chama `POST /api/admin/logout` e redireciona para `/admin/login`).
- [ ] **Step 4:** `src/app/admin/layout.tsx`: grid `sidebar + main`,
  responsivo (sidebar colapsa em menu no mobile — reaproveitar padrão de
  `MobileMenu` se fizer sentido, ou um `Sheet` do shadcn).

- [ ] **Commit da Fase 6:**
  ```bash
  git add -A
  git commit -m "feat: add admin authentication (session cookie) and admin shell layout"
  ```

---

## Fase 7 — Componentes compartilhados do admin

### Task 7.1: `LeadForm` + validação Zod + route handler

**Files:**
- Create: `src/lib/validation/lead.ts`, `src/components/lead-form.tsx`,
  `src/app/api/leads/route.ts`
- Test: `src/lib/validation/__tests__/lead.test.ts`

**Interfaces:** Consumes `getRepositories().leads` (2.3). Produces
`<LeadForm origin="contato" | "formacao" | "palestra" />`, usado nas Tasks
5.2, 5.4, 5.5.

- [ ] **Step 1:** Teste do schema:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { leadSchema } from "../lead";

  describe("leadSchema", () => {
    it("accepts a valid lead", () => {
      const result = leadSchema.safeParse({
        name: "Maria Souza",
        email: "maria@example.com",
        phone: "11999999999",
        profession: "Enfermeira",
        interest: "Curso de transporte aeromédico",
        message: "Quero saber mais.",
        origin: "formacao",
        consentGiven: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects without consent", () => {
      const result = leadSchema.safeParse({
        name: "Maria Souza",
        email: "maria@example.com",
        phone: "11999999999",
        profession: "Enfermeira",
        interest: "Curso",
        message: "Mensagem",
        origin: "contato",
        consentGiven: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid email", () => {
      const result = leadSchema.safeParse({
        name: "Maria Souza",
        email: "não-é-email",
        phone: "11999999999",
        profession: "Enfermeira",
        interest: "Curso",
        message: "Mensagem",
        origin: "contato",
        consentGiven: true,
      });
      expect(result.success).toBe(false);
    });
  });
  ```
- [ ] **Step 2:** `npm test` → falha.
- [ ] **Step 3:** Implementar `src/lib/validation/lead.ts`:
  ```typescript
  import { z } from "zod";

  export const leadSchema = z.object({
    name: z.string().min(2, "Informe seu nome completo."),
    email: z.string().email("Informe um e-mail válido."),
    phone: z.string().min(8, "Informe um telefone válido."),
    profession: z.string().min(2, "Informe sua profissão."),
    interest: z.string().min(2, "Conte o que você procura."),
    message: z.string().min(5, "Escreva uma mensagem."),
    origin: z.enum(["contato", "formacao", "palestra"]),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar o uso dos dados para contato." }),
    }),
  });

  export type LeadInput = z.infer<typeof leadSchema>;
  ```
- [ ] **Step 4:** `npm test` → passa.
- [ ] **Step 5:** `src/app/api/leads/route.ts`: `POST` valida com
  `leadSchema.safeParse(await request.json())`; se inválido, 400 com
  `error.flatten()`; se válido, chama
  `getRepositories().leads.create({...parsed, id: crypto.randomUUID(),
  createdAt: new Date().toISOString(), status: "novo", notes: null})` e
  retorna 201.
- [ ] **Step 6:** `LeadForm` (client component): campos do design doc §14,
  labels associados (`htmlFor`/`id`), checkbox de consentimento com texto
  explícito (não pré-marcado), submit via `fetch("/api/leads")`, estados
  `idle | loading | success | error`, mensagens de erro por campo a partir de
  `error.flatten().fieldErrors` quando 400, mensagem de confirmação clara em
  sucesso (sem redirecionar — mantém o usuário na página).

### Task 7.2: `EmptyState`

**Files:**
- Create: `src/components/empty-state.tsx`

- [ ] Props `{ title: string; description: string; action?: { label:
  string; href: string } }`. Usado por `TestimonialsSection` (4.9) e pelas
  telas de admin sem itens.

### Task 7.3: `ConfirmDialog`

**Files:**
- Create: `src/components/admin/confirm-dialog.tsx`

- [ ] Baseado no `Dialog` do shadcn (Task 0.3). Props `{ open: boolean;
  onOpenChange: (open: boolean) => void; title: string; description: string;
  confirmLabel: string; onConfirm: () => void; destructive?: boolean }`.
  Usado por toda ação de exclusão no admin.

### Task 7.4: `DataTable` e `MetricCard`

**Files:**
- Create: `src/components/admin/data-table.tsx`,
  `src/components/admin/metric-card.tsx`

- [ ] `DataTable<T>`: genérica, props `{ columns: { key: keyof T; header:
  string; render?: (row: T) => ReactNode }[]; rows: T[]; emptyState:
  ReactNode; rowActions?: (row: T) => ReactNode }`. Usa a tabela do shadcn.
  Sem paginação nesta fase (volume de dados demo é pequeno) — anotar como
  limite conhecido em comentário.
- [ ] `MetricCard`: props `{ label: string; value: string | number; hint?:
  string }`, usado no dashboard (Task 8.1).

### Task 7.5: `MediaUploader` (stub funcional)

**Files:**
- Create: `src/components/admin/media-uploader.tsx`

- [ ] Client component: input de arquivo com área de drag-and-drop, preview
  via `URL.createObjectURL(file)`, callback `onUploaded(url: string)`.
  Comentário explícito no topo: "Fase 1 — retorna uma URL de objeto local
  (não persiste); integração real de storage é não-objetivo desta fase (ver
  design doc §12)."

---

## Fase 8 — Páginas do painel administrativo

### Task 8.1: Dashboard (`/admin`)

**Interfaces:** Consumes `getRepositories()` (todos os repositórios) para
calcular contagens: total de leads, formações publicadas
(`status !== "em-breve"`), conteúdos publicados, solicitações de palestra
(leads com `origin: "palestra"`), e uma lista das 5 leads mais recentes como
"atividade recente". "Cliques nos CTAs" não tem fonte de dados real nesta
fase (nenhum tracking implementado) — exibir `MetricCard` com valor "—" e
`hint: "Disponível após integrar analytics"` em vez de inventar um número.

- [ ] Grid de `MetricCard`s + tabela simples de atividade recente
  (`DataTable` sem ações).

### Task 8.2: `/admin/formacoes`

**Interfaces:** Consumes/produces via `getRepositories().programs`.

- [ ] `DataTable` listando todas as formações (título, categoria, status,
  destaque), ações por linha: editar (abre formulário em modal/rota
  `/admin/formacoes/[slug]/editar` — usar modal com `Dialog` para manter
  escopo simples), publicar/despublicar (toggle de `status`), excluir
  (`ConfirmDialog`). Botão "Nova formação" abre o mesmo formulário vazio.
  Formulário cobre todos os campos de `Program` exceto `slug` (gerado via
  `slugify(title)` — Task 8.6) e `isDemoContent` (interno).

### Task 8.3: `/admin/conteudos`

- [ ] Mesmo padrão da Task 8.2, sobre `ContentPost` (`getRepositories().contentPosts`).

### Task 8.4: `/admin/depoimentos`

- [ ] `DataTable` sobre `Testimonial`, com toggle `authorizedForDisplay`
  visível como coluna e como campo do formulário (obrigatório marcar antes
  de publicar). Estado vazio inicial via `EmptyState` ("Nenhum depoimento
  cadastrado ainda.").

### Task 8.5: `/admin/palestras`

**Interfaces:** Consumes `getRepositories().speaking` (temas) e
`getRepositories().leads` filtrados por `origin: "palestra"` (solicitações).

- [ ] Duas seções na mesma página: gestão de `SpeakingTopic[]` (CRUD simples,
  sem imagem) e tabela somente-leitura das solicitações recebidas
  (reaproveita a lógica de leads).

### Task 8.6: `/admin/leads`

**Interfaces:** Consumes `getRepositories().leads`.

- [ ] `DataTable` com nome, e-mail, telefone, interesse, origem, data
  (formatada), status (select editável inline: novo/em-contato/
  convertido/descartado), observações (campo de texto editável). Sem
  exclusão em massa nesta fase.
- [ ] Criar `src/lib/utils/slugify.ts` usado pelas Tasks 8.2/8.3:
  ```typescript
  export function slugify(input: string): string {
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  ```
  Com teste unitário simples (`slugify("Curso de Transporte Aeromédico") ===
  "curso-de-transporte-aeromedico"`) em
  `src/lib/utils/__tests__/slugify.test.ts`.

### Task 8.7: `/admin/configuracoes`

**Interfaces:** Consumes/produces `getRepositories().settings`.

- [ ] Formulário único cobrindo `Profile` (nome, cargo, credenciais como
  lista editável, bios, foto via `MediaUploader`), `SiteSettings` (stats,
  WhatsApp, e-mail, Instagram, CTAs principais, nota de rodapé). Campos de
  "SEO global" (title/description padrão) e "logomarca" (upload via
  `MediaUploader`) incluídos aqui mesmo sem persistirem além da sessão do
  processo (nesta fase). Salvar via `getRepositories().settings.update(...)`
  com mensagem de confirmação.

- [ ] **Commit da Fase 8:**
  ```bash
  git add -A
  git commit -m "feat: build admin panel screens (dashboard and CRUD skeletons)"
  ```

---

## Fase 9 — SEO

### Task 9.1: `generateMetadata` por rota pública

**Files:**
- Modify: cada `page.tsx` das Fases 4–5 que ainda não tenha `generateMetadata`
  próprio.

- [ ] Cada rota exporta `title`/`description` únicos e específicos (não
  reaproveitar a description genérica da home). Open Graph
  (`openGraph.images` usando `coverUrl`/`imageUrl` quando existir, senão
  omitido — nunca uma imagem genérica de banco de imagens) e Twitter Card
  via `metadata.twitter`.

### Task 9.2: `sitemap.ts` e `robots.ts`

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`

- [ ] `sitemap.ts`: gera entradas para todas as rotas públicas estáticas +
  `formacoes/[slug]` e `conteudos/[slug]` a partir dos repositórios.
  `robots.ts`: permite tudo exceto `/admin`.

### Task 9.3: JSON-LD estruturado

**Files:**
- Create: `src/lib/seo/json-ld.ts`
- Modify: `src/app/(public)/layout.tsx` ou `page.tsx` da home (Person +
  Organization), `formacoes/[slug]/page.tsx` (Course), `conteudos/[slug]/page.tsx`
  (Article).

- [ ] Funções puras `buildPersonJsonLd(profile)`,
  `buildOrganizationJsonLd(settings)`, `buildCourseJsonLd(program)`,
  `buildArticleJsonLd(post)` — cada uma só inclui campos com dado real
  presente (ex.: `Course.hasCourseInstance` só aparece se `durationHours`
  não for `null`). Renderizadas via `<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`.

### Task 9.4: Slots de analytics condicionais

**Files:**
- Create: `src/components/analytics-scripts.tsx`
- Modify: `src/app/layout.tsx`

- [ ] Componente que só renderiza o script do GA/GTM se
  `process.env.NEXT_PUBLIC_GA_ID` existir, e o Pixel da Meta só se
  `NEXT_PUBLIC_META_PIXEL_ID` existir. Sem IDs hardcoded.

---

## Fase 10 — Revisão de acessibilidade, responsividade e motion

### Task 10.1: Auditoria manual guiada

- [ ] **Step 1:** `npm run build && npm run start`, abrir no navegador.
- [ ] **Step 2:** Testar em 320px, 375px, 768px, 1024px, 1440px (devtools) —
  nenhuma seção com overflow horizontal, nenhum texto cortado.
- [ ] **Step 3:** Navegar todo o site público só com teclado (Tab/Shift+Tab/
  Enter/Escape) — todo controle interativo alcançável, foco sempre visível,
  menu mobile e modais do admin (`ConfirmDialog`) fecham com `Escape`.
- [ ] **Step 4:** Ativar "reduzir movimento" no SO (ou emular via devtools
  `prefers-reduced-motion: reduce`) e confirmar que hero, menu mobile e
  entradas de scroll não têm transição de posição.
- [ ] **Step 5:** Rodar Lighthouse (Chrome devtools) em `/` — anotar notas de
  Accessibility/SEO/Performance no relatório final; corrigir achados
  críticos (contraste, `alt` faltante, heading fora de ordem) antes de
  seguir.

### Task 10.2: Corrigir achados da Task 10.1

- [ ] Aplicar as correções identificadas, uma a uma, re-testando cada uma no
  navegador antes de seguir para a próxima.

---

## Fase 11 — Lint, build e fechamento

### Task 11.1: Lint

- [ ] `npm run lint` — corrigir todos os erros e warnings relevantes (não
  suprimir regra via comentário sem justificativa registrada no próprio
  código).

### Task 11.2: Typecheck e testes

- [ ] `npx tsc --noEmit` sem erros.
- [ ] `npm test` — todos os testes (repositórios, auth, validação, slugify)
  passando.

### Task 11.3: Build de produção

- [ ] `npm run build` sem erros nem warnings de build. `npm run start` e
  navegar pelas rotas principais (`/`, `/formacoes`, `/formacoes/[slug]`,
  `/admin/login` → `/admin`) confirmando ausência de erros no console do
  navegador.

### Task 11.4: README

**Files:**
- Create/Modify: `README.md`

- [ ] Instalação (`npm install`), variáveis de ambiente
  (`cp .env.example .env.local` + explicação de `ADMIN_PASSWORD`/
  `ADMIN_SESSION_SECRET`), como rodar (`npm run dev`), como testar
  (`npm test`), como buildar (`npm run build`), estrutura de pastas
  resumida, lista do que depende de Supabase/credenciais reais para a
  próxima fase.

### Task 11.5: Commit final

- [ ] ```bash
  git add -A
  git commit -m "feat: add SEO metadata, accessibility pass, and finalize build"
  ```

---

## Self-review (executado após escrever este plano)

- **Cobertura do briefing:** todas as 17 seções do pedido do usuário mapeiam
  para uma fase (§1–2 → Fase 2/design doc; §3 → Fase 0; §4 → design doc §3;
  §5 → design doc §4; §6.1–6.13 → Fase 4; §7 → Fase 5; §8 → Fase 6–8; §9 →
  Fase 2/7; §10 → todas as fases de UI; §11 → Fase 4/10; §12 → Fase 10; §13 →
  Fase 9; §14 → Task 7.1; §15 → constraints globais + Fase 11; §16 → ordem
  das fases; §17 → Fase 11 + este self-review).
- **Placeholders:** nenhum "TBD"/"implementar depois" restante — os únicos
  valores vazios propositais (`whatsappUrl`, `testimonials: []`) estão
  documentados como dependência de dado real do administrador, não como
  lacuna do plano.
- **Consistência de tipos:** `Program.slug`/`ContentPost.slug` usados de
  forma consistente entre `src/data`, repositórios (Task 2.3) e rotas
  dinâmicas (Task 5.2/5.3); `getRepositories()` é o único ponto de acesso em
  todas as tasks de UI subsequentes.
- **Escopo:** um único plano cobrindo múltiplos subsistemas (landing +
  páginas internas + admin) — decisão deliberada por instrução explícita do
  usuário ("não pare após criar apenas a página inicial"), não um
  esquecimento da checagem de escopo do writing-plans.
