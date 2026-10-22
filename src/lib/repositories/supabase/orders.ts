import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StoreOrderItemRow, StoreOrderRow } from "@/lib/supabase/types";
import type { ApplyEventResult, OrderRepository } from "../types";
import {
  orderDraftToRpc,
  orderFulfillmentPatchToRow,
  orderRowToDomain,
  publicOrderFromJson,
  readOrdersSecret,
} from "./orders-mapping";

type OrderWithItems = StoreOrderRow & { store_order_items: StoreOrderItemRow[] };

const RESULTS: ApplyEventResult[] = [
  "paid",
  "paid_review",
  "duplicate",
  "ignored",
  "canceled",
  "expired",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Escrita de pedido e confirmação de pagamento passam por funções SQL que exigem
// o segredo do servidor (ORDERS_RPC_SECRET): não há service_role. A leitura do
// painel respeita a RLS do administrador logado.
async function callWithSecret<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const secret = readOrdersSecret(process.env);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(name, { p_secret: secret, ...args });
  if (error) throw new Error(`Falha em ${name}: ${error.message}`);
  return data as T;
}

export function createSupabaseOrderRepository(): OrderRepository {
  return {
    async create(draft) {
      const data = await callWithSecret<{ id: string; number: number; access_token: string }>(
        "create_store_order",
        { p_order: orderDraftToRpc(draft) }
      );
      return { id: data.id, number: Number(data.number), accessToken: data.access_token };
    },

    async attachCheckout(orderId, checkout) {
      await callWithSecret("attach_store_order_checkout", {
        p_order_id: orderId,
        p_checkout_id: checkout.id,
        p_checkout_url: checkout.url,
      });
    },

    async cancelPending(orderId) {
      await callWithSecret("cancel_store_order_pending", { p_order_id: orderId });
    },

    async applyEvent(event) {
      const result = await callWithSecret<string>("apply_store_order_event", {
        p_event_id: event.eventId,
        p_type: event.type,
        p_checkout_id: event.checkoutId,
        p_payload: event.payload ?? {},
      });
      return RESULTS.includes(result as ApplyEventResult) ? (result as ApplyEventResult) : "ignored";
    },

    async getPublic(orderId, token) {
      // Id que nem é um UUID nunca existe: mesma resposta de pedido inexistente.
      if (!UUID.test(orderId) || !token) return null;
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc("get_store_order_public", {
        p_order_id: orderId,
        p_token: token,
      });
      if (error) return null;
      return publicOrderFromJson(data);
    },

    async list() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_orders")
        .select("*, store_order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
      return (data as OrderWithItems[]).map((row) => orderRowToDomain(row, row.store_order_items));
    },

    async updateFulfillment(id, patch) {
      const supabase = await createServerSupabaseClient();
      const row = orderFulfillmentPatchToRow(patch);
      const query =
        Object.keys(row).length === 0
          ? supabase.from("store_orders").select("*, store_order_items(*)").eq("id", id)
          : supabase
              .from("store_orders")
              .update(row)
              .eq("id", id)
              .select("*, store_order_items(*)");
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`Falha ao atualizar pedido: ${error.message}`);
      if (!data) return null;
      const order = data as OrderWithItems;
      return orderRowToDomain(order, order.store_order_items);
    },
  };
}
