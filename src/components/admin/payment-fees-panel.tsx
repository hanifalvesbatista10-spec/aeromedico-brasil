"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePaymentFees } from "@/lib/actions/orders";
import type { PaymentFees } from "@/lib/payments/fees";
import { feesToForm, type PaymentFeesForm } from "@/lib/validation/payment-fees";

type RuleKey = "pix" | "cardSingle" | "cardInstallments";

const RULES: { key: RuleKey; label: string; hint?: string }[] = [
  { key: "pix", label: "Pix" },
  { key: "cardSingle", label: "Cartão à vista" },
  { key: "cardInstallments", label: "Cartão parcelado", hint: "Vale de 2x até o máximo de parcelas." },
];

/**
 * Taxas do contrato do Asaas, repassadas ao cliente no total do pedido. O valor
 * digitado é o do contrato; a conversão para pontos-base e centavos é do servidor.
 */
export function PaymentFeesPanel({ initialFees }: { initialFees: PaymentFees }) {
  const [form, setForm] = useState<PaymentFeesForm>(() => feesToForm(initialFees));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Região de status sempre montada: é ela que o leitor de tela anuncia.
  const [announcement, setAnnouncement] = useState("");

  function setRule(key: RuleKey, field: "percent" | "fixed", value: string) {
    setForm((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setAnnouncement("");
    try {
      const result = await savePaymentFees(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm(feesToForm(result.data));
      setAnnouncement("Taxas salvas. Valem para os próximos pedidos.");
    } catch {
      setError("Não foi possível salvar agora. Atualize a página e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="fees-title" className="space-y-6">
      <div>
        <h2 id="fees-title" className="font-heading text-base font-semibold text-navy-950">
          Taxas de pagamento
        </h2>
        <p className="text-sm text-gray-600">
          Informe as taxas do seu contrato com o Asaas. O cliente paga a taxa junto com o pedido, então
          o que sobra para você é o valor dos produtos mais o frete. Mudar aqui vale só para os próximos
          pedidos.
        </p>
      </div>

      <p data-testid="fees-announcer" role="status" className="sr-only">
        {announcement}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-5"
      >
        {RULES.map(({ key, label, hint }) => (
          <fieldset key={key} className="space-y-2">
            <legend className="text-sm font-medium text-navy-950">{label}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`fee-${key}-percent`}>{`${label}: percentual (%)`}</Label>
                <Input
                  id={`fee-${key}-percent`}
                  inputMode="decimal"
                  value={form[key].percent}
                  onChange={(e) => setRule(key, "percent", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`fee-${key}-fixed`}>{`${label}: taxa fixa (R$)`}</Label>
                <Input
                  id={`fee-${key}-fixed`}
                  inputMode="decimal"
                  value={form[key].fixed}
                  onChange={(e) => setRule(key, "fixed", e.target.value)}
                />
              </div>
            </div>
            {hint && <p className="text-xs text-gray-600">{hint}</p>}
          </fieldset>
        ))}

        <div className="max-w-xs space-y-1">
          <Label htmlFor="fee-max-installments">Máximo de parcelas</Label>
          <Input
            id="fee-max-installments"
            inputMode="numeric"
            value={form.maxInstallments}
            onChange={(e) => setForm((current) => ({ ...current, maxInstallments: e.target.value }))}
          />
          <p className="text-xs text-gray-600">De 1 a 21.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" aria-disabled={saving} className="aria-disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar taxas"}
        </Button>
      </form>
    </section>
  );
}
