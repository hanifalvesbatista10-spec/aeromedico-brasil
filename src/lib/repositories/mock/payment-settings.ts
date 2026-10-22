import { DEFAULT_PAYMENT_FEES, validatePaymentFees, type PaymentFees } from "@/lib/payments/fees";
import type { PaymentSettingsRepository } from "../types";

// Implementação em memória, só para os testes.
export function createMockPaymentSettingsRepository(): PaymentSettingsRepository {
  let fees: PaymentFees = structuredClone(DEFAULT_PAYMENT_FEES);

  return {
    async get() {
      return structuredClone(fees);
    },
    async update(next) {
      const problem = validatePaymentFees(next);
      if (problem) throw new Error(problem);
      fees = structuredClone(next);
      return structuredClone(fees);
    },
  };
}
