import type { Testimonial } from "@/lib/types";
import type { TestimonialsRepository } from "../types";
import { testimonials as seedTestimonials } from "@/data/testimonials";

export function createMockTestimonialsRepository(): TestimonialsRepository {
  let items: Testimonial[] = seedTestimonials.map((item) => ({ ...item }));

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
      const updated: Testimonial = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
  };
}
