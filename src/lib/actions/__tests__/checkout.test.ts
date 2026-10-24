import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/payments/terms";
import type { StoreProductDetail } from "@/lib/repositories/types";

const listProductDetails = vi.fn();
const listCategories = vi.fn();
const findActiveByCode = vi.fn();
const create = vi.fn();
const attachCheckout = vi.fn();
const cancelPending = vi.fn();
const getTerms = vi.fn();
const unstableRethrow = vi.fn();
const quote = vi.fn();
const getShippingProvider = vi.fn();
const getAsaasConfig = vi.fn();
const createAsaasCheckout = vi.fn();

vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    store: {
      listProductDetails: () => listProductDetails(),
      listCategories: () => listCategories(),
    },
    coupons: { findActiveByCode: (code: string) => findActiveByCode(code) },
    orders: {
      create: (draft: unknown) => create(draft),
      attachCheckout: (...args: unknown[]) => attachCheckout(...args),
      cancelPending: (id: string) => cancelPending(id),
    },
    paymentSettings: { get: () => getTerms() },
  }),
}));
vi.mock("next/navigation", () => ({ unstable_rethrow: (e: unknown) => unstableRethrow(e) }));
vi.mock("@/lib/shipping/config", () => ({ getShippingProvider: () => getShippingProvider() }));
vi.mock("@/lib/payments/asaas", () => ({
  getAsaasConfig: () => getAsaasConfig(),
  createAsaasCheckout: (...args: unknown[]) => createAsaasCheckout(...args),
}));

import { placeOrderAction, quoteCheckoutAction } from "../checkout";

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

const PAC = { id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 };
const SECRET = "s".repeat(64);
const asaasConfig = { apiKey: "chave", environment: "sandbox", webhookToken: "w".repeat(40) };

const buyer = {
  name: "Maria Silva",
  email: "maria@exemplo.com",
  phone: "85999998888",
  cep: "01018-020",
  street: "Rua das Flores",
  number: "100",
  complement: "",
  district: "Centro",
  city: "São Paulo",
  state: "SP",
};

function selection(over: Record<string, unknown> = {}) {
  return {
    lines: [{ productId: "bone", variantId: null, quantity: 2 }],
    couponCode: null,
    shipping: { optionId: "1", cep: "01018-020", expectedCents: 2345 },
    method: "pix",
    expectedTotalCents: 6145,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  unstableRethrow.mockReset();
  vi.stubEnv("ORDERS_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://aeromedico.exemplo.com.br");
  listProductDetails.mockResolvedValue([cap]);
  listCategories.mockResolvedValue([]);
  findActiveByCode.mockResolvedValue(null);
  getTerms.mockResolvedValue(DEFAULT_PAYMENT_TERMS);
  quote.mockResolvedValue({ ok: true, options: [PAC] });
  getShippingProvider.mockReturnValue({ quote: (input: unknown) => quote(input) });
  getAsaasConfig.mockReturnValue(asaasConfig);
  create.mockResolvedValue({ id: "ord-1", number: 123, accessToken: "token-do-pedido" });
  attachCheckout.mockResolvedValue(undefined);
  cancelPending.mockResolvedValue(undefined);
  createAsaasCheckout.mockResolvedValue({ ok: true, id: "chk_1", url: "https://asaas.com/checkout/chk_1" });
});

afterEach(() => vi.unstubAllEnvs());

describe("placeOrderAction: checkout desligado ou entrada ruim", () => {
  it("sem Asaas, sem provedor de frete, sem segredo ou sem endereço do site: disabled, nada criado", async () => {
    const off = [
      () => getAsaasConfig.mockReturnValue(null),
      () => getShippingProvider.mockReturnValue(null),
      () => vi.stubEnv("ORDERS_RPC_SECRET", ""),
      () => vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""),
    ];
    for (const turnOff of off) {
      beforeEachReset();
      turnOff();
      const result = await placeOrderAction(selection(), buyer);
      expect(result).toEqual({
        ok: false,
        code: "disabled",
        error: "O pagamento pelo site ainda não está disponível. Volte em breve.",
      });
      expect(create).not.toHaveBeenCalled();
    }
  });

  it("comprador inválido: invalid-buyer, sem criar pedido", async () => {
    const result = await placeOrderAction(selection(), { ...buyer, email: "sem-arroba" });
    expect(result).toEqual({ ok: false, code: "invalid-buyer", error: "Informe um e-mail válido." });
    expect(create).not.toHaveBeenCalled();
  });

  it("sem o total que o cliente viu, não cria pedido", async () => {
    const result = await placeOrderAction(selection({ expectedTotalCents: undefined }), buyer);
    expect(result).toMatchObject({ ok: false, code: "quote", quote: { code: "invalid-input" } });
    expect(create).not.toHaveBeenCalled();
  });

  it("frete que mudou volta como cotação e NÃO cria pedido", async () => {
    quote.mockResolvedValue({ ok: true, options: [{ ...PAC, priceCents: 2500 }] });
    const result = await placeOrderAction(selection(), buyer);
    expect(result).toMatchObject({ ok: false, code: "quote", quote: { code: "shipping-changed", newShippingCents: 2500 } });
    expect(create).not.toHaveBeenCalled();
    expect(createAsaasCheckout).not.toHaveBeenCalled();
  });

  it("total que o cliente viu diferente do calculado: nada é cobrado", async () => {
    const result = await placeOrderAction(selection({ expectedTotalCents: 6000 }), buyer);
    expect(result).toMatchObject({ ok: false, code: "quote", quote: { code: "price-changed", newTotalCents: 6145 } });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("placeOrderAction: caminho feliz", () => {
  it("grava o pedido com os valores do SERVIDOR, cria o checkout com o total com taxa e devolve o link", async () => {
    const result = await placeOrderAction(
      selection({ totalCents: 1, pixDiscountCents: 9999, subtotalCents: 1 }),
      buyer
    );
    expect(result).toEqual({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });

    expect(create).toHaveBeenCalledWith({
      customer: { name: "Maria Silva", email: "maria@exemplo.com", phone: "85999998888" },
      address: {
        cep: "01018020",
        street: "Rua das Flores",
        number: "100",
        complement: null,
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      },
      shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
      items: [
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
      ],
      subtotalCents: 4000,
      discountCents: 0,
      couponCode: null,
      pixDiscountCents: 200,
      totalCents: 6145,
      paymentMethod: "pix",
      environment: "sandbox",
    });

    expect(createAsaasCheckout).toHaveBeenCalledWith(
      asaasConfig,
      expect.objectContaining({
        orderId: "ord-1",
        orderNumber: 123,
        totalCents: 6145,
        method: "pix",
        maxInstallments: 6,
        siteUrl: "https://aeromedico.exemplo.com.br",
        accessToken: "token-do-pedido",
        itemsSummary: "2x Boné",
      })
    );
    expect(attachCheckout).toHaveBeenCalledWith("ord-1", {
      id: "chk_1",
      url: "https://asaas.com/checkout/chk_1",
    });
  });
});

describe("placeOrderAction: falhas depois de criar o pedido", () => {
  it("Asaas recusa ou fica fora do ar: pedido cancelado, sem vincular, mensagem para tentar de novo", async () => {
    for (const reason of ["rejected", "unavailable"]) {
      vi.clearAllMocks();
      createAsaasCheckout.mockResolvedValue({ ok: false, reason });
      const result = await placeOrderAction(selection(), buyer);
      expect(result).toEqual({
        ok: false,
        code: "unavailable",
        error: "Não conseguimos abrir o pagamento agora. Nenhuma cobrança foi feita. Tente de novo em instantes.",
      });
      expect(cancelPending).toHaveBeenCalledWith("ord-1");
      expect(attachCheckout).not.toHaveBeenCalled();
    }
  });

  it("falha ao vincular o checkout: o link NÃO é entregue e o pedido é cancelado", async () => {
    attachCheckout.mockRejectedValue(new Error("connection refused: db.interno:5432"));
    const result = await placeOrderAction(selection(), buyer);
    expect(result).toEqual({
      ok: false,
      code: "unavailable",
      error: "Não conseguimos abrir o pagamento agora. Nenhuma cobrança foi feita. Tente de novo em instantes.",
    });
    expect(cancelPending).toHaveBeenCalledWith("ord-1");
  });

  it("falha ao gravar o pedido: unavailable sem vazar o erro e sem chamar o Asaas", async () => {
    create.mockRejectedValue(new Error("duplicate key value violates unique constraint"));
    const result = await placeOrderAction(selection(), buyer);
    expect(result).toMatchObject({ ok: false, code: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("duplicate key");
    expect(createAsaasCheckout).not.toHaveBeenCalled();
  });

  it("catálogo fora do ar: unavailable; erro interno do Next é relançado", async () => {
    const internal = new Error("Dynamic server usage");
    listProductDetails.mockRejectedValue(internal);
    expect(await placeOrderAction(selection(), buyer)).toMatchObject({ ok: false, code: "unavailable" });

    unstableRethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    await expect(placeOrderAction(selection(), buyer)).rejects.toBe(internal);
  });
});

describe("quoteCheckoutAction", () => {
  it("devolve a cotação do servidor, com as três formas de pagamento", async () => {
    const result = await quoteCheckoutAction(selection({ expectedTotalCents: undefined }));
    expect(result.ok && result.options.map((o) => o.method)).toEqual([
      "pix",
      "card_single",
      "card_installments",
    ]);
  });

  it("desligado ou com infraestrutura fora do ar: unavailable, sem lançar", async () => {
    getAsaasConfig.mockReturnValue(null);
    expect(await quoteCheckoutAction(selection())).toMatchObject({ ok: false, code: "unavailable" });

    getAsaasConfig.mockReturnValue(asaasConfig);
    listProductDetails.mockRejectedValue(new Error("falha"));
    expect(await quoteCheckoutAction(selection())).toMatchObject({ ok: false, code: "unavailable" });
  });
});

// Restaura os mocks padrão entre as variações do primeiro teste (que desliga uma peça por vez).
function beforeEachReset() {
  vi.clearAllMocks();
  vi.stubEnv("ORDERS_RPC_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://aeromedico.exemplo.com.br");
  getShippingProvider.mockReturnValue({ quote: (input: unknown) => quote(input) });
  getAsaasConfig.mockReturnValue(asaasConfig);
}

describe("placeOrderAction: CEP da entrega", () => {
  it("CEP de entrega diferente do CEP cotado no frete: recusa e nada é criado", async () => {
    const result = await placeOrderAction(selection(), { ...buyer, cep: "69900-000" });
    expect(result).toEqual({
      ok: false,
      code: "invalid-buyer",
      error: "O CEP da entrega deve ser o mesmo do cálculo do frete.",
    });
    expect(create).not.toHaveBeenCalled();
    expect(createAsaasCheckout).not.toHaveBeenCalled();
  });

  it("o mesmo CEP, com ou sem hífen, passa", async () => {
    const result = await placeOrderAction(selection(), { ...buyer, cep: "01018020" });
    expect(result.ok).toBe(true);
  });
});

describe("placeOrderAction: ambiente do pedido", () => {
  it("o pedido é gravado com o ambiente do Asaas configurado (sandbox ou produção)", async () => {
    await placeOrderAction(selection(), buyer);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ environment: "sandbox" }));

    getAsaasConfig.mockReturnValue({ ...asaasConfig, environment: "production" });
    await placeOrderAction(selection(), buyer);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ environment: "production" }));
  });
});

describe("quoteCheckoutAction: texto quando o pagamento está desligado", () => {
  it("não manda o comprador para o WhatsApp", async () => {
    getAsaasConfig.mockReturnValue(null);
    const result = await quoteCheckoutAction(selection());
    expect(result).toEqual({
      ok: false,
      code: "unavailable",
      error: "O pagamento pelo site ainda não está disponível. Volte em breve.",
    });
  });
});
