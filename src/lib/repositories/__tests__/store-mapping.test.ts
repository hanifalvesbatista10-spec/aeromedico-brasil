import { describe, it, expect } from "vitest";
import {
  mapStoreError,
  storeCategoryToDomain,
  storeImageToDomain,
  storeImageToRow,
  storeProductToDomain,
  storeProductToRow,
  storeProductToRowPatch,
  storeVariantToDomain,
  storeVariantToRow,
} from "../supabase/store-mapping";
import { DUPLICATE_STORE_SLUG_MESSAGE } from "../types";
import type {
  StoreCategoryRow,
  StoreProductImageRow,
  StoreProductRow,
  StoreVariantRow,
} from "@/lib/supabase/types";

const productRow: StoreProductRow = {
  id: "p1",
  slug: "camiseta",
  category_id: null,
  name: "Camiseta",
  description: "Algodão",
  base_price_cents: 4990,
  weight_grams: 200,
  length_cm: 30,
  width_cm: 25,
  height_cm: 3,
  has_variants: true,
  featured: false,
  published: true,
  sort_order: 2,
  seo_title: null,
  seo_description: null,
  created_at: "2026-10-18T00:00:00Z",
  updated_at: "2026-10-18T00:00:00Z",
};

describe("mapeamento de produto", () => {
  it("converte snake_case para camelCase sem perder null", () => {
    expect(storeProductToDomain(productRow)).toEqual({
      id: "p1",
      slug: "camiseta",
      categoryId: null,
      name: "Camiseta",
      description: "Algodão",
      basePriceCents: 4990,
      weightGrams: 200,
      lengthCm: 30,
      widthCm: 25,
      heightCm: 3,
      hasVariants: true,
      featured: false,
      published: true,
      sortOrder: 2,
      seoTitle: null,
      seoDescription: null,
    });
  });

  it("storeProductToRow nunca inclui id e volta para snake_case", () => {
    const domain = storeProductToDomain(productRow);
    const { id: _id, ...input } = domain;
    void _id;
    const row = storeProductToRow(input);
    expect(row).not.toHaveProperty("id");
    expect(row).toMatchObject({
      slug: "camiseta",
      category_id: null,
      base_price_cents: 4990,
      has_variants: true,
      seo_title: null,
    });
  });

  it("storeProductToRowPatch só leva os campos informados", () => {
    expect(storeProductToRowPatch({ name: "Novo", published: false })).toEqual({
      name: "Novo",
      published: false,
    });
    expect(storeProductToRowPatch({})).toEqual({});
  });
});

describe("mapeamento de variação, categoria e imagem", () => {
  it("variação mantém preço, peso e estoque nulos", () => {
    const row: StoreVariantRow = {
      id: "v1",
      product_id: "p1",
      sku: null,
      size: "M",
      color_name: "Preta",
      color_hex: "#000000",
      price_cents: null,
      weight_grams: null,
      stock: null,
      published: true,
      sort_order: 1,
      created_at: "x",
      updated_at: "x",
    };
    const domain = storeVariantToDomain(row);
    expect(domain).toEqual({
      id: "v1",
      productId: "p1",
      sku: null,
      size: "M",
      colorName: "Preta",
      colorHex: "#000000",
      priceCents: null,
      weightGrams: null,
      stock: null,
      published: true,
      sortOrder: 1,
    });
    const { id: _id, productId: _productId, ...input } = domain;
    void _id;
    void _productId;
    expect(storeVariantToRow("p1", input)).toMatchObject({
      product_id: "p1",
      color_name: "Preta",
      price_cents: null,
      stock: null,
    });
  });

  it("categoria e imagem convertem os campos", () => {
    const category: StoreCategoryRow = {
      id: "c1",
      slug: "camisetas",
      name: "Camisetas",
      published: true,
      sort_order: 0,
      created_at: "x",
      updated_at: "x",
    };
    expect(storeCategoryToDomain(category)).toEqual({
      id: "c1",
      slug: "camisetas",
      name: "Camisetas",
      published: true,
      sortOrder: 0,
    });

    const image: StoreProductImageRow = {
      id: "i1",
      product_id: "p1",
      url: "https://x/a.webp",
      alt: "Frente",
      color_name: null,
      sort_order: 0,
      created_at: "x",
    };
    const domain = storeImageToDomain(image);
    expect(domain).toEqual({
      id: "i1",
      productId: "p1",
      url: "https://x/a.webp",
      alt: "Frente",
      colorName: null,
      sortOrder: 0,
    });
    const { id: _id, productId: _productId, ...input } = domain;
    void _id;
    void _productId;
    expect(storeImageToRow("p1", input)).toEqual({
      product_id: "p1",
      url: "https://x/a.webp",
      alt: "Frente",
      color_name: null,
      sort_order: 0,
    });
  });
});

describe("mapStoreError", () => {
  it("violação de unicidade de produto vira a mensagem em português", () => {
    const error = mapStoreError(
      { code: "23505", message: 'duplicate key value violates unique constraint "store_products_slug_key"' },
      "product",
      "Falha ao criar produto"
    );
    expect(error.message).toBe(DUPLICATE_STORE_SLUG_MESSAGE);
  });

  it("violação de unicidade de variação e de categoria têm mensagem própria", () => {
    expect(
      mapStoreError({ code: "23505", message: "dup" }, "variant", "Falha").message
    ).toBe("Já existe uma variação com este tamanho e cor (ou este SKU).");
    expect(
      mapStoreError({ code: "23505", message: "dup" }, "category", "Falha").message
    ).toBe("Já existe uma categoria com este endereço (slug).");
  });

  it("outros erros mantêm o contexto e a mensagem do banco", () => {
    const error = mapStoreError(
      { code: "42501", message: "permission denied" },
      "product",
      "Falha ao criar produto"
    );
    expect(error.message).toBe("Falha ao criar produto: permission denied");
  });
});
