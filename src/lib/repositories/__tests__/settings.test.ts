import { describe, it, expect } from "vitest";
import { createMockSettingsRepository } from "../mock/settings";

describe("mock settings repository", () => {
  it("returns the seeded settings", async () => {
    const repo = createMockSettingsRepository();
    const settings = await repo.get();
    expect(settings.profile.name).toBe("Lucio Macêdo");
  });

  it("updates and persists a patch within the same instance", async () => {
    const repo = createMockSettingsRepository();
    const updated = await repo.update({ email: "novo@exemplo.com" });
    expect(updated.email).toBe("novo@exemplo.com");
    expect((await repo.get()).email).toBe("novo@exemplo.com");
  });
});
