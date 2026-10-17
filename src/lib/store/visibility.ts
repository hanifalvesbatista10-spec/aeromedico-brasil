import type { StoreCategory, StoreProduct } from "@/lib/types";

/**
 * Produto visível para o público: está publicado e, se tem categoria, essa
 * categoria também está publicada. Esconder uma categoria no painel esconde
 * os produtos dela. O visitante nem recebe categorias despublicadas (RLS),
 * então uma categoria ausente da lista conta como oculta.
 */
export function isStoreProductVisible(
  product: Pick<StoreProduct, "published" | "categoryId">,
  categories: Pick<StoreCategory, "id" | "published">[]
): boolean {
  if (!product.published) return false;
  if (product.categoryId === null) return true;
  return categories.some(
    (category) => category.id === product.categoryId && category.published
  );
}
