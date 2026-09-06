import type { Program } from "@/lib/types";

// Conteúdo de exemplo — usado só pelos testes do repositório mock. Em
// produção, os mesmos itens vivem no Supabase (ver
// supabase/migrations/20260905120300_cms_seed.sql) e são editados pelo
// painel administrativo.
export const programs: Program[] = [
  {
    slug: "curso-transporte-aeromedico-basico",
    type: "curso",
    title: "Transporte Aeromédico Básico",
    category: "Curso",
    shortDescription:
      "Fundamentos do transporte aeromédico: fisiologia de voo, biossegurança e organização da equipe durante a missão.",
    fullDescription: null,
    imageUrl: null,
    durationHours: 16,
    format: "online",
    status: "disponivel",
    enrollUrl: null,
    ctaLabel: "Inscrever-se",
    featured: true,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    isDemoContent: true,
  },
  {
    slug: "mentoria-carreira-aeromedica",
    type: "mentoria",
    title: "Mentoria em Carreira Aeromédica",
    category: "Mentoria",
    shortDescription:
      "Acompanhamento individual para profissionais de saúde que querem migrar ou evoluir na carreira em transporte aeromédico.",
    fullDescription: null,
    imageUrl: null,
    durationHours: null,
    format: "online",
    status: "proximas-turmas",
    enrollUrl: null,
    ctaLabel: "Inscrever-se",
    featured: true,
    published: true,
    sortOrder: 1,
    seoTitle: null,
    seoDescription: null,
    isDemoContent: true,
  },
  {
    slug: "treinamento-equipes-resgate",
    type: "treinamento",
    title: "Treinamento para Equipes de Resgate",
    category: "Treinamento",
    shortDescription:
      "Programa presencial para equipes de resgate que atuam em interface com aeronaves e cenários de emergência.",
    fullDescription: null,
    imageUrl: null,
    durationHours: 24,
    format: "presencial",
    status: "em-breve",
    enrollUrl: null,
    ctaLabel: "Inscrever-se",
    featured: true,
    published: true,
    sortOrder: 2,
    seoTitle: null,
    seoDescription: null,
    isDemoContent: true,
  },
];
