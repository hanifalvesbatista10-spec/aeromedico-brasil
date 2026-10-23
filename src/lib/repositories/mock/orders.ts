import type { OrderDraft, OrderStatus, PublicOrder, StoreOrder } from "@/lib/types";
import { ADMIN_ORDERS_LIMIT, type ApplyEventResult, type OrderRepository } from "../types";

export interface MockOrderRepository extends OrderRepository {
  /** Estado que o banco alteraria: estoque por variação e usos por cupom. */
  inspect(): { stock: Record<string, number | null>; couponUses: Record<string, number> };
}

// Implementação em memória, só para os testes. Espelha as regras das funções
// SQL de supabase/migrations/20261022120000_store_orders.sql.
export function createMockOrderRepository(
  initial: { stock?: Record<string, number | null>; couponUses?: Record<string, number> } = {}
): MockOrderRepository {
  const stock: Record<string, number | null> = { ...(initial.stock ?? {}) };
  const couponUses: Record<string, number> = { ...(initial.couponUses ?? {}) };
  const orders: StoreOrder[] = [];
  const tokens = new Map<string, string>();
  const events = new Set<string>();
  let counter = 1000;

  const find = (id: string) => orders.find((order) => order.id === id);
  const findByCheckout = (checkoutId: string) =>
    orders.find((order) => order.checkoutId !== null && order.checkoutId === checkoutId);
  const copy = (order: StoreOrder): StoreOrder => structuredClone(order);

  function lineTotals(order: StoreOrder) {
    const byVariant = new Map<string, number>();
    for (const item of order.items) {
      if (item.variantId) {
        byVariant.set(item.variantId, (byVariant.get(item.variantId) ?? 0) + item.quantity);
      }
    }
    return byVariant;
  }

  return {
    inspect: () => ({ stock: { ...stock }, couponUses: { ...couponUses } }),

    async create(draft: OrderDraft) {
      const itemsSum = draft.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
      if (itemsSum !== draft.subtotalCents) throw new Error("subtotal não confere com os itens");
      const expectedTotal =
        draft.subtotalCents - draft.discountCents + draft.shipping.cents + draft.feeCents;
      if (draft.totalCents !== expectedTotal) throw new Error("total não confere");

      const id = crypto.randomUUID();
      const accessToken = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
      counter += 1;
      orders.unshift({
        ...structuredClone(draft),
        id,
        number: counter,
        status: "awaiting_payment",
        environment: draft.environment ?? "production",
        checkoutId: null,
        trackingCode: null,
        notes: null,
        createdAt: new Date().toISOString(),
        paidAt: null,
      });
      tokens.set(id, accessToken);
      return { id, number: counter, accessToken };
    },

    async attachCheckout(orderId, checkout) {
      const order = find(orderId);
      if (!order || order.status !== "awaiting_payment" || order.checkoutId !== null) {
        throw new Error("pedido não encontrado ou já vinculado");
      }
      order.checkoutId = checkout.id;
    },

    async cancelPending(orderId) {
      const order = find(orderId);
      if (order && order.status === "awaiting_payment" && order.checkoutId === null) {
        order.status = "canceled";
      }
    },

    async applyEvent(event): Promise<ApplyEventResult> {
      const order = findByCheckout(event.checkoutId);
      if (events.has(event.eventId)) return "duplicate";
      events.add(event.eventId);
      if (!order) return "ignored";

      if (event.type === "CHECKOUT_PAID") {
        // Pago depois de cancelado: o dinheiro entrou, então o dono precisa ver (nada é baixado).
        if (order.status === "canceled") {
          order.status = "paid_review";
          order.paidAt = new Date().toISOString();
          return "paid_review";
        }
        if (order.status !== "awaiting_payment" && order.status !== "expired") return "ignored";
        const needed = lineTotals(order);
        const enough = [...needed].every(([variantId, quantity]) => {
          const available = stock[variantId];
          return available === undefined || available === null || available >= quantity;
        });
        order.paidAt = new Date().toISOString();
        if (!enough) {
          order.status = "paid_review";
          return "paid_review";
        }
        for (const [variantId, quantity] of needed) {
          const available = stock[variantId];
          if (available !== undefined && available !== null) stock[variantId] = available - quantity;
        }
        // Como o SQL: o código do cupom não diferencia maiúsculas.
        const couponKey = order.couponCode
          ? Object.keys(couponUses).find((key) => key.toUpperCase() === order.couponCode!.toUpperCase())
          : undefined;
        if (couponKey !== undefined) couponUses[couponKey] += 1;
        order.status = "paid";
        return "paid";
      }
      if (event.type === "CHECKOUT_CANCELED") {
        if (order.status !== "awaiting_payment") return "ignored";
        order.status = "canceled";
        return "canceled";
      }
      if (event.type === "CHECKOUT_EXPIRED") {
        if (order.status !== "awaiting_payment") return "ignored";
        order.status = "expired";
        return "expired";
      }
      return "ignored";
    },

    async getPublic(orderId, token): Promise<PublicOrder | null> {
      const order = find(orderId);
      if (!order || tokens.get(orderId) !== token) return null;
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        items: order.items.map((item) => ({
          name: item.name,
          size: item.size,
          colorName: item.colorName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        })),
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingCents: order.shipping.cents,
        feeCents: order.feeCents,
        totalCents: order.totalCents,
        paymentMethod: order.paymentMethod,
        trackingCode: order.trackingCode,
      };
    },

    async list() {
      return orders.slice(0, ADMIN_ORDERS_LIMIT).map(copy);
    },

    async getById(id) {
      const order = find(id);
      return order ? copy(order) : null;
    },

    async updateFulfillment(id, patch) {
      const order = find(id);
      if (!order) return null;
      if (patch.status !== undefined) order.status = patch.status as OrderStatus;
      if (patch.trackingCode !== undefined) order.trackingCode = patch.trackingCode;
      if (patch.notes !== undefined) order.notes = patch.notes;
      return copy(order);
    },
  };
}
