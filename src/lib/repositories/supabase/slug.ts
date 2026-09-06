import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante um slug único numa tabela com coluna `slug` unique. Se o slug
 * base já existir, tenta `base-2`, `base-3`... até encontrar um livre.
 * Evita que o admin veja um erro de constraint do banco ao cadastrar dois
 * títulos parecidos — a mission pede "validar slug".
 */
export async function uniqueSlug(
  supabase: SupabaseClient,
  table: "programs" | "content_posts",
  base: string
): Promise<string> {
  const { data, error } = await supabase.from(table).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`Falha ao validar slug: ${error.message}`);

  const taken = new Set((data as { slug: string }[]).map((row) => row.slug));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
