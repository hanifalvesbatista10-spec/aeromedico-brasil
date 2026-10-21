import { describe, it, expect } from "vitest";
import {
  couponFormToInput,
  couponStatus,
  couponToForm,
  describeCouponUses,
  describeCouponValue,
  emptyCouponForm,
  formatDateTimeLocal,
  fromLocalInput,
  toLocalInput,
} from "../coupon-drafts";
import { storeCouponSchema } from "@/lib/validation/coupons";
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

describe("datas do formulário (fuso do navegador)", () => {
  it("ida e volta: ISO → campo datetime-local → ISO", () => {
    const iso = new Date(2026, 11, 31, 23, 59).toISOString();
    expect(toLocalInput(iso)).toBe("2026-12-31T23:59");
    expect(fromLocalInput("2026-12-31T23:59")).toBe(iso);
  });

  it("vazio e inválido ficam vazios", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("lixo")).toBe("");
    expect(fromLocalInput("")).toBe("");
    expect(fromLocalInput("lixo")).toBe("");
  });
});

describe("formulário do cupom", () => {
  it("o formulário vazio não passa na validação (nada é inventado)", () => {
    expect(storeCouponSchema.safeParse(couponFormToInput(emptyCouponForm)).success).toBe(false);
  });

  it("ida e volta: cupom → formulário → validação devolve o mesmo cupom", () => {
    const original = coupon({
      kind: "fixed",
      value: 2050,
      minOrderCents: 5000,
      startsAt: new Date(2026, 10, 1, 8, 0).toISOString(),
      expiresAt: new Date(2026, 11, 31, 23, 59).toISOString(),
      maxUses: 100,
      usesCount: 3,
      active: false,
    });
    const form = couponToForm(original);
    expect(form).toMatchObject({
      code: "VERAO10",
      kind: "fixed",
      value: "20,50",
      minOrder: "50,00",
      startsAt: "2026-11-01T08:00",
      expiresAt: "2026-12-31T23:59",
      maxUses: "100",
      usesCount: "3",
      active: false,
    });
    const parsed = storeCouponSchema.safeParse(couponFormToInput(form));
    expect(parsed.success && parsed.data).toEqual({
      code: "VERAO10",
      kind: "fixed",
      value: 2050,
      minOrderCents: 5000,
      startsAt: original.startsAt,
      expiresAt: original.expiresAt,
      maxUses: 100,
      usesCount: 3,
      active: false,
    });
  });

  it("sem mínimo e sem limite, os campos ficam vazios", () => {
    expect(couponToForm(coupon())).toMatchObject({ minOrder: "", maxUses: "", value: "10" });
  });
});

describe("rótulos da lista", () => {
  it("descreve o desconto", () => {
    expect(describeCouponValue(coupon())).toBe("10%");
    expect(plain(describeCouponValue(coupon({ kind: "fixed", value: 2000 })))).toBe("R$ 20,00");
  });

  it("descreve os usos", () => {
    expect(describeCouponUses(coupon({ usesCount: 3, maxUses: 10 }))).toBe("3 de 10");
    expect(describeCouponUses(coupon({ usesCount: 3 }))).toBe("3 (sem limite)");
  });

  it("situação: inativo, expirado, esgotado, agendado ou ativo", () => {
    expect(couponStatus(coupon({ active: false }), NOW)).toBe("Inativo");
    expect(couponStatus(coupon({ expiresAt: "2026-11-01T00:00:00Z" }), NOW)).toBe("Expirado");
    expect(couponStatus(coupon({ maxUses: 5, usesCount: 5 }), NOW)).toBe("Esgotado");
    expect(couponStatus(coupon({ startsAt: "2026-12-01T00:00:00Z" }), NOW)).toBe("Agendado");
    expect(couponStatus(coupon(), NOW)).toBe("Ativo");
    // Inativo vence qualquer outra situação.
    expect(couponStatus(coupon({ active: false, expiresAt: "2026-11-01T00:00:00Z" }), NOW)).toBe("Inativo");
  });
});

describe("formatDateTimeLocal", () => {
  it("mostra dia/mês/ano e hora no fuso do navegador", () => {
    const iso = new Date(2026, 11, 31, 23, 59).toISOString();
    expect(formatDateTimeLocal(iso)).toBe("31/12/2026 23:59");
  });

  it("vazio e inválido ficam vazios", () => {
    expect(formatDateTimeLocal(null)).toBe("");
    expect(formatDateTimeLocal("lixo")).toBe("");
  });
});
