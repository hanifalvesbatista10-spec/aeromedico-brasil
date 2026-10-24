import { describe, it, expect } from "vitest";
import {
  DEFAULT_PAYMENT_TERMS,
  MAX_PIX_DISCOUNT_BP,
  paymentOptions,
  pixDiscountFor,
  validatePaymentTerms,
} from "../terms";

describe("pixDiscountFor", () => {
  it("5% de R$ 49,90 são R$ 2,50 (arredonda ao centavo mais próximo)", () => {
    expect(pixDiscountFor(4990, 500)).toBe(250);
  });

  it("valores exatos, zero e sem desconto", () => {
    expect(pixDiscountFor(10000, 500)).toBe(500);
    expect(pixDiscountFor(0, 500)).toBe(0);
    expect(pixDiscountFor(4990, 0)).toBe(0);
  });

  it("o desconto nunca passa do valor dos produtos", () => {
    for (const base of [1, 99, 4990, 123456]) {
      expect(pixDiscountFor(base, MAX_PIX_DISCOUNT_BP)).toBeLessThanOrEqual(base);
    }
  });

  it("recusa valores que não são inteiros não negativos", () => {
    expect(() => pixDiscountFor(-1, 500)).toThrow();
    expect(() => pixDiscountFor(10.5, 500)).toThrow();
    expect(() => pixDiscountFor(100, -1)).toThrow();
    expect(() => pixDiscountFor(100, 0.5)).toThrow();
  });
});

describe("paymentOptions", () => {
  // Exemplo do modelo aprovado: 1 camisa a R$ 49,90 + frete de R$ 32,66.
  const order = { productsCents: 4990, shippingCents: 3266 };

  it("Pix leva 5% sobre os produtos (não sobre o frete); cartão paga o preço cheio, sem taxa", () => {
    const [pix, single, installments] = paymentOptions(order, DEFAULT_PAYMENT_TERMS);
    expect(pix).toMatchObject({ method: "pix", label: "Pix", discountCents: 250, totalCents: 8006 });
    expect(single).toMatchObject({ method: "card_single", label: "Cartão à vista", discountCents: 0, totalCents: 8256 });
    expect(installments).toMatchObject({
      method: "card_installments",
      label: "Cartão parcelado em até 6x",
      discountCents: 0,
      totalCents: 8256,
      installments: 6,
      installmentCents: 1376,
    });
  });

  it("a parcela é arredondada para cima", () => {
    const [, , installments] = paymentOptions({ productsCents: 1000, shippingCents: 0 }, DEFAULT_PAYMENT_TERMS);
    expect(installments.installmentCents).toBe(167);
  });

  it("sem desconto configurado, o Pix paga o mesmo que o cartão", () => {
    const [pix, single] = paymentOptions(order, { ...DEFAULT_PAYMENT_TERMS, pixDiscountBp: 0 });
    expect(pix.discountCents).toBe(0);
    expect(pix.totalCents).toBe(single.totalCents);
  });

  it("só o parcelado traz parcelas, e respeita o máximo configurado", () => {
    const options = paymentOptions(order, { ...DEFAULT_PAYMENT_TERMS, maxInstallments: 3 });
    expect(options[0].installments).toBeNull();
    expect(options[1].installments).toBeNull();
    expect(options[2].label).toBe("Cartão parcelado em até 3x");
    expect(options[2].installments).toBe(3);
  });

  it("com máximo de 1 parcela não há cartão parcelado (seria igual ao à vista)", () => {
    const options = paymentOptions(order, { ...DEFAULT_PAYMENT_TERMS, maxInstallments: 1 });
    expect(options.map((option) => option.method)).toEqual(["pix", "card_single"]);
  });

  it("pedido só com frete e produtos a zero não dá total negativo", () => {
    const [pix] = paymentOptions({ productsCents: 0, shippingCents: 2000 }, DEFAULT_PAYMENT_TERMS);
    expect(pix.totalCents).toBe(2000);
  });
});

describe("validatePaymentTerms", () => {
  it("aceita os valores padrão", () => {
    expect(validatePaymentTerms(DEFAULT_PAYMENT_TERMS)).toBeNull();
  });

  it("desconto do Pix: inteiro de 0 a 50%", () => {
    const bad = (pixDiscountBp: number) => validatePaymentTerms({ ...DEFAULT_PAYMENT_TERMS, pixDiscountBp });
    expect(bad(-1)).not.toBeNull();
    expect(bad(MAX_PIX_DISCOUNT_BP + 1)).not.toBeNull();
    expect(bad(2.5)).not.toBeNull();
    expect(bad(0)).toBeNull();
    expect(bad(MAX_PIX_DISCOUNT_BP)).toBeNull();
  });

  it("parcelas: inteiro de 1 a 21", () => {
    const bad = (maxInstallments: number) => validatePaymentTerms({ ...DEFAULT_PAYMENT_TERMS, maxInstallments });
    expect(bad(0)).not.toBeNull();
    expect(bad(22)).not.toBeNull();
    expect(bad(2.5)).not.toBeNull();
    expect(bad(1)).toBeNull();
    expect(bad(21)).toBeNull();
  });
});
