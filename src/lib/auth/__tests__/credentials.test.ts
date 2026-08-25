import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyPassword } from "../credentials";

describe("verifyPassword", () => {
  const original = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "senha-teste-123";
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = original;
  });

  it("accepts the correct password", () => {
    expect(verifyPassword("senha-teste-123")).toBe(true);
  });

  it("rejects an incorrect password", () => {
    expect(verifyPassword("errada")).toBe(false);
  });

  it("rejects when ADMIN_PASSWORD is not configured", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(verifyPassword("qualquer")).toBe(false);
  });
});
