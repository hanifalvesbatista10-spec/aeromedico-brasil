import { describe, it, expect } from "vitest";
import { createMockContentRepository } from "../mock/content-posts";

describe("mock content repository", () => {
  it("lists seeded content posts", async () => {
    const repo = createMockContentRepository();
    const items = await repo.list();
    expect(items.length).toBeGreaterThan(0);
  });

  it("finds a post by slug and returns null when missing", async () => {
    const repo = createMockContentRepository();
    const [first] = await repo.list();
    expect((await repo.getBySlug(first.slug))?.slug).toBe(first.slug);
    expect(await repo.getBySlug("inexistente")).toBeNull();
  });

  it("creates, updates and removes a post", async () => {
    const repo = createMockContentRepository();
    await repo.create({
      slug: "post-teste",
      kind: "artigo",
      title: "Teste",
      category: "Categoria",
      summary: "Resumo",
      body: null,
      coverUrl: null,
      author: "Autor",
      publishedAt: "2026-01-01",
      externalUrl: null,
      featured: false,
      published: false,
      sortOrder: 0,
      seoTitle: null,
      seoDescription: null,
      isDemoContent: true,
    });
    const updated = await repo.update("post-teste", { title: "Atualizado" });
    expect(updated?.title).toBe("Atualizado");
    await repo.remove("post-teste");
    expect(await repo.getBySlug("post-teste")).toBeNull();
  });
});
