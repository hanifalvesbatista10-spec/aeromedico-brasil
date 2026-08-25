import type { SiteSettings } from "@/lib/types";
import type { SettingsRepository } from "../types";
import { siteSettings as seedSettings } from "@/data/settings";

export function createMockSettingsRepository(): SettingsRepository {
  let current: SiteSettings = { ...seedSettings };

  return {
    async get() {
      return { ...current };
    },
    async update(patch) {
      current = { ...current, ...patch };
      return { ...current };
    },
  };
}
