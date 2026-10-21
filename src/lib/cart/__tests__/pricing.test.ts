import { describe, it, expect } from "vitest";
import { priceCart } from "../pricing";
import type { CartLine } from "../cart";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory, StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

function product(over: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id: "camiseta",
    slug: "camiseta-aeromedico",
    categoryId: null,
    name: "Camiseta Aeromédico",
    description: "",
    basePriceCents: 4990,
    weightGrams: 200,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 3,
    hasVariants: true,
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ...over,
  };
}

function variant(over: Partial<StoreVariant>): StoreVariant {
  return {
    id: "v",
    productId: "camiseta",
    sku: null,
    size: "P",
    colorName: "Preta",
    colorHex: "#000000",
    priceCents: null,
    weightGrams: null,
    stock: null,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

function image(over: Partial<StoreProductImage>): StoreProductImage {
  return {
    id: "i",
    productId: "camiseta",
    url: "https://x/geral.webp",
    alt: "",
    colorName: null,
    sortOrder: 0,
    ...over,
  };
}

const shirt: StoreProductDetail = {
  product: product(),
  variants: [
    variant({ id: "p-preta", size: "P", priceCents: 5990, stock: 5, sortOrder: 0 }),
    variant({ id: "m-preta", size: "M", stock: 0, sortOrder: 1 }),
    variant({ id: "g-preta", size: "G", stock: null, sortOrder: 2 }),
    variant({ id: "gg-rascunho", size: "GG", published: false, sortOrder: 3 }),
  ],
  images: [
    image({ id: "i1", url: "https://x/geral.webp" }),
    image({ id: "i2", url: "https://x/preta.webp", colorName: "Preta", sortOrder: 1 }),
  ],
};

const cap: StoreProductDetail = {
  product: product({ id: "bone", slug: "bone", name: "Boné", basePriceCents: 2000, hasVariants: false }),
  variants: [],
  images: [],
};

const details = [shirt, cap];
const categories: StoreCategory[] = [];

const line = (productId: string, variantId: string | null, quantity = 1): CartLine => ({
  productId,
  variantId,
  quantity,
});

describe("priceCart", () => {
  it("carrinho vazio zera tudo", () => {
    expect(priceCart([], details, categories)).toEqual({
      lines: [],
      unavailable: [],
      subtotalCents: 0,
      itemCount: 0,
    });
  });

  it("preço da variação prevalece; sem preço próprio usa o base", () => {
    const cart = priceCart(
      [line("camiseta", "p-preta", 2), line("camiseta", "g-preta", 1)],
      details,
      categories
    );
    expect(cart.lines.map((l) => l.unitPriceCents)).toEqual([5990, 4990]);
    expect(cart.subtotalCents).toBe(5990 * 2 + 4990);
    expect(cart.itemCount).toBe(3);
  });

  it("devolve nome, tamanho, cor e foto da cor escolhida", () => {
    const [first] = priceCart([line("camiseta", "p-preta")], details, categories).lines;
    expect(first).toMatchObject({
      slug: "camiseta-aeromedico",
      name: "Camiseta Aeromédico",
      size: "P",
      colorName: "Preta",
      imageUrl: "https://x/preta.webp",
      lineTotalCents: 5990,
    });
  });

  it("sem foto nenhuma, imageUrl é null", () => {
    const [first] = priceCart([line("bone", null)], details, categories).lines;
    expect(first.imageUrl).toBeNull();
  });

  it("produto sem variações aceita variantId nulo", () => {
    const cart = priceCart([line("bone", null, 3)], details, categories);
    expect(cart.subtotalCents).toBe(6000);
    expect(cart.lines[0].variantId).toBeNull();
  });

  it("variantId num produto sem variações, ou nulo num produto com variações, é removido", () => {
    const cart = priceCart(
      [line("bone", "qualquer"), line("camiseta", null)],
      details,
      categories
    );
    expect(cart.lines).toEqual([]);
    expect(cart.unavailable.map((u) => u.reason)).toEqual(["removed", "removed"]);
  });

  it("produto inexistente, despublicado, em categoria despublicada ou variação despublicada saem do subtotal", () => {
    const draft: StoreProductDetail = {
      ...cap,
      product: product({ id: "rascunho", slug: "r", hasVariants: false, published: false }),
    };
    const hidden: StoreProductDetail = {
      ...cap,
      product: product({ id: "oculto", slug: "o", hasVariants: false, categoryId: "cat" }),
    };
    const cart = priceCart(
      [
        line("fantasma", null),
        line("rascunho", null),
        line("oculto", null),
        line("camiseta", "gg-rascunho"),
        line("bone", null),
      ],
      [...details, draft, hidden],
      [{ id: "cat", slug: "cat", name: "Cat", published: false, sortOrder: 0 }]
    );
    expect(cart.unavailable.map((u) => u.reason)).toEqual([
      "removed",
      "removed",
      "removed",
      "removed",
    ]);
    expect(cart.lines.map((l) => l.productId)).toEqual(["bone"]);
    expect(cart.subtotalCents).toBe(2000);
    expect(cart.itemCount).toBe(1);
  });

  it("variação despublicada de produto visível ainda mostra o nome do produto", () => {
    const cart = priceCart([line("camiseta", "gg-rascunho")], details, categories);
    expect(cart.unavailable).toEqual([
      expect.objectContaining({ reason: "removed", name: "Camiseta Aeromédico" }),
    ]);
  });

  it("estoque zero é esgotado e fica fora do subtotal", () => {
    const cart = priceCart([line("camiseta", "m-preta", 2)], details, categories);
    expect(cart.unavailable).toEqual([
      expect.objectContaining({ reason: "sold-out", name: "Camiseta Aeromédico" }),
    ]);
    expect(cart.subtotalCents).toBe(0);
  });

  it("quantidade acima do estoque é reduzida e avisada", () => {
    const [first] = priceCart([line("camiseta", "p-preta", 9)], details, categories).lines;
    expect(first).toMatchObject({ quantity: 5, maxQuantity: 5, reduced: true, lineTotalCents: 5990 * 5 });
  });

  it("estoque nulo não tem limite nem aviso", () => {
    const [first] = priceCart([line("camiseta", "g-preta", 3)], details, categories).lines;
    expect(first).toMatchObject({ quantity: 3, maxQuantity: null, reduced: false });
  });

  it("quantidade acima de 99 vira 99", () => {
    const [first] = priceCart([line("bone", null, 500)], details, categories).lines;
    expect(first.quantity).toBe(99);
  });

  it("linhas com a mesma chave são somadas antes do estoque", () => {
    const cart = priceCart(
      [line("camiseta", "p-preta", 3), line("camiseta", "p-preta", 4)],
      details,
      categories
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ quantity: 5, reduced: true });
  });

  it("mantém a ordem do carrinho", () => {
    const cart = priceCart([line("bone", null), line("camiseta", "g-preta")], details, categories);
    expect(cart.lines.map((l) => l.productId)).toEqual(["bone", "camiseta"]);
  });
});
