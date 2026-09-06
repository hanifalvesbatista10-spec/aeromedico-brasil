"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { Testimonial } from "@/lib/types";

export interface TestimonialFormInput {
  name: string;
  profession: string;
  photoUrl: string | null;
  programOrEvent: string;
  quote: string;
  authorizedForDisplay: boolean;
  published: boolean;
}

export async function createTestimonial(
  input: TestimonialFormInput
): Promise<Testimonial> {
  await requireAdmin();
  const items = await getRepositories().testimonials.list();
  const testimonial = await getRepositories().testimonials.create({
    ...input,
    id: crypto.randomUUID(),
    sortOrder: items.length,
  });
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return testimonial;
}

export async function updateTestimonial(
  id: string,
  input: TestimonialFormInput
): Promise<Testimonial | null> {
  await requireAdmin();
  const testimonial = await getRepositories().testimonials.update(id, input);
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return testimonial;
}

export async function deleteTestimonial(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().testimonials.remove(id);
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}

export async function toggleTestimonialPublished(
  id: string,
  published: boolean
): Promise<Testimonial | null> {
  await requireAdmin();
  const testimonial = await getRepositories().testimonials.update(id, { published });
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return testimonial;
}

export async function moveTestimonial(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().testimonials;
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
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}
