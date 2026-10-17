import type {
  StoreCategoryRow,
  StoreProductImageRow,
  StoreProductRow,
  StoreVariantRow,
} from "@/lib/supabase/types";
import type {
  StoreCategory,
  StoreProduct,
  StoreProductImage,
  StoreVariant,
} from "@/lib/types";
import { DUPLICATE_STORE_SLUG_MESSAGE } from "../types";

// Mapeamento puro entre linhas do banco (snake_case) e o domínio (camelCase).
// Fica separado do repositório para ser testado sem carregar o cliente do
// servidor (que depende de cookies do Next).

export function storeProductToDomain(row: StoreProductRow): StoreProduct {
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    basePriceCents: row.base_price_cents,
    weightGrams: row.weight_grams,
    lengthCm: row.length_cm,
    widthCm: row.width_cm,
    heightCm: row.height_cm,
    hasVariants: row.has_variants,
    featured: row.featured,
    published: row.published,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

export function storeProductToRow(input: Omit<StoreProduct, "id">) {
  return {
    slug: input.slug,
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    base_price_cents: input.basePriceCents,
    weight_grams: input.weightGrams,
    length_cm: input.lengthCm,
    width_cm: input.widthCm,
    height_cm: input.heightCm,
    has_variants: input.hasVariants,
    featured: input.featured,
    published: input.published,
    sort_order: input.sortOrder,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
  };
}

export function storeProductToRowPatch(patch: Partial<StoreProduct>) {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.basePriceCents !== undefined) row.base_price_cents = patch.basePriceCents;
  if (patch.weightGrams !== undefined) row.weight_grams = patch.weightGrams;
  if (patch.lengthCm !== undefined) row.length_cm = patch.lengthCm;
  if (patch.widthCm !== undefined) row.width_cm = patch.widthCm;
  if (patch.heightCm !== undefined) row.height_cm = patch.heightCm;
  if (patch.hasVariants !== undefined) row.has_variants = patch.hasVariants;
  if (patch.featured !== undefined) row.featured = patch.featured;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
  return row;
}

export function storeVariantToDomain(row: StoreVariantRow): StoreVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    size: row.size,
    colorName: row.color_name,
    colorHex: row.color_hex,
    priceCents: row.price_cents,
    weightGrams: row.weight_grams,
    stock: row.stock,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

export function storeVariantToRow(
  productId: string,
  input: Omit<StoreVariant, "id" | "productId">
) {
  return {
    product_id: productId,
    sku: input.sku,
    size: input.size,
    color_name: input.colorName,
    color_hex: input.colorHex,
    price_cents: input.priceCents,
    weight_grams: input.weightGrams,
    stock: input.stock,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

export function storeCategoryToDomain(row: StoreCategoryRow): StoreCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    published: row.published,
    sortOrder: row.sort_order,
  };
}

export function storeCategoryToRow(input: Omit<StoreCategory, "id">) {
  return {
    slug: input.slug,
    name: input.name,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

export function storeCategoryToRowPatch(patch: Partial<StoreCategory>) {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export function storeImageToDomain(row: StoreProductImageRow): StoreProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    url: row.url,
    alt: row.alt,
    colorName: row.color_name,
    sortOrder: row.sort_order,
  };
}

export function storeImageToRow(
  productId: string,
  input: Omit<StoreProductImage, "id" | "productId">
) {
  return {
    product_id: productId,
    url: input.url,
    alt: input.alt,
    color_name: input.colorName,
    sort_order: input.sortOrder,
  };
}

const UNIQUE_VIOLATION = "23505";

const uniqueMessages = {
  product: DUPLICATE_STORE_SLUG_MESSAGE,
  variant: "Já existe uma variação com este tamanho e cor (ou este SKU).",
  category: "Já existe uma categoria com este endereço (slug).",
} as const;

/**
 * Traduz o erro do Postgres/PostgREST: violação de unicidade (23505) vira
 * uma mensagem em português para o dono; o resto mantém o contexto.
 */
export function mapStoreError(
  error: { code?: string; message: string },
  entity: keyof typeof uniqueMessages,
  context: string
): Error {
  if (error.code === UNIQUE_VIOLATION) return new Error(uniqueMessages[entity]);
  return new Error(`${context}: ${error.message}`);
}
