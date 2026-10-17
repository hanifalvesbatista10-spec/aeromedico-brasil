import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { VariantPicker } from "@/components/store/variant-picker";
import { isStoreProductVisible } from "@/lib/store/visibility";
import { publishedVariants } from "@/lib/store/variants";
import type { StoreProductDetail } from "@/lib/repositories/types";

/**
 * Produto visível ao público (publicado e em categoria publicada) ou `null`.
 * Rascunho nunca aparece, nem para administrador logado. Catálogo
 * indisponível (ex.: migration ainda não aplicada) vira 404, não 500.
 */
async function loadVisibleProduct(slug: string): Promise<StoreProductDetail | null> {
  const store = getRepositories().store;
  try {
    const [detail, categories] = await Promise.all([
      store.getProductBySlug(slug),
      store.listCategories(),
    ]);
    if (!detail || !isStoreProductVisible(detail.product, categories)) return null;
    return detail;
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[loja] produto indisponível", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await loadVisibleProduct(slug);
  if (!detail) return {};

  return {
    title: detail.product.seoTitle ?? detail.product.name,
    description:
      detail.product.seoDescription ??
      (detail.product.description.slice(0, 160) || undefined),
  };
}

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detail, settings] = await Promise.all([
    loadVisibleProduct(slug),
    getRepositories().settings.get(),
  ]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20 lg:px-8">
      <Link
        href="/loja"
        className="text-sm font-medium text-navy-700 hover:underline focus-visible:underline"
      >
        ← Voltar para a loja
      </Link>
      <div className="mt-6">
        <VariantPicker
          product={detail.product}
          variants={publishedVariants(detail.variants)}
          images={detail.images}
          whatsappUrl={settings.whatsappUrl}
        />
      </div>
    </div>
  );
}
