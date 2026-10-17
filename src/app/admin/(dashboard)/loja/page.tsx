import { getRepositories } from "@/lib/repositories";
import { StoreManager } from "@/components/admin/store-manager";

export default async function AdminLojaPage() {
  const store = getRepositories().store;
  const [categories, details] = await Promise.all([
    store.listCategories(),
    store.listProductDetails(),
  ]);

  return <StoreManager initialCategories={categories} initialDetails={details} />;
}
