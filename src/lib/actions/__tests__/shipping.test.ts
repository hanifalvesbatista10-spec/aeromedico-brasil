import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoreProductDetail } from "@/lib/repositories/types";

const listProductDetails = vi.fn();
const listCategories = vi.fn();
const unstableRethrow = vi.fn();
const quote = vi.fn();
const getShippingProvider = vi.fn();

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
vi.mock("@/lib/shipping/config", () => ({
  getShippingProvider: () => getShippingProvider(),
}));

import { quoteShippingAction } from "../shipping";

const cap: StoreProductDetail = {
  product: {
    id: "bone",
    slug: "bone",
    categoryId: null,
    name: "Boné",
    description: "",
    basePriceCents: 2000,
    weightGrams: 120,
    lengthCm: 20,
    widthCm: 18,
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

const oneCap = [{ productId: "bone", variantId: null, quantity: 2 }];
const options = [{ id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 }];

beforeEach(() => {
  vi.clearAllMocks();
  unstableRethrow.mockReset();
  listProductDetails.mockResolvedValue([cap]);
  listCategories.mockResolvedValue([]);
  quote.mockResolvedValue({ ok: true, options });
  getShippingProvider.mockReturnValue({ quote: (input: unknown) => quote(input) });
});

describe("quoteShippingAction", () => {
  it("entrada que não é lista ou com quantidade inválida: invalid-input, sem chamar nada", async () => {
    for (const lines of [{ productId: "bone" }, [{ productId: "bone", variantId: null, quantity: 0 }], "x"]) {
      expect(await quoteShippingAction(lines, "01018-020")).toEqual({
        ok: false,
        code: "invalid-input",
        error: "Não foi possível ler os itens do carrinho.",
      });
    }
    expect(listProductDetails).not.toHaveBeenCalled();
    expect(quote).not.toHaveBeenCalled();
  });

  it("carrinho vazio: empty-cart, sem chamar o provedor", async () => {
    expect(await quoteShippingAction([], "01018-020")).toMatchObject({ ok: false, code: "empty-cart" });
    expect(quote).not.toHaveBeenCalled();
  });

  it("CEP inválido: invalid-cep, sem chamar o provedor", async () => {
    for (const cep of ["abc", "0101", 12345678, null, undefined]) {
      expect(await quoteShippingAction(oneCap, cep)).toEqual({
        ok: false,
        code: "invalid-cep",
        error: "CEP inválido. Confira os 8 números.",
      });
    }
    expect(quote).not.toHaveBeenCalled();
  });

  it("sem provedor configurado: unconfigured, sem ler o catálogo", async () => {
    getShippingProvider.mockReturnValue(null);
    expect(await quoteShippingAction(oneCap, "01018-020")).toEqual({
      ok: false,
      code: "unconfigured",
      error: "O cálculo automático do frete ainda não está ativo. O frete é combinado no WhatsApp.",
    });
    expect(listProductDetails).not.toHaveBeenCalled();
  });

  it("só itens indisponíveis: empty-cart, sem chamar o provedor", async () => {
    const lines = [{ productId: "fantasma", variantId: null, quantity: 1 }];
    expect(await quoteShippingAction(lines, "01018-020")).toEqual({
      ok: false,
      code: "empty-cart",
      error: "Não há itens disponíveis para calcular o frete.",
    });
    expect(quote).not.toHaveBeenCalled();
  });

  it("caminho feliz: peso e medidas vêm do banco, não do navegador", async () => {
    const lines = [{ productId: "bone", variantId: null, quantity: 2, weightGrams: 1, unitPriceCents: 1 }];
    const result = await quoteShippingAction(lines, " 01018-020 ");

    expect(result).toEqual({ ok: true, options, cep: "01018020" });
    expect(quote).toHaveBeenCalledWith({
      destinationCep: "01018020",
      items: [
        {
          id: "bone:-",
          name: "Boné",
          widthCm: 18,
          heightCm: 10,
          lengthCm: 20,
          weightGrams: 120,
          unitPriceCents: 2000,
          quantity: 2,
        },
      ],
    });
  });

  it("provedor recusa o CEP: invalid-cep com a mensagem de CEP não encontrado", async () => {
    quote.mockResolvedValue({ ok: false, reason: "invalid-cep" });
    expect(await quoteShippingAction(oneCap, "01018020")).toEqual({
      ok: false,
      code: "invalid-cep",
      error: "CEP não encontrado. Confira os 8 números.",
    });
  });

  it("provedor indisponível: mensagem para tentar de novo", async () => {
    quote.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await quoteShippingAction(oneCap, "01018020")).toEqual({
      ok: false,
      code: "unavailable",
      error: "Não foi possível calcular o frete agora. Tente de novo.",
    });
  });

  it("catálogo fora do ar: unavailable, sem vazar o erro original", async () => {
    listProductDetails.mockRejectedValue(new Error("connection refused: db.interno:5432"));
    const result = await quoteShippingAction(oneCap, "01018020");
    expect(result).toEqual({
      ok: false,
      code: "unavailable",
      error: "Não foi possível calcular o frete agora. Tente de novo.",
    });
    expect(quote).not.toHaveBeenCalled();
  });

  it("erro interno do Next é relançado", async () => {
    const internal = new Error("Dynamic server usage");
    listProductDetails.mockRejectedValue(internal);
    unstableRethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    await expect(quoteShippingAction(oneCap, "01018020")).rejects.toBe(internal);
  });
});
