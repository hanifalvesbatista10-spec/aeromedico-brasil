import { describe, it, expect } from "vitest";
import { formatCep, normalizeCep } from "../cep";

describe("normalizeCep", () => {
  it("aceita o CEP escrito de qualquer jeito e devolve só os 8 dígitos", () => {
    expect(normalizeCep("01018-020")).toBe("01018020");
    expect(normalizeCep(" 01018020 ")).toBe("01018020");
    expect(normalizeCep("01.018-020")).toBe("01018020");
  });

  it("recusa o que não tem exatamente 8 dígitos", () => {
    for (const input of ["0101", "010180201", "abcdefgh", "", "   ", "0101802a"]) {
      expect(normalizeCep(input)).toBeNull();
    }
  });
});

describe("formatCep", () => {
  it("põe o hífen", () => {
    expect(formatCep("01018020")).toBe("01018-020");
  });
});
