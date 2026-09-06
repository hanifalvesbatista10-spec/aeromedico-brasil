"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { Lead, LeadStatus } from "@/lib/types";

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<Lead | null> {
  await requireAdmin();
  const lead = await getRepositories().leads.update(id, { status });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  revalidatePath("/admin/palestras");
  return lead;
}

export async function updateLeadNotes(id: string, notes: string): Promise<Lead | null> {
  await requireAdmin();
  const lead = await getRepositories().leads.update(id, {
    notes: notes.trim() ? notes : null,
  });
  revalidatePath("/admin/leads");
  return lead;
}

export async function deleteLead(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().leads.remove(id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  revalidatePath("/admin/palestras");
}
