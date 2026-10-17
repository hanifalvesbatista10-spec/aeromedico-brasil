import type {
  StoreCategory,
  StoreProduct,
  StoreProductImage,
  StoreVariant,
} from "@/lib/types";
import { DUPLICATE_STORE_SLUG_MESSAGE, type StoreRepository } from "../types";

// Implementação em memória, só para os testes: o catálogo nasce vazio, como
// em produção (o dono cadastra tudo pelo painel).
export function createMockStoreRepository(): StoreRepository {
  let categories: StoreCategory[] = [];
  let products: StoreProduct[] = [];
  let variants: StoreVariant[] = [];
  let images: StoreProductImage[] = [];

  const bySort = <T extends { sortOrder: number }>(a: T, b: T) =>
    a.sortOrder - b.sortOrder;

  function assertSlugFree(slug: string, exceptId?: string) {
    if (products.some((p) => p.slug === slug && p.id !== exceptId)) {
      throw new Error(DUPLICATE_STORE_SLUG_MESSAGE);
    }
  }

  return {
    async listCategories() {
      return [...categories].sort(bySort).map((c) => ({ ...c }));
    },

    async listProducts() {
      return [...products].sort(bySort).map((p) => ({ ...p }));
    },

    async getProductBySlug(slug) {
      const product = products.find((p) => p.slug === slug);
      if (!product) return null;
      return {
        product: { ...product },
        variants: variants
          .filter((v) => v.productId === product.id)
          .sort(bySort)
          .map((v) => ({ ...v })),
        images: images
          .filter((i) => i.productId === product.id)
          .sort(bySort)
          .map((i) => ({ ...i })),
      };
    },

    async createProduct(input) {
      assertSlugFree(input.slug);
      const created: StoreProduct = { ...input, id: crypto.randomUUID() };
      products = [...products, created];
      return { ...created };
    },

    async updateProduct(id, patch) {
      const current = products.find((p) => p.id === id);
      if (!current) return null;
      if (patch.slug !== undefined) assertSlugFree(patch.slug, id);
      const updated: StoreProduct = { ...current, ...patch, id };
      products = products.map((p) => (p.id === id ? updated : p));
      return { ...updated };
    },

    async removeProduct(id) {
      products = products.filter((p) => p.id !== id);
      variants = variants.filter((v) => v.productId !== id);
      images = images.filter((i) => i.productId !== id);
    },

    async saveVariants(productId, input) {
      variants = variants.filter((v) => v.productId !== productId);
      const saved = input.map<StoreVariant>((v) => ({
        ...v,
        id: crypto.randomUUID(),
        productId,
      }));
      variants = [...variants, ...saved];
      products = products.map((p) =>
        p.id === productId ? { ...p, hasVariants: saved.length > 0 } : p
      );
      return saved.sort(bySort).map((v) => ({ ...v }));
    },

    async saveImages(productId, input) {
      images = images.filter((i) => i.productId !== productId);
      const saved = input.map<StoreProductImage>((i) => ({
        ...i,
        id: crypto.randomUUID(),
        productId,
      }));
      images = [...images, ...saved];
      return saved.sort(bySort).map((i) => ({ ...i }));
    },

    async createCategory(input) {
      const created: StoreCategory = { ...input, id: crypto.randomUUID() };
      categories = [...categories, created];
      return { ...created };
    },

    async updateCategory(id, patch) {
      const current = categories.find((c) => c.id === id);
      if (!current) return null;
      const updated: StoreCategory = { ...current, ...patch, id };
      categories = categories.map((c) => (c.id === id ? updated : c));
      return { ...updated };
    },

    async removeCategory(id) {
      categories = categories.filter((c) => c.id !== id);
      products = products.map((p) =>
        p.categoryId === id ? { ...p, categoryId: null } : p
      );
    },
  };
}
