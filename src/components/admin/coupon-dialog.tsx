"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveStoreCoupon } from "@/lib/actions/coupons";
import {
  couponFormToInput,
  couponToForm,
  emptyCouponForm,
  type CouponForm,
} from "@/lib/store/coupon-drafts";
import type { StoreCoupon } from "@/lib/types";

/**
 * Cria ou edita um cupom. É montado só enquanto o diálogo está aberto (o
 * gerenciador usa `key`), então o estado sempre começa do cupom editado.
 */
export function CouponDialog({
  coupon,
  onSaved,
  onClose,
}: {
  coupon: StoreCoupon | null;
  onSaved: (coupon: StoreCoupon) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CouponForm>(coupon ? couponToForm(coupon) : emptyCouponForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveStoreCoupon({ id: coupon?.id, ...couponFormToInput(form) });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      onSaved(result.data);
      onClose();
    } catch {
      setError("Não foi possível salvar agora. Atualize a página e tente de novo.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{coupon ? "Editar cupom" : "Novo cupom"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Código</Label>
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ex.: VERAO10"
              autoCapitalize="characters"
            />
            <p className="text-xs text-gray-600">
              O cliente digita este código no carrinho. Não diferencia maiúsculas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-kind">Tipo de desconto</Label>
              <select
                id="coupon-kind"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as CouponForm["kind"], value: "" })
                }
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">
                {form.kind === "percent" ? "Percentual (%)" : "Valor (R$)"}
              </Label>
              <Input
                id="coupon-value"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.kind === "percent" ? "Ex.: 10" : "Ex.: 20,00"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-min">Pedido mínimo (R$)</Label>
            <Input
              id="coupon-min"
              inputMode="decimal"
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
              placeholder="Vazio = sem mínimo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-starts">Início</Label>
              <Input
                id="coupon-starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-expires">Fim</Label>
              <Input
                id="coupon-expires"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-600">
            Deixe vazio para valer sem data de início ou de fim. Horário de Brasília.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-max-uses">Limite de usos</Label>
              <Input
                id="coupon-max-uses"
                inputMode="numeric"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Vazio = sem limite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-uses-count">Usos já feitos</Label>
              <Input
                id="coupon-uses-count"
                inputMode="numeric"
                value={form.usesCount}
                onChange={(e) => setForm({ ...form, usesCount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="coupon-active"
              type="checkbox"
              className="size-4 rounded border-border"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <Label htmlFor="coupon-active" className="font-normal">
              Cupom ativo
            </Label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
