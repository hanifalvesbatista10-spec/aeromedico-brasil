"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { OrderDialog } from "@/components/admin/order-dialog";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  orderCode,
} from "@/lib/orders/fulfillment";
import { formatBRL } from "@/lib/money";
import { formatDateTimeLocal } from "@/lib/store/coupon-drafts";
import type { OrderStatus, StoreOrder } from "@/lib/types";

type Filter = "all" | OrderStatus;

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function StatusBadges({ order }: { order: StoreOrder }) {
  const variant =
    order.status === "paid_review" ? "destructive" : order.status === "paid" ? "default" : "secondary";
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Badge variant={variant}>{ORDER_STATUS_LABELS[order.status]}</Badge>
      {order.environment === "sandbox" && <Badge variant="outline">Teste (sandbox)</Badge>}
    </span>
  );
}

function countText(count: number): string {
  return `${count} ${count === 1 ? "pedido" : "pedidos"} na lista.`;
}

export function OrdersManager({
  initialOrders,
  showingLatest,
}: {
  initialOrders: StoreOrder[];
  /** Quando a lista foi cortada nos pedidos mais recentes: quantos são mostrados. */
  showingLatest?: number;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  // Região de status sempre montada: é ela que o leitor de tela anuncia.
  const [announcement, setAnnouncement] = useState("");

  const visible = filter === "all" ? orders : orders.filter((order) => order.status === filter);
  const selected = openId ? (orders.find((order) => order.id === openId) ?? null) : null;
  const reviewCount = orders.filter((order) => order.status === "paid_review").length;

  function handleChanged(updated: StoreOrder, text: string) {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
    setAnnouncement(text);
  }

  function handleFilter(value: Filter) {
    setFilter(value);
    const count = value === "all" ? orders.length : orders.filter((order) => order.status === value).length;
    setAnnouncement(countText(count));
  }

  const columns: DataTableColumn<StoreOrder>[] = [
    {
      key: "number",
      header: "Pedido",
      render: (o) => <span className="font-mono font-medium">{orderCode(o.number)}</span>,
    },
    {
      key: "date",
      header: "Data",
      render: (o) => <span suppressHydrationWarning>{formatDateTimeLocal(o.createdAt)}</span>,
    },
    { key: "buyer", header: "Comprador", render: (o) => o.customer.name },
    { key: "total", header: "Total", render: (o) => formatBRL(o.totalCents) },
    { key: "method", header: "Forma", render: (o) => PAYMENT_METHOD_LABELS[o.paymentMethod] },
    { key: "status", header: "Situação", render: (o) => <StatusBadges order={o} /> },
  ];

  return (
    <section aria-labelledby="orders-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="orders-title" className="font-heading text-base font-semibold text-navy-950">
            Pedidos
          </h2>
          <p className="text-sm text-gray-600">
            Pedidos feitos pelo site. Você marca a separação, o envio e a entrega.
          </p>
        </div>
        {orders.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="orders-filter">Filtrar por situação</Label>
            <select
              id="orders-filter"
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-base md:text-sm"
              value={filter}
              onChange={(e) => handleFilter(e.target.value as Filter)}
            >
              <option value="all">Todos</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <p data-testid="orders-announcer" role="status" className="sr-only">
        {announcement}
      </p>

      {showingLatest !== undefined && (
        <p className="text-sm text-gray-600">{`Mostrando os ${showingLatest} pedidos mais recentes.`}</p>
      )}

      {reviewCount > 0 && (
        <p
          data-testid="review-banner"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          {reviewCount === 1
            ? "1 pedido pago precisa de conferência."
            : `${reviewCount} pedidos pagos precisam de conferência.`}{" "}
          O estoque não cobriu a compra. Abra o pedido, confira o estoque ou fale com o cliente.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={visible}
        getRowId={(o) => o.id}
        emptyState={
          orders.length === 0 ? (
            <EmptyState
              title="Nenhum pedido ainda."
              description="Os pedidos feitos pelo site aparecem aqui."
            />
          ) : (
            <EmptyState
              title="Nenhum pedido com esta situação."
              description="Escolha outra situação no filtro."
            />
          )
        }
        rowActions={(o) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenId(o.id)}
            aria-label={`Ver detalhes do pedido ${orderCode(o.number)}`}
          >
            Ver detalhes
          </Button>
        )}
      />

      {selected && (
        <OrderDialog
          key={selected.id}
          order={selected}
          onChanged={handleChanged}
          onAnnounce={setAnnouncement}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}
