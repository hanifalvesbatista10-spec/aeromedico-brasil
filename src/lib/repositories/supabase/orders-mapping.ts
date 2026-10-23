import { MIN_ORDERS_SECRET_LENGTH, usableOrdersSecret } from "@/lib/orders/secret";
import { DEFAULT_PAYMENT_FEES, type PaymentFees } from "@/lib/payments/fees";
import type {
  StoreOrderItemRow,
  StoreOrderRow,
  StorePaymentSettingsRow,
} from "@/lib/supabase/types";
import type { OrderDraft, OrderStatus, PublicOrder, StoreOrder } from "@/lib/types";

// Mapeamento puro entre o banco (snake_case, JSON das funções SQL) e o domínio.
// Separado do repositório para testar sem o cliente do servidor (cookies do Next).

/** Segredo que autoriza as funções SQL de escrita. Cita só o NOME da variável nos erros. */
export function readOrdersSecret(env: Record<string, string | undefined>): string {
  const secret = usableOrdersSecret(env.ORDERS_RPC_SECRET);
  if (!secret) {
    throw new Error(
      `A variável ORDERS_RPC_SECRET não está configurada ou tem menos de ${MIN_ORDERS_SECRET_LENGTH} caracteres.`
    );
  }
  return secret;
}

/** JSON que `create_store_order` lê (as chaves são as da migration). */
export function orderDraftToRpc(draft: OrderDraft) {
  return {
    customer: { ...draft.customer },
    address: { ...draft.address },
    shipping: { ...draft.shipping },
    items: draft.items.map((item) => ({ ...item })),
    subtotalCents: draft.subtotalCents,
    discountCents: draft.discountCents,
    couponCode: draft.couponCode,
    feeCents: draft.feeCents,
    totalCents: draft.totalCents,
    paymentMethod: draft.paymentMethod,
    environment: draft.environment ?? "production",
  };
}

export function orderRowToDomain(row: StoreOrderRow, items: StoreOrderItemRow[]): StoreOrder {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    environment: row.environment === "sandbox" ? "sandbox" : "production",
    customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone },
    address: {
      cep: row.ship_cep,
      street: row.ship_street,
      number: row.ship_number,
      complement: row.ship_complement,
      district: row.ship_district,
      city: row.ship_city,
      state: row.ship_state,
    },
    shipping: { optionId: row.ship_option_id, label: row.ship_label, cents: row.shipping_cents },
    items: items.map((item) => ({
      productId: item.product_id ?? "",
      variantId: item.variant_id,
      name: item.name,
      size: item.size,
      colorName: item.color_name,
      unitPriceCents: item.unit_price_cents,
      quantity: item.quantity,
      weightGrams: item.weight_grams,
    })),
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    couponCode: row.coupon_code,
    feeCents: row.fee_cents,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    checkoutId: row.asaas_checkout_id,
    trackingCode: row.tracking_code,
    notes: row.notes,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

const STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "paid_review",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
  "expired",
];

/** JSON de `get_store_order_public` → `PublicOrder`; formato inesperado vira `null`. */
export function publicOrderFromJson(json: unknown): PublicOrder | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.number !== "number" ||
    typeof o.status !== "string" ||
    !STATUSES.includes(o.status as OrderStatus) ||
    !Array.isArray(o.items)
  ) {
    return null;
  }
  return {
    id: o.id,
    number: o.number,
    status: o.status as OrderStatus,
    items: o.items as PublicOrder["items"],
    subtotalCents: Number(o.subtotalCents),
    discountCents: Number(o.discountCents),
    shippingCents: Number(o.shippingCents),
    feeCents: Number(o.feeCents),
    totalCents: Number(o.totalCents),
    paymentMethod: o.paymentMethod as PublicOrder["paymentMethod"],
    trackingCode: typeof o.trackingCode === "string" ? o.trackingCode : null,
  };
}

export function orderFulfillmentPatchToRow(patch: {
  status?: OrderStatus;
  trackingCode?: string | null;
  notes?: string | null;
}) {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.trackingCode !== undefined) row.tracking_code = patch.trackingCode;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

export function paymentFeesFromRow(row: StorePaymentSettingsRow | null): PaymentFees {
  if (!row) return structuredClone(DEFAULT_PAYMENT_FEES);
  return {
    pix: { fixedCents: row.pix_fixed_cents, percentBp: row.pix_percent_bp },
    cardSingle: { fixedCents: row.card_single_fixed_cents, percentBp: row.card_single_percent_bp },
    cardInstallments: {
      fixedCents: row.card_installments_fixed_cents,
      percentBp: row.card_installments_percent_bp,
    },
    maxInstallments: row.max_installments,
  };
}

export function paymentFeesToRow(fees: PaymentFees) {
  return {
    pix_fixed_cents: fees.pix.fixedCents,
    pix_percent_bp: fees.pix.percentBp,
    card_single_fixed_cents: fees.cardSingle.fixedCents,
    card_single_percent_bp: fees.cardSingle.percentBp,
    card_installments_fixed_cents: fees.cardInstallments.fixedCents,
    card_installments_percent_bp: fees.cardInstallments.percentBp,
    max_installments: fees.maxInstallments,
  };
}
