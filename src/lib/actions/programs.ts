"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { slugify } from "@/lib/utils/slugify";
import type { Program, ProgramFormat, ProgramStatus } from "@/lib/types";

export interface ProgramFormInput {
  title: string;
  category: string;
  shortDescription: string;
  imageUrl: string | null;
  durationHours: number | null;
  format: ProgramFormat;
  status: ProgramStatus;
  enrollUrl: string | null;
  featured: boolean;
}

export async function createProgram(input: ProgramFormInput): Promise<Program> {
  const program = await getRepositories().programs.create({
    ...input,
    slug: slugify(input.title),
    isDemoContent: false,
  });
  revalidatePath("/admin/formacoes");
  revalidatePath("/formacoes");
  revalidatePath("/");
  return program;
}

export async function updateProgram(
  slug: string,
  input: ProgramFormInput
): Promise<Program | null> {
  const program = await getRepositories().programs.update(slug, input);
  revalidatePath("/admin/formacoes");
  revalidatePath("/formacoes");
  revalidatePath("/");
  return program;
}

export async function deleteProgram(slug: string): Promise<void> {
  await getRepositories().programs.remove(slug);
  revalidatePath("/admin/formacoes");
  revalidatePath("/formacoes");
  revalidatePath("/");
}
