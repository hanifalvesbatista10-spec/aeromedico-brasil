import { describe, it, expect } from "vitest";
import { createMockPaymentSettingsRepository } from "../mock/payment-settings";
import { DEFAULT_PAYMENT_FEES, validatePaymentFees } from "@/lib/payments/fees";

describe("validatePaymentFees", () => {
  it("aceita os valores padrão", () => {
    expect(validatePaymentFees(DEFAULT_PAYMENT_FEES)).toBeNull();
  });

  it("recusa percentual de 100% ou mais, fixa negativa ou fracionada", () => {
    const bad = (patch: Partial<typeof DEFAULT_PAYMENT_FEES>) =>
      validatePaymentFees({ ...DEFAULT_PAYMENT_FEES, ...patch });
    expect(bad({ pix: { fixedCents: 199, percentBp: 10000 } })).not.toBeNull();
    expect(bad({ cardSingle: { fixedCents: -1, percentBp: 299 } })).not.toBeNull();
    expect(bad({ cardInstallments: { fixedCents: 49.5, percentBp: 349 } })).not.toBeNull();
  });

  it("parcelas de 1 a 21 e inteiras", () => {
    const bad = (maxInstallments: number) =>
      validatePaymentFees({ ...DEFAULT_PAYMENT_FEES, maxInstallments });
    expect(bad(0)).not.toBeNull();
    expect(bad(22)).not.toBeNull();
    expect(bad(2.5)).not.toBeNull();
    expect(bad(1)).toBeNull();
    expect(bad(21)).toBeNull();
  });
});

describe("mock payment settings repository", () => {
  it("começa com os valores padrão", async () => {
    expect(await createMockPaymentSettingsRepository().get()).toEqual(DEFAULT_PAYMENT_FEES);
  });

  it("update grava e devolve; valores inválidos são recusados sem gravar", async () => {
    const repo = createMockPaymentSettingsRepository();
    const next = { ...DEFAULT_PAYMENT_FEES, maxInstallments: 3 };
    expect(await repo.update(next)).toEqual(next);
    expect(await repo.get()).toEqual(next);

    await expect(
      repo.update({ ...next, pix: { fixedCents: 0, percentBp: 10000 } })
    ).rejects.toThrow();
    expect(await repo.get()).toEqual(next);
  });
});
