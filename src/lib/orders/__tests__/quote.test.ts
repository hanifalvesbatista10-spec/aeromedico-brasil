import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeCheckoutQuote, type CheckoutDeps } from "../quote";
import { DEFAULT_PAYMENT_TERMS, paymentOptions } from "@/lib/payments/terms";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCoupon, StoreProduct, StoreVariant } from "@/lib/types";

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

const shirt: StoreProductDetail = {
  product: product({}),
  variants: [
    variant({ id: "m-preta" }),
    variant({ id: "esgotada", size: "PP", stock: 0 }),
  ],
  images: [],
};

const PAC = { id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 };

function coupon(over: Partial<StoreCoupon> = {}): StoreCoupon {
  return {
    id: "c1",
    code: "VERAO10",
    kind: "percent",
    value: 10,
    minOrderCents: 0,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    usesCount: 0,
    active: true,
    ...over,
  };
}

const NOW = new Date("2026-11-10T12:00:00Z");

let quote: ReturnType<typeof vi.fn>;
let findActiveByCode: ReturnType<typeof vi.fn>;
let deps: CheckoutDeps;

beforeEach(() => {
  quote = vi.fn().mockResolvedValue({ ok: true, options: [PAC] });
  findActiveByCode = vi.fn().mockResolvedValue(null);
  deps = {
    store: {
      listProductDetails: vi.fn().mockResolvedValue([cap, shirt]),
      listCategories: vi.fn().mockResolvedValue([]),
    },
    coupons: { findActiveByCode },
    shippingProvider: { quote },
    terms: DEFAULT_PAYMENT_TERMS,
    now: NOW,
  } as unknown as CheckoutDeps;
});

function selection(over: Record<string, unknown> = {}) {
  return {
    lines: [{ productId: "bone", variantId: null, quantity: 2 }],
    couponCode: null,
    shipping: { optionId: "1", cep: "01018-020", expectedCents: 2345 },
    method: "pix",
    ...over,
  };
}

describe("computeCheckoutQuote: caminho feliz", () => {
  it("recalcula subtotal, frete e as três formas de pagamento", async () => {
    const result = await computeCheckoutQuote(selection(), deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.subtotalCents).toBe(4000);
    expect(result.discountCents).toBe(0);
    expect(result.couponCode).toBeNull();
    expect(result.shipping).toEqual({ optionId: "1", label: "Correios PAC", cents: 2345, cep: "01018020" });
    expect(result.orderCents).toBe(6345);
    expect(result.options).toEqual(
      paymentOptions({ productsCents: 4000, shippingCents: 2345 }, DEFAULT_PAYMENT_TERMS)
    );
    expect(result.chosen.method).toBe("pix");
    // Pix: 5% de R$ 40,00 = R$ 2,00 de desconto; o frete fica de fora.
    expect(result.chosen.discountCents).toBe(200);
    expect(result.chosen.totalCents).toBe(6145);
  });

  it("devolve os itens do pedido com preço e peso vindos do catálogo", async () => {
    const result = await computeCheckoutQuote(selection(), deps);
    expect(result.ok && result.items).toEqual([
      {
        productId: "bone",
        variantId: null,
        name: "Boné",
        size: null,
        colorName: null,
        unitPriceCents: 2000,
        quantity: 2,
        weightGrams: 120,
      },
    ]);
  });

  it("o frete é cotado de novo com o CEP normalizado e itens do banco", async () => {
    await computeCheckoutQuote(selection(), deps);
    expect(quote).toHaveBeenCalledWith({
      destinationCep: "01018020",
      items: [
        expect.objectContaining({ id: "bone:-", weightGrams: 120, unitPriceCents: 2000, quantity: 2 }),
      ],
    });
  });

  it("a forma escolhida define o `chosen`", async () => {
    const result = await computeCheckoutQuote(selection({ method: "card_installments" }), deps);
    expect(result.ok && result.chosen.method).toBe("card_installments");
    expect(result.ok && result.chosen.installments).toBe(6);
  });
});

describe("computeCheckoutQuote: nada que vem do navegador vale", () => {
  it("campos extras e totais enviados pelo navegador são ignorados", async () => {
    const result = await computeCheckoutQuote(
      selection({ totalCents: 1, pixDiscountCents: 9999, subtotalCents: 1, unitPriceCents: 1 }),
      deps
    );
    expect(result.ok && result.orderCents).toBe(6345);
  });

  it("método inválido, CEP inválido e frete ausente são entrada inválida", async () => {
    for (const bad of [
      selection({ method: "boleto" }),
      selection({ shipping: { optionId: "1", cep: "abc", expectedCents: 2345 } }),
      { ...selection(), shipping: undefined },
      "lixo",
    ]) {
      const result = await computeCheckoutQuote(bad, deps);
      expect(result).toMatchObject({ ok: false, code: "invalid-input" });
    }
  });

  it("carrinho vazio ou só com item esgotado: empty-cart", async () => {
    expect(await computeCheckoutQuote(selection({ lines: [] }), deps)).toMatchObject({
      ok: false,
      code: "empty-cart",
    });
    expect(
      await computeCheckoutQuote(
        selection({ lines: [{ productId: "camiseta", variantId: "esgotada", quantity: 1 }] }),
        deps
      )
    ).toMatchObject({ ok: false, code: "empty-cart" });
    expect(quote).not.toHaveBeenCalled();
  });
});

describe("computeCheckoutQuote: frete refeito no servidor", () => {
  it("provedor ausente, falha ou opção que não existe mais: shipping-unavailable", async () => {
    expect(await computeCheckoutQuote(selection(), { ...deps, shippingProvider: null })).toMatchObject({
      ok: false,
      code: "shipping-unavailable",
    });

    quote.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await computeCheckoutQuote(selection(), deps)).toMatchObject({
      ok: false,
      code: "shipping-unavailable",
    });

    quote.mockResolvedValue({ ok: true, options: [{ ...PAC, id: "99" }] });
    expect(await computeCheckoutQuote(selection(), deps)).toMatchObject({
      ok: false,
      code: "shipping-unavailable",
    });
  });

  it("preço do frete diferente do que o cliente viu: shipping-changed com o valor novo", async () => {
    quote.mockResolvedValue({ ok: true, options: [{ ...PAC, priceCents: 2500 }] });
    const result = await computeCheckoutQuote(selection(), deps);
    expect(result).toMatchObject({ ok: false, code: "shipping-changed", newShippingCents: 2500 });
    expect(!result.ok && result.error.replace(/ /g, " ")).toBe(
      "O frete mudou para R$ 25,00. Confira o novo total e clique em Finalizar pedido de novo."
    );
  });
});

describe("computeCheckoutQuote: cupom", () => {
  it("cupom válido reduz o valor do pedido", async () => {
    findActiveByCode.mockResolvedValue(coupon());
    const result = await computeCheckoutQuote(selection({ couponCode: " verao10 " }), deps);
    expect(findActiveByCode).toHaveBeenCalledWith("VERAO10");
    expect(result.ok && [result.discountCents, result.couponCode, result.orderCents]).toEqual([
      400,
      "VERAO10",
      5945,
    ]);
  });

  it("cupom expirado ou inexistente segue sem desconto e sem código", async () => {
    findActiveByCode.mockResolvedValue(coupon({ expiresAt: "2020-01-01T00:00:00Z" }));
    const expired = await computeCheckoutQuote(selection({ couponCode: "VERAO10" }), deps);
    expect(expired.ok && [expired.discountCents, expired.couponCode]).toEqual([0, null]);

    findActiveByCode.mockResolvedValue(null);
    const unknown = await computeCheckoutQuote(selection({ couponCode: "NAOEXISTE" }), deps);
    expect(unknown.ok && [unknown.discountCents, unknown.couponCode]).toEqual([0, null]);
  });

  it("falha ao consultar o cupom não é engolida (o chamador trata)", async () => {
    findActiveByCode.mockRejectedValue(new Error("tabela ausente"));
    await expect(
      computeCheckoutQuote(selection({ couponCode: "VERAO10" }), deps)
    ).rejects.toThrow("tabela ausente");
  });
});

describe("computeCheckoutQuote: total que o cliente viu", () => {
  it("total esperado diferente do calculado: price-changed com o total novo", async () => {
    const result = await computeCheckoutQuote(selection({ expectedTotalCents: 6000 }), deps);
    expect(result).toMatchObject({ ok: false, code: "price-changed", newTotalCents: 6145 });
    expect(!result.ok && result.error.replace(/ /g, " ")).toBe(
      "O total do pedido mudou para R$ 61,45. Se estiver de acordo, clique em Finalizar pedido de novo."
    );
  });

  it("total esperado igual ao calculado passa", async () => {
    const result = await computeCheckoutQuote(selection({ expectedTotalCents: 6145 }), deps);
    expect(result.ok).toBe(true);
  });

  it("cupom que sumiu entre a cotação e o pedido muda o total e é avisado", async () => {
    // O cliente viu o total COM o cupom: produtos 3600 + frete 2345 − Pix 180 = 5765.
    const result = await computeCheckoutQuote(selection({ expectedTotalCents: 5765 }), deps);
    expect(result).toMatchObject({ ok: false, code: "price-changed" });
  });
});

describe("computeCheckoutQuote: forma de pagamento que não é oferecida", () => {
  it("cartão parcelado com máximo de 1 parcela: entrada inválida, sem lançar erro", async () => {
    const result = await computeCheckoutQuote(selection({ method: "card_installments" }), {
      ...deps,
      terms: { ...DEFAULT_PAYMENT_TERMS, maxInstallments: 1 },
    });
    expect(result).toMatchObject({ ok: false, code: "invalid-input" });
  });
});
