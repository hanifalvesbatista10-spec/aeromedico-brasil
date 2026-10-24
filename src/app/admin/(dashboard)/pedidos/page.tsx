import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { ADMIN_ORDERS_LIMIT } from "@/lib/repositories/types";
import { OrdersManager } from "@/components/admin/orders-manager";
import { PaymentTermsPanel } from "@/components/admin/payment-terms-panel";
import { EmptyState } from "@/components/empty-state";
import type { PaymentTerms } from "@/lib/payments/terms";
import type { StoreOrder } from "@/lib/types";

export default async function AdminPedidosPage() {
  let orders: StoreOrder[];
  let terms: PaymentTerms;
  try {
    const repositories = getRepositories();
    [orders, terms] = await Promise.all([repositories.orders.list(), repositories.paymentSettings.get()]);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin/pedidos] tabelas indisponíveis", error instanceof Error ? error.name : "erro");
    return (
      <EmptyState
        title="Não foi possível carregar os pedidos."
        description="Se a migration 20261022120000_store_orders.sql ainda não foi aplicada no Supabase do projeto, aplique-a e recarregue esta página."
      />
    );
  }

  return (
    <div className="space-y-12">
      <OrdersManager
        initialOrders={orders}
        showingLatest={orders.length >= ADMIN_ORDERS_LIMIT ? ADMIN_ORDERS_LIMIT : undefined}
      />
      <PaymentTermsPanel initialTerms={terms} />
    </div>
  );
}
