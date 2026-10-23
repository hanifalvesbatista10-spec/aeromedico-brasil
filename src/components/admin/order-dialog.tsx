"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateOrderFulfillment } from "@/lib/actions/orders";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  checkFulfillmentChange,
  nextStatuses,
  orderCode,
} from "@/lib/orders/fulfillment";
import { formatBRL } from "@/lib/money";
import { formatCep } from "@/lib/shipping/cep";
import { formatDateTimeLocal } from "@/lib/store/coupon-drafts";
import type { OrderStatus, StoreOrder } from "@/lib/types";

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Marcar em separação",
  shipped: "Marcar como enviado",
  delivered: "Marcar como entregue",
  canceled: "Cancelar pedido",
};

/** Texto anunciado depois que a situação muda ("Pedido AB-000001: enviado."). */
const DONE_TEXT: Partial<Record<OrderStatus, string>> = {
  preparing: "em separação",
  shipped: "enviado",
  delivered: "entregue",
  canceled: "cancelado",
};

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex justify-between gap-4 border-t border-border pt-2 font-semibold text-navy-950"
          : "flex justify-between gap-4 text-gray-700"
      }
    >
      <dt>{label}</dt> <dd>{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold text-navy-950">{title}</h3>
      <div className="space-y-1 text-sm text-gray-700">{children}</div>
    </section>
  );
}

/**
 * Detalhe de um pedido e troca de situação. O servidor confere a transição de
 * novo; a checagem daqui só poupa a viagem quando o código de rastreio falta.
 */
export function OrderDialog({
  order,
  onChanged,
  onAnnounce,
  onClose,
}: {
  order: StoreOrder;
  onChanged: (order: StoreOrder, announcement: string) => void;
  onAnnounce: (text: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Aviso curto DENTRO do diálogo: o diálogo é modal, então a região de status
  // da página fica escondida do leitor de tela enquanto ele está aberto.
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingInvalid, setTrackingInvalid] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const trackingRef = useRef<HTMLInputElement>(null);
  const returnFocusToCancel = useRef(false);

  const code = orderCode(order.number);
  const next = nextStatuses(order);
  const forward = next.filter((status) => status !== "canceled");
  const canCancel = next.includes("canceled");
  const warningId = `cancel-warning-${order.id}`;

  useEffect(() => {
    if (confirmCancel) {
      // O botão que abriu a confirmação saiu da tela: o foco vai para o botão novo.
      confirmRef.current?.focus();
    } else if (returnFocusToCancel.current) {
      // "Voltar" fechou a confirmação: o foco volta para quem a abriu.
      returnFocusToCancel.current = false;
      cancelRef.current?.focus();
    }
  }, [confirmCancel]);

  async function change(status: OrderStatus) {
    if (busy) return;
    setError(null);
    setTrackingInvalid(false);

    const trackingCode = status === "shipped" ? tracking : undefined;
    const checked = checkFulfillmentChange(order, { status, trackingCode });
    if (!checked.ok) {
      setError(checked.error);
      if (status === "shipped") {
        setTrackingInvalid(true);
        trackingRef.current?.focus();
      }
      return;
    }

    setBusy(status);
    try {
      const result = await updateOrderFulfillment(
        order.id,
        trackingCode === undefined ? { status } : { status, trackingCode }
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmCancel(false);
      onChanged(result.data, `Pedido ${code}: ${DONE_TEXT[status] ?? ORDER_STATUS_LABELS[status].toLowerCase()}.`);
      // Os botões da situação anterior saíram da tela: o foco fica na situação.
      statusRef.current?.focus();
    } catch {
      setError("Não foi possível salvar agora. Atualize a página e tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  async function copyTracking() {
    if (!order.trackingCode) return;
    try {
      await navigator.clipboard.writeText(order.trackingCode);
      setNote("Código de rastreio copiado.");
      onAnnounce("Código de rastreio copiado.");
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie à mão.");
    }
  }

  const address = order.address;
  const street = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        initialFocus={statusRef}
        className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{`Pedido ${code}`}</DialogTitle>
          <DialogDescription>
            <span suppressHydrationWarning>{`Feito em ${formatDateTimeLocal(order.createdAt)}`}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <p ref={statusRef} tabIndex={-1} className="text-sm font-medium text-navy-950 outline-none">
            Situação:{" "}
            <Badge variant={order.status === "paid_review" ? "destructive" : "secondary"}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            {order.environment === "sandbox" && (
              <>
                {" "}
                <Badge variant="outline">Teste (sandbox)</Badge>
              </>
            )}
          </p>

          {order.environment === "sandbox" && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              Pedido de teste: foi feito no ambiente de testes do Asaas, com dinheiro de mentira. Não
              separe nem envie.
            </p>
          )}

          {order.status === "paid_review" && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              O pagamento foi confirmado, mas o estoque não cobriu a compra, então nenhum item foi
              descontado do estoque. Confira o estoque ou fale com o cliente antes de separar.
            </p>
          )}

          <Section title="Comprador">
            <p>{order.customer.name}</p>
            <p>{order.customer.email}</p>
            <p>{order.customer.phone}</p>
          </Section>

          <Section title="Entrega">
            <p>{street}</p>
            <p>{address.district}</p>
            <p>{`${address.city}/${address.state}`}</p>
            <p>{`CEP ${formatCep(address.cep)}`}</p>
          </Section>

          <Section title="Itens">
            <ul className="divide-y divide-border">
              {order.items.map((item, index) => (
                <li key={`${item.productId}-${item.variantId ?? "-"}-${index}`} className="flex justify-between gap-4 py-1">
                  <span>
                    <span className="font-medium text-navy-950">{`${item.quantity}x ${item.name}`}</span>
                    {(item.size || item.colorName) && (
                      <span className="block text-gray-600">
                        {[item.size, item.colorName].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{formatBRL(item.unitPriceCents * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatBRL(order.subtotalCents)} />
            {order.discountCents > 0 && (
              <Row
                label={order.couponCode ? `Desconto (${order.couponCode})` : "Desconto"}
                value={`-${formatBRL(order.discountCents)}`}
              />
            )}
            <Row label={`Frete (${order.shipping.label})`} value={formatBRL(order.shipping.cents)} />
            {order.feeCents > 0 && <Row label="Taxa de pagamento" value={formatBRL(order.feeCents)} />}
            <Row label="Total" value={formatBRL(order.totalCents)} strong />
          </dl>
          <p className="text-sm text-gray-700">{`Forma de pagamento: ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`}</p>

          {order.trackingCode && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
              <span>
                Código de rastreio:{" "}
                <span className="font-mono font-medium text-navy-950">{order.trackingCode}</span>
              </span>
              <Button variant="outline" size="sm" onClick={() => void copyTracking()}>
                Copiar código
              </Button>
            </div>
          )}

          <p role="status" className={note ? "text-sm text-green-800" : "sr-only"}>
            {note}
          </p>

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-navy-950">Atualizar situação</h3>

            {next.length === 0 && (
              <p className="text-sm text-gray-600">
                {order.status === "awaiting_payment"
                  ? "Este pedido aguarda o pagamento. A situação muda sozinha quando o Asaas avisar."
                  : "Nada a marcar neste pedido."}
              </p>
            )}

            {order.status === "preparing" && (
              <div className="space-y-1">
                <Label htmlFor="order-tracking">Código de rastreio</Label>
                <Input
                  id="order-tracking"
                  ref={trackingRef}
                  value={tracking}
                  aria-invalid={trackingInvalid}
                  onChange={(e) => {
                    setTracking(e.target.value);
                    setError(null);
                    setTrackingInvalid(false);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Ex.: AA123456789BR"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {forward.map((status) => (
                <Button
                  key={status}
                  aria-disabled={busy !== null}
                  className="aria-disabled:opacity-60"
                  onClick={() => void change(status)}
                >
                  {busy === status ? "Salvando…" : ACTION_LABELS[status]}
                </Button>
              ))}
              {canCancel && !confirmCancel && (
                <Button
                  ref={cancelRef}
                  variant="outline"
                  aria-disabled={busy !== null}
                  className="aria-disabled:opacity-60"
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancelar pedido
                </Button>
              )}
            </div>

            {confirmCancel && (
              <div className="space-y-3 rounded-md border border-border bg-gray-50 p-3">
                <p id={warningId} className="text-sm text-gray-700">
                  Cancelar aqui só muda a situação do pedido no site. Não devolve o dinheiro. Se o cliente
                  já pagou, faça o estorno no painel do Asaas e ajuste o estoque à mão.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    ref={confirmRef}
                    variant="destructive"
                    aria-describedby={warningId}
                    aria-disabled={busy !== null}
                    className="aria-disabled:opacity-60"
                    onClick={() => void change("canceled")}
                  >
                    {busy === "canceled" ? "Salvando…" : "Confirmar cancelamento"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      returnFocusToCancel.current = true;
                      setConfirmCancel(false);
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
