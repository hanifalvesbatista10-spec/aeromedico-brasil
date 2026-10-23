import type { PaymentMethod } from "@/lib/payments/fees";
import type { OrderStatus, StoreOrder } from "@/lib/types";

/** O que as regras de andamento precisam saber do pedido. */
export type FulfillmentSubject = Pick<StoreOrder, "status" | "checkoutId">;

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
  paid_review: "Pago: conferir estoque",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  expired: "Expirado",
};

/**
 * Próximos andamentos que o dono pode marcar: pago → separação → enviado →
 * entregue, e cancelar até o envio. Pedido aguardando pagamento ou expirado não
 * se mexe à mão: o webhook resolve. A exceção é o pedido órfão (aguardando
 * pagamento e sem checkout no Asaas): ele nunca poderá ser pago, então pode ser
 * cancelado para sair da lista.
 */
export function nextStatuses(order: FulfillmentSubject): OrderStatus[] {
  switch (order.status) {
    case "paid":
    case "paid_review":
      return ["preparing", "canceled"];
    case "preparing":
      return ["shipped", "canceled"];
    case "shipped":
      return ["delivered", "canceled"];
    case "awaiting_payment":
      return order.checkoutId === null ? ["canceled"] : [];
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
export function checkFulfillmentChange(
  current: FulfillmentSubject,
  change: FulfillmentChange
): FulfillmentCheck {
  if (!nextStatuses(current).includes(change.status)) {
    return { ok: false, error: "Não é possível mudar o pedido para esta situação agora." };
  }
  if (change.status !== "shipped") return { ok: true, patch: { status: change.status } };

  const code = (change.trackingCode ?? "").trim().toUpperCase();
  if (code === "") {
    return { ok: false, error: "Informe o código de rastreio para marcar como enviado." };
  }
  if (!TRACKING_RE.test(code)) {
    return {
      ok: false,
      error:
        "Código de rastreio inválido. Use de 4 a 60 caracteres, só letras, números, ponto, hífen ou traço baixo (_), sem espaços.",
    };
  }
  return { ok: true, patch: { status: "shipped", trackingCode: code } };
}
