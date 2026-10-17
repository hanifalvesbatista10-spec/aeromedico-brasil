import type { Metadata } from "next";
import { getRepositories } from "@/lib/repositories";
import { EmptyState } from "@/components/empty-state";
import { StoreProductCard } from "@/components/store/product-card";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Loja",
  description:
    "Camisetas, bonés, patches e outros produtos da marca Aeromédico Brasil.",
};

function ProductGrid({ items }: { items: StoreProductDetail[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((detail) => (
        <StoreProductCard key={detail.product.id} detail={detail} />
      ))}
    </div>
  );
}

export default async function LojaPage() {
  const store = getRepositories().store;
  let categories: StoreCategory[] = [];
  let details: StoreProductDetail[] = [];
  try {
    [categories, details] = await Promise.all([
      store.listCategories(),
      store.listProductDetails(),
    ]);
  } catch (error) {
    // Catálogo indisponível (ex.: migration da loja ainda não aplicada): o
    // visitante vê "a loja abre em breve" em vez de uma página de erro.
    console.error("[loja] catálogo indisponível", error);
  }

  // O visitante já só recebe linhas publicadas (RLS), mas um administrador
  // logado recebe tudo: o filtro explícito evita rascunhos na vitrine pública.
  const products = details
    .filter((detail) => detail.product.published)
    .sort((a, b) => a.product.sortOrder - b.product.sortOrder);
  const visibleCategories = categories
    .filter((category) => category.published)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sections = visibleCategories
    .map((category) => ({
      id: category.id,
      title: category.name,
      items: products.filter((d) => d.product.categoryId === category.id),
    }))
    .filter((section) => section.items.length > 0);

  const categorized = new Set(sections.flatMap((s) => s.items.map((d) => d.product.id)));
  const others = products.filter((d) => !categorized.has(d.product.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">Loja</p>
      <h1 className="mt-3 max-w-2xl text-h1 font-heading font-bold text-navy-950">
        Produtos da marca Aeromédico Brasil
      </h1>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="A loja abre em breve"
            description="Os produtos aparecem aqui assim que forem publicados no painel administrativo."
            action={{ label: "Falar com a equipe", href: "/contato" }}
          />
        </div>
      ) : (
        <>
          {sections.map((section) => (
            <section key={section.id} className="mt-12" aria-labelledby={`categoria-${section.id}`}>
              <h2
                id={`categoria-${section.id}`}
                className="text-h2 font-heading font-bold text-navy-950"
              >
                {section.title}
              </h2>
              <ProductGrid items={section.items} />
            </section>
          ))}

          {others.length > 0 && (
            <section className="mt-12" aria-labelledby="outros-produtos">
              {sections.length > 0 ? (
                <h2
                  id="outros-produtos"
                  className="text-h2 font-heading font-bold text-navy-950"
                >
                  Outros produtos
                </h2>
              ) : (
                <h2 id="outros-produtos" className="sr-only">
                  Todos os produtos
                </h2>
              )}
              <ProductGrid items={others} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
