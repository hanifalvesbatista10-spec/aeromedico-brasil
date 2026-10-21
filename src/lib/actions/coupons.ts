"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  storeCouponSchema,
  type StoreCouponFormInput,
} from "@/lib/validation/coupons";
import type { StoreCoupon } from "@/lib/types";

// Mesmo padrão das ações da loja: administrador conferido ANTES de tudo e
// erros esperados devolvidos como valor (em produção o Next esconde a mensagem
// de erros lançados por Server Actions).

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível salvar agora.";
}

export async function saveStoreCoupon(
  input: { id?: string } & StoreCouponFormInput
): Promise<ActionResult<StoreCoupon>> {
  await requireAdmin();

  const { id, ...form } = input;
  const parsed = storeCouponSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const coupons = getRepositories().coupons;
    const saved = id
      ? await coupons.update(id, parsed.data)
      : await coupons.create(parsed.data);
    if (!saved) return { ok: false, error: "Cupom não encontrado." };
    revalidatePath("/admin/cupons");
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

export async function toggleStoreCouponActive(
  id: string,
  active: boolean
): Promise<StoreCoupon | null> {
  await requireAdmin();
  const coupon = await getRepositories().coupons.update(id, { active });
  revalidatePath("/admin/cupons");
  return coupon;
}

export async function deleteStoreCoupon(id: string): Promise<void> {
  await requireAdmin();
  await getRepositories().coupons.remove(id);
  revalidatePath("/admin/cupons");
}
