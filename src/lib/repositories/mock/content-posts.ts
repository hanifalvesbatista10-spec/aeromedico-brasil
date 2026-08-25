import type { ContentPost } from "@/lib/types";
import type { ContentRepository } from "../types";
import { contentPosts as seedContentPosts } from "@/data/content-posts";

export function createMockContentRepository(): ContentRepository {
  let items: ContentPost[] = seedContentPosts.map((post) => ({ ...post }));

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
      const updated: ContentPost = { ...items[index], ...patch };
      items = items.map((item, i) => (i === index ? updated : item));
      return { ...updated };
    },
    async remove(slug) {
      items = items.filter((item) => item.slug !== slug);
    },
  };
}
