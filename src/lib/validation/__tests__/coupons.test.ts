import { describe, it, expect } from "vitest";
import { storeCouponSchema, type StoreCouponFormInput } from "../coupons";

function form(over: Partial<StoreCouponFormInput> = {}): StoreCouponFormInput {
  return {
    code: "verao10",
    kind: "percent",
    value: "10",
    minOrder: "",
    startsAt: "",
    expiresAt: "",
    maxUses: "",
    usesCount: "",
    active: true,
    ...over,
  };
}

function parse(over: Partial<StoreCouponFormInput> = {}) {
  return storeCouponSchema.safeParse(form(over));
}

function messageOf(over: Partial<StoreCouponFormInput>): string | null {
  const result = parse(over);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

describe("storeCouponSchema", () => {
  it("formulário básico vira o cupom com os padrões", () => {
    const result = parse({ code: "  verao10 " });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      code: "VERAO10",
      kind: "percent",
      value: 10,
      minOrderCents: 0,
      startsAt: null,
      expiresAt: null,
      maxUses: null,
      usesCount: 0,
      active: true,
    });
  });

  it("código: de 3 a 32 letras, números, hífen ou sublinhado", () => {
    const message = "Use de 3 a 32 letras, números, hífen ou sublinhado.";
    expect(messageOf({ code: "ab" })).toBe(message);
    expect(messageOf({ code: "açaí10" })).toBe(message);
    expect(messageOf({ code: "a".repeat(33) })).toBe(message);
    expect(messageOf({ code: "BLACK-FRIDAY_25" })).toBeNull();
    // Espaço no meio some na normalização.
    expect(parse({ code: "verao 10" }).success).toBe(true);
  });

  it("percentual: inteiro de 1 a 100", () => {
    const message = "Informe um percentual entre 1 e 100.";
    for (const value of ["0", "101", "10,5", "abc", "", "-5"]) {
      expect(messageOf({ value })).toBe(message);
    }
    expect(messageOf({ value: "100" })).toBeNull();
    expect(messageOf({ value: "1" })).toBeNull();
  });

  it("valor fixo: reais viram centavos e precisa ser maior que zero", () => {
    const ok = parse({ kind: "fixed", value: "20,50" });
    expect(ok.success && ok.data.value).toBe(2050);
    expect(parse({ kind: "fixed", value: "20" }).success && 2000).toBe(2000);
    expect(messageOf({ kind: "fixed", value: "0" })).toBe(
      "Informe um valor válido, por exemplo 20,00."
    );
    expect(messageOf({ kind: "fixed", value: "abc" })).toBe(
      "Informe um valor válido, por exemplo 20,00."
    );
  });

  it("pedido mínimo: vazio é zero; preenchido vira centavos", () => {
    const ok = parse({ minOrder: "50,00" });
    expect(ok.success && ok.data.minOrderCents).toBe(5000);
    expect(messageOf({ minOrder: "abc" })).toBe("Informe um valor válido, por exemplo 50,00.");
  });

  it("datas: vazias são null, ISO é aceito e texto solto é recusado", () => {
    const ok = parse({
      startsAt: "2026-12-01T03:00:00.000Z",
      expiresAt: "2026-12-31T23:59:00.000Z",
    });
    expect(ok.success && [ok.data.startsAt, ok.data.expiresAt]).toEqual([
      "2026-12-01T03:00:00.000Z",
      "2026-12-31T23:59:00.000Z",
    ]);
    expect(messageOf({ startsAt: "ontem" })).toBe("Data inválida.");
  });

  it("a data final precisa ser depois da inicial", () => {
    const message = "A data final deve ser depois da inicial.";
    expect(
      messageOf({ startsAt: "2026-12-31T00:00:00.000Z", expiresAt: "2026-12-01T00:00:00.000Z" })
    ).toBe(message);
    expect(
      messageOf({ startsAt: "2026-12-01T00:00:00.000Z", expiresAt: "2026-12-01T00:00:00.000Z" })
    ).toBe(message);
  });

  it("limite de usos: vazio é sem limite; inteiro maior que zero", () => {
    const message = "Informe um limite de usos inteiro, maior que zero.";
    expect(messageOf({ maxUses: "0" })).toBe(message);
    expect(messageOf({ maxUses: "1,5" })).toBe(message);
    const ok = parse({ maxUses: "10" });
    expect(ok.success && ok.data.maxUses).toBe(10);
  });

  it("usos já feitos: vazio é zero; inteiro de zero para cima", () => {
    const message = "Informe quantos usos já foram feitos (número inteiro, zero ou mais).";
    expect(messageOf({ usesCount: "-1" })).toBe(message);
    const ok = parse({ usesCount: "3" });
    expect(ok.success && ok.data.usesCount).toBe(3);
  });
});
