"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { assertSafeExternalUrl } from "@/lib/utils/safe-url";
import type { SpeakingKind, SpeakingTopic } from "@/lib/types";

export interface SpeakingTopicFormInput {
  kind: SpeakingKind;
  title: string;
  description: string;
  themes: string[];
  hireUrl: string | null;
  published: boolean;
}

export async function createSpeakingTopic(
  input: SpeakingTopicFormInput
): Promise<SpeakingTopic> {
  await requireAdmin();
  assertSafeExternalUrl(input.hireUrl, "Link de contratação");
  const items = await getRepositories().speaking.list();
  const topic = await getRepositories().speaking.create({
    ...input,
    id: crypto.randomUUID(),
    sortOrder: items.length,
  });
  revalidatePath("/admin/palestras");
  revalidatePath("/");
  revalidatePath("/palestras");
  return topic;
}

export async function updateSpeakingTopic(
  id: string,
  input: SpeakingTopicFormInput
): Promise<SpeakingTopic | null> {
  await requireAdmin();
  assertSafeExternalUrl(input.hireUrl, "Link de contratação");
  const topic = await getRepositories().speaking.update(id, input);
  revalidatePath("/admin/palestras");
  revalidatePath("/");
  revalidatePath("/palestras");
  return topic;
}

export async function deleteSpeakingTopic(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().speaking.remove(id);
  revalidatePath("/admin/palestras");
  revalidatePath("/");
  revalidatePath("/palestras");
}

export async function toggleSpeakingTopicPublished(
  id: string,
  published: boolean
): Promise<SpeakingTopic | null> {
  await requireAdmin();
  const topic = await getRepositories().speaking.update(id, { published });
  revalidatePath("/admin/palestras");
  revalidatePath("/palestras");
  return topic;
}

export async function moveSpeakingTopic(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const repo = getRepositories().speaking;
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
  revalidatePath("/admin/palestras");
  revalidatePath("/palestras");
}
