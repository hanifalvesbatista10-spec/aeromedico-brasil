"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import type { Testimonial } from "@/lib/types";

export interface TestimonialFormInput {
  name: string;
  profession: string;
  photoUrl: string | null;
  programOrEvent: string;
  quote: string;
  authorizedForDisplay: boolean;
}

export async function createTestimonial(
  input: TestimonialFormInput
): Promise<Testimonial> {
  const testimonial = await getRepositories().testimonials.create({
    ...input,
    id: crypto.randomUUID(),
  });
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return testimonial;
}

export async function updateTestimonial(
  id: string,
  input: TestimonialFormInput
): Promise<Testimonial | null> {
  const testimonial = await getRepositories().testimonials.update(id, input);
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return testimonial;
}

export async function deleteTestimonial(id: string): Promise<void> {
  await getRepositories().testimonials.remove(id);
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
}
