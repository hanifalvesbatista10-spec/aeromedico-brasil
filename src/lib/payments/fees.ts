// Taxa do Asaas repassada ao cliente: o preço do pedido é somado à taxa da
// forma de pagamento escolhida, de modo que o dono receba o valor cheio.
// Tudo em centavos e em inteiros (sem divisão decimal), para o arredondamento
// ser exato e previsível.

export type PaymentMethod = "pix" | "card_single" | "card_installments";

export interface FeeRule {
  /** Taxa fixa por venda, em centavos. */
  fixedCents: number;
  /** Percentual em pontos-base: 349 = 3,49%. */
  percentBp: number;
}

export interface PaymentFees {
  pix: FeeRule;
  cardSingle: FeeRule;
  cardInstallments: FeeRule;
  /** Máximo de parcelas oferecido (o Asaas aceita de 1 a 21). */
  maxInstallments: number;
}

/**
 * Tabela padrão do Asaas (Pix R$ 1,99; cartão à vista 2,99% + R$ 0,49; 2x a 6x
 * 3,49% + R$ 0,49). O dono confere e ajusta no painel: o contrato pode mudar e
 * há promoções de 3 meses.
 */
export const DEFAULT_PAYMENT_FEES: PaymentFees = {
  pix: { fixedCents: 199, percentBp: 0 },
  cardSingle: { fixedCents: 49, percentBp: 299 },
  cardInstallments: { fixedCents: 49, percentBp: 349 },
  maxInstallments: 6,
};

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} deve ser um inteiro maior ou igual a zero.`);
  }
}

/**
 * Total que o cliente paga para o dono receber `orderCents`:
 * `total = ceil((pedido + fixa) / (1 − percentual))`.
 */
export function feeFor(
  orderCents: number,
  rule: FeeRule
): { feeCents: number; totalCents: number } {
  assertInteger(orderCents, "O valor do pedido");
  assertInteger(rule.fixedCents, "A taxa fixa");
  assertInteger(rule.percentBp, "O percentual");
  if (rule.percentBp >= 10000) throw new Error("O percentual deve ser menor que 100%.");

  const numerator = (orderCents + rule.fixedCents) * 10000;
  const denominator = 10000 - rule.percentBp;
  const totalCents = Math.floor((numerator + denominator - 1) / denominator);
  return { feeCents: totalCents - orderCents, totalCents };
}

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  feeCents: number;
  totalCents: number;
  installments: number | null;
  installmentCents: number | null;
}

/**
 * Pix, cartão à vista e cartão parcelado, nessa ordem, com o total de cada um.
 * Com máximo de 1 parcela não há parcelado (seria igual ao à vista, e o Asaas
 * não aceita um parcelamento de 1x).
 */
export function paymentOptions(orderCents: number, fees: PaymentFees): PaymentOption[] {
  const pix = feeFor(orderCents, fees.pix);
  const single = feeFor(orderCents, fees.cardSingle);

  const options: PaymentOption[] = [
    { method: "pix", label: "Pix", ...pix, installments: null, installmentCents: null },
    {
      method: "card_single",
      label: "Cartão à vista",
      ...single,
      installments: null,
      installmentCents: null,
    },
  ];

  if (fees.maxInstallments >= 2) {
    const installments = feeFor(orderCents, fees.cardInstallments);
    options.push({
      method: "card_installments",
      label: `Cartão parcelado em até ${fees.maxInstallments}x`,
      ...installments,
      installments: fees.maxInstallments,
      installmentCents: Math.ceil(installments.totalCents / fees.maxInstallments),
    });
  }
  return options;
}

/** Valida a configuração de taxas; devolve a mensagem do primeiro problema ou `null`. */
export function validatePaymentFees(fees: PaymentFees): string | null {
  const rules: [string, FeeRule][] = [
    ["Pix", fees.pix],
    ["Cartão à vista", fees.cardSingle],
    ["Cartão parcelado", fees.cardInstallments],
  ];
  for (const [label, rule] of rules) {
    if (!Number.isInteger(rule.fixedCents) || rule.fixedCents < 0) {
      return `${label}: a taxa fixa deve ser um valor maior ou igual a zero.`;
    }
    if (!Number.isInteger(rule.percentBp) || rule.percentBp < 0 || rule.percentBp >= 10000) {
      return `${label}: o percentual deve ser maior ou igual a zero e menor que 100%.`;
    }
  }
  if (
    !Number.isInteger(fees.maxInstallments) ||
    fees.maxInstallments < 1 ||
    fees.maxInstallments > 21
  ) {
    return "O máximo de parcelas deve ser um número inteiro de 1 a 21.";
  }
  return null;
}
