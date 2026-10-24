import { validatePaymentTerms } from "@/lib/payments/terms";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StorePaymentSettingsRow } from "@/lib/supabase/types";
import type { PaymentSettingsRepository } from "../types";
import { paymentTermsFromRow, paymentTermsToRow } from "./orders-mapping";

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
        if (error.code && MISSING_TABLE_CODES.includes(error.code)) return paymentTermsFromRow(null);
        throw new Error("Falha ao ler as condições de pagamento.");
      }
      return paymentTermsFromRow(data as StorePaymentSettingsRow | null);
    },

    async update(terms) {
      const problem = validatePaymentTerms(terms);
      if (problem) throw new Error(problem);

      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_payment_settings")
        .update(paymentTermsToRow(terms))
        .eq("id", true)
        .select("*")
        .single();
      if (error) throw new Error(`Falha ao salvar as condições de pagamento: ${error.message}`);
      return paymentTermsFromRow(data as StorePaymentSettingsRow);
    },
  };
}
