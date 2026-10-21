import { describe, it, expect } from "vitest";
import { buildShippingItems } from "../items";
import { priceCart } from "@/lib/cart/pricing";
import type { CartLine } from "@/lib/cart/cart";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreProduct, StoreVariant } from "@/lib/types";

function product(over: Partial<StoreProduct>): StoreProduct {
  return {
    id: "camiseta",
    slug: "camiseta",
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
    size: "M",
    colorName: "Preta",
    colorHex: null,
    priceCents: null,
    weightGrams: null,
    stock: null,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

const shirt: StoreProductDetail = {
  product: product({}),
  variants: [
    variant({ id: "m-preta" }),
    variant({ id: "g-preta", size: "G", weightGrams: 350, priceCents: 5990 }),
    variant({ id: "pp-esgotada", size: "PP", stock: 0 }),
  ],
  images: [],
};

const cap: StoreProductDetail = {
  product: product({
    id: "bone",
    slug: "bone",
    name: "Boné",
    basePriceCents: 2000,
    weightGrams: 120,
    lengthCm: 20,
    widthCm: 18,
    heightCm: 10,
    hasVariants: false,
  }),
  variants: [],
  images: [],
};

const details = [shirt, cap];
const line = (productId: string, variantId: string | null, quantity = 1): CartLine => ({
  productId,
  variantId,
  quantity,
});

function items(lines: CartLine[], source = details) {
  return buildShippingItems(priceCart(lines, source, []), source);
}

describe("buildShippingItems", () => {
  it("um item por linha, com medidas do produto, peso e valor da unidade", () => {
    const result = items([line("camiseta", "m-preta", 2), line("bone", null, 1)]);
    expect(result).toEqual([
      {
        id: "camiseta:m-preta",
        name: "Camiseta Aeromédico",
        widthCm: 25,
        heightCm: 3,
        lengthCm: 30,
        weightGrams: 200,
        unitPriceCents: 4990,
        quantity: 2,
      },
      {
        id: "bone:-",
        name: "Boné",
        widthCm: 18,
        heightCm: 10,
        lengthCm: 20,
        weightGrams: 120,
        unitPriceCents: 2000,
        quantity: 1,
      },
    ]);
  });

  it("o peso e o preço da variação sobrepõem os do produto", () => {
    const [item] = items([line("camiseta", "g-preta")]);
    expect(item).toMatchObject({ weightGrams: 350, unitPriceCents: 5990 });
  });

  it("item indisponível não entra na cotação", () => {
    const result = items([line("camiseta", "pp-esgotada"), line("bone", null)]);
    expect(result.map((i) => i.id)).toEqual(["bone:-"]);
  });

  it("carrinho vazio não gera itens", () => {
    expect(items([])).toEqual([]);
  });

  it("produto que sumiu do catálogo entre a precificação e a montagem é ignorado", () => {
    const cart = priceCart([line("camiseta", "m-preta"), line("bone", null)], details, []);
    expect(buildShippingItems(cart, [cap]).map((i) => i.id)).toEqual(["bone:-"]);
  });
});
