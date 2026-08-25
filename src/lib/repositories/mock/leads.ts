import type { Lead } from "@/lib/types";
import type { LeadsRepository } from "../types";

export function createMockLeadsRepository(): LeadsRepository {
  let items: Lead[] = [];

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
      const updated: Lead = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
  };
}
