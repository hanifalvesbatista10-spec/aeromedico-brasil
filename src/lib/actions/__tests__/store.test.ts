import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAdmin = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const removeProduct = vi.fn();
const saveVariants = vi.fn();
const listProducts = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/admin-guard", () => ({
  requireAdmin: () => requireAdmin(),
}));
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({
    store: {
      listProducts: () => listProducts(),
      createProduct,
      updateProduct,
      removeProduct,
      saveVariants,
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import {
  deleteStoreProduct,
  moveStoreProduct,
  saveStoreProduct,
  saveStoreVariants,
  toggleStoreProductPublished,
} from "../store";

const validInput = {
  name: "Camiseta Aeromédico",
  description: "",
  price: "49,90",
  weightGrams: 200,
  lengthCm: 30,
  widthCm: 25,
  heightCm: 3,
  categoryId: "",
  featured: false,
  published: true,
  seoTitle: "",
  seoDescription: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({});
  createProduct.mockImplementation(async (input) => ({ id: "novo", ...input }));
  updateProduct.mockImplementation(async (id, patch) => ({ id, ...patch }));
  saveVariants.mockResolvedValue([]);
  listProducts.mockResolvedValue([{ id: "existente" }]);
});

describe("ações da loja", () => {
  it("sem administrador, nada chega ao repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(saveStoreProduct(validInput)).rejects.toThrow("Sessão administrativa");
    await expect(deleteStoreProduct("x")).rejects.toThrow("Sessão administrativa");
    await expect(saveStoreVariants("p", [])).rejects.toThrow("Sessão administrativa");
    expect(createProduct).not.toHaveBeenCalled();
    expect(removeProduct).not.toHaveBeenCalled();
    expect(saveVariants).not.toHaveBeenCalled();
  });

  it("entrada inválida lança a mensagem clara e não chega ao repositório", async () => {
    await expect(saveStoreProduct({ ...validInput, price: "abc" })).rejects.toThrow(
      "Informe um preço válido, por exemplo 49,90."
    );
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("cria o produto com centavos, slug gerado do nome e ordem ao final", async () => {
    await saveStoreProduct(validInput);
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(createProduct.mock.calls[0][0]).toMatchObject({
      name: "Camiseta Aeromédico",
      slug: "camiseta-aeromedico",
      basePriceCents: 4990,
      categoryId: null,
      hasVariants: false,
      sortOrder: 1,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/loja");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/loja");
  });

  it("com id existente, atualiza sem trocar o slug", async () => {
    await saveStoreProduct({ ...validInput, id: "abc" });
    expect(createProduct).not.toHaveBeenCalled();
    expect(updateProduct).toHaveBeenCalledTimes(1);
    const [id, patch] = updateProduct.mock.calls[0];
    expect(id).toBe("abc");
    expect(patch).not.toHaveProperty("slug");
    expect(patch).not.toHaveProperty("hasVariants");
  });

  it("nome sem letras nem números não gera slug vazio", async () => {
    await expect(saveStoreProduct({ ...validInput, name: "!!!" })).rejects.toThrow(
      "Use letras ou números no nome do produto."
    );
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("variação repetida é barrada antes de apagar o conjunto antigo", async () => {
    const base = { sku: "", colorHex: "", price: "", weightGrams: "", stock: "", published: true, sortOrder: 0 };
    await expect(
      saveStoreVariants("p", [
        { ...base, size: "M", colorName: "Preta" },
        { ...base, size: "M", colorName: "Preta" },
      ])
    ).rejects.toThrow("Há variações repetidas");
    expect(saveVariants).not.toHaveBeenCalled();
  });

  it("publica e despublica um produto", async () => {
    await toggleStoreProductPublished("abc", false);
    expect(updateProduct).toHaveBeenCalledWith("abc", { published: false });
    expect(revalidatePath).toHaveBeenCalledWith("/loja");
  });

  it("sem administrador, publicar e reordenar não chegam ao repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(toggleStoreProductPublished("abc", true)).rejects.toThrow("Sessão administrativa");
    await expect(moveStoreProduct("abc", "down")).rejects.toThrow("Sessão administrativa");
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("reordena trocando com o vizinho, renumera de 0 a n-1 e grava só o que mudou", async () => {
    listProducts.mockResolvedValue([
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 2 },
      { id: "c", sortOrder: 2 },
    ]);
    await moveStoreProduct("a", "down");
    const updates = Object.fromEntries(
      updateProduct.mock.calls.map(([id, patch]) => [id, patch.sortOrder])
    );
    expect(updates).toEqual({ b: 0, a: 1 });
  });

  it("não faz nada ao mover o primeiro para cima ou o último para baixo", async () => {
    listProducts.mockResolvedValue([
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
    ]);
    await moveStoreProduct("a", "up");
    await moveStoreProduct("b", "down");
    expect(updateProduct).not.toHaveBeenCalled();
  });
});
