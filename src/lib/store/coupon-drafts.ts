import { formatBRL, formatCentsForInput } from "@/lib/money";
import type { StoreCouponFormInput } from "@/lib/validation/coupons";
import type { CouponKind, StoreCoupon } from "@/lib/types";

// Estado do formulário de cupom no painel. Tudo que o dono digita é texto; as
// datas usam o formato do campo `datetime-local` ("2026-12-31T23:59", no fuso
// do navegador) e só viram ISO na hora de enviar (a validação fica no servidor,
// src/lib/validation/coupons.ts).

export interface CouponForm {
  code: string;
  kind: CouponKind;
  value: string;
  minOrder: string;
  startsAt: string;
  expiresAt: string;
  maxUses: string;
  usesCount: string;
  active: boolean;
}

export const emptyCouponForm: CouponForm = {
  code: "",
  kind: "percent",
  value: "",
  minOrder: "",
  startsAt: "",
  expiresAt: "",
  maxUses: "",
  usesCount: "",
  active: true,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → texto do `datetime-local` no fuso do navegador; inválido vira "". */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Texto do `datetime-local` (fuso do navegador) → ISO; vazio/inválido vira "". */
export function fromLocalInput(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function couponToForm(coupon: StoreCoupon): CouponForm {
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.kind === "percent" ? String(coupon.value) : formatCentsForInput(coupon.value),
    minOrder: coupon.minOrderCents > 0 ? formatCentsForInput(coupon.minOrderCents) : "",
    startsAt: toLocalInput(coupon.startsAt),
    expiresAt: toLocalInput(coupon.expiresAt),
    maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
    usesCount: String(coupon.usesCount),
    active: coupon.active,
  };
}

export function couponFormToInput(form: CouponForm): StoreCouponFormInput {
  return {
    ...form,
    startsAt: fromLocalInput(form.startsAt),
    expiresAt: fromLocalInput(form.expiresAt),
  };
}

export function describeCouponValue(coupon: StoreCoupon): string {
  return coupon.kind === "percent" ? `${coupon.value}%` : formatBRL(coupon.value);
}

export function describeCouponUses(coupon: StoreCoupon): string {
  return coupon.maxUses === null
    ? `${coupon.usesCount} (sem limite)`
    : `${coupon.usesCount} de ${coupon.maxUses}`;
}

export type CouponStatusLabel = "Ativo" | "Inativo" | "Expirado" | "Esgotado" | "Agendado";

/** "Inativo" (decisão do dono) vence qualquer outra situação. */
export function couponStatus(coupon: StoreCoupon, now: Date): CouponStatusLabel {
  if (!coupon.active) return "Inativo";
  if (coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() <= now.getTime()) {
    return "Expirado";
  }
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return "Esgotado";
  if (coupon.startsAt !== null && new Date(coupon.startsAt).getTime() > now.getTime()) {
    return "Agendado";
  }
  return "Ativo";
}
