"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { slugify } from "@/lib/utils/slugify";
import { assertSafeExternalUrl } from "@/lib/utils/safe-url";
import type { ContentKind, ContentPost } from "@/lib/types";

export interface ContentPostFormInput {
  title: string;
  kind: ContentKind;
  category: string;
  summary: string;
  body: string | null;
  coverUrl: string | null;
  author: string;
  publishedAt: string;
  externalUrl: string | null;
  featured: boolean;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

function revalidatePublicPaths() {
  revalidatePath("/conteudos");
  revalidatePath("/");
}

export async function createContentPost(
  input: ContentPostFormInput
): Promise<ContentPost> {
  await requireAdmin();
  assertSafeExternalUrl(input.externalUrl, "Link externo");
  const posts = await getRepositories().contentPosts.list();
  const post = await getRepositories().contentPosts.create({
    ...input,
    slug: slugify(input.title),
    sortOrder: posts.length,
    isDemoContent: false,
  });
  revalidatePath("/admin/conteudos");
  revalidatePublicPaths();
  return post;
}

export async function updateContentPost(
  slug: string,
  input: ContentPostFormInput
): Promise<ContentPost | null> {
  await requireAdmin();
  assertSafeExternalUrl(input.externalUrl, "Link externo");
  const post = await getRepositories().contentPosts.update(slug, input);
  revalidatePath("/admin/conteudos");
  revalidatePath(`/conteudos/${slug}`);
  revalidatePublicPaths();
  return post;
}

export async function deleteContentPost(slug: string): Promise<void> {
  await requireAdmin();
  await getRepositories().contentPosts.remove(slug);
  revalidatePath("/admin/conteudos");
  revalidatePath(`/conteudos/${slug}`);
  revalidatePublicPaths();
}

export async function toggleContentPostPublished(
  slug: string,
  published: boolean
): Promise<ContentPost | null> {
  await requireAdmin();
  const post = await getRepositories().contentPosts.update(slug, { published });
  revalidatePath("/admin/conteudos");
  revalidatePublicPaths();
  return post;
}

export async function moveContentPost(slug: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().contentPosts;
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
  revalidatePath("/admin/conteudos");
  revalidatePublicPaths();
}
