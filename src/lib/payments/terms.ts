// Condições de pagamento da loja: desconto no Pix e máximo de parcelas no cartão.
// Não há taxa repassada ao comprador: o custo do Asaas fica por conta do dono, que
// já o considera no preço dos produtos. O Pix é um incentivo (desconto sobre os
// produtos); cartão à vista e parcelado pagam o preço cheio.
// Tudo em centavos e em inteiros, para o arredondamento ser exato e previsível.

export type PaymentMethod = "pix" | "card_single" | "card_installments";

export interface PaymentTerms {
  /** Desconto do Pix em pontos-base sobre o valor dos produtos: 500 = 5%. */
  pixDiscountBp: number;
  /** Máximo de parcelas oferecido (o Asaas aceita de 1 a 21). */
  maxInstallments: number;
}

export const DEFAULT_PAYMENT_TERMS: PaymentTerms = {
  pixDiscountBp: 500,
  maxInstallments: 6,
};

/** Maior desconto aceito no Pix: 50%. */
export const MAX_PIX_DISCOUNT_BP = 5000;

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} deve ser um inteiro maior ou igual a zero.`);
  }
}

/** Desconto do Pix sobre `baseCents` (valor dos produtos, já depois do cupom). Arredonda ao centavo mais próximo. */
export function pixDiscountFor(baseCents: number, discountBp: number): number {
  assertInteger(baseCents, "O valor dos produtos");
  assertInteger(discountBp, "O desconto do Pix");
  return Math.round((baseCents * discountBp) / 10000);
}

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  /** Desconto desta forma de pagamento (só o Pix tem). */
  discountCents: number;
  /** O que o comprador paga: produtos + frete − desconto. */
  totalCents: number;
  installments: number | null;
  installmentCents: number | null;
}

/**
 * Pix, cartão à vista e cartão parcelado, nessa ordem, com o total de cada um.
 * Com máximo de 1 parcela não há parcelado (seria igual ao à vista, e o Asaas
 * não aceita um parcelamento de 1x).
 */
export function paymentOptions(
  order: { productsCents: number; shippingCents: number },
  terms: PaymentTerms
): PaymentOption[] {
  assertInteger(order.shippingCents, "O frete");
  const fullCents = order.productsCents + order.shippingCents;
  const pixDiscount = pixDiscountFor(order.productsCents, terms.pixDiscountBp);

  const options: PaymentOption[] = [
    {
      method: "pix",
      label: "Pix",
      discountCents: pixDiscount,
      totalCents: fullCents - pixDiscount,
      installments: null,
      installmentCents: null,
    },
    {
      method: "card_single",
      label: "Cartão à vista",
      discountCents: 0,
      totalCents: fullCents,
      installments: null,
      installmentCents: null,
    },
  ];

  if (terms.maxInstallments >= 2) {
    options.push({
      method: "card_installments",
      label: `Cartão parcelado em até ${terms.maxInstallments}x`,
      discountCents: 0,
      totalCents: fullCents,
      installments: terms.maxInstallments,
      installmentCents: Math.ceil(fullCents / terms.maxInstallments),
    });
  }
  return options;
}

/** Valida as condições de pagamento; devolve a mensagem do primeiro problema ou `null`. */
export function validatePaymentTerms(terms: PaymentTerms): string | null {
  if (
    !Number.isInteger(terms.pixDiscountBp) ||
    terms.pixDiscountBp < 0 ||
    terms.pixDiscountBp > MAX_PIX_DISCOUNT_BP
  ) {
    return "O desconto do Pix deve ficar entre 0% e 50%.";
  }
  if (
    !Number.isInteger(terms.maxInstallments) ||
    terms.maxInstallments < 1 ||
    terms.maxInstallments > 21
  ) {
    return "O máximo de parcelas deve ser um número inteiro de 1 a 21.";
  }
  return null;
}
