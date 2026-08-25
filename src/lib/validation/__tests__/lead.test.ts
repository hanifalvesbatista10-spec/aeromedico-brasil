import { describe, it, expect } from "vitest";
import { leadSchema } from "../lead";

const validInput = {
  name: "Maria Souza",
  email: "maria@example.com",
  phone: "11999999999",
  profession: "Enfermeira",
  interest: "Curso de transporte aeromédico",
  message: "Quero saber mais.",
  origin: "formacao" as const,
  consentGiven: true as const,
};

describe("leadSchema", () => {
  it("accepts a valid lead", () => {
    expect(leadSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects without consent", () => {
    const result = leadSchema.safeParse({ ...validInput, consentGiven: false });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = leadSchema.safeParse({ ...validInput, email: "não-é-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a short message", () => {
    const result = leadSchema.safeParse({ ...validInput, message: "Oi" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown origin", () => {
    const result = leadSchema.safeParse({ ...validInput, origin: "outro" });
    expect(result.success).toBe(false);
  });
});
