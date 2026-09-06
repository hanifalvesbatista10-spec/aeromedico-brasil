import { getRepositories } from "@/lib/repositories";
import { MaterialsManager } from "@/components/admin/materials-manager";

export default async function AdminMateriaisPage() {
  const materials = await getRepositories().materials.list();
  return <MaterialsManager initialMaterials={materials} />;
}
