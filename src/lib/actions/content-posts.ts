"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { slugify } from "@/lib/utils/slugify";
import type { ContentKind, ContentPost } from "@/lib/types";

export interface ContentPostFormInput {
  title: string;
  kind: ContentKind;
  category: string;
  summary: string;
  coverUrl: string | null;
  author: string;
  publishedAt: string;
  externalUrl: string | null;
}

export async function createContentPost(
  input: ContentPostFormInput
): Promise<ContentPost> {
  const post = await getRepositories().contentPosts.create({
    ...input,
    slug: slugify(input.title),
    isDemoContent: false,
  });
  revalidatePath("/admin/conteudos");
  revalidatePath("/conteudos");
  revalidatePath("/");
  return post;
}

export async function updateContentPost(
  slug: string,
  input: ContentPostFormInput
): Promise<ContentPost | null> {
  const post = await getRepositories().contentPosts.update(slug, input);
  revalidatePath("/admin/conteudos");
  revalidatePath("/conteudos");
  revalidatePath("/");
  return post;
}

export async function deleteContentPost(slug: string): Promise<void> {
  await getRepositories().contentPosts.remove(slug);
  revalidatePath("/admin/conteudos");
  revalidatePath("/conteudos");
  revalidatePath("/");
}
