import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Total de cliques em CTA já registrados — usado só no dashboard admin. */
export async function getCtaEventsCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("cta_events")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`Falha ao carregar cliques em CTA: ${error.message}`);
  return count ?? 0;
}

export interface RecordCtaEventInput {
  ctaId: string;
  pagePath: string;
  source?: string | null;
}

/** Registra um clique de CTA — chamado pela rota pública /api/cta. */
export async function recordCtaEvent(input: RecordCtaEventInput): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("cta_events").insert({
    cta_id: input.ctaId,
    page_path: input.pagePath,
    source: input.source ?? null,
  });
  if (error) throw new Error(`Falha ao registrar clique: ${error.message}`);
}
