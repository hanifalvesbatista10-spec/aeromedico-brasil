import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TestimonialRow } from "@/lib/supabase/types";
import type { TestimonialsRepository } from "../types";
import type { Testimonial } from "@/lib/types";

function toDomain(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    name: row.name,
    profession: row.profession,
    photoUrl: row.photo_url,
    programOrEvent: row.program_or_event,
    quote: row.quote,
    authorizedForDisplay: row.authorized_for_display,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

function toRow(input: Testimonial) {
  return {
    name: input.name,
    profession: input.profession,
    photo_url: input.photoUrl,
    program_or_event: input.programOrEvent,
    quote: input.quote,
    authorized_for_display: input.authorizedForDisplay,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

function toRowPatch(patch: Partial<Testimonial>) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.profession !== undefined) row.profession = patch.profession;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  if (patch.programOrEvent !== undefined) row.program_or_event = patch.programOrEvent;
  if (patch.quote !== undefined) row.quote = patch.quote;
  if (patch.authorizedForDisplay !== undefined)
    row.authorized_for_display = patch.authorizedForDisplay;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export function createSupabaseTestimonialsRepository(): TestimonialsRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar depoimentos: ${error.message}`);
      return (data as TestimonialRow[]).map(toDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("testimonials")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar depoimento: ${error.message}`);
      return toDomain(data as TestimonialRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("testimonials")
        .update(toRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar depoimento: ${error.message}`);
      return data ? toDomain(data as TestimonialRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir depoimento: ${error.message}`);
    },
  };
}
