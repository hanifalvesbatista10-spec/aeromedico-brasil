"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { slugify } from "@/lib/utils/slugify";
import { assertSafeExternalUrl } from "@/lib/utils/safe-url";
import type { Program, ProgramFormat, ProgramStatus, ProgramType } from "@/lib/types";

export interface ProgramFormInput {
  title: string;
  type: ProgramType;
  category: string;
  shortDescription: string;
  fullDescription: string | null;
  imageUrl: string | null;
  durationHours: number | null;
  format: ProgramFormat;
  status: ProgramStatus;
  enrollUrl: string | null;
  ctaLabel: string;
  featured: boolean;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

function revalidatePublicPaths() {
  revalidatePath("/formacoes");
  revalidatePath("/");
}

export async function createProgram(input: ProgramFormInput): Promise<Program> {
  await requireAdmin();
  assertSafeExternalUrl(input.enrollUrl, "Link de inscrição");
  const programs = await getRepositories().programs.list();
  const program = await getRepositories().programs.create({
    ...input,
    slug: slugify(input.title),
    sortOrder: programs.length,
    isDemoContent: false,
  });
  revalidatePath("/admin/formacoes");
  revalidatePublicPaths();
  return program;
}

export async function updateProgram(
  slug: string,
  input: ProgramFormInput
): Promise<Program | null> {
  await requireAdmin();
  assertSafeExternalUrl(input.enrollUrl, "Link de inscrição");
  const program = await getRepositories().programs.update(slug, input);
  revalidatePath("/admin/formacoes");
  revalidatePath(`/formacoes/${slug}`);
  revalidatePublicPaths();
  return program;
}

export async function deleteProgram(slug: string): Promise<void> {
  await requireAdmin();
  await getRepositories().programs.remove(slug);
  revalidatePath("/admin/formacoes");
  revalidatePath(`/formacoes/${slug}`);
  revalidatePublicPaths();
}

export async function toggleProgramPublished(
  slug: string,
  published: boolean
): Promise<Program | null> {
  await requireAdmin();
  const program = await getRepositories().programs.update(slug, { published });
  revalidatePath("/admin/formacoes");
  revalidatePublicPaths();
  return program;
}

export async function moveProgram(slug: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().programs;
  const items = await repo.list();
  const index = items.findIndex((item) => item.slug === slug);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || neighborIndex < 0 || neighborIndex >= items.length) return;

  const current = items[index];
  const neighbor = items[neighborIndex];
  await Promise.all([
    repo.update(current.slug, { sortOrder: neighbor.sortOrder }),
    repo.update(neighbor.slug, { sortOrder: current.sortOrder }),
  ]);
  revalidatePath("/admin/formacoes");
  revalidatePublicPaths();
}
