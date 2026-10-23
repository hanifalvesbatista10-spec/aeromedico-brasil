import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { OrdersManager } from "@/components/admin/orders-manager";
import { PaymentFeesPanel } from "@/components/admin/payment-fees-panel";
import { EmptyState } from "@/components/empty-state";
import type { PaymentFees } from "@/lib/payments/fees";
import type { StoreOrder } from "@/lib/types";

export default async function AdminPedidosPage() {
  let orders: StoreOrder[];
  let fees: PaymentFees;
  try {
    const repositories = getRepositories();
    [orders, fees] = await Promise.all([repositories.orders.list(), repositories.paymentSettings.get()]);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[admin/pedidos] tabelas indisponíveis", error);
    return (
      <EmptyState
        title="Não foi possível carregar os pedidos."
        description="Se a migration 20261022120000_store_orders.sql ainda não foi aplicada no Supabase do projeto, aplique-a e recarregue esta página."
      />
    );
  }

  return (
    <div className="space-y-12">
      <OrdersManager initialOrders={orders} />
      <PaymentFeesPanel initialFees={fees} />
    </div>
  );
}
