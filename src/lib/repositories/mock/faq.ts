import type { FAQItem } from "@/lib/types";
import type { FAQRepository } from "../types";
import { faqItems as seedFaqItems } from "@/data/faq";

export function createMockFAQRepository(): FAQRepository {
  let items: FAQItem[] = seedFaqItems.map((item) => ({ ...item }));

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
      const updated: FAQItem = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
  };
}
