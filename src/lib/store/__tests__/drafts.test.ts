import { describe, it, expect } from "vitest";
import {
  draftToInput,
  emptyProductForm,
  imageDraftToInput,
  imageToDraft,
  newVariantDraft,
  productFormToInput,
  productToForm,
  variantToDraft,
} from "../drafts";
import {
  storeImageSchema,
  storeProductSchema,
  storeVariantsSchema,
} from "@/lib/validation/store";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

const product: StoreProduct = {
  id: "p1",
  slug: "camiseta",
  categoryId: "c1",
  name: "Camiseta",
  description: "Algodão",
  basePriceCents: 4990,
  weightGrams: 200,
  lengthCm: 30,
  widthCm: 25,
  heightCm: 3,
  hasVariants: true,
  featured: true,
  published: false,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: "Descrição",
};

const variant: StoreVariant = {
  id: "v1",
  productId: "p1",
  sku: null,
  size: "M",
  colorName: "Preta",
  colorHex: "#000000",
  priceCents: 5990,
  weightGrams: null,
  stock: 0,
  published: true,
  sortOrder: 0,
};

describe("produto no formulário", () => {
  it("mostra preço em reais e campos nulos como texto vazio", () => {
    expect(productToForm(product)).toEqual({
      name: "Camiseta",
      description: "Algodão",
      price: "49,90",
      weightGrams: "200",
      lengthCm: "30",
      widthCm: "25",
      heightCm: "3",
      categoryId: "c1",
      featured: true,
      published: false,
      seoTitle: "",
      seoDescription: "Descrição",
    });
  });

  it("o formulário vazio não passa na validação (nada é inventado)", () => {
    expect(storeProductSchema.safeParse(productFormToInput(emptyProductForm)).success).toBe(false);
  });

  it("ida e volta: formulário preenchido valida e volta aos mesmos centavos", () => {
    const result = storeProductSchema.safeParse(productFormToInput(productToForm(product)));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.basePriceCents).toBe(4990);
    expect(result.data.seoTitle).toBeNull();
  });
});

describe("variação no formulário", () => {
  it("preço em reais, estoque zero preservado e nulos como vazio", () => {
    const draft = variantToDraft(variant);
    expect(draft).toMatchObject({
      sku: "",
      size: "M",
      colorName: "Preta",
      colorHex: "#000000",
      price: "59,90",
      weightGrams: "",
      stock: "0",
      published: true,
    });
    expect(draft.key).toBeTruthy();
  });

  it("variação já salva leva o id até a validação; variação nova não leva", () => {
    const saved = draftToInput(variantToDraft(variant), 0);
    expect(saved.id).toBe("v1");
    const parsed = storeVariantsSchema.safeParse([saved]);
    expect(parsed.success && parsed.data[0].id).toBe("v1");

    const fresh = draftToInput(newVariantDraft(), 0);
    expect(fresh.id).toBeUndefined();
  });

  it("ids repetidos na mesma lista são barrados", () => {
    const one = draftToInput(variantToDraft(variant), 0);
    const two = draftToInput(variantToDraft({ ...variant, size: "G" }), 1);
    expect(storeVariantsSchema.safeParse([one, { ...two, id: "v1" }]).success).toBe(false);
  });

  it("estoque e preço nulos viram vazio", () => {
    const draft = variantToDraft({ ...variant, priceCents: null, stock: null });
    expect(draft.price).toBe("");
    expect(draft.stock).toBe("");
  });

  it("draftToInput usa a posição como ordem e passa na validação com os mesmos valores", () => {
    const inputs = [
      draftToInput(variantToDraft(variant), 0),
      draftToInput(
        variantToDraft({ ...variant, id: "v2", size: "G", priceCents: null, stock: null }),
        1
      ),
    ];
    expect(inputs.map((i) => i.sortOrder)).toEqual([0, 1]);

    const result = storeVariantsSchema.safeParse(inputs);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0]).toMatchObject({ priceCents: 5990, stock: 0, weightGrams: null });
    expect(result.data[1]).toMatchObject({ priceCents: null, stock: null });
  });
});

describe("foto no formulário", () => {
  const image: StoreProductImage = {
    id: "i1",
    productId: "p1",
    url: "https://exemplo.supabase.co/storage/v1/object/public/site-media/a.webp",
    alt: "Frente",
    colorName: null,
    sortOrder: 0,
  };

  it("converte e valida de volta", () => {
    const draft = imageToDraft(image);
    expect(draft).toMatchObject({ url: image.url, alt: "Frente", colorName: "" });
    const input = imageDraftToInput(draft, 3);
    expect(input.sortOrder).toBe(3);
    const result = storeImageSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.colorName).toBeNull();
  });
});
