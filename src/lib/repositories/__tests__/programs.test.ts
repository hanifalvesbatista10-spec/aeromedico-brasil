import { describe, it, expect } from "vitest";
import { createMockProgramsRepository } from "../mock/programs";

describe("mock programs repository", () => {
  it("lists seeded programs", async () => {
    const repo = createMockProgramsRepository();
    const items = await repo.list();
    expect(items.length).toBeGreaterThan(0);
  });

  it("finds a program by slug", async () => {
    const repo = createMockProgramsRepository();
    const [first] = await repo.list();
    const found = await repo.getBySlug(first.slug);
    expect(found?.slug).toBe(first.slug);
  });

  it("returns null for an unknown slug", async () => {
    const repo = createMockProgramsRepository();
    const found = await repo.getBySlug("slug-inexistente");
    expect(found).toBeNull();
  });

  it("creates, updates and removes a program", async () => {
    const repo = createMockProgramsRepository();
    const created = await repo.create({
      slug: "teste-slug",
      type: "curso",
      title: "Teste",
      category: "Categoria",
      shortDescription: "Descrição",
      fullDescription: null,
      imageUrl: null,
      durationHours: null,
      format: "online",
      status: "em-breve",
      enrollUrl: null,
      ctaLabel: "Inscrever-se",
      featured: false,
      published: false,
      sortOrder: 0,
      seoTitle: null,
      seoDescription: null,
      isDemoContent: true,
    });
    expect(created.slug).toBe("teste-slug");

    const updated = await repo.update("teste-slug", { title: "Atualizado" });
    expect(updated?.title).toBe("Atualizado");

    await repo.remove("teste-slug");
    const afterRemove = await repo.getBySlug("teste-slug");
    expect(afterRemove).toBeNull();
  });

  it("does not leak mutations between repository instances", async () => {
    const repoA = createMockProgramsRepository();
    const repoB = createMockProgramsRepository();
    await repoA.remove((await repoA.list())[0].slug);
    const repoBItems = await repoB.list();
    expect(repoBItems.length).toBeGreaterThan(0);
  });
});
