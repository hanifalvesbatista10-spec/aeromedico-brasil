import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoreProductDetail } from "@/lib/repositories/types";

const listProductDetails = vi.fn();
const listCategories = vi.fn();
const unstableRethrow = vi.fn();

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    store: {
      listProductDetails: () => listProductDetails(),
      listCategories: () => listCategories(),
    },
  }),
}));
vi.mock("next/navigation", () => ({
  unstable_rethrow: (error: unknown) => unstableRethrow(error),
}));

import { priceCartAction } from "../cart";

const cap: StoreProductDetail = {
  product: {
    id: "bone",
    slug: "bone",
    categoryId: null,
    name: "Boné",
    description: "",
    basePriceCents: 2000,
    weightGrams: 100,
    lengthCm: 20,
    widthCm: 20,
    heightCm: 10,
    hasVariants: false,
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
  },
  variants: [],
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  listProductDetails.mockResolvedValue([cap]);
  listCategories.mockResolvedValue([]);
});

describe("priceCartAction", () => {
  it("carrinho vazio responde sem consultar o banco", async () => {
    const result = await priceCartAction([]);
    expect(result).toEqual({
      ok: true,
      cart: { lines: [], unavailable: [], subtotalCents: 0, itemCount: 0 },
    });
    expect(listProductDetails).not.toHaveBeenCalled();
  });

  it.each([
    ["quantidade zero", [{ productId: "bone", variantId: null, quantity: 0 }]],
    ["quantidade negativa", [{ productId: "bone", variantId: null, quantity: -1 }]],
    ["quantidade fracionada", [{ productId: "bone", variantId: null, quantity: 1.5 }]],
    ["quantidade em texto", [{ productId: "bone", variantId: null, quantity: "2" }]],
    ["quantidade enorme", [{ productId: "bone", variantId: null, quantity: 1000 }]],
    ["sem productId", [{ variantId: null, quantity: 1 }]],
    ["entrada que não é lista", { productId: "bone" }],
    [
      "mais de 50 linhas",
      Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, variantId: null, quantity: 1 })),
    ],
  ])("entrada inválida (%s) vira erro como valor e não consulta o banco", async (_name, input) => {
    expect(await priceCartAction(input)).toEqual({
      ok: false,
      error: "Não foi possível ler os itens do carrinho.",
    });
    expect(listProductDetails).not.toHaveBeenCalled();
  });

  it("calcula o subtotal a partir do banco e ignora preço enviado pelo navegador", async () => {
    const result = await priceCartAction([
      { productId: "bone", variantId: null, quantity: 2, unitPriceCents: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cart.subtotalCents).toBe(4000);
    expect(result.cart.lines[0].unitPriceCents).toBe(2000);
  });

  it("falha do catálogo devolve mensagem fixa, sem vazar o erro original", async () => {
    listProductDetails.mockRejectedValue(new Error("connection refused: db.interno:5432"));
    const result = await priceCartAction([{ productId: "bone", variantId: null, quantity: 1 }]);
    expect(result).toEqual({
      ok: false,
      error: "Não foi possível carregar o carrinho agora. Tente de novo.",
    });
  });

  it("erro interno do Next é relançado antes de virar mensagem", async () => {
    const internal = new Error("Dynamic server usage");
    listProductDetails.mockRejectedValue(internal);
    unstableRethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    await expect(
      priceCartAction([{ productId: "bone", variantId: null, quantity: 1 }])
    ).rejects.toBe(internal);
  });
});
