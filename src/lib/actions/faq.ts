"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { FAQItem } from "@/lib/types";

export interface FAQItemFormInput {
  question: string;
  answer: string;
  published: boolean;
}

export async function createFAQItem(input: FAQItemFormInput): Promise<FAQItem> {
  await requireAdmin();
  const items = await getRepositories().faq.list();
  const item = await getRepositories().faq.create({
    ...input,
    id: crypto.randomUUID(),
    sortOrder: items.length,
  });
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return item;
}

export async function updateFAQItem(
  id: string,
  input: FAQItemFormInput
): Promise<FAQItem | null> {
  await requireAdmin();
  const item = await getRepositories().faq.update(id, input);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return item;
}

export async function deleteFAQItem(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().faq.remove(id);
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
}

export async function toggleFAQItemPublished(
  id: string,
  published: boolean
): Promise<FAQItem | null> {
  await requireAdmin();
  const item = await getRepositories().faq.update(id, { published });
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return item;
}

export async function moveFAQItem(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().faq;
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
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
}
