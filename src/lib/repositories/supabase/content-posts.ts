import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentPostRow } from "@/lib/supabase/types";
import type { ContentRepository } from "../types";
import type { ContentPost } from "@/lib/types";
import { uniqueSlug } from "./slug";

function toDomain(row: ContentPostRow): ContentPost {
  return {
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    category: row.category,
    summary: row.summary,
    body: row.body,
    coverUrl: row.cover_url,
    author: row.author,
    publishedAt: row.published_at,
    externalUrl: row.external_url,
    featured: row.featured,
    published: row.published,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    isDemoContent: row.is_demo_content,
  };
}

function toRow(input: ContentPost) {
  return {
    slug: input.slug,
    kind: input.kind,
    title: input.title,
    category: input.category,
    summary: input.summary,
    body: input.body,
    cover_url: input.coverUrl,
    author: input.author,
    published_at: input.publishedAt,
    external_url: input.externalUrl,
    featured: input.featured,
    published: input.published,
    sort_order: input.sortOrder,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    is_demo_content: input.isDemoContent,
  };
}

function toRowPatch(patch: Partial<ContentPost>) {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
  if (patch.author !== undefined) row.author = patch.author;
  if (patch.publishedAt !== undefined) row.published_at = patch.publishedAt;
  if (patch.externalUrl !== undefined) row.external_url = patch.externalUrl;
  if (patch.featured !== undefined) row.featured = patch.featured;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
  return row;
}

export function createSupabaseContentRepository(): ContentRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("content_posts")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar conteúdos: ${error.message}`);
      return (data as ContentPostRow[]).map(toDomain);
    },

    async getBySlug(slug) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("content_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(`Falha ao carregar conteúdo: ${error.message}`);
      return data ? toDomain(data as ContentPostRow) : null;
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const slug = await uniqueSlug(supabase, "content_posts", input.slug);
      const { data, error } = await supabase
        .from("content_posts")
        .insert(toRow({ ...input, slug }))
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao criar conteúdo: ${error.message}`);
      return toDomain(data as ContentPostRow);
    },

    async update(slug, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("content_posts")
        .update(toRowPatch(patch))
        .eq("slug", slug)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(`Falha ao atualizar conteúdo: ${error.message}`);
      return data ? toDomain(data as ContentPostRow) : null;
    },

    async remove(slug) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("content_posts").delete().eq("slug", slug);
      if (error) throw new Error(`Falha ao excluir conteúdo: ${error.message}`);
    },
  };
}
