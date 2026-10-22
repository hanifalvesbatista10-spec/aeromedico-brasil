import { describe, it, expect } from "vitest";
import {
  orderDraftToRpc,
  orderRowToDomain,
  paymentFeesFromRow,
  paymentFeesToRow,
  publicOrderFromJson,
  readOrdersSecret,
} from "../supabase/orders-mapping";
import { DEFAULT_PAYMENT_FEES } from "@/lib/payments/fees";
import type { OrderDraft } from "@/lib/types";
import type { StoreOrderItemRow, StoreOrderRow, StorePaymentSettingsRow } from "@/lib/supabase/types";

const draft: OrderDraft = {
  customer: { name: "Maria", email: "maria@exemplo.com", phone: "85999998888" },
  address: {
    cep: "01018020",
    street: "Rua A",
    number: "10",
    complement: null,
    district: "Centro",
    city: "São Paulo",
    state: "SP",
  },
  shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
  items: [
    {
      productId: "p1",
      variantId: null,
      name: "Boné",
      size: null,
      colorName: null,
      unitPriceCents: 2000,
      quantity: 1,
      weightGrams: 120,
    },
  ],
  subtotalCents: 2000,
  discountCents: 0,
  couponCode: null,
  feeCents: 199,
  totalCents: 4544,
  paymentMethod: "pix",
};

describe("orderDraftToRpc", () => {
  it("usa exatamente as chaves que a função SQL lê", () => {
    expect(orderDraftToRpc(draft)).toEqual({
      customer: { name: "Maria", email: "maria@exemplo.com", phone: "85999998888" },
      address: {
        cep: "01018020",
        street: "Rua A",
        number: "10",
        complement: null,
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      },
      shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
      items: [
        {
          productId: "p1",
          variantId: null,
          name: "Boné",
          size: null,
          colorName: null,
          unitPriceCents: 2000,
          quantity: 1,
          weightGrams: 120,
        },
      ],
      subtotalCents: 2000,
      discountCents: 0,
      couponCode: null,
      feeCents: 199,
      totalCents: 4544,
      paymentMethod: "pix",
    });
  });
});

describe("leituras", () => {
  it("o JSON público vira PublicOrder", () => {
    const json = {
      id: "o1",
      number: 123,
      status: "paid",
      subtotalCents: 2000,
      discountCents: 0,
      shippingCents: 2345,
      feeCents: 199,
      totalCents: 4544,
      paymentMethod: "pix",
      trackingCode: null,
      items: [{ name: "Boné", size: null, colorName: null, quantity: 1, unitPriceCents: 2000 }],
    };
    expect(publicOrderFromJson(json)).toEqual(json);
  });

  it("JSON nulo ou fora do formato vira null", () => {
    expect(publicOrderFromJson(null)).toBeNull();
    expect(publicOrderFromJson({ id: 5 })).toBeNull();
  });

  it("a linha do banco com seus itens vira StoreOrder", () => {
    const row: StoreOrderRow = {
      id: "o1",
      number: 7,
      access_token: "t",
      status: "shipped",
      customer_name: "Maria",
      customer_email: "maria@exemplo.com",
      customer_phone: "85999998888",
      ship_cep: "01018020",
      ship_street: "Rua A",
      ship_number: "10",
      ship_complement: null,
      ship_district: "Centro",
      ship_city: "São Paulo",
      ship_state: "SP",
      ship_option_id: "1",
      ship_label: "Correios PAC",
      subtotal_cents: 2000,
      discount_cents: 0,
      coupon_code: null,
      shipping_cents: 2345,
      fee_cents: 199,
      total_cents: 4544,
      payment_method: "pix",
      asaas_checkout_id: "chk",
      asaas_checkout_url: "https://x",
      tracking_code: "BR1",
      notes: null,
      created_at: "2026-10-22T10:00:00Z",
      paid_at: "2026-10-22T10:05:00Z",
      updated_at: "2026-10-22T10:05:00Z",
    };
    const items: StoreOrderItemRow[] = [
      {
        id: "i1",
        order_id: "o1",
        product_id: "p1",
        variant_id: null,
        name: "Boné",
        size: null,
        color_name: null,
        unit_price_cents: 2000,
        quantity: 1,
        weight_grams: 120,
      },
    ];
    const order = orderRowToDomain(row, items);
    expect(order).toMatchObject({
      id: "o1",
      number: 7,
      status: "shipped",
      checkoutId: "chk",
      trackingCode: "BR1",
      paidAt: "2026-10-22T10:05:00Z",
      shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
      customer: { name: "Maria", email: "maria@exemplo.com", phone: "85999998888" },
    });
    expect(order.items[0]).toMatchObject({ name: "Boné", unitPriceCents: 2000, quantity: 1 });
  });
});

describe("taxas", () => {
  const row: StorePaymentSettingsRow = {
    id: true,
    pix_fixed_cents: 99,
    pix_percent_bp: 0,
    card_single_fixed_cents: 49,
    card_single_percent_bp: 199,
    card_installments_fixed_cents: 49,
    card_installments_percent_bp: 249,
    max_installments: 4,
    updated_at: "2026-10-22T10:00:00Z",
  };

  it("linha ↔ domínio", () => {
    const fees = paymentFeesFromRow(row);
    expect(fees).toEqual({
      pix: { fixedCents: 99, percentBp: 0 },
      cardSingle: { fixedCents: 49, percentBp: 199 },
      cardInstallments: { fixedCents: 49, percentBp: 249 },
      maxInstallments: 4,
    });
    expect(paymentFeesToRow(fees)).toEqual({
      pix_fixed_cents: 99,
      pix_percent_bp: 0,
      card_single_fixed_cents: 49,
      card_single_percent_bp: 199,
      card_installments_fixed_cents: 49,
      card_installments_percent_bp: 249,
      max_installments: 4,
    });
  });

  it("sem linha (tabela ausente) cai nos valores padrão", () => {
    expect(paymentFeesFromRow(null)).toEqual(DEFAULT_PAYMENT_FEES);
  });
});

describe("readOrdersSecret", () => {
  it("devolve o segredo configurado", () => {
    expect(readOrdersSecret({ ORDERS_RPC_SECRET: "abc" })).toBe("abc");
  });

  it("sem segredo, lança um erro claro que cita só o NOME da variável", () => {
    expect(() => readOrdersSecret({})).toThrow("ORDERS_RPC_SECRET");
    expect(() => readOrdersSecret({ ORDERS_RPC_SECRET: "  " })).toThrow("ORDERS_RPC_SECRET");
  });
});
