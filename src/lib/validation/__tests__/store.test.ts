import { describe, it, expect } from "vitest";
import {
  storeProductSchema,
  storeVariantSchema,
  storeVariantsSchema,
} from "../store";

const validProduct = {
  name: "Camiseta Aeromédico",
  description: "Algodão",
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

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("storeProductSchema", () => {
  it("converte o preço digitado em centavos e normaliza campos vazios para null", () => {
    const result = storeProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.basePriceCents).toBe(4990);
    expect(result.data.categoryId).toBeNull();
    expect(result.data.seoTitle).toBeNull();
    expect(result.data.seoDescription).toBeNull();
  });

  it("rejeita produto sem nome", () => {
    const result = storeProductSchema.safeParse({ ...validProduct, name: "  " });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Informe o nome do produto.");
  });

  it.each(["abc", "", "0", "-5"])("rejeita o preço %j com mensagem clara", (price) => {
    const result = storeProductSchema.safeParse({ ...validProduct, price });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Informe um preço válido, por exemplo 49,90.");
  });

  it.each([0, -10, 1.5])("rejeita o peso %s", (weightGrams) => {
    const result = storeProductSchema.safeParse({ ...validProduct, weightGrams });
    expect(result.success).toBe(false);
  });

  it("rejeita dimensão zerada", () => {
    expect(storeProductSchema.safeParse({ ...validProduct, heightCm: 0 }).success).toBe(false);
  });
});

describe("storeVariantSchema", () => {
  const validVariant = {
    sku: "",
    size: "M",
    colorName: "Preta",
    colorHex: "#000000",
    price: "",
    weightGrams: "",
    stock: "",
    published: true,
    sortOrder: 0,
  };

  it("estoque vazio vira null (sem limite) e preço/peso vazios herdam do produto", () => {
    const result = storeVariantSchema.safeParse(validVariant);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.stock).toBeNull();
    expect(result.data.priceCents).toBeNull();
    expect(result.data.weightGrams).toBeNull();
    expect(result.data.sku).toBeNull();
  });

  it("aceita estoque zero (esgotado), preço próprio e peso próprio", () => {
    const result = storeVariantSchema.safeParse({
      ...validVariant,
      stock: "0",
      price: "59,90",
      weightGrams: "220",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.stock).toBe(0);
    expect(result.data.priceCents).toBe(5990);
    expect(result.data.weightGrams).toBe(220);
  });

  it("rejeita variação sem tamanho e sem cor", () => {
    const result = storeVariantSchema.safeParse({
      ...validVariant,
      size: "",
      colorName: "",
      colorHex: "",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Informe o tamanho ou a cor da variação.");
  });

  it("rejeita estoque negativo, preço inválido e cor hexadecimal inválida", () => {
    expect(storeVariantSchema.safeParse({ ...validVariant, stock: "-1" }).success).toBe(false);
    expect(storeVariantSchema.safeParse({ ...validVariant, price: "abc" }).success).toBe(false);
    expect(storeVariantSchema.safeParse({ ...validVariant, colorHex: "preto" }).success).toBe(false);
  });
});

describe("storeVariantsSchema", () => {
  const base = {
    sku: "",
    colorHex: "",
    price: "",
    weightGrams: "",
    stock: "",
    published: true,
    sortOrder: 0,
  };

  it("rejeita a mesma combinação de tamanho e cor repetida", () => {
    const result = storeVariantsSchema.safeParse([
      { ...base, size: "M", colorName: "Preta" },
      { ...base, size: "M", colorName: "Preta" },
    ]);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Há variações repetidas (mesmo tamanho e cor).");
  });

  it("aceita lista vazia (produto único) e combinações diferentes", () => {
    expect(storeVariantsSchema.safeParse([]).success).toBe(true);
    expect(
      storeVariantsSchema.safeParse([
        { ...base, size: "M", colorName: "Preta" },
        { ...base, size: "G", colorName: "Preta" },
      ]).success
    ).toBe(true);
  });
});
