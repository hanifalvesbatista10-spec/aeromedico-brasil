import { getRepositories } from "@/lib/repositories";
import { StoreManager } from "@/components/admin/store-manager";

export default async function AdminLojaPage() {
  const store = getRepositories().store;
  const [categories, products] = await Promise.all([
    store.listCategories(),
    store.listProducts(),
  ]);

  // Catálogos de loja pequena: um carregamento por produto é suficiente e
  // dispensa buscar variações e fotos sob demanda ao abrir a edição.
  const details = (
    await Promise.all(products.map((product) => store.getProductBySlug(product.slug)))
  ).filter((detail) => detail !== null);

  return <StoreManager initialCategories={categories} initialDetails={details} />;
}
