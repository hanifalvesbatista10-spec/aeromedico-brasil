import type { Program } from "@/lib/types";

// Conteúdo de exemplo — substituir por formações reais antes de publicar.
export const programs: Program[] = [
  {
    slug: "curso-transporte-aeromedico-basico",
    title: "Transporte Aeromédico Básico",
    category: "Curso",
    shortDescription:
      "Fundamentos do transporte aeromédico: fisiologia de voo, biossegurança e organização da equipe durante a missão.",
    imageUrl: null,
    durationHours: 16,
    format: "online",
    status: "disponivel",
    enrollUrl: null,
    featured: true,
    isDemoContent: true,
  },
  {
    slug: "mentoria-carreira-aeromedica",
    title: "Mentoria em Carreira Aeromédica",
    category: "Mentoria",
    shortDescription:
      "Acompanhamento individual para profissionais de saúde que querem migrar ou evoluir na carreira em transporte aeromédico.",
    imageUrl: null,
    durationHours: null,
    format: "online",
    status: "proximas-turmas",
    enrollUrl: null,
    featured: true,
    isDemoContent: true,
  },
  {
    slug: "treinamento-equipes-resgate",
    title: "Treinamento para Equipes de Resgate",
    category: "Treinamento",
    shortDescription:
      "Programa presencial para equipes de resgate que atuam em interface com aeronaves e cenários de emergência.",
    imageUrl: null,
    durationHours: 24,
    format: "presencial",
    status: "em-breve",
    enrollUrl: null,
    featured: true,
    isDemoContent: true,
  },
];
