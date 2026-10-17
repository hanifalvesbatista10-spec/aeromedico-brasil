import { describe, it, expect } from "vitest";
import { formatBRL, formatCentsForInput, parseBRLToCents } from "../money";

const nbsp = (value: string) => value.replace(/ /g, " ");

describe("formatBRL", () => {
  it("formata centavos em reais pt-BR", () => {
    expect(nbsp(formatBRL(4990))).toBe("R$ 49,90");
    expect(nbsp(formatBRL(0))).toBe("R$ 0,00");
    expect(nbsp(formatBRL(123456))).toBe("R$ 1.234,56");
  });
});

describe("parseBRLToCents", () => {
  it("aceita vírgula, ponto, prefixo R$ e separador de milhar", () => {
    expect(parseBRLToCents("49,90")).toBe(4990);
    expect(parseBRLToCents("49.90")).toBe(4990);
    expect(parseBRLToCents("R$ 49,90")).toBe(4990);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
  });

  it("aceita valor inteiro", () => {
    expect(parseBRLToCents("50")).toBe(5000);
  });

  it("evita erro de ponto flutuante", () => {
    expect(parseBRLToCents("19,90")).toBe(1990);
    expect(parseBRLToCents("0,29")).toBe(29);
  });

  it("rejeita vazio, lixo, negativo e mais de duas casas decimais", () => {
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("   ")).toBeNull();
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("-5")).toBeNull();
    expect(parseBRLToCents("49,999")).toBeNull();
  });
});

describe("formatCentsForInput", () => {
  it("devolve o valor como o dono digita, sem símbolo nem milhar", () => {
    expect(formatCentsForInput(4990)).toBe("49,90");
    expect(formatCentsForInput(5000)).toBe("50,00");
    expect(formatCentsForInput(5)).toBe("0,05");
    expect(formatCentsForInput(123456)).toBe("1234,56");
  });

  it("volta ao mesmo valor ao passar pelo parser", () => {
    for (const cents of [1, 99, 4990, 123456]) {
      expect(parseBRLToCents(formatCentsForInput(cents))).toBe(cents);
    }
  });
});
