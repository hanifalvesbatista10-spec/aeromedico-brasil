import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAdmin = vi.fn();
const listProducts = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const removeProduct = vi.fn();
const saveVariants = vi.fn();
const saveImages = vi.fn();
const getProductBySlug = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();
const removeCategory = vi.fn();
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
      saveImages,
      getProductBySlug,
      createCategory,
      updateCategory,
      removeCategory,
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import {
  deleteStoreProduct,
  moveStoreProduct,
  saveStoreCategory,
  saveStoreProductBundle,
  toggleStoreProductPublished,
} from "../store";

const productForm = {
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

const variantForm = (size: string) => ({
  sku: "",
  size,
  colorName: "Preta",
  colorHex: "",
  price: "",
  weightGrams: "",
  stock: "",
  published: true,
  sortOrder: 0,
});

const imageForm = {
  url: "https://exemplo.supabase.co/storage/v1/object/public/site-media/a.webp",
  alt: "",
  colorName: "",
  sortOrder: 0,
};

const bundle = {
  product: productForm,
  variants: [variantForm("P")],
  images: [imageForm],
};

const currentDetail = {
  product: { id: "novo", slug: "camiseta-aeromedico" },
  variants: [],
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({});
  listProducts.mockResolvedValue([{ id: "existente", sortOrder: 0 }]);
  createProduct.mockImplementation(async (input) => ({ id: "novo", ...input }));
  updateProduct.mockImplementation(async (id, patch) => ({
    id,
    slug: "camiseta-aeromedico",
    ...patch,
  }));
  saveVariants.mockResolvedValue([]);
  saveImages.mockResolvedValue([]);
  getProductBySlug.mockResolvedValue(currentDetail);
  createCategory.mockImplementation(async (input) => ({ id: "c1", ...input }));
  updateCategory.mockImplementation(async (id, patch) => ({ id, ...patch }));
});

describe("saveStoreProductBundle", () => {
  it("sem administrador, nada chega ao repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(saveStoreProductBundle(bundle)).rejects.toThrow("Sessão administrativa");
    expect(createProduct).not.toHaveBeenCalled();
    expect(saveVariants).not.toHaveBeenCalled();
  });

  it("entrada inválida devolve a mensagem como valor e não grava nada", async () => {
    const result = await saveStoreProductBundle({
      ...bundle,
      product: { ...productForm, price: "abc" },
    });
    expect(result).toEqual({
      ok: false,
      error: "Informe um preço válido, por exemplo 49,90.",
      detail: null,
    });
    expect(createProduct).not.toHaveBeenCalled();
    expect(saveVariants).not.toHaveBeenCalled();
  });

  it("variação repetida e foto inválida também são barradas antes de qualquer gravação", async () => {
    const duplicated = await saveStoreProductBundle({
      ...bundle,
      variants: [variantForm("P"), variantForm("P")],
    });
    expect(duplicated).toMatchObject({ ok: false, error: "Há variações repetidas (mesmo tamanho e cor)." });

    const badImage = await saveStoreProductBundle({
      ...bundle,
      images: [{ ...imageForm, url: "javascript:alert(1)" }],
    });
    expect(badImage).toMatchObject({ ok: false, error: "Endereço da foto inválido." });

    expect(createProduct).not.toHaveBeenCalled();
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("nome sem letras nem números não gera slug vazio", async () => {
    const result = await saveStoreProductBundle({
      ...bundle,
      product: { ...productForm, name: "!!!" },
    });
    expect(result).toMatchObject({
      ok: false,
      error: "Use letras ou números no nome do produto.",
    });
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("produto novo nasce como rascunho, grava variações e fotos e só então publica", async () => {
    const result = await saveStoreProductBundle(bundle);

    expect(result).toEqual({ ok: true, detail: currentDetail });
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(createProduct.mock.calls[0][0]).toMatchObject({
      name: "Camiseta Aeromédico",
      slug: "camiseta-aeromedico",
      basePriceCents: 4990,
      categoryId: null,
      hasVariants: false,
      published: false,
      sortOrder: 1,
    });
    expect(updateProduct).toHaveBeenCalledWith("novo", { published: true });

    const order = (mock: ReturnType<typeof vi.fn>) => mock.mock.invocationCallOrder[0];
    expect(order(createProduct)).toBeLessThan(order(saveVariants));
    expect(order(saveVariants)).toBeLessThan(order(saveImages));
    expect(order(saveImages)).toBeLessThan(order(updateProduct));
    expect(revalidatePath).toHaveBeenCalledWith("/loja");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/loja");
  });

  it("produto novo marcado como rascunho não é publicado depois", async () => {
    await saveStoreProductBundle({
      ...bundle,
      product: { ...productForm, published: false },
    });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("com id existente atualiza o mesmo produto, sem trocar o slug nem criar outro", async () => {
    const result = await saveStoreProductBundle({ ...bundle, id: "abc" });

    expect(result.ok).toBe(true);
    expect(createProduct).not.toHaveBeenCalled();
    expect(updateProduct).toHaveBeenCalledTimes(1);
    const [id, patch] = updateProduct.mock.calls[0];
    expect(id).toBe("abc");
    expect(patch).toMatchObject({ basePriceCents: 4990, published: true });
    expect(patch).not.toHaveProperty("slug");
    expect(patch).not.toHaveProperty("hasVariants");
    expect(saveVariants).toHaveBeenCalledWith("abc", expect.any(Array));
    expect(saveImages).toHaveBeenCalledWith("abc", expect.any(Array));
  });

  it("falha ao gravar variações: devolve o erro e o estado real, e o produto novo continua rascunho", async () => {
    saveVariants.mockRejectedValue(new Error("Falha ao salvar variações: timeout"));

    const result = await saveStoreProductBundle(bundle);

    expect(result).toEqual({
      ok: false,
      error: "Falha ao salvar variações: timeout",
      detail: currentDetail,
    });
    expect(updateProduct).not.toHaveBeenCalled();
    expect(saveImages).not.toHaveBeenCalled();
  });

  it("slug repetido ao criar volta como mensagem clara, sem lançar", async () => {
    createProduct.mockRejectedValue(
      new Error("Já existe um produto com este endereço (slug).")
    );
    const result = await saveStoreProductBundle(bundle);
    expect(result).toEqual({
      ok: false,
      error: "Já existe um produto com este endereço (slug).",
      detail: null,
    });
  });

  it("produto inexistente ao editar devolve mensagem", async () => {
    updateProduct.mockResolvedValue(null);
    const result = await saveStoreProductBundle({ ...bundle, id: "sumiu" });
    expect(result).toEqual({ ok: false, error: "Produto não encontrado.", detail: null });
    expect(saveVariants).not.toHaveBeenCalled();
  });
});

describe("saveStoreCategory", () => {
  it("sem administrador, nada chega ao repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(saveStoreCategory({ name: "Bonés", published: true })).rejects.toThrow(
      "Sessão administrativa"
    );
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("nome vazio volta como mensagem e não grava", async () => {
    const result = await saveStoreCategory({ name: "  ", published: true });
    expect(result).toEqual({ ok: false, error: "Informe o nome da categoria." });
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("cria com slug gerado do nome e devolve a categoria", async () => {
    const result = await saveStoreCategory({ name: "Bonés", published: true, sortOrder: 2 });
    expect(result.ok).toBe(true);
    expect(createCategory.mock.calls[0][0]).toMatchObject({ name: "Bonés", slug: "bones", sortOrder: 2 });
  });

  it("com id atualiza sem trocar o slug", async () => {
    await saveStoreCategory({ id: "c1", name: "Bonés novos", published: false });
    const [id, patch] = updateCategory.mock.calls[0];
    expect(id).toBe("c1");
    expect(patch).not.toHaveProperty("slug");
  });

  it("slug repetido volta como mensagem clara", async () => {
    createCategory.mockRejectedValue(new Error("Já existe uma categoria com este endereço (slug)."));
    const result = await saveStoreCategory({ name: "Bonés", published: true });
    expect(result).toEqual({
      ok: false,
      error: "Já existe uma categoria com este endereço (slug).",
    });
  });
});

describe("demais ações da loja", () => {
  it("sem administrador, excluir, publicar e reordenar não chegam ao repositório", async () => {
    requireAdmin.mockRejectedValue(new Error("Sessão administrativa não encontrada."));
    await expect(deleteStoreProduct("x")).rejects.toThrow("Sessão administrativa");
    await expect(toggleStoreProductPublished("abc", true)).rejects.toThrow("Sessão administrativa");
    await expect(moveStoreProduct("abc", "down")).rejects.toThrow("Sessão administrativa");
    expect(removeProduct).not.toHaveBeenCalled();
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("publica e despublica um produto", async () => {
    await toggleStoreProductPublished("abc", false);
    expect(updateProduct).toHaveBeenCalledWith("abc", { published: false });
    expect(revalidatePath).toHaveBeenCalledWith("/loja");
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
