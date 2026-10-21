import type { StoreCoupon } from "@/lib/types";
import { DUPLICATE_COUPON_MESSAGE, type CouponRepository } from "../types";

// Implementação em memória, só para os testes.
export function createMockCouponRepository(): CouponRepository {
  let coupons: StoreCoupon[] = [];

  const key = (code: string) => code.trim().toUpperCase();

  function assertCodeFree(code: string, exceptId?: string) {
    if (coupons.some((c) => key(c.code) === key(code) && c.id !== exceptId)) {
      throw new Error(DUPLICATE_COUPON_MESSAGE);
    }
  }

  return {
    async list() {
      return [...coupons]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ ...c }));
    },

    async create(input) {
      assertCodeFree(input.code);
      const created: StoreCoupon = { ...input, id: crypto.randomUUID() };
      coupons = [...coupons, created];
      return { ...created };
    },

    async update(id, patch) {
      const current = coupons.find((c) => c.id === id);
      if (!current) return null;
      if (patch.code !== undefined) assertCodeFree(patch.code, id);
      const updated: StoreCoupon = { ...current, ...patch, id };
      coupons = coupons.map((c) => (c.id === id ? updated : c));
      return { ...updated };
    },

    async remove(id) {
      coupons = coupons.filter((c) => c.id !== id);
    },

    async findActiveByCode(code) {
      const found = coupons.find((c) => c.active && key(c.code) === key(code));
      return found ? { ...found } : null;
    },
  };
}
