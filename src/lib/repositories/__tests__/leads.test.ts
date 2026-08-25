import { describe, it, expect } from "vitest";
import { createMockLeadsRepository } from "../mock/leads";

describe("mock leads repository", () => {
  it("starts empty", async () => {
    const repo = createMockLeadsRepository();
    expect(await repo.list()).toEqual([]);
  });

  it("creates, updates status and removes a lead", async () => {
    const repo = createMockLeadsRepository();
    const created = await repo.create({
      id: "lead-1",
      name: "Maria Souza",
      email: "maria@example.com",
      phone: "11999999999",
      profession: "Enfermeira",
      interest: "Curso de transporte aeromédico",
      message: "Quero saber mais.",
      origin: "formacao",
      consentGiven: true,
      createdAt: "2026-08-25T00:00:00.000Z",
      status: "novo",
      notes: null,
    });
    expect(created.status).toBe("novo");

    const updated = await repo.update("lead-1", { status: "em-contato" });
    expect(updated?.status).toBe("em-contato");

    await repo.remove("lead-1");
    expect(await repo.list()).toEqual([]);
  });
});
