import { describe, it, expect } from "vitest";
import {
  couponToDomain,
  couponToRow,
  couponToRowPatch,
  mapCouponError,
} from "../supabase/coupons-mapping";
import { DUPLICATE_COUPON_MESSAGE } from "../types";
import type { StoreCouponRow } from "@/lib/supabase/types";

const row: StoreCouponRow = {
  id: "c1",
  code: "VERAO10",
  kind: "percent",
  value: 10,
  min_order_cents: 5000,
  starts_at: "2026-12-01T03:00:00+00:00",
  expires_at: null,
  max_uses: 100,
  uses_count: 3,
  active: true,
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};

describe("mapeamento de cupons", () => {
  it("linha do banco vira o domínio", () => {
    expect(couponToDomain(row)).toEqual({
      id: "c1",
      code: "VERAO10",
      kind: "percent",
      value: 10,
      minOrderCents: 5000,
      startsAt: "2026-12-01T03:00:00+00:00",
      expiresAt: null,
      maxUses: 100,
      usesCount: 3,
      active: true,
    });
  });

  it("o domínio volta para a linha (sem id)", () => {
    const { id, ...input } = couponToDomain(row);
    void id;
    expect(couponToRow(input)).toEqual({
      code: "VERAO10",
      kind: "percent",
      value: 10,
      min_order_cents: 5000,
      starts_at: "2026-12-01T03:00:00+00:00",
      expires_at: null,
      max_uses: 100,
      uses_count: 3,
      active: true,
    });
  });

  it("o patch só leva o que foi informado, inclusive null explícito", () => {
    expect(couponToRowPatch({ active: false, expiresAt: null })).toEqual({
      active: false,
      expires_at: null,
    });
    expect(couponToRowPatch({})).toEqual({});
  });

  it("violação de unicidade (23505) vira a mensagem de código repetido", () => {
    const error = mapCouponError({ code: "23505", message: "duplicate key" }, "Falha ao salvar");
    expect(error.message).toBe(DUPLICATE_COUPON_MESSAGE);
  });

  it("outros erros mantêm o contexto", () => {
    expect(mapCouponError({ message: "timeout" }, "Falha ao salvar").message).toBe(
      "Falha ao salvar: timeout"
    );
  });
});
