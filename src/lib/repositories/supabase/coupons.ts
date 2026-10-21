import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StoreCouponRow } from "@/lib/supabase/types";
import type { CouponRepository } from "../types";
import {
  couponToDomain,
  couponToRow,
  couponToRowPatch,
  mapCouponError,
} from "./coupons-mapping";

// A tabela só é visível para o administrador (RLS). O visitante valida um
// código pela função `find_store_coupon` (security definer), que devolve no
// máximo um cupom ativo e nunca permite listar os demais.
export function createSupabaseCouponRepository(): CouponRepository {
  return {
    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_coupons")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw new Error(`Falha ao carregar cupons: ${error.message}`);
      return (data as StoreCouponRow[]).map(couponToDomain);
    },

    async create(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_coupons")
        .insert(couponToRow(input))
        .select("*")
        .single();
      if (error) throw mapCouponError(error, "Falha ao criar cupom");
      return couponToDomain(data as StoreCouponRow);
    },

    async update(id, patch) {
      const supabase = await createServerSupabaseClient();
      const row = couponToRowPatch(patch);
      const query =
        Object.keys(row).length === 0
          ? supabase.from("store_coupons").select("*").eq("id", id)
          : supabase.from("store_coupons").update(row).eq("id", id).select("*");
      const { data, error } = await query.maybeSingle();
      if (error) throw mapCouponError(error, "Falha ao atualizar cupom");
      return data ? couponToDomain(data as StoreCouponRow) : null;
    },

    async remove(id) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("store_coupons").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir cupom: ${error.message}`);
    },

    async findActiveByCode(code) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("find_store_coupon", {
        p_code: code,
      });
      if (error) throw new Error(`Falha ao consultar cupom: ${error.message}`);
      const rows = (data ?? []) as StoreCouponRow[];
      return rows[0] ? couponToDomain(rows[0]) : null;
    },
  };
}
