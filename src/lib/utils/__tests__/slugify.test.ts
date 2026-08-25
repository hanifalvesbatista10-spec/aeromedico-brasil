import { describe, it, expect } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
  it("converts accented titles to a plain slug", () => {
    expect(slugify("Curso de Transporte Aeromédico")).toBe(
      "curso-de-transporte-aeromedico"
    );
  });

  it("collapses multiple spaces and punctuation", () => {
    expect(slugify("APH & Emergência!  Básico")).toBe("aph-emergencia-basico");
  });
});
