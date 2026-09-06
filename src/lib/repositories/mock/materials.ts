import type { Material } from "@/lib/types";
import type { MaterialsRepository } from "../types";

// Nenhum material de exemplo — a biblioteca de materiais é um recurso novo,
// sem conteúdo demonstrativo anterior a migrar.
export function createMockMaterialsRepository(): MaterialsRepository {
  let items: Material[] = [];

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
      const updated: Material = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
  };
}
