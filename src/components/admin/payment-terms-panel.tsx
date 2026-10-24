"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePaymentTerms } from "@/lib/actions/orders";
import type { PaymentTerms } from "@/lib/payments/terms";
import { termsToForm, type PaymentTermsForm } from "@/lib/validation/payment-terms";

/**
 * Condições de pagamento da loja: desconto no Pix e máximo de parcelas. Não há taxa
 * extra para quem paga no cartão. A conversão do percentual para pontos-base é do servidor.
 */
export function PaymentTermsPanel({ initialTerms }: { initialTerms: PaymentTerms }) {
  const [form, setForm] = useState<PaymentTermsForm>(() => termsToForm(initialTerms));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Região de status sempre montada: é ela que o leitor de tela anuncia, e quando
  // tem texto também é a confirmação visível.
  const [announcement, setAnnouncement] = useState("");

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setAnnouncement("");
    try {
      const result = await savePaymentTerms(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(termsToForm(result.data));
      setAnnouncement("Condições salvas. Valem para os próximos pedidos.");
    } catch {
      setError("Não foi possível salvar agora. Atualize a página e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="terms-title" className="space-y-6">
      <div>
        <h2 id="terms-title" className="font-heading text-base font-semibold text-navy-950">
          Condições de pagamento
        </h2>
        <p className="text-sm text-gray-600">
          O Pix tem um desconto automático sobre o valor dos produtos (depois do cupom, sem contar o frete). No
          cartão não há taxa extra: o comprador paga o preço da vitrine, então o custo do Asaas precisa estar
          no preço dos produtos. Mudar aqui vale só para os próximos pedidos.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-5"
      >
        <div className="max-w-md space-y-1">
          <Label htmlFor="terms-pix-discount">Desconto no Pix (%)</Label>
          <Input
            id="terms-pix-discount"
            inputMode="decimal"
            placeholder="Ex.: 5"
            aria-describedby="terms-pix-discount-hint"
            value={form.pixDiscount}
            onChange={(e) => setForm((current) => ({ ...current, pixDiscount: e.target.value }))}
          />
          <p id="terms-pix-discount-hint" className="text-xs text-gray-600">
            De 0 a 50. Use 0 para não dar desconto no Pix.
          </p>
        </div>

        <div className="max-w-md space-y-1">
          <Label htmlFor="terms-max-installments">Máximo de parcelas no cartão</Label>
          <Input
            id="terms-max-installments"
            inputMode="numeric"
            aria-describedby="terms-max-installments-hint"
            value={form.maxInstallments}
            onChange={(e) => setForm((current) => ({ ...current, maxInstallments: e.target.value }))}
          />
          <p id="terms-max-installments-hint" className="text-xs text-gray-600">
            Digite um número de 1 a 21. Use 1 para não oferecer parcelamento. O Asaas cobra mais caro em
            faixas maiores de parcelas: confira no contrato antes de aumentar.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <p
          data-testid="terms-announcer"
          role="status"
          className={announcement ? "text-sm text-green-800" : "sr-only"}
        >
          {announcement}
        </p>

        <Button type="submit" aria-disabled={saving} className="aria-disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar condições"}
        </Button>
      </form>
    </section>
  );
}
