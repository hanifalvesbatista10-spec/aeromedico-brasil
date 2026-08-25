"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import type { SiteSettings } from "@/lib/types";

export async function updateSettings(
  patch: Partial<SiteSettings>
): Promise<SiteSettings> {
  const settings = await getRepositories().settings.update(patch);
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracoes");
  return settings;
}
