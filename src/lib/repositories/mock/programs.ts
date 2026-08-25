import type { Program } from "@/lib/types";
import type { ProgramsRepository } from "../types";
import { programs as seedPrograms } from "@/data/programs";

export function createMockProgramsRepository(): ProgramsRepository {
  let items: Program[] = seedPrograms.map((program) => ({ ...program }));

  return {
    async list() {
      return items.map((item) => ({ ...item }));
    },
    async getBySlug(slug) {
      const found = items.find((item) => item.slug === slug);
      return found ? { ...found } : null;
    },
    async create(input) {
      items = [...items, { ...input }];
      return { ...input };
    },
    async update(slug, patch) {
      const index = items.findIndex((item) => item.slug === slug);
      if (index === -1) return null;
      const updated: Program = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(slug) {
      items = items.filter((item) => item.slug !== slug);
    },
  };
}
