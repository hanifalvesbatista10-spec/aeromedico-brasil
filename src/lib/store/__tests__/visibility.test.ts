import { describe, it, expect } from "vitest";
import { isStoreProductVisible } from "../visibility";
import type { StoreCategory, StoreProduct } from "@/lib/types";

function product(over: Partial<StoreProduct>): StoreProduct {
  return {
    id: "p",
    slug: "p",
    categoryId: null,
    name: "Produto",
    description: "",
    basePriceCents: 1000,
    weightGrams: 100,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 1,
    hasVariants: false,
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ...over,
  };
}

function category(over: Partial<StoreCategory>): StoreCategory {
  return { id: "c", slug: "c", name: "Categoria", published: true, sortOrder: 0, ...over };
}

describe("isStoreProductVisible", () => {
  it("produto publicado sem categoria é visível", () => {
    expect(isStoreProductVisible(product({}), [])).toBe(true);
  });

  it("produto publicado em categoria publicada é visível", () => {
    expect(
      isStoreProductVisible(product({ categoryId: "c" }), [category({ id: "c" })])
    ).toBe(true);
  });

  it("esconder a categoria esconde os produtos dela", () => {
    expect(
      isStoreProductVisible(product({ categoryId: "c" }), [
        category({ id: "c", published: false }),
      ])
    ).toBe(false);
  });

  it("categoria que o visitante não enxerga (RLS esconde as despublicadas) também esconde o produto", () => {
    expect(isStoreProductVisible(product({ categoryId: "c" }), [])).toBe(false);
  });

  it("produto não publicado nunca é visível", () => {
    expect(isStoreProductVisible(product({ published: false }), [])).toBe(false);
    expect(
      isStoreProductVisible(product({ published: false, categoryId: "c" }), [category({ id: "c" })])
    ).toBe(false);
  });
});
