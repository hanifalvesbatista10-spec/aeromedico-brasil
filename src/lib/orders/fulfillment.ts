import type { PaymentMethod } from "@/lib/payments/fees";
import type { OrderStatus } from "@/lib/types";

/** Código do pedido que o comprador e o dono veem ("AB-000012"). */
export function orderCode(number: number): string {
  return `AB-${String(number).padStart(6, "0")}`;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  card_single: "Cartão à vista",
  card_installments: "Cartão parcelado",
};

/** Nomes das situações no painel (o comprador vê outros textos, em order-summary). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  paid_review: "Pago, conferir",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  expired: "Expirado",
};

/**
 * Próximos andamentos que o dono pode marcar: pago → separação → enviado →
 * entregue, e cancelar até o envio. Pedido aguardando pagamento ou expirado não
 * se mexe à mão: o webhook resolve, e cancelar um pedido que ainda pode ser pago
 * faria um pagamento confirmado depois ser ignorado.
 */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "paid":
    case "paid_review":
      return ["preparing", "canceled"];
    case "preparing":
      return ["shipped", "canceled"];
    case "shipped":
      return ["delivered", "canceled"];
    default:
      return [];
  }
}

export interface FulfillmentChange {
  status: OrderStatus;
  trackingCode?: string | null;
}

export type FulfillmentCheck =
  | { ok: true; patch: { status: OrderStatus; trackingCode?: string } }
  | { ok: false; error: string };

const TRACKING_RE = /^[A-Z0-9][A-Z0-9._-]{3,59}$/;

/** Confere a mudança pedida contra a situação atual e devolve o que gravar. */
export function checkFulfillmentChange(current: OrderStatus, change: FulfillmentChange): FulfillmentCheck {
  if (!nextStatuses(current).includes(change.status)) {
    return { ok: false, error: "Esta mudança de andamento não é permitida para o pedido." };
  }
  if (change.status !== "shipped") return { ok: true, patch: { status: change.status } };

  const code = (change.trackingCode ?? "").trim().toUpperCase();
  if (code === "") {
    return { ok: false, error: "Informe o código de rastreio para marcar como enviado." };
  }
  if (!TRACKING_RE.test(code)) {
    return {
      ok: false,
      error: "O código de rastreio deve ter de 4 a 60 caracteres: letras, números, ponto, hífen ou sublinhado.",
    };
  }
  return { ok: true, patch: { status: "shipped", trackingCode: code } };
}
