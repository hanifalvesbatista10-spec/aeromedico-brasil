import type { ContentPost, Material, Program } from "@/lib/types";

// As páginas públicas nunca devem confiar só na RLS para esconder rascunhos:
// um administrador logado também recebe linhas não publicadas do repositório.
// Estes seletores são o filtro explícito da área gratuita.

export function selectPublicMaterials(materials: Material[]): Material[] {
  return materials
    .filter((material) => material.published && material.isPublic)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function selectRecentPosts(
  posts: ContentPost[],
  limit: number
): ContentPost[] {
  return posts
    .filter((post) => post.published)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

export function selectProductHighlights(
  programs: Program[],
  limit: number
): Program[] {
  return programs
    .filter((program) => program.published)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, limit);
}

/**
 * Link externo de um material, só se for http/https. Qualquer outro esquema
 * (`javascript:`, `data:`) ou texto inválido vira `null` e o item é omitido.
 */
export function materialExternalHref(material: Material): string | null {
  if (!material.externalUrl) return null;
  try {
    const url = new URL(material.externalUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
