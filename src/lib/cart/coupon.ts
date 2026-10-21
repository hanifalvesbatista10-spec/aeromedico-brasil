import { formatBRL } from "@/lib/money";
import type { StoreCoupon } from "@/lib/types";

// Regras do cupom, puras: valem no servidor (priceCartAction) e no navegador
// (resposta imediata ao mexer na quantidade). `now` entra por parâmetro.

export const COUPON_NOT_FOUND_MESSAGE = "Cupom não encontrado.";

/** Tira espaços (inclusive no meio) e põe em maiúsculas: "verao 10" → "VERAO10". */
export function normalizeCouponCode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export type CouponRejection =
  | "not-started"
  | "expired"
  | "exhausted"
  | "below-minimum";

export type CouponEvaluation =
  | { ok: true; discountCents: number }
  | { ok: false; reason: CouponRejection; message: string };

function reject(reason: CouponRejection, message: string): CouponEvaluation {
  return { ok: false, reason, message };
}

/**
 * Confere validade, limite de usos e pedido mínimo (nessa ordem) e calcula o
 * desconto, que nunca passa do subtotal. O estado `active` não entra aqui:
 * cupom inativo nem chega pela consulta pública.
 */
export function evaluateCoupon(
  coupon: CartCoupon,
  subtotalCents: number,
  now: Date
): CouponEvaluation {
  if (coupon.startsAt !== null && new Date(coupon.startsAt).getTime() > now.getTime()) {
    return reject("not-started", "Este cupom ainda não está valendo.");
  }
  if (coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() <= now.getTime()) {
    return reject("expired", "Este cupom expirou.");
  }
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
    return reject("exhausted", "Este cupom atingiu o limite de usos.");
  }
  if (subtotalCents < coupon.minOrderCents) {
    return reject(
      "below-minimum",
      `Este cupom vale para pedidos a partir de ${formatBRL(coupon.minOrderCents)}.`
    );
  }

  const raw =
    coupon.kind === "percent"
      ? Math.floor((subtotalCents * coupon.value) / 100)
      : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(raw, subtotalCents)) };
}

/** O que o navegador recebe de um cupom aceito: as regras, para recalcular o desconto na hora. */
export type CartCoupon = Pick<
  StoreCoupon,
  "code" | "kind" | "value" | "minOrderCents" | "startsAt" | "expiresAt" | "maxUses" | "usesCount"
>;

export function toCartCoupon(coupon: StoreCoupon): CartCoupon {
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    minOrderCents: coupon.minOrderCents,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
  };
}
