"use server";

import { revalidatePath } from "next/cache";
import { getRepositories } from "@/lib/repositories";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { checkFulfillmentChange, type FulfillmentChange } from "@/lib/orders/fulfillment";
import { paymentTermsSchema, type PaymentTermsForm } from "@/lib/validation/payment-terms";
import type { PaymentTerms } from "@/lib/payments/terms";
import type { StoreOrder } from "@/lib/types";

// Mesmo padrão das ações da loja: administrador conferido ANTES de tudo e
// erros esperados devolvidos como valor (em produção o Next esconde a mensagem
// de erros lançados por Server Actions). Erros internos do banco não vazam.

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SAVE_FAILED = "Não foi possível salvar agora. Tente de novo.";

export async function updateOrderFulfillment(
  id: string,
  change: FulfillmentChange
): Promise<ActionResult<StoreOrder>> {
  await requireAdmin();

  try {
    const orders = getRepositories().orders;
    const current = await orders.getById(id);
    if (!current) return { ok: false, error: "Pedido não encontrado." };

    const checked = checkFulfillmentChange(current, change);
    if (!checked.ok) return checked;

    const saved = await orders.updateFulfillment(id, checked.patch);
    if (!saved) return { ok: false, error: "Pedido não encontrado." };
    revalidatePath("/admin/pedidos");
    return { ok: true, data: saved };
  } catch (error) {
    console.error("[admin/pedidos] falha ao atualizar o pedido", error instanceof Error ? error.name : "erro");
    return { ok: false, error: SAVE_FAILED };
  }
}

export async function savePaymentTerms(input: PaymentTermsForm): Promise<ActionResult<PaymentTerms>> {
  await requireAdmin();

  const parsed = paymentTermsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os valores digitados." };
  }

  try {
    const saved = await getRepositories().paymentSettings.update(parsed.data);
    revalidatePath("/admin/pedidos");
    return { ok: true, data: saved };
  } catch (error) {
    console.error("[admin/pedidos] falha ao salvar as condições de pagamento", error instanceof Error ? error.name : "erro");
    return { ok: false, error: SAVE_FAILED };
  }
}
