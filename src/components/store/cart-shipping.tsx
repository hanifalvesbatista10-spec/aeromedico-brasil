"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quoteShippingAction } from "@/lib/actions/shipping";
import type { CartLine } from "@/lib/cart/cart";
import { formatBRL } from "@/lib/money";
import { normalizeCep } from "@/lib/shipping/cep";
import type { ShippingOption } from "@/lib/shipping/types";

/** Opção de entrega escolhida, válida só para o carrinho (`signature`) que a originou. */
export interface ShippingSelection {
  label: string;
  /** CEP de destino, 8 dígitos. */
  cep: string;
  priceCents: number;
  signature: string;
}

interface Quote {
  signature: string;
  cep: string;
  options: ShippingOption[];
  selectedId: string;
}

type Notice = { kind: "alert" | "status"; text: string };

function maskCep(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function optionLabel(option: ShippingOption): string {
  return `${option.company} ${option.name}`.trim();
}

function deliveryText(days: number | null): string {
  if (days === null) return "prazo não informado";
  return `até ${days} ${days === 1 ? "dia útil" : "dias úteis"}`;
}

/**
 * CEP, cotação e escolha da entrega. A cotação vale só para o conteúdo do
 * carrinho em que foi pedida: se `signature` muda, as opções somem e a escolha
 * deixa de valer (quem usa a seleção confere a assinatura).
 */
export function CartShipping({
  lines,
  signature,
  onSelect,
}: {
  lines: CartLine[];
  signature: string;
  onSelect: (selection: ShippingSelection | null) => void;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const latestRequest = useRef(0);

  const canQuote = normalizeCep(cep) !== null && !loading;
  const stale = quote !== null && quote.signature !== signature;

  function select(current: Quote, id: string) {
    const option = current.options.find((item) => item.id === id);
    if (!option) return;
    onSelect({
      label: optionLabel(option),
      cep: current.cep,
      priceCents: option.priceCents,
      signature: current.signature,
    });
  }

  async function handleQuote() {
    const request = ++latestRequest.current;
    const requestedSignature = signature;
    setLoading(true);
    setNotice(null);
    try {
      const result = await quoteShippingAction(lines, cep);
      if (request !== latestRequest.current) return;
      if (!result.ok) {
        setQuote(null);
        onSelect(null);
        setNotice({
          kind: result.code === "unconfigured" ? "status" : "alert",
          text: result.error,
        });
        return;
      }
      const next: Quote = {
        signature: requestedSignature,
        cep: result.cep,
        options: result.options,
        selectedId: result.options[0].id,
      };
      setQuote(next);
      select(next, next.selectedId);
    } catch {
      if (request !== latestRequest.current) return;
      setQuote(null);
      onSelect(null);
      setNotice({
        kind: "alert",
        text: "Não foi possível calcular o frete agora. Tente de novo.",
      });
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }

  function handleChoose(id: string) {
    if (!quote) return;
    const next = { ...quote, selectedId: id };
    setQuote(next);
    select(next, id);
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canQuote) void handleQuote();
        }}
        className="space-y-2"
      >
        <Label htmlFor="cart-cep">CEP de entrega</Label>
        <div className="flex gap-2">
          <Input
            id="cart-cep"
            value={cep}
            onChange={(e) => setCep(maskCep(e.target.value))}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            className="h-11"
          />
          <Button type="submit" variant="outline" className="h-11" disabled={!canQuote}>
            Calcular frete
          </Button>
        </div>
      </form>

      {notice && (
        <p
          role={notice.kind}
          className={notice.kind === "alert" ? "mt-2 text-sm text-red-800" : "mt-2 text-sm text-gray-600"}
        >
          {notice.text}
        </p>
      )}

      {stale && (
        <p className="mt-2 text-sm text-amber-800">O carrinho mudou. Calcule o frete de novo.</p>
      )}

      {quote && !stale && (
        <fieldset className="mt-3 space-y-2">
          <legend className="text-sm font-medium text-navy-950">Opções de entrega</legend>
          {quote.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm has-[:checked]:border-navy-700 has-[:checked]:bg-navy-950/5"
            >
              <input
                type="radio"
                name="shipping-option"
                className="mt-1 size-4"
                checked={quote.selectedId === option.id}
                onChange={() => handleChoose(option.id)}
              />
              <span>
                {`${optionLabel(option)} · ${formatBRL(option.priceCents)} · ${deliveryText(option.deliveryDays)}`}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
