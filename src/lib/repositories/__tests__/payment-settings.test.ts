import { describe, it, expect } from "vitest";
import { createMockPaymentSettingsRepository } from "../mock/payment-settings";
import { DEFAULT_PAYMENT_TERMS } from "@/lib/payments/terms";

describe("mock payment settings repository", () => {
  it("começa com os valores padrão (Pix 5%, até 6x)", async () => {
    expect(await createMockPaymentSettingsRepository().get()).toEqual(DEFAULT_PAYMENT_TERMS);
  });

  it("update grava e devolve; valores inválidos são recusados sem gravar", async () => {
    const repo = createMockPaymentSettingsRepository();
    const next = { pixDiscountBp: 700, maxInstallments: 3 };
    expect(await repo.update(next)).toEqual(next);
    expect(await repo.get()).toEqual(next);

    await expect(repo.update({ ...next, pixDiscountBp: 9000 })).rejects.toThrow();
    await expect(repo.update({ ...next, maxInstallments: 0 })).rejects.toThrow();
    expect(await repo.get()).toEqual(next);
  });

  it("o que volta é uma cópia: mexer nela não muda o que está guardado", async () => {
    const repo = createMockPaymentSettingsRepository();
    const copy = await repo.get();
    copy.pixDiscountBp = 1;
    expect((await repo.get()).pixDiscountBp).toBe(DEFAULT_PAYMENT_TERMS.pixDiscountBp);
  });
});
