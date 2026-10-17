"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { slugify } from "@/lib/utils/slugify";
import {
  storeCategorySchema,
  storeImagesSchema,
  storeProductSchema,
  storeVariantsSchema,
  type StoreCategoryFormInput,
  type StoreImageFormInput,
  type StoreProductFormInput,
  type StoreVariantFormInput,
} from "@/lib/validation/store";
import type {
  StoreCategory,
  StoreProduct,
  StoreProductImage,
  StoreVariant,
} from "@/lib/types";

// Toda ação confere o administrador ANTES de qualquer outra coisa (defesa em
// profundidade; a garantia real é a RLS) e só então valida a entrada: quem
// não é admin não aprende nada sobre as regras de validação.

function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Dados inválidos.");
  }
  return result.data;
}

function revalidateStore() {
  revalidatePath("/loja");
  revalidatePath("/loja/[slug]", "page");
  revalidatePath("/admin/loja");
}

function slugFrom(name: string, label: string): string {
  const slug = slugify(name);
  if (!slug) throw new Error(`Use letras ou números no nome d${label}.`);
  return slug;
}

export async function saveStoreProduct(
  input: StoreProductFormInput & { id?: string }
): Promise<StoreProduct> {
  await requireAdmin();
  const { id, ...form } = input;
  const data = parseOrThrow(storeProductSchema, form);
  const repository = getRepositories().store;

  let product: StoreProduct | null;
  if (id) {
    // O endereço (slug) não muda ao editar: links já divulgados continuam valendo.
    product = await repository.updateProduct(id, data);
    if (!product) throw new Error("Produto não encontrado.");
  } else {
    const existing = await repository.listProducts();
    product = await repository.createProduct({
      ...data,
      slug: slugFrom(data.name, "o produto"),
      hasVariants: false,
      sortOrder: existing.length,
    });
  }

  revalidateStore();
  return product;
}

export async function toggleStoreProductPublished(
  id: string,
  published: boolean
): Promise<StoreProduct | null> {
  await requireAdmin();
  const product = await getRepositories().store.updateProduct(id, { published });
  revalidateStore();
  return product;
}

/**
 * Troca o produto com o vizinho e renumera a lista inteira de 0 a n-1:
 * exclusões deixam ordens duplicadas ou com buracos, e trocar só dois valores
 * não resolveria. Só grava os produtos cuja ordem de fato mudou.
 */
export async function moveStoreProduct(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  await requireAdmin();
  const repository = getRepositories().store;
  const ordered = [...(await repository.listProducts())].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const index = ordered.findIndex((product) => product.id === id);
  const neighbor = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighbor < 0 || neighbor >= ordered.length) return;

  [ordered[index], ordered[neighbor]] = [ordered[neighbor], ordered[index]];

  await Promise.all(
    ordered.map((product, position) =>
      product.sortOrder === position
        ? null
        : repository.updateProduct(product.id, { sortOrder: position })
    )
  );
  revalidateStore();
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().store.removeProduct(id);
  revalidateStore();
}

export async function saveStoreVariants(
  productId: string,
  input: StoreVariantFormInput[]
): Promise<StoreVariant[]> {
  await requireAdmin();
  // Valida tudo (inclusive duplicidade) ANTES de apagar o conjunto antigo.
  const variants = parseOrThrow(storeVariantsSchema, input);
  const saved = await getRepositories().store.saveVariants(productId, variants);
  revalidateStore();
  return saved;
}

export async function saveStoreImages(
  productId: string,
  input: StoreImageFormInput[]
): Promise<StoreProductImage[]> {
  await requireAdmin();
  const images = parseOrThrow(storeImagesSchema, input);
  const saved = await getRepositories().store.saveImages(productId, images);
  revalidateStore();
  return saved;
}

export async function saveStoreCategory(
  input: StoreCategoryFormInput & { id?: string }
): Promise<StoreCategory> {
  await requireAdmin();
  const { id, ...form } = input;
  const data = parseOrThrow(storeCategorySchema, form);
  const repository = getRepositories().store;

  let category: StoreCategory | null;
  if (id) {
    category = await repository.updateCategory(id, data);
    if (!category) throw new Error("Categoria não encontrada.");
  } else {
    category = await repository.createCategory({
      ...data,
      slug: slugFrom(data.name, "a categoria"),
    });
  }

  revalidateStore();
  return category;
}

export async function deleteStoreCategory(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().store.removeCategory(id);
  revalidateStore();
}
