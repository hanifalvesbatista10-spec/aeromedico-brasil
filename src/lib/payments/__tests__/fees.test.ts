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
        const net = (total: number) =>
          total - (Math.floor((total * rule.percentBp) / 10000) + rule.fixedCents);
        expect(net(totalCents)).toBeGreaterThanOrEqual(order);
        expect(net(totalCents - 1)).toBeLessThan(order);
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
    expect(options.map((o) => o.label)).toEqual(["Pix", "Cartão à vista", "Cartão em até 6x"]);
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
    expect(options[2].label).toBe("Cartão em até 3x");
    expect(options[2].installments).toBe(3);
  });
});
