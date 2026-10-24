import { z } from "zod";
import {
  MAX_PIX_DISCOUNT_BP,
  validatePaymentTerms,
  type PaymentTerms,
} from "@/lib/payments/terms";

// O dono digita o desconto do Pix como percentual com vírgula ("5" ou "5,5") e o
// máximo de parcelas como número. Aqui viram pontos-base (500) e inteiro, que é
// o que o cálculo e o banco usam.

const PERCENT_RE = /^\d+([.,]\d{1,2})?$/;

export const paymentTermsSchema = z
  .object({
    pixDiscount: z.string(),
    maxInstallments: z.string(),
  })
  .transform((raw, ctx): PaymentTerms => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };

    const percent = raw.pixDiscount.trim();
    if (!PERCENT_RE.test(percent)) {
      return fail("Desconto no Pix: informe o percentual, por exemplo 5 ou 5,5 (use 0 para não dar desconto).");
    }
    const maxText = raw.maxInstallments.trim();
    if (!/^\d+$/.test(maxText)) return fail("Informe o máximo de parcelas, um número inteiro de 1 a 21.");

    const terms: PaymentTerms = {
      pixDiscountBp: Math.round(Number(percent.replace(",", ".")) * 100),
      maxInstallments: Number(maxText),
    };
    const problem = validatePaymentTerms(terms);
    return problem ? fail(problem) : terms;
  });

export type PaymentTermsForm = z.input<typeof paymentTermsSchema>;

/** As condições guardadas como o dono as digita (ponto-base 500 → "5"). */
export function termsToForm(terms: PaymentTerms): PaymentTermsForm {
  const percent = terms.pixDiscountBp / 100;
  return {
    pixDiscount: Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(".", ","),
    maxInstallments: String(terms.maxInstallments),
  };
}

export { MAX_PIX_DISCOUNT_BP };
