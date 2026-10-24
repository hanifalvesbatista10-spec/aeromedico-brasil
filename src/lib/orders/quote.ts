import { z } from "zod";
import { evaluateCoupon, normalizeCouponCode } from "@/lib/cart/coupon";
import { priceCart } from "@/lib/cart/pricing";
import { formatBRL } from "@/lib/money";
import {
  paymentOptions,
  type PaymentMethod,
  type PaymentOption,
  type PaymentTerms,
} from "@/lib/payments/terms";
import type { CouponRepository, StoreRepository } from "@/lib/repositories/types";
import { normalizeCep } from "@/lib/shipping/cep";
import { buildShippingItems } from "@/lib/shipping/items";
import type { ShippingProvider } from "@/lib/shipping/types";
import type { OrderItemInput } from "@/lib/types";
import { cartLinesSchema } from "@/lib/validation/cart";
import { MAX_COUPON_CODE_LENGTH } from "@/lib/validation/coupons";

// Recálculo do pedido no SERVIDOR. O navegador só diz o que escolheu (itens,
// cupom, opção de frete, forma de pagamento) e o que viu (frete e total);
// preço, desconto, frete e desconto do Pix são sempre refeitos aqui.

export const checkoutSelectionSchema = z.object({
  lines: cartLinesSchema,
  couponCode: z.string().max(MAX_COUPON_CODE_LENGTH).nullish(),
  shipping: z.object({
    optionId: z.string().min(1).max(64),
    cep: z.string().max(20),
    /** Preço do frete que o cliente viu. */
    expectedCents: z.number().int().min(0),
  }),
  method: z.enum(["pix", "card_single", "card_installments"]),
  /** Total da forma escolhida que o cliente viu (obrigatório ao criar o pedido). */
  expectedTotalCents: z.number().int().min(0).optional(),
});

export type CheckoutSelection = z.input<typeof checkoutSelectionSchema>;

export interface CheckoutDeps {
  store: Pick<StoreRepository, "listProductDetails" | "listCategories">;
  coupons: Pick<CouponRepository, "findActiveByCode">;
  shippingProvider: ShippingProvider | null;
  terms: PaymentTerms;
  now: Date;
}

export type CheckoutQuote =
  | {
      ok: true;
      subtotalCents: number;
      discountCents: number;
      couponCode: string | null;
      shipping: { optionId: string; label: string; cents: number; cep: string };
      orderCents: number;
      /** Condições vigentes (desconto do Pix, parcelas): o carrinho calcula os totais com elas. */
      terms: PaymentTerms;
      options: PaymentOption[];
      chosen: PaymentOption;
      items: OrderItemInput[];
    }
  | {
      ok: false;
      code:
        | "invalid-input"
        | "empty-cart"
        | "shipping-unavailable"
        | "shipping-changed"
        | "price-changed"
        | "unavailable";
      error: string;
      newShippingCents?: number;
      newTotalCents?: number;
    };

const EMPTY_CART =
  "Os itens do carrinho não estão mais disponíveis. Atualize a página para ver o que mudou.";

const fail = (
  code: Extract<CheckoutQuote, { ok: false }>["code"],
  error: string,
  extra: { newShippingCents?: number; newTotalCents?: number } = {}
): CheckoutQuote => ({ ok: false, code, error, ...extra });

/**
 * Refaz o pedido com os dados do servidor. Falhas de infraestrutura (catálogo
 * ou cupons fora do ar) são lançadas: quem chama trata (e relança os erros
 * internos do Next). Frete indisponível volta como valor.
 */
export async function computeCheckoutQuote(
  rawSelection: unknown,
  deps: CheckoutDeps
): Promise<CheckoutQuote> {
  const parsed = checkoutSelectionSchema.safeParse(rawSelection);
  if (!parsed.success) return fail("invalid-input", "Algo deu errado com os dados do pedido. Atualize a página e tente de novo.");
  const selection = parsed.data;

  const cep = normalizeCep(selection.shipping.cep);
  if (!cep) return fail("invalid-input", "Algo deu errado com os dados do pedido. Atualize a página e tente de novo.");
  if (selection.lines.length === 0) {
    return fail("empty-cart", EMPTY_CART);
  }

  const [details, categories] = await Promise.all([
    deps.store.listProductDetails(),
    deps.store.listCategories(),
  ]);
  const cart = priceCart(selection.lines, details, categories);
  if (cart.lines.length === 0) return fail("empty-cart", EMPTY_CART);

  // Cupom: reavaliado com o subtotal do servidor; recusado = sem desconto.
  let discountCents = 0;
  let couponCode: string | null = null;
  const code = selection.couponCode ? normalizeCouponCode(selection.couponCode) : "";
  if (code && code.length <= MAX_COUPON_CODE_LENGTH) {
    const found = await deps.coupons.findActiveByCode(code);
    if (found) {
      const evaluation = evaluateCoupon(found, cart.subtotalCents, deps.now);
      if (evaluation.ok) {
        discountCents = evaluation.discountCents;
        couponCode = found.code;
      }
    }
  }

  // Frete: cotado de novo, escolhendo a mesma opção por id.
  const shippingItems = buildShippingItems(cart, details);
  const unavailable = () =>
    fail(
      "shipping-unavailable",
      "Não conseguimos confirmar o frete agora. Tente de novo ou escolha outra opção de frete."
    );
  if (!deps.shippingProvider) return unavailable();
  const quoted = await deps.shippingProvider.quote({ destinationCep: cep, items: shippingItems });
  if (!quoted.ok) return unavailable();
  const option = quoted.options.find((item) => item.id === selection.shipping.optionId);
  if (!option) return unavailable();
  if (option.priceCents !== selection.shipping.expectedCents) {
    return fail(
      "shipping-changed",
      `O frete mudou para ${formatBRL(option.priceCents)}. Confira o novo total e clique em Pagar de novo.`,
      { newShippingCents: option.priceCents }
    );
  }

  // O desconto do Pix vale sobre os produtos (já sem o cupom), nunca sobre o frete.
  const productsCents = cart.subtotalCents - discountCents;
  const orderCents = productsCents + option.priceCents;
  const options = paymentOptions({ productsCents, shippingCents: option.priceCents }, deps.terms);
  const chosen = options.find((item) => item.method === (selection.method as PaymentMethod));
  // Forma que não está sendo oferecida (ex.: parcelado com máximo de 1x): nunca estoura.
  if (!chosen) return fail("invalid-input", "Algo deu errado com os dados do pedido. Atualize a página e tente de novo.");

  if (
    selection.expectedTotalCents !== undefined &&
    selection.expectedTotalCents !== chosen.totalCents
  ) {
    return fail(
      "price-changed",
      `O total do pedido mudou para ${formatBRL(chosen.totalCents)}. Se estiver de acordo, clique em Pagar de novo.`,
      { newTotalCents: chosen.totalCents }
    );
  }

  const weightByKey = new Map(shippingItems.map((item) => [item.id, item.weightGrams]));
  return {
    ok: true,
    subtotalCents: cart.subtotalCents,
    discountCents,
    couponCode,
    shipping: {
      optionId: option.id,
      label: `${option.company} ${option.name}`.trim(),
      cents: option.priceCents,
      cep,
    },
    orderCents,
    terms: deps.terms,
    options,
    chosen,
    items: cart.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      name: line.name,
      size: line.size,
      colorName: line.colorName,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      weightGrams: weightByKey.get(line.key) ?? 1,
    })),
  };
}
