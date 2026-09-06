import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FAQItemRow } from "@/lib/supabase/types";
import type { FAQRepository } from "../types";
import type { FAQItem } from "@/lib/types";

function toDomain(row: FAQItemRow): FAQItem {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

function toRow(input: FAQItem) {
  return {
    question: input.question,
    answer: input.answer,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

function toRowPatch(patch: Partial<FAQItem>) {
  const row: Record<string, unknown> = {};
  if (patch.question !== undefined) row.question = patch.question;
  if (patch.answer !== undefined) row.answer = patch.answer;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export function createSupabaseFAQRepository(): FAQRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar perguntas frequentes: ${error.message}`);
      return (data as FAQItemRow[]).map(toDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("faq_items")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar pergunta: ${error.message}`);
      return toDomain(data as FAQItemRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("faq_items")
        .update(toRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar pergunta: ${error.message}`);
      return data ? toDomain(data as FAQItemRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir pergunta: ${error.message}`);
    },
  };
}
