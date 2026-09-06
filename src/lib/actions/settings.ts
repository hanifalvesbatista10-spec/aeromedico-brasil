"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { SiteSettings } from "@/lib/types";

export async function updateSettings(
  patch: Partial<SiteSettings>
): Promise<SiteSettings> {
  await requireAdmin();
  const settings = await getRepositories().settings.update(patch);
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracoes");
  return settings;
}
