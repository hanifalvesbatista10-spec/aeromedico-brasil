"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { assertSafeExternalUrl } from "@/lib/utils/safe-url";
import type { Material, MaterialType } from "@/lib/types";

export interface MaterialFormInput {
  title: string;
  description: string;
  type: MaterialType;
  filePath: string | null;
  externalUrl: string | null;
  coverUrl: string | null;
  category: string;
  isPublic: boolean;
  published: boolean;
}

export async function createMaterial(input: MaterialFormInput): Promise<Material> {
  await requireAdmin();
  assertSafeExternalUrl(input.externalUrl, "Link externo");
  const items = await getRepositories().materials.list();
  const material = await getRepositories().materials.create({
    ...input,
    id: crypto.randomUUID(),
    sortOrder: items.length,
  });
  revalidatePath("/admin/materiais");
  return material;
}

export async function updateMaterial(
  id: string,
  input: MaterialFormInput
): Promise<Material | null> {
  await requireAdmin();
  assertSafeExternalUrl(input.externalUrl, "Link externo");
  const material = await getRepositories().materials.update(id, input);
  revalidatePath("/admin/materiais");
  return material;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  const repo = getRepositories().materials;
  const items = await repo.list();
  const target = items.find((item) => item.id === id);

  await repo.remove(id);

  if (target?.filePath) {
    const stillReferenced = items.some(
      (item) => item.id !== id && item.filePath === target.filePath
    );
    if (!stillReferenced) {
      await supabase.storage.from("materials").remove([target.filePath]);
    }
  }

  revalidatePath("/admin/materiais");
}

export async function toggleMaterialPublished(
  id: string,
  published: boolean
): Promise<Material | null> {
  await requireAdmin();
  const material = await getRepositories().materials.update(id, { published });
  revalidatePath("/admin/materiais");
  return material;
}

export async function moveMaterial(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().materials;
  const items = await repo.list();
  const index = items.findIndex((item) => item.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[neighborIndex];
  await Promise.all([
    repo.update(current.id, { sortOrder: neighbor.sortOrder }),
    repo.update(neighbor.id, { sortOrder: current.sortOrder }),
  ]);
  revalidatePath("/admin/materiais");
}

export async function getMaterialSignedUrl(filePath: string): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(filePath, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
