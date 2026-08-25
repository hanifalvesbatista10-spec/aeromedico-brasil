import { createMockProgramsRepository } from "./mock/programs";
import { createMockContentRepository } from "./mock/content-posts";
import { createMockTestimonialsRepository } from "./mock/testimonials";
import { createMockSpeakingRepository } from "./mock/speaking-topics";
import { createMockFAQRepository } from "./mock/faq";
import { createMockLeadsRepository } from "./mock/leads";
import { createMockSettingsRepository } from "./mock/settings";

// Único ponto de composição dos repositórios. Nenhum componente deve
// importar uma implementação `mock/*` diretamente — sempre via
// `getRepositories()`. Trocar por implementações Supabase acontece aqui,
// sem alterar quem consome os dados.
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
