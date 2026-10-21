import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoreProductDetail } from "@/lib/repositories/types";

const listProductDetails = vi.fn();
const listCategories = vi.fn();
const unstableRethrow = vi.fn();
const findActiveByCode = vi.fn();

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    store: {
      listProductDetails: () => listProductDetails(),
      listCategories: () => listCategories(),
    },
    coupons: { findActiveByCode: (code: string) => findActiveByCode(code) },
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
  // clearAllMocks não desfaz implementações: sem isto, o teste que faz o
  // rethrow lançar contaminaria os seguintes.
  unstableRethrow.mockReset();
  listProductDetails.mockResolvedValue([cap]);
  listCategories.mockResolvedValue([]);
  findActiveByCode.mockResolvedValue(null);
});

const verao10 = {
  id: "c1",
  code: "VERAO10",
  kind: "percent" as const,
  value: 10,
  minOrderCents: 0,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usesCount: 0,
  active: true,
};
const oneCap = [{ productId: "bone", variantId: null, quantity: 1 }];

describe("priceCartAction", () => {
  it("carrinho vazio responde sem consultar o banco", async () => {
    const result = await priceCartAction([]);
    expect(result).toEqual({
      ok: true,
      cart: { lines: [], unavailable: [], subtotalCents: 0, itemCount: 0 },
      coupon: null,
      couponError: null,
    });
    expect(listProductDetails).not.toHaveBeenCalled();
    expect(findActiveByCode).not.toHaveBeenCalled();
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

describe("priceCartAction com cupom", () => {
  it("sem código não consulta cupons", async () => {
    const result = await priceCartAction(oneCap);
    expect(result).toMatchObject({ ok: true, coupon: null, couponError: null });
    expect(findActiveByCode).not.toHaveBeenCalled();
  });

  it("normaliza o código antes de procurar", async () => {
    findActiveByCode.mockResolvedValue(verao10);
    await priceCartAction(oneCap, " verao 10 ");
    expect(findActiveByCode).toHaveBeenCalledWith("VERAO10");
  });

  it("cupom válido volta com as regras para o navegador recalcular", async () => {
    findActiveByCode.mockResolvedValue(verao10);
    const result = await priceCartAction(oneCap, "VERAO10");
    expect(result).toMatchObject({
      ok: true,
      couponError: null,
      coupon: {
        code: "VERAO10",
        kind: "percent",
        value: 10,
        minOrderCents: 0,
        startsAt: null,
        expiresAt: null,
        maxUses: null,
        usesCount: 0,
      },
    });
    if (result.ok) expect(result.coupon).not.toHaveProperty("id");
  });

  it("código que não existe: 'Cupom não encontrado.'", async () => {
    const result = await priceCartAction(oneCap, "NAOEXISTE");
    expect(result).toMatchObject({ ok: true, coupon: null, couponError: "Cupom não encontrado." });
  });

  it("cupom expirado volta sem cupom e com a mensagem da regra", async () => {
    findActiveByCode.mockResolvedValue({ ...verao10, expiresAt: "2020-01-01T00:00:00Z" });
    const result = await priceCartAction(oneCap, "VERAO10");
    expect(result).toMatchObject({ ok: true, coupon: null, couponError: "Este cupom expirou." });
  });

  it("subtotal abaixo do mínimo informa o mínimo", async () => {
    findActiveByCode.mockResolvedValue({ ...verao10, minOrderCents: 5000 });
    const result = await priceCartAction(oneCap, "VERAO10");
    expect(result.ok && result.coupon).toBeNull();
    expect(result.ok && result.couponError?.replace(/ /g, " ")).toBe(
      "Este cupom vale para pedidos a partir de R$ 50,00."
    );
  });

  it("falha ao consultar cupons não derruba o carrinho", async () => {
    findActiveByCode.mockRejectedValue(new Error('relation "store_coupons" does not exist'));
    const result = await priceCartAction(oneCap, "VERAO10");
    expect(result).toMatchObject({
      ok: true,
      coupon: null,
      couponError: "Cupons indisponíveis no momento.",
    });
    expect(result.ok && result.cart.subtotalCents).toBe(2000);
  });

  it("código longo demais ou que não é texto vira 'não encontrado' sem consultar o banco", async () => {
    for (const code of ["A".repeat(33), 123, { code: "x" }]) {
      const result = await priceCartAction(oneCap, code);
      expect(result).toMatchObject({ ok: true, coupon: null, couponError: "Cupom não encontrado." });
    }
    expect(findActiveByCode).not.toHaveBeenCalled();
  });

  it("erro interno do Next na consulta de cupom é relançado", async () => {
    const internal = new Error("Dynamic server usage");
    findActiveByCode.mockRejectedValue(internal);
    unstableRethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    await expect(priceCartAction(oneCap, "VERAO10")).rejects.toBe(internal);
  });
});
