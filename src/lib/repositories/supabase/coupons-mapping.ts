import type { StoreCouponRow } from "@/lib/supabase/types";
import type { StoreCoupon } from "@/lib/types";
import { DUPLICATE_COUPON_MESSAGE } from "../types";

// Mapeamento puro entre a linha do banco (snake_case) e o domínio (camelCase).

export function couponToDomain(row: StoreCouponRow): StoreCoupon {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    minOrderCents: row.min_order_cents,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    active: row.active,
  };
}

export function couponToRow(input: Omit<StoreCoupon, "id">) {
  return {
    code: input.code,
    kind: input.kind,
    value: input.value,
    min_order_cents: input.minOrderCents,
    starts_at: input.startsAt,
    expires_at: input.expiresAt,
    max_uses: input.maxUses,
    uses_count: input.usesCount,
    active: input.active,
  };
}

/** Só as colunas informadas; `null` explícito limpa a coluna. */
export function couponToRowPatch(patch: Partial<Omit<StoreCoupon, "id">>) {
  const row: Record<string, unknown> = {};
  if (patch.code !== undefined) row.code = patch.code;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.minOrderCents !== undefined) row.min_order_cents = patch.minOrderCents;
  if (patch.startsAt !== undefined) row.starts_at = patch.startsAt;
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt;
  if (patch.maxUses !== undefined) row.max_uses = patch.maxUses;
  if (patch.usesCount !== undefined) row.uses_count = patch.usesCount;
  if (patch.active !== undefined) row.active = patch.active;
  return row;
}

const UNIQUE_VIOLATION = "23505";

/** Violação de unicidade (código repetido) vira mensagem em português. */
export function mapCouponError(
  error: { code?: string; message: string },
  context: string
): Error {
  if (error.code === UNIQUE_VIOLATION) return new Error(DUPLICATE_COUPON_MESSAGE);
  return new Error(`${context}: ${error.message}`);
}
