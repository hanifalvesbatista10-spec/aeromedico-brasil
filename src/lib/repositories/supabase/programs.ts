import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProgramRow } from "@/lib/supabase/types";
import type { ProgramsRepository } from "../types";
import type { Program } from "@/lib/types";
import { uniqueSlug } from "./slug";

function toDomain(row: ProgramRow): Program {
  return {
    slug: row.slug,
    type: row.type,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    imageUrl: row.image_url,
    durationHours: row.duration_hours,
    format: row.format,
    status: row.status,
    enrollUrl: row.enroll_url,
    ctaLabel: row.cta_label,
    featured: row.featured,
    published: row.published,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    isDemoContent: row.is_demo_content,
  };
}

function toRow(input: Program) {
  return {
    slug: input.slug,
    type: input.type,
    title: input.title,
    category: input.category,
    short_description: input.shortDescription,
    full_description: input.fullDescription,
    image_url: input.imageUrl,
    duration_hours: input.durationHours,
    format: input.format,
    status: input.status,
    enroll_url: input.enrollUrl,
    cta_label: input.ctaLabel,
    featured: input.featured,
    published: input.published,
    sort_order: input.sortOrder,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    is_demo_content: input.isDemoContent,
  };
}

function toRowPatch(patch: Partial<Program>) {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.shortDescription !== undefined) row.short_description = patch.shortDescription;
  if (patch.fullDescription !== undefined) row.full_description = patch.fullDescription;
  if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
  if (patch.durationHours !== undefined) row.duration_hours = patch.durationHours;
  if (patch.format !== undefined) row.format = patch.format;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.enrollUrl !== undefined) row.enroll_url = patch.enrollUrl;
  if (patch.ctaLabel !== undefined) row.cta_label = patch.ctaLabel;
  if (patch.featured !== undefined) row.featured = patch.featured;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
  return row;
}

export function createSupabaseProgramsRepository(): ProgramsRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar formações: ${error.message}`);
      return (data as ProgramRow[]).map(toDomain);
    },

    async getBySlug(slug) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(`Falha ao carregar formação: ${error.message}`);
      return data ? toDomain(data as ProgramRow) : null;
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const slug = await uniqueSlug(supabase, "programs", input.slug);
      const { data, error } = await supabase
        .from("programs")
        .insert(toRow({ ...input, slug }))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar formação: ${error.message}`);
      return toDomain(data as ProgramRow);
    },

    async update(slug, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("programs")
        .update(toRowPatch(patch))
        .eq("slug", slug)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar formação: ${error.message}`);
      return data ? toDomain(data as ProgramRow) : null;
    },

    async remove(slug) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("programs").delete().eq("slug", slug);
      if (error) throw new Error(`Falha ao excluir formação: ${error.message}`);
    },
  };
}
