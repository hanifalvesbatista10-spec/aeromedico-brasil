import { createSupabaseProgramsRepository } from "./supabase/programs";
import { createSupabaseContentRepository } from "./supabase/content-posts";
import { createSupabaseTestimonialsRepository } from "./supabase/testimonials";
import { createSupabaseSpeakingRepository } from "./supabase/speaking-topics";
import { createSupabaseFAQRepository } from "./supabase/faq";
import { createSupabaseLeadsRepository } from "./supabase/leads";
import { createSupabaseMaterialsRepository } from "./supabase/materials";
import { createSupabaseSettingsRepository } from "./supabase/settings";

// Único ponto de composição dos repositórios. Nenhum componente deve
// importar uma implementação `supabase/*` ou `mock/*` diretamente — sempre
// via `getRepositories()`.
//
// A implementação mock (`./mock/*`) só é usada nos testes automatizados
// (`src/lib/repositories/__tests__`), que importam as fábricas mock
// diretamente — nunca através deste arquivo. Em desenvolvimento e produção,
// a fonte de verdade é sempre o Supabase; se a configuração
// (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
// estiver ausente, cada chamada falha com um erro operacional explícito
// (ver src/lib/supabase/env.ts) em vez de cair silenciosamente em dados
// fictícios.
const repositories = {
  programs: createSupabaseProgramsRepository(),
  contentPosts: createSupabaseContentRepository(),
  testimonials: createSupabaseTestimonialsRepository(),
  speaking: createSupabaseSpeakingRepository(),
  faq: createSupabaseFAQRepository(),
  leads: createSupabaseLeadsRepository(),
  materials: createSupabaseMaterialsRepository(),
  settings: createSupabaseSettingsRepository(),
};

export function getRepositories() {
  return repositories;
}
