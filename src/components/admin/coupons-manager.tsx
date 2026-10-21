"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CouponDialog } from "@/components/admin/coupon-dialog";
import { EmptyState } from "@/components/empty-state";
import { deleteStoreCoupon, toggleStoreCouponActive } from "@/lib/actions/coupons";
import { formatBRL } from "@/lib/money";
import { COUPON_NOT_FOUND_MESSAGE } from "@/lib/cart/coupon";
import {
  couponStatus,
  describeCouponUses,
  describeCouponValue,
  formatDateTimeLocal,
} from "@/lib/store/coupon-drafts";
import type { StoreCoupon } from "@/lib/types";

type DialogState = { coupon: StoreCoupon | null } | null;

function validity(coupon: StoreCoupon): string {
  if (!coupon.startsAt && !coupon.expiresAt) return "Sem prazo";
  // No fuso do navegador: a data do banco é UTC e 23:59 de Brasília viraria o dia seguinte.
  const from = coupon.startsAt ? formatDateTimeLocal(coupon.startsAt) : null;
  const to = coupon.expiresAt ? formatDateTimeLocal(coupon.expiresAt) : null;
  if (from && to) return `${from} a ${to}`;
  return from ? `A partir de ${from}` : `Até ${to}`;
}

const byCode = (a: StoreCoupon, b: StoreCoupon) => a.code.localeCompare(b.code);

export function CouponsManager({ initialCoupons }: { initialCoupons: StoreCoupon[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreCoupon | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Região de status sempre montada: é ela que o leitor de tela anuncia.
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const now = new Date();

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch {
      setError("Não foi possível concluir agora. Atualize a página e tente de novo.");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(saved: StoreCoupon) {
    setCoupons((current) =>
      [...current.filter((item) => item.id !== saved.id), saved].sort(byCode)
    );
    setAnnouncement(`Cupom ${saved.code} salvo.`);
  }

  function handleToggle(coupon: StoreCoupon) {
    if (busyId !== null) return;
    void run(coupon.id, async () => {
      const updated = await toggleStoreCouponActive(coupon.id, !coupon.active);
      if (!updated) return;
      setCoupons((current) => current.map((item) => (item.id === coupon.id ? updated : item)));
      setAnnouncement(`Cupom ${updated.code} ${updated.active ? "ativado" : "desativado"}.`);
    });
  }

  function handleDelete(coupon: StoreCoupon) {
    void run(coupon.id, async () => {
      await deleteStoreCoupon(coupon.id);
      setCoupons((current) => current.filter((item) => item.id !== coupon.id));
      setAnnouncement(`Cupom ${coupon.code} excluído.`);
      // O botão "Excluir" saiu junto com a linha: o foco vai para o título da seção.
      titleRef.current?.focus();
    });
  }

  const columns: DataTableColumn<StoreCoupon>[] = [
    { key: "code", header: "Código", render: (c) => <span className="font-mono">{c.code}</span> },
    { key: "discount", header: "Desconto", render: (c) => describeCouponValue(c) },
    {
      key: "min",
      header: "Pedido mínimo",
      render: (c) => (c.minOrderCents > 0 ? formatBRL(c.minOrderCents) : "Sem mínimo"),
    },
    {
      key: "validity",
      header: "Validade",
      render: (c) => <span suppressHydrationWarning>{validity(c)}</span>,
    },
    { key: "uses", header: "Usos", render: describeCouponUses },
    {
      key: "status",
      header: "Situação",
      render: (c) => {
        const status = couponStatus(c, now);
        return <Badge variant={status === "Ativo" ? "default" : "secondary"}>{status}</Badge>;
      },
    },
  ];

  return (
    <section aria-labelledby="coupons-title" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="coupons-title"
            ref={titleRef}
            tabIndex={-1}
            className="font-heading text-base font-semibold text-navy-950 outline-none"
          >
            Cupons de desconto
          </h2>
          <p className="text-sm text-gray-600">
            O cliente aplica o código no carrinho. Um cupom por pedido.
          </p>
        </div>
        <Button onClick={() => setDialog({ coupon: null })}>Novo cupom</Button>
      </div>

      <p data-testid="coupons-announcer" role="status" className="sr-only">
        {announcement}
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={coupons}
        getRowId={(c) => c.id}
        emptyState={
          <EmptyState
            title="Nenhum cupom cadastrado."
            description="Clique em “Novo cupom” para criar o primeiro."
          />
        }
        rowActions={(c) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog({ coupon: c })}
              aria-label={`Editar ${c.code}`}
            >
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-disabled={busyId === c.id}
              className="aria-disabled:opacity-50"
              onClick={() => handleToggle(c)}
              aria-label={`${c.active ? "Desativar" : "Ativar"} ${c.code}`}
            >
              {c.active ? "Desativar" : "Ativar"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(c)}
              aria-label={`Excluir ${c.code}`}
            >
              Excluir
            </Button>
          </>
        )}
      />

      {dialog && (
        <CouponDialog
          key={dialog.coupon?.id ?? "novo"}
          coupon={dialog.coupon}
          onSaved={handleSaved}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir cupom"
        description={`Excluir o cupom "${deleteTarget?.code}"? Quem digitar esse código no carrinho verá "${COUPON_NOT_FOUND_MESSAGE}" Para só pausar, use Desativar.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </section>
  );
}
