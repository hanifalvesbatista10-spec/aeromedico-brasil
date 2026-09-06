import type { SpeakingTopic } from "@/lib/types";

// Conteúdo de exemplo — usado só pelos testes do repositório mock. Em
// produção, os mesmos itens vivem no Supabase (ver
// supabase/migrations/20260905120300_cms_seed.sql) e são editados pelo
// painel administrativo.
export const speakingTopics: SpeakingTopic[] = [
  {
    id: "palestra",
    kind: "palestra",
    title: "Palestras",
    description:
      "Apresentações sobre transporte aeromédico, APH e educação em saúde, adaptadas ao público e à duração do evento.",
    themes: [],
    hireUrl: null,
    published: true,
    sortOrder: 0,
  },
  {
    id: "treinamento",
    kind: "treinamento",
    title: "Treinamentos para equipes",
    description:
      "Programas práticos para equipes de saúde e resgate que atuam ou querem atuar em transporte aeromédico.",
    themes: [],
    hireUrl: null,
    published: true,
    sortOrder: 1,
  },
  {
    id: "evento",
    kind: "evento",
    title: "Participação em eventos",
    description:
      "Participação como palestrante convidado em congressos, encontros e eventos do setor de saúde e emergência.",
    themes: [],
    hireUrl: null,
    published: true,
    sortOrder: 2,
  },
  {
    id: "aula",
    kind: "aula",
    title: "Aulas e programas educacionais",
    description:
      "Aulas avulsas ou módulos dentro de programas de graduação, pós-graduação e educação continuada.",
    themes: [],
    hireUrl: null,
    published: true,
    sortOrder: 3,
  },
  {
    id: "mentoria",
    kind: "mentoria",
    title: "Consultoria e mentoria",
    description:
      "Acompanhamento para profissionais e instituições que querem estruturar ou revisar processos de transporte aeromédico.",
    themes: [],
    hireUrl: null,
    published: true,
    sortOrder: 4,
  },
];
