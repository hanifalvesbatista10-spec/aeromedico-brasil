import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { VariantPicker } from "@/components/store/variant-picker";
import { publishedVariants } from "@/lib/store/variants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getRepositories()
    .store.getProductBySlug(slug)
    .catch(() => null);
  if (!detail || !detail.product.published) return {};

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
  const repositories = getRepositories();
  const [detail, settings] = await Promise.all([
    // Catálogo indisponível (ex.: migration ainda não aplicada) = 404, não 500.
    repositories.store.getProductBySlug(slug).catch((error: unknown) => {
      console.error("[loja] produto indisponível", error);
      return null;
    }),
    repositories.settings.get(),
  ]);
  // Rascunho nunca aparece, nem para administrador logado.
  if (!detail || !detail.product.published) notFound();

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
