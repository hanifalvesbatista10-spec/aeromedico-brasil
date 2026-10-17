import { formatCentsForInput } from "@/lib/money";
import type {
  StoreImageFormInput,
  StoreProductFormInput,
  StoreVariantFormInput,
} from "@/lib/validation/store";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

// Estado dos formulários do painel da loja. Todo campo digitável é texto
// (como o dono digita: "49,90", "200"); a validação e a conversão para
// centavos/inteiros acontecem nas Server Actions (src/lib/validation/store.ts).

export interface ProductForm {
  name: string;
  description: string;
  price: string;
  weightGrams: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  /** "" = sem categoria. */
  categoryId: string;
  featured: boolean;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
}

export const emptyProductForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  weightGrams: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  categoryId: "",
  featured: false,
  published: false,
  seoTitle: "",
  seoDescription: "",
};

export function productToForm(product: StoreProduct): ProductForm {
  return {
    name: product.name,
    description: product.description,
    price: formatCentsForInput(product.basePriceCents),
    weightGrams: String(product.weightGrams),
    lengthCm: String(product.lengthCm),
    widthCm: String(product.widthCm),
    heightCm: String(product.heightCm),
    categoryId: product.categoryId ?? "",
    featured: product.featured,
    published: product.published,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
  };
}

export function productFormToInput(form: ProductForm): StoreProductFormInput {
  return { ...form };
}

export interface VariantDraft {
  /** Chave só para o React; não vai para o banco. */
  key: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  price: string;
  weightGrams: string;
  stock: string;
  published: boolean;
}

export function newVariantDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    sku: "",
    size: "",
    colorName: "",
    colorHex: "",
    price: "",
    weightGrams: "",
    stock: "",
    published: true,
  };
}

export function variantToDraft(variant: StoreVariant): VariantDraft {
  return {
    key: variant.id,
    sku: variant.sku ?? "",
    size: variant.size ?? "",
    colorName: variant.colorName ?? "",
    colorHex: variant.colorHex ?? "",
    price: variant.priceCents === null ? "" : formatCentsForInput(variant.priceCents),
    weightGrams: variant.weightGrams === null ? "" : String(variant.weightGrams),
    stock: variant.stock === null ? "" : String(variant.stock),
    published: variant.published,
  };
}

/** A posição na lista vira a ordem de exibição. */
export function draftToInput(
  draft: VariantDraft,
  sortOrder: number
): StoreVariantFormInput {
  const { key: _key, ...fields } = draft;
  void _key;
  return { ...fields, sortOrder };
}

export interface ImageDraft {
  key: string;
  url: string;
  alt: string;
  /** "" = foto geral do produto. */
  colorName: string;
}

export function newImageDraft(url: string): ImageDraft {
  return { key: crypto.randomUUID(), url, alt: "", colorName: "" };
}

export function imageToDraft(image: StoreProductImage): ImageDraft {
  return {
    key: image.id,
    url: image.url,
    alt: image.alt,
    colorName: image.colorName ?? "",
  };
}

export function imageDraftToInput(
  draft: ImageDraft,
  sortOrder: number
): StoreImageFormInput {
  const { key: _key, ...fields } = draft;
  void _key;
  return { ...fields, sortOrder };
}
