import { z } from "zod";
import { formatCentsForInput, parseBRLToCents } from "@/lib/money";
import { validatePaymentFees, type FeeRule, type PaymentFees } from "@/lib/payments/fees";

// O dono digita as taxas como estão no contrato do Asaas: percentual em % com
// vírgula ("2,99") e taxa fixa em reais ("0,49"). Aqui viram pontos-base (299) e
// centavos (49), que é o que o cálculo e o banco usam.

/** Maior valor das colunas `integer` do Postgres. */
const MAX_DB_INT = 2_147_483_647;

const ruleForm = z.object({ percent: z.string(), fixed: z.string() });

const PERCENT_RE = /^\d+([.,]\d{1,2})?$/;

export const paymentFeesSchema = z
  .object({
    pix: ruleForm,
    cardSingle: ruleForm,
    cardInstallments: ruleForm,
    maxInstallments: z.string(),
  })
  .transform((raw, ctx): PaymentFees => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };

    const rule = (label: string, input: { percent: string; fixed: string }): FeeRule => {
      const percent = input.percent.trim();
      if (!PERCENT_RE.test(percent)) {
        return fail(`${label}: informe o percentual, por exemplo 2,99 (use 0 se não houver).`);
      }
      const fixedText = input.fixed.trim();
      const fixed = fixedText === "" ? null : parseBRLToCents(fixedText);
      if (fixed === null || fixed < 0) {
        return fail(`${label}: informe a taxa fixa em reais, por exemplo 0,49 (use 0 se não houver).`);
      }
      if (fixed > MAX_DB_INT) return fail(`${label}: o valor da taxa fixa é grande demais.`);
      return { percentBp: Math.round(Number(percent.replace(",", ".")) * 100), fixedCents: fixed };
    };

    const maxText = raw.maxInstallments.trim();
    if (!/^\d+$/.test(maxText)) return fail("Informe o máximo de parcelas, um número inteiro de 1 a 21.");

    const fees: PaymentFees = {
      pix: rule("Pix", raw.pix),
      cardSingle: rule("Cartão à vista", raw.cardSingle),
      cardInstallments: rule("Cartão parcelado", raw.cardInstallments),
      maxInstallments: Number(maxText),
    };
    const problem = validatePaymentFees(fees);
    return problem ? fail(problem) : fees;
  });

export type PaymentFeesForm = z.input<typeof paymentFeesSchema>;

function ruleToForm(rule: FeeRule) {
  return {
    percent: (rule.percentBp / 100).toFixed(2).replace(".", ","),
    fixed: formatCentsForInput(rule.fixedCents),
  };
}

/** As taxas guardadas como o dono as digita (ponto-base 299 → "2,99"). */
export function feesToForm(fees: PaymentFees): PaymentFeesForm {
  return {
    pix: ruleToForm(fees.pix),
    cardSingle: ruleToForm(fees.cardSingle),
    cardInstallments: ruleToForm(fees.cardInstallments),
    maxInstallments: String(fees.maxInstallments),
  };
}
