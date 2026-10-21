"use server";

import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import {
  COUPON_NOT_FOUND_MESSAGE,
  evaluateCoupon,
  normalizeCouponCode,
  toCartCoupon,
  type CartCoupon,
} from "@/lib/cart/coupon";
import { priceCart, type PricedCart } from "@/lib/cart/pricing";
import { MAX_COUPON_CODE_LENGTH } from "@/lib/validation/coupons";
import { cartLinesSchema } from "@/lib/validation/cart";

export type PriceCartResult =
  | {
      ok: true;
      cart: PricedCart;
      /** Cupom aceito para este subtotal; `null` se não há cupom ou ele foi recusado. */
      coupon: CartCoupon | null;
      /** Por que o código digitado não vale (ou `null`). */
      couponError: string | null;
    }
  | { ok: false; error: string };

interface CouponOutcome {
  coupon: CartCoupon | null;
  couponError: string | null;
}

const NO_COUPON: CouponOutcome = { coupon: null, couponError: null };
const NOT_FOUND: CouponOutcome = { coupon: null, couponError: COUPON_NOT_FOUND_MESSAGE };

/**
 * Resolve o código digitado. Falha ao ler cupons (ex.: migration ainda não
 * aplicada) nunca derruba o carrinho: só desliga o cupom.
 */
async function resolveCoupon(
  couponCode: unknown,
  subtotalCents: number
): Promise<CouponOutcome> {
  if (couponCode === undefined || couponCode === null) return NO_COUPON;
  if (typeof couponCode !== "string") return NOT_FOUND;

  const code = normalizeCouponCode(couponCode);
  if (code === "") return NO_COUPON;
  if (code.length > MAX_COUPON_CODE_LENGTH) return NOT_FOUND;

  try {
    const found = await getRepositories().coupons.findActiveByCode(code);
    if (!found) return NOT_FOUND;
    const evaluation = evaluateCoupon(found, subtotalCents, new Date());
    if (!evaluation.ok) return { coupon: null, couponError: evaluation.message };
    return { coupon: toCartCoupon(found), couponError: null };
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[carrinho] cupons indisponíveis", error);
    return { coupon: null, couponError: "Cupons indisponíveis no momento." };
  }
}

/**
 * Precifica o carrinho com os dados do catálogo e, se houver código, valida o
 * cupom. Leitura pública (qualquer visitante), então não exige admin: só
 * devolve o que a loja já mostra, e nunca usa preço vindo do navegador. Erros
 * esperados voltam como valor porque o Next esconde a mensagem de erros
 * lançados em Server Actions em produção.
 */
export async function priceCartAction(
  input: unknown,
  couponCode?: unknown
): Promise<PriceCartResult> {
  const parsed = cartLinesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Não foi possível ler os itens do carrinho." };

  if (parsed.data.length === 0) {
    return {
      ok: true,
      cart: { lines: [], unavailable: [], subtotalCents: 0, itemCount: 0 },
      ...NO_COUPON,
    };
  }

  let cart: PricedCart;
  try {
    const store = getRepositories().store;
    const [details, categories] = await Promise.all([
      store.listProductDetails(),
      store.listCategories(),
    ]);
    cart = priceCart(parsed.data, details, categories);
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[carrinho] catálogo indisponível", error);
    return {
      ok: false,
      error: "Não foi possível carregar o carrinho agora. Tente de novo.",
    };
  }

  return { ok: true, cart, ...(await resolveCoupon(couponCode, cart.subtotalCents)) };
}
