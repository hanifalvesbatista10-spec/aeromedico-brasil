"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { slugify } from "@/lib/utils/slugify";
import { reorderBySwap } from "@/lib/store/order";
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
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory, StoreProduct } from "@/lib/types";

// Toda ação confere o administrador ANTES de qualquer outra coisa (defesa em
// profundidade; a garantia real é a RLS) e só então valida a entrada: quem
// não é admin não aprende nada sobre as regras de validação.
//
// Erros ESPERADOS (validação, endereço repetido, falha ao gravar) voltam como
// valor `{ ok: false, error }`: em produção o Next esconde a mensagem de erros
// lançados por Server Actions, e o dono precisa ler "Informe um preço válido".

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface StoreBundleInput {
  /** Presente ao editar; ausente ao criar. */
  id?: string;
  product: StoreProductFormInput;
  variants: StoreVariantFormInput[];
  images: StoreImageFormInput[];
}

/**
 * `detail` é o estado REAL do produto no banco. Vem também quando a gravação
 * falha pela metade, para o painel mostrar o que de fato ficou salvo.
 */
export type StoreBundleResult =
  | { ok: true; detail: StoreProductDetail }
  | { ok: false; error: string; detail: StoreProductDetail | null };

function issueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível salvar agora.";
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

/**
 * Salva produto, variações e fotos numa única chamada. Valida tudo ANTES de
 * gravar qualquer coisa. Produto novo nasce como rascunho e só é publicado
 * depois que variações e fotos foram gravadas: uma falha no meio nunca deixa
 * à venda um produto sem tamanho e cor.
 */
export async function saveStoreProductBundle(
  input: StoreBundleInput
): Promise<StoreBundleResult> {
  await requireAdmin();

  const product = storeProductSchema.safeParse(input.product);
  if (!product.success) {
    return { ok: false, error: issueMessage(product.error), detail: null };
  }
  const variants = storeVariantsSchema.safeParse(input.variants);
  if (!variants.success) {
    return { ok: false, error: issueMessage(variants.error), detail: null };
  }
  const images = storeImagesSchema.safeParse(input.images);
  if (!images.success) {
    return { ok: false, error: issueMessage(images.error), detail: null };
  }

  const repository = getRepositories().store;
  let saved: StoreProduct | null = null;

  try {
    if (input.id) {
      // O endereço (slug) não muda ao editar: links já divulgados continuam valendo.
      saved = await repository.updateProduct(input.id, product.data);
      if (!saved) return { ok: false, error: "Produto não encontrado.", detail: null };
    } else {
      const slug = slugFrom(product.data.name, "o produto");
      const existing = await repository.listProducts();
      saved = await repository.createProduct({
        ...product.data,
        slug,
        published: false,
        hasVariants: false,
        sortOrder: existing.length,
      });
    }

    await repository.saveVariants(saved.id, variants.data);
    await repository.saveImages(saved.id, images.data);

    if (!input.id && product.data.published) {
      saved = (await repository.updateProduct(saved.id, { published: true })) ?? saved;
    }

    revalidateStore();
    const detail = await repository.getProductBySlug(saved.slug);
    return detail
      ? { ok: true, detail }
      : { ok: false, error: "Produto salvo, mas não foi possível recarregá-lo.", detail: null };
  } catch (error) {
    revalidateStore();
    const detail = saved
      ? await repository.getProductBySlug(saved.slug).catch(() => null)
      : null;
    return { ok: false, error: messageOf(error), detail };
  }
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

/** Move o produto uma posição; a regra de ordem está em `reorderBySwap`. */
export async function moveStoreProduct(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  await requireAdmin();
  const repository = getRepositories().store;
  const changes = reorderBySwap(await repository.listProducts(), id, direction);
  if (changes.length === 0) return;

  await Promise.all(
    changes.map((change) =>
      repository.updateProduct(change.id, { sortOrder: change.sortOrder })
    )
  );
  revalidateStore();
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().store.removeProduct(id);
  revalidateStore();
}

export async function saveStoreCategory(
  input: StoreCategoryFormInput & { id?: string }
): Promise<ActionResult<StoreCategory>> {
  await requireAdmin();
  const { id, ...form } = input;
  const parsed = storeCategorySchema.safeParse(form);
  if (!parsed.success) return { ok: false, error: issueMessage(parsed.error) };

  const repository = getRepositories().store;
  try {
    let category: StoreCategory | null;
    if (id) {
      category = await repository.updateCategory(id, parsed.data);
      if (!category) return { ok: false, error: "Categoria não encontrada." };
    } else {
      category = await repository.createCategory({
        ...parsed.data,
        slug: slugFrom(parsed.data.name, "a categoria"),
      });
    }
    revalidateStore();
    return { ok: true, data: category };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

export async function deleteStoreCategory(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().store.removeCategory(id);
  revalidateStore();
}
