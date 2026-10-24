import { DEFAULT_PAYMENT_TERMS, validatePaymentTerms, type PaymentTerms } from "@/lib/payments/terms";
import type { PaymentSettingsRepository } from "../types";

// Implementação em memória, só para os testes.
export function createMockPaymentSettingsRepository(): PaymentSettingsRepository {
  let terms: PaymentTerms = structuredClone(DEFAULT_PAYMENT_TERMS);

  return {
    async get() {
      return structuredClone(terms);
    },
    async update(next) {
      const problem = validatePaymentTerms(next);
      if (problem) throw new Error(problem);
      terms = structuredClone(next);
      return structuredClone(terms);
    },
  };
}
