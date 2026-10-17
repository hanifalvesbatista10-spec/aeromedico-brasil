import { describe, it, expect } from "vitest";
import { createMockStoreRepository } from "../mock/store";
import type { StoreProduct, StoreVariant } from "@/lib/types";

const DUPLICATE_SLUG_MESSAGE = "Já existe um produto com este endereço (slug).";

function newProduct(over: Partial<Omit<StoreProduct, "id">> = {}): Omit<StoreProduct, "id"> {
  return {
    slug: "camiseta-teste",
    categoryId: null,
    name: "Camiseta de teste",
    description: "",
    basePriceCents: 4990,
    weightGrams: 200,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 3,
    hasVariants: false,
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    ...over,
  };
}

function newVariant(
  over: Partial<Omit<StoreVariant, "id" | "productId">> = {}
): Omit<StoreVariant, "id" | "productId"> {
  return {
    sku: null,
    size: "M",
    colorName: "Preta",
    colorHex: "#000000",
    priceCents: null,
    weightGrams: null,
    stock: null,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

describe("mock store repository", () => {
  it("começa vazio: o catálogo é cadastrado pelo dono", async () => {
    const repo = createMockStoreRepository();
    expect(await repo.listCategories()).toEqual([]);
    expect(await repo.listProducts()).toEqual([]);
  });

  it("cria um produto e o devolve por slug, sem variações nem imagens", async () => {
    const repo = createMockStoreRepository();
    const created = await repo.createProduct(newProduct());
    expect(created.id).toBeTruthy();

    const found = await repo.getProductBySlug("camiseta-teste");
    expect(found?.product.id).toBe(created.id);
    expect(found?.variants).toEqual([]);
    expect(found?.images).toEqual([]);
  });

  it("devolve null para slug inexistente", async () => {
    const repo = createMockStoreRepository();
    expect(await repo.getProductBySlug("nao-existe")).toBeNull();
  });

  it("rejeita slug duplicado com mensagem em português", async () => {
    const repo = createMockStoreRepository();
    await repo.createProduct(newProduct());
    await expect(repo.createProduct(newProduct())).rejects.toThrow(
      DUPLICATE_SLUG_MESSAGE
    );
  });

  it("rejeita trocar o slug para um já usado por outro produto", async () => {
    const repo = createMockStoreRepository();
    await repo.createProduct(newProduct({ slug: "a" }));
    const b = await repo.createProduct(newProduct({ slug: "b" }));
    await expect(repo.updateProduct(b.id, { slug: "a" })).rejects.toThrow(
      DUPLICATE_SLUG_MESSAGE
    );
  });

  it("atualiza um produto e devolve null para id desconhecido", async () => {
    const repo = createMockStoreRepository();
    const created = await repo.createProduct(newProduct());
    const updated = await repo.updateProduct(created.id, { name: "Novo nome" });
    expect(updated?.name).toBe("Novo nome");
    expect(await repo.updateProduct("id-inexistente", { name: "x" })).toBeNull();
  });

  it("saveVariants substitui o conjunto anterior e mantém hasVariants coerente", async () => {
    const repo = createMockStoreRepository();
    const product = await repo.createProduct(newProduct());

    await repo.saveVariants(product.id, [
      newVariant({ size: "P" }),
      newVariant({ size: "M" }),
    ]);
    let found = await repo.getProductBySlug("camiseta-teste");
    expect(found?.variants.map((v) => v.size)).toEqual(["P", "M"]);
    expect(found?.product.hasVariants).toBe(true);

    await repo.saveVariants(product.id, [newVariant({ size: "G" })]);
    found = await repo.getProductBySlug("camiseta-teste");
    expect(found?.variants.map((v) => v.size)).toEqual(["G"]);
    expect(found?.variants.every((v) => v.productId === product.id)).toBe(true);

    await repo.saveVariants(product.id, []);
    found = await repo.getProductBySlug("camiseta-teste");
    expect(found?.variants).toEqual([]);
    expect(found?.product.hasVariants).toBe(false);
  });

  it("saveImages substitui o conjunto anterior", async () => {
    const repo = createMockStoreRepository();
    const product = await repo.createProduct(newProduct());
    await repo.saveImages(product.id, [
      { url: "https://x/a.webp", alt: "A", colorName: null, sortOrder: 0 },
    ]);
    await repo.saveImages(product.id, [
      { url: "https://x/b.webp", alt: "B", colorName: "Preta", sortOrder: 0 },
    ]);
    const found = await repo.getProductBySlug("camiseta-teste");
    expect(found?.images.map((i) => i.url)).toEqual(["https://x/b.webp"]);
  });

  it("remove o produto junto com variações e imagens", async () => {
    const repo = createMockStoreRepository();
    const product = await repo.createProduct(newProduct());
    await repo.saveVariants(product.id, [newVariant()]);
    await repo.saveImages(product.id, [
      { url: "https://x/a.webp", alt: "A", colorName: null, sortOrder: 0 },
    ]);

    await repo.removeProduct(product.id);

    expect(await repo.getProductBySlug("camiseta-teste")).toBeNull();
    expect(await repo.listProducts()).toEqual([]);
    // Recriar com o mesmo slug não ressuscita variações nem imagens antigas.
    await repo.createProduct(newProduct());
    const again = await repo.getProductBySlug("camiseta-teste");
    expect(again?.variants).toEqual([]);
    expect(again?.images).toEqual([]);
  });

  it("gerencia categorias", async () => {
    const repo = createMockStoreRepository();
    const category = await repo.createCategory({
      slug: "camisetas",
      name: "Camisetas",
      published: true,
      sortOrder: 0,
    });
    expect((await repo.listCategories()).map((c) => c.slug)).toEqual(["camisetas"]);

    const updated = await repo.updateCategory(category.id, { name: "Camisetas Aeromédico" });
    expect(updated?.name).toBe("Camisetas Aeromédico");

    await repo.removeCategory(category.id);
    expect(await repo.listCategories()).toEqual([]);
  });

  it("não vaza mutação entre instâncias nem pelos objetos devolvidos", async () => {
    const a = createMockStoreRepository();
    const b = createMockStoreRepository();
    const created = await a.createProduct(newProduct());
    created.name = "alterado fora do repositório";

    expect((await a.listProducts())[0].name).toBe("Camiseta de teste");
    expect(await b.listProducts()).toEqual([]);
  });

  it("listProductDetails devolve cada produto com suas variações e fotos, na ordem de exibição", async () => {
    const repo = createMockStoreRepository();
    const b = await repo.createProduct(newProduct({ slug: "b", name: "B", sortOrder: 1 }));
    const a = await repo.createProduct(newProduct({ slug: "a", name: "A", sortOrder: 0 }));
    await repo.saveVariants(a.id, [newVariant({ size: "P" }), newVariant({ size: "M" })]);
    await repo.saveImages(b.id, [
      { url: "https://x/b.webp", alt: "B", colorName: null, sortOrder: 0 },
    ]);

    const details = await repo.listProductDetails();

    expect(details.map((d) => d.product.slug)).toEqual(["a", "b"]);
    expect(details[0].variants.map((v) => v.size)).toEqual(["P", "M"]);
    expect(details[0].images).toEqual([]);
    expect(details[1].variants).toEqual([]);
    expect(details[1].images.map((i) => i.url)).toEqual(["https://x/b.webp"]);
  });

  it("listProductDetails devolve lista vazia quando não há produtos", async () => {
    expect(await createMockStoreRepository().listProductDetails()).toEqual([]);
  });
});
