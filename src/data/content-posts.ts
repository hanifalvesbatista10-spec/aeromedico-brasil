import type { ContentPost } from "@/lib/types";

// Conteúdo de exemplo — substituir por artigos/vídeos reais antes de publicar.
export const contentPosts: ContentPost[] = [
  {
    slug: "fisiologia-de-voo-o-que-todo-profissional-precisa-saber",
    kind: "artigo",
    title: "Fisiologia de voo: o que todo profissional precisa saber",
    category: "Ciência",
    summary:
      "Como a altitude e a pressurização afetam o paciente crítico durante o transporte aeromédico.",
    coverUrl: null,
    author: "Lucio Macêdo",
    publishedAt: "2026-06-10",
    externalUrl: null,
    isDemoContent: true,
  },
  {
    slug: "checklist-pre-voo-da-equipe-de-saude",
    kind: "video",
    title: "Checklist pré-voo da equipe de saúde",
    category: "Prática",
    summary:
      "Passo a passo dos itens que a equipe de saúde confere antes de embarcar em uma missão aeromédica.",
    coverUrl: null,
    author: "Lucio Macêdo",
    publishedAt: "2026-05-22",
    externalUrl: null,
    isDemoContent: true,
  },
  {
    slug: "entrevista-sobre-formacao-em-aph",
    kind: "link-externo",
    title: "Entrevista sobre formação em APH",
    category: "Entrevista",
    summary:
      "Conversa sobre os caminhos de formação para quem quer atuar no atendimento pré-hospitalar.",
    coverUrl: null,
    author: "Lucio Macêdo",
    publishedAt: "2026-04-15",
    externalUrl: "https://www.instagram.com/aeromedico.brasil/",
    isDemoContent: true,
  },
];
