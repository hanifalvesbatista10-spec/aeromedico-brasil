import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/money";
import { orderCode } from "@/lib/orders/fulfillment";
import { cn } from "@/lib/utils";
import type { OrderStatus, PublicOrder } from "@/lib/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  paid_review:
    "Pagamento confirmado. Estamos conferindo a disponibilidade dos itens e vamos falar com você pelo e-mail ou telefone informado.",
  preparing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Pedido cancelado",
  expired: "Pedido expirado: o prazo para pagar terminou.",
};

const METHOD_LABELS: Record<PublicOrder["paymentMethod"], string> = {
  pix: "Pix",
  card_single: "Cartão à vista",
  card_installments: "Cartão parcelado",
};

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        strong ? "border-t border-border pt-3 text-base font-semibold text-navy-950" : "text-sm text-gray-600"
      )}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Resumo do pedido para o comprador. O status vem SEMPRE do banco (confirmado
 * por webhook); a volta do checkout não prova pagamento.
 */
export function OrderSummary({
  order,
  refreshHref,
}: {
  order: PublicOrder;
  /** Endereço desta mesma página (com a chave) para conferir o status de novo. */
  refreshHref?: string;
}) {
  const code = orderCode(order.number);
  const waiting = order.status === "awaiting_payment";

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-h1 font-heading font-bold text-navy-950">{`Pedido ${code}`}</h1>
      <p data-testid="order-status" className="mt-3 text-lg font-medium text-navy-700">
        {STATUS_LABELS[order.status]}
      </p>

      {waiting && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            Assim que o pagamento for confirmado, o status muda aqui. Se você já pagou, use o botão
            Atualizar para conferir. Guarde o endereço desta página para acompanhar o pedido.
          </p>
          {refreshHref && (
            <Link
              href={refreshHref}
              prefetch={false}
              className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-11")}
            >
              Atualizar
            </Link>
          )}
        </div>
      )}

      <ul aria-label="Itens do pedido" className="mt-8 divide-y divide-border border-y border-border">
        {order.items.map((item) => (
          <li key={`${item.name}-${item.size}-${item.colorName}`} className="flex justify-between gap-4 py-4">
            <div>
              <p className="font-medium text-navy-950">{`${item.quantity}x ${item.name}`}</p>
              {(item.size || item.colorName) && (
                <p className="mt-1 text-sm text-gray-600">
                  {[item.size, item.colorName].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm text-gray-600">{formatBRL(item.unitPriceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-2">
        <Row label="Subtotal" value={formatBRL(order.subtotalCents)} />
        {order.discountCents > 0 && (
          <Row label="Desconto" value={`-${formatBRL(order.discountCents)}`} />
        )}
        {order.pixDiscountCents > 0 && (
          <Row label="Desconto no Pix" value={`-${formatBRL(order.pixDiscountCents)}`} />
        )}
        <Row label="Frete" value={formatBRL(order.shippingCents)} />
        <Row label="Total" value={formatBRL(order.totalCents)} strong />
      </dl>

      <p className="mt-6 text-sm text-gray-600">Forma de pagamento: {METHOD_LABELS[order.paymentMethod]}</p>

      {order.trackingCode && (
        <p className="mt-2 text-sm text-gray-600">
          Código de rastreio: <span className="font-mono font-medium text-navy-950">{order.trackingCode}</span>
        </p>
      )}
    </article>
  );
}
