import type { SpeakingTopic } from "@/lib/types";
import type { SpeakingRepository } from "../types";
import { speakingTopics as seedSpeakingTopics } from "@/data/speaking-topics";

export function createMockSpeakingRepository(): SpeakingRepository {
  let items: SpeakingTopic[] = seedSpeakingTopics.map((item) => ({ ...item }));

  return {
    async list() {
      return items.map((item) => ({ ...item }));
    },
    async create(input) {
      items = [...items, { ...input }];
      return { ...input };
    },
    async update(id, patch) {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated: SpeakingTopic = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
  };
}
