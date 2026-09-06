import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MaterialRow } from "@/lib/supabase/types";
import type { MaterialsRepository } from "../types";
import type { Material } from "@/lib/types";

function toDomain(row: MaterialRow): Material {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    filePath: row.file_path,
    externalUrl: row.external_url,
    coverUrl: row.cover_url,
    category: row.category,
    isPublic: row.is_public,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

function toRow(input: Material) {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    file_path: input.filePath,
    external_url: input.externalUrl,
    cover_url: input.coverUrl,
    category: input.category,
    is_public: input.isPublic,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

function toRowPatch(patch: Partial<Material>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.filePath !== undefined) row.file_path = patch.filePath;
  if (patch.externalUrl !== undefined) row.external_url = patch.externalUrl;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export function createSupabaseMaterialsRepository(): MaterialsRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar materiais: ${error.message}`);
      return (data as MaterialRow[]).map(toDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("materials")
        .insert(toRow(input))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar material: ${error.message}`);
      return toDomain(data as MaterialRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("materials")
        .update(toRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar material: ${error.message}`);
      return data ? toDomain(data as MaterialRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir material: ${error.message}`);
    },
  };
}
