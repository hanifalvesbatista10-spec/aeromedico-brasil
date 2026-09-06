import { describe, it, expect } from "vitest";
import { createMockMaterialsRepository } from "../mock/materials";

describe("mock materials repository", () => {
  it("starts empty", async () => {
    const repo = createMockMaterialsRepository();
    expect(await repo.list()).toEqual([]);
  });

  it("creates, updates and removes a material", async () => {
    const repo = createMockMaterialsRepository();
    const created = await repo.create({
      id: "material-1",
      title: "Protocolo de biossegurança",
      description: "PDF com o protocolo padrão da equipe.",
      type: "pdf",
      filePath: "materials/protocolo.pdf",
      externalUrl: null,
      coverUrl: null,
      category: "Protocolos",
      isPublic: false,
      published: false,
      sortOrder: 0,
    });
    expect(created.id).toBe("material-1");

    const updated = await repo.update("material-1", { published: true, isPublic: true });
    expect(updated?.published).toBe(true);
    expect(updated?.isPublic).toBe(true);

    await repo.remove("material-1");
    expect(await repo.list()).toEqual([]);
  });
});
