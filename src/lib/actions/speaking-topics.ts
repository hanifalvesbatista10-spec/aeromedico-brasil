"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import type { SpeakingKind, SpeakingTopic } from "@/lib/types";

export interface SpeakingTopicFormInput {
  kind: SpeakingKind;
  title: string;
  description: string;
}

export async function createSpeakingTopic(
  input: SpeakingTopicFormInput
): Promise<SpeakingTopic> {
  const topic = await getRepositories().speaking.create({
    ...input,
    id: crypto.randomUUID(),
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
  const topic = await getRepositories().speaking.update(id, input);
  revalidatePath("/admin/palestras");
  revalidatePath("/");
  revalidatePath("/palestras");
  return topic;
}

export async function deleteSpeakingTopic(id: string): Promise<void> {
  await getRepositories().speaking.remove(id);
  revalidatePath("/admin/palestras");
  revalidatePath("/");
  revalidatePath("/palestras");
}
