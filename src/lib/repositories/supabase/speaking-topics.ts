import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SpeakingTopicRow } from "@/lib/supabase/types";
import type { SpeakingRepository } from "../types";
import type { SpeakingTopic } from "@/lib/types";

function toDomain(row: SpeakingTopicRow): SpeakingTopic {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    themes: row.themes,
    hireUrl: row.hire_url,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

function toRow(input: SpeakingTopic) {
  return {
    kind: input.kind,
    title: input.title,
    description: input.description,
    themes: input.themes,
    hire_url: input.hireUrl,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

function toRowPatch(patch: Partial<SpeakingTopic>) {
  const row: Record<string, unknown> = {};
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.themes !== undefined) row.themes = patch.themes;
  if (patch.hireUrl !== undefined) row.hire_url = patch.hireUrl;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export function createSupabaseSpeakingRepository(): SpeakingRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("speaking_topics")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar palestras: ${error.message}`);
      return (data as SpeakingTopicRow[]).map(toDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("speaking_topics")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar formato de palestra: ${error.message}`);
      return toDomain(data as SpeakingTopicRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("speaking_topics")
        .update(toRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar formato de palestra: ${error.message}`);
      return data ? toDomain(data as SpeakingTopicRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("speaking_topics").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir formato de palestra: ${error.message}`);
    },
  };
}
