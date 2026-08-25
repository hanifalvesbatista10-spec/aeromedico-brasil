import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signSession, verifySessionToken } from "../session";

describe("session token", () => {
  const original = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "segredo-teste";
  });

  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = original;
  });

  it("verifies a token it signed", () => {
    const token = signSession();
    expect(verifySessionToken(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = signSession();
    expect(verifySessionToken(token + "x")).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(verifySessionToken("")).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession();
    process.env.ADMIN_SESSION_SECRET = "outro-segredo";
    expect(verifySessionToken(token)).toBe(false);
  });
});
