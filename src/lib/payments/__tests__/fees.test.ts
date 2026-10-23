import { describe, it, expect } from "vitest";
import { DEFAULT_PAYMENT_FEES, feeFor, paymentOptions } from "../fees";

const { pix, cardSingle, cardInstallments } = DEFAULT_PAYMENT_FEES;

describe("feeFor", () => {
  it("valores de referência: pedido de R$ 100,00", () => {
    expect(feeFor(10000, pix)).toEqual({ feeCents: 199, totalCents: 10199 });
    expect(feeFor(10000, cardSingle)).toEqual({ feeCents: 359, totalCents: 10359 });
    expect(feeFor(10000, cardInstallments)).toEqual({ feeCents: 413, totalCents: 10413 });
  });

  it("o dono nunca recebe menos que o valor do pedido, e o arredondamento é o mínimo possível", () => {
    for (const rule of [pix, cardSingle, cardInstallments]) {
      for (let i = 0; i < 200; i++) {
        const order = 1 + i * 2500;
        const { totalCents } = feeFor(order, rule);
        // O que sobra depois da taxa, com a taxa arredondada para baixo.
        const net = totalCents - (Math.floor((totalCents * rule.percentBp) / 10000) + rule.fixedCents);
        expect(net).toBeGreaterThanOrEqual(order);
        // Mínimo exato: um centavo a menos não cobriria (pedido + fixa) / (1 − percentual).
        const covers = (total: number) =>
          total * (10000 - rule.percentBp) >= (order + rule.fixedCents) * 10000;
        expect(covers(totalCents)).toBe(true);
        expect(covers(totalCents - 1)).toBe(false);
      }
    }
  });

  it("pedido zero cobra só a taxa fixa; percentual zero cobra só a fixa", () => {
    expect(feeFor(0, pix)).toEqual({ feeCents: 199, totalCents: 199 });
    expect(feeFor(5000, { fixedCents: 100, percentBp: 0 })).toEqual({
      feeCents: 100,
      totalCents: 5100,
    });
  });

  it("recusa percentual de 100% ou mais e valores inválidos", () => {
    expect(() => feeFor(1000, { fixedCents: 0, percentBp: 10000 })).toThrow();
    expect(() => feeFor(1000, { fixedCents: 0, percentBp: -1 })).toThrow();
    expect(() => feeFor(1000, { fixedCents: 0.5, percentBp: 100 })).toThrow();
    expect(() => feeFor(-1, pix)).toThrow();
    expect(() => feeFor(10.5, pix)).toThrow();
  });
});

describe("paymentOptions", () => {
  it("devolve Pix, cartão à vista e parcelado, nessa ordem", () => {
    const options = paymentOptions(10000, DEFAULT_PAYMENT_FEES);
    expect(options.map((o) => o.method)).toEqual(["pix", "card_single", "card_installments"]);
    expect(options.map((o) => o.label)).toEqual(["Pix", "Cartão à vista", "Cartão parcelado em até 6x"]);
    expect(options.map((o) => o.totalCents)).toEqual([10199, 10359, 10413]);
    expect(options.map((o) => o.feeCents)).toEqual([199, 359, 413]);
  });

  it("só o parcelado traz número de parcelas e valor da parcela (arredondado para cima)", () => {
    const [p, single, installments] = paymentOptions(10000, DEFAULT_PAYMENT_FEES);
    expect([p.installments, p.installmentCents]).toEqual([null, null]);
    expect([single.installments, single.installmentCents]).toEqual([null, null]);
    expect(installments.installments).toBe(6);
    expect(installments.installmentCents).toBe(1736);
  });

  it("respeita o máximo de parcelas configurado", () => {
    const options = paymentOptions(12000, { ...DEFAULT_PAYMENT_FEES, maxInstallments: 3 });
    expect(options[2].label).toBe("Cartão parcelado em até 3x");
    expect(options[2].installments).toBe(3);
  });
});

describe("paymentOptions: sem parcelamento", () => {
  it("máximo de 1 parcela não oferece a opção de cartão parcelado", () => {
    const options = paymentOptions(10000, { ...DEFAULT_PAYMENT_FEES, maxInstallments: 1 });
    expect(options.map((option) => option.method)).toEqual(["pix", "card_single"]);
  });

  it("máximo de 2 parcelas ainda oferece", () => {
    const options = paymentOptions(10000, { ...DEFAULT_PAYMENT_FEES, maxInstallments: 2 });
    expect(options.map((option) => option.method)).toEqual(["pix", "card_single", "card_installments"]);
    expect(options[2].installments).toBe(2);
  });
});
