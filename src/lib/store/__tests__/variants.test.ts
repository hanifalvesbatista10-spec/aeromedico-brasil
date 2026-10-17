import { describe, it, expect } from "vitest";
import {
  productAvailability,
  publishedVariants,
  resolveVariant,
  variantAvailability,
  variantOptions,
  variantPriceCents,
} from "../variants";
import type { StoreVariant } from "@/lib/types";

function variant(over: Partial<StoreVariant>): StoreVariant {
  return {
    id: "v",
    productId: "p",
    sku: null,
    size: null,
    colorName: null,
    colorHex: null,
    priceCents: null,
    weightGrams: null,
    stock: null,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

describe("publishedVariants", () => {
  it("exclui variação não publicada e ordena por sortOrder", () => {
    const result = publishedVariants([
      variant({ id: "b", sortOrder: 2 }),
      variant({ id: "rascunho", published: false }),
      variant({ id: "a", sortOrder: 1 }),
    ]);
    expect(result.map((v) => v.id)).toEqual(["a", "b"]);
  });
});

describe("variantOptions", () => {
  it("devolve tamanhos únicos e cores únicas por nome, na ordem de sortOrder", () => {
    const options = variantOptions([
      variant({ id: "1", size: "M", colorName: "Preta", colorHex: "#000000", sortOrder: 2 }),
      variant({ id: "2", size: "P", colorName: "Preta", colorHex: "#000000", sortOrder: 1 }),
      variant({ id: "3", size: "P", colorName: "Branca", colorHex: "#ffffff", sortOrder: 3 }),
      variant({ id: "4", size: null, colorName: null, sortOrder: 4 }),
    ]);
    expect(options.sizes).toEqual(["P", "M"]);
    expect(options.colors).toEqual([
      { name: "Preta", hex: "#000000" },
      { name: "Branca", hex: "#ffffff" },
    ]);
  });

  it("devolve listas vazias sem variações", () => {
    expect(variantOptions([])).toEqual({ sizes: [], colors: [] });
  });
});

describe("resolveVariant", () => {
  const list = [
    variant({ id: "pp", size: "P", colorName: "Preta" }),
    variant({ id: "pb", size: "P", colorName: "Branca" }),
    variant({ id: "so-tamanho", size: "G", colorName: null }),
  ];

  it("acha a combinação exata de tamanho e cor", () => {
    expect(resolveVariant(list, "P", "Branca")?.id).toBe("pb");
  });

  it("trata null como valor: variação só com tamanho", () => {
    expect(resolveVariant(list, "G", null)?.id).toBe("so-tamanho");
  });

  it("devolve null quando a combinação não existe", () => {
    expect(resolveVariant(list, "G", "Preta")).toBeNull();
  });
});

describe("variantPriceCents", () => {
  it("usa o preço da variação quando existe e o base caso contrário", () => {
    expect(variantPriceCents({ basePriceCents: 4990 }, variant({ priceCents: 5990 }))).toBe(5990);
    expect(variantPriceCents({ basePriceCents: 4990 }, variant({ priceCents: null }))).toBe(4990);
    expect(variantPriceCents({ basePriceCents: 4990 }, null)).toBe(4990);
  });
});

describe("variantAvailability", () => {
  it("estoque 0 esgota; null e positivo estão disponíveis", () => {
    expect(variantAvailability(variant({ stock: 0 }))).toBe("sold-out");
    expect(variantAvailability(variant({ stock: null }))).toBe("available");
    expect(variantAvailability(variant({ stock: 3 }))).toBe("available");
  });

  it("produto sem variação (null) está disponível", () => {
    expect(variantAvailability(null)).toBe("available");
  });
});

describe("productAvailability", () => {
  it("produto sem variações vende o produto único", () => {
    expect(productAvailability(false, [])).toBe("available");
  });

  it("produto com variações e nenhuma publicada fica indisponível", () => {
    expect(productAvailability(true, [])).toBe("unavailable");
    expect(productAvailability(true, [variant({ published: false })])).toBe("unavailable");
  });

  it("todas esgotadas = esgotado; alguma disponível = disponível", () => {
    expect(
      productAvailability(true, [variant({ stock: 0 }), variant({ stock: 0 })])
    ).toBe("sold-out");
    expect(
      productAvailability(true, [variant({ stock: 0 }), variant({ stock: null })])
    ).toBe("available");
  });
});
