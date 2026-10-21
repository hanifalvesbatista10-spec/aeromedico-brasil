import { describe, it, expect } from "vitest";
import { evaluateCoupon, normalizeCouponCode, COUPON_NOT_FOUND_MESSAGE } from "../coupon";
import type { StoreCoupon } from "@/lib/types";

const NOW = new Date("2026-11-10T12:00:00Z");

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

const plain = (text: string) => text.replace(/ /g, " ");

describe("normalizeCouponCode", () => {
  it("tira espaços (inclusive no meio) e põe em maiúsculas", () => {
    expect(normalizeCouponCode("  verao 10 ")).toBe("VERAO10");
    expect(normalizeCouponCode("Black-Friday_25")).toBe("BLACK-FRIDAY_25");
  });
});

describe("desconto", () => {
  it("percentual arredonda para baixo", () => {
    expect(evaluateCoupon(coupon(), 9990, NOW)).toEqual({ ok: true, discountCents: 999 });
    expect(evaluateCoupon(coupon({ value: 15 }), 3333, NOW)).toEqual({ ok: true, discountCents: 499 });
  });

  it("valor fixo nunca passa do subtotal", () => {
    const fixed = coupon({ kind: "fixed", value: 2000 });
    expect(evaluateCoupon(fixed, 5000, NOW)).toEqual({ ok: true, discountCents: 2000 });
    expect(evaluateCoupon(fixed, 1500, NOW)).toEqual({ ok: true, discountCents: 1500 });
  });

  it("100% desconta o subtotal inteiro e subtotal zero desconta zero", () => {
    expect(evaluateCoupon(coupon({ value: 100 }), 4990, NOW)).toEqual({ ok: true, discountCents: 4990 });
    expect(evaluateCoupon(coupon(), 0, NOW)).toEqual({ ok: true, discountCents: 0 });
    expect(evaluateCoupon(coupon({ kind: "fixed", value: 500 }), 0, NOW)).toEqual({ ok: true, discountCents: 0 });
  });
});

describe("regras", () => {
  it("ainda não começou", () => {
    const result = evaluateCoupon(coupon({ startsAt: "2026-11-11T00:00:00Z" }), 5000, NOW);
    expect(result).toEqual({
      ok: false,
      reason: "not-started",
      message: "Este cupom ainda não está valendo.",
    });
  });

  it("expira exatamente no instante final; antes dele ainda vale", () => {
    expect(evaluateCoupon(coupon({ expiresAt: "2026-11-10T12:00:00Z" }), 5000, NOW)).toEqual({
      ok: false,
      reason: "expired",
      message: "Este cupom expirou.",
    });
    expect(evaluateCoupon(coupon({ expiresAt: "2026-11-10T12:00:01Z" }), 5000, NOW).ok).toBe(true);
  });

  it("limite de usos: esgotado quando usos >= máximo; sem máximo nunca esgota", () => {
    expect(evaluateCoupon(coupon({ maxUses: 10, usesCount: 10 }), 5000, NOW)).toEqual({
      ok: false,
      reason: "exhausted",
      message: "Este cupom atingiu o limite de usos.",
    });
    expect(evaluateCoupon(coupon({ maxUses: 10, usesCount: 9 }), 5000, NOW).ok).toBe(true);
    expect(evaluateCoupon(coupon({ maxUses: null, usesCount: 9999 }), 5000, NOW).ok).toBe(true);
  });

  it("abaixo do pedido mínimo informa o mínimo", () => {
    const result = evaluateCoupon(coupon({ minOrderCents: 5000 }), 4999, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("below-minimum");
    expect(plain(result.message)).toBe("Este cupom vale para pedidos a partir de R$ 50,00.");
    expect(evaluateCoupon(coupon({ minOrderCents: 5000 }), 5000, NOW).ok).toBe(true);
  });

  it("a ordem das checagens: expirado vence abaixo do mínimo", () => {
    const result = evaluateCoupon(
      coupon({ expiresAt: "2026-01-01T00:00:00Z", minOrderCents: 5000 }),
      100,
      NOW
    );
    expect(result).toMatchObject({ ok: false, reason: "expired" });
  });
});

describe("mensagem de cupom inexistente", () => {
  it("é a mesma para código errado e cupom inativo", () => {
    expect(COUPON_NOT_FOUND_MESSAGE).toBe("Cupom não encontrado.");
  });
});
