import { validatePaymentFees } from "@/lib/payments/fees";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StorePaymentSettingsRow } from "@/lib/supabase/types";
import type { PaymentSettingsRepository } from "../types";
import { paymentFeesFromRow, paymentFeesToRow } from "./orders-mapping";

// Registro único. Se a tabela ainda não existe (migration não aplicada), o
// carrinho segue com os valores padrão em vez de quebrar. Qualquer OUTRA falha é
// lançada: usar a taxa padrão em silêncio cobraria um valor diferente do contrato
// e, no painel, o dono poderia salvar por cima da configuração real.
const MISSING_TABLE_CODES = ["42P01", "PGRST205"];

export function createSupabasePaymentSettingsRepository(): PaymentSettingsRepository {
  return {
    async get() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_payment_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      if (error) {
        if (error.code && MISSING_TABLE_CODES.includes(error.code)) return paymentFeesFromRow(null);
        throw new Error("Falha ao ler as taxas de pagamento.");
      }
      return paymentFeesFromRow(data as StorePaymentSettingsRow | null);
    },

    async update(fees) {
      const problem = validatePaymentFees(fees);
      if (problem) throw new Error(problem);

      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_payment_settings")
        .update(paymentFeesToRow(fees))
        .eq("id", true)
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao salvar as taxas: ${error.message}`);
      return paymentFeesFromRow(data as StorePaymentSettingsRow);
    },
  };
}
