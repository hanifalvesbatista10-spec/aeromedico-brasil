"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quoteShippingAction } from "@/lib/actions/shipping";
import type { CartLine } from "@/lib/cart/cart";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { formatCep, normalizeCep } from "@/lib/shipping/cep";
import type { ShippingOption } from "@/lib/shipping/types";
import {
  cardClass,
  cardNoteClass,
  cardTitleClass,
  darkButtonClass,
  fieldClass,
  optionClass,
  radioClass,
} from "./cart-ui";

/** Opção de entrega escolhida, válida só para o carrinho (`signature`) que a originou. */
export interface ShippingSelection {
  /** Id da opção no Melhor Envio: o servidor refaz o frete por ele. */
  optionId: string;
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
 * carrinho em que foi pedida e para o CEP em que foi pedida: mudar um dos dois
 * apaga as opções e a escolha. Quem usa a seleção ainda confere a assinatura.
 * Tudo que muda o frete é anunciado por `onAnnounce` (leitor de tela).
 */
export function CartShipping({
  lines,
  signature,
  onSelect,
  onAnnounce,
}: {
  lines: CartLine[];
  signature: string;
  onSelect: (selection: ShippingSelection | null) => void;
  onAnnounce: (text: string) => void;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const latestRequest = useRef(0);

  const stale = quote !== null && quote.signature !== signature;

  // Sair da tela (ex.: erro ao reprecificar) desfaz a escolha: sem as opções
  // visíveis, o resumo não pode continuar cobrando um frete que ninguém vê.
  useEffect(() => () => onSelect(null), [onSelect]);

  useEffect(() => {
    if (stale) onAnnounce("O carrinho mudou. Calcule o frete de novo.");
  }, [stale, onAnnounce]);

  function select(current: Quote, id: string) {
    const option = current.options.find((item) => item.id === id);
    if (!option) return null;
    onSelect({
      optionId: option.id,
      label: optionLabel(option),
      cep: current.cep,
      priceCents: option.priceCents,
      signature: current.signature,
    });
    return option;
  }

  function handleCepChange(value: string) {
    const masked = maskCep(value);
    setCep(masked);
    // Outro CEP: a cotação anterior não vale mais.
    if (quote && masked !== formatCep(quote.cep)) {
      setQuote(null);
      onSelect(null);
    }
    setNotice(null);
  }

  async function handleQuote() {
    if (loading) return;
    if (normalizeCep(cep) === null) {
      setNotice({ kind: "alert", text: "Informe um CEP com 8 números." });
      return;
    }

    const request = ++latestRequest.current;
    const requestedSignature = signature;
    setLoading(true);
    setNotice(null);
    onSelect(null);
    try {
      const result = await quoteShippingAction(lines, cep);
      if (request !== latestRequest.current) return;
      if (!result.ok) {
        setQuote(null);
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
      const chosen = select(next, next.selectedId);
      if (chosen) {
        const count = result.options.length;
        onAnnounce(
          `Frete calculado: ${count} ${count === 1 ? "opção" : "opções"}. Entrega ${optionLabel(
            chosen
          )} selecionada: ${formatBRL(chosen.priceCents)}.`
        );
      }
    } catch {
      if (request !== latestRequest.current) return;
      setQuote(null);
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
    const chosen = select(next, id);
    if (chosen) {
      onAnnounce(`Entrega ${optionLabel(chosen)} selecionada: ${formatBRL(chosen.priceCents)}.`);
    }
  }

  return (
    <section aria-labelledby="cart-shipping-title" className={cardClass}>
      <h2 id="cart-shipping-title" className={cardTitleClass}>
        Entrega
        <span className={cardNoteClass}>Cálculo pelo Melhor Envio</span>
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleQuote();
        }}
        className="space-y-1.5"
      >
        <Label htmlFor="cart-cep" className="sr-only">
          CEP de entrega
        </Label>
        <div className="flex gap-2.5">
          <Input
            id="cart-cep"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            spellCheck={false}
            placeholder="CEP de entrega: 00000-000"
            className={fieldClass}
          />
          <button
            type="submit"
            aria-disabled={loading}
            className={cn(darkButtonClass, "inline-flex items-center")}
          >
            {loading ? "Calculando…" : "Calcular frete"}
          </button>
        </div>
      </form>

      {notice && (
        <p
          role={notice.kind}
          className={cn("mt-2.5 text-sm", notice.kind === "alert" ? "text-red-800" : "text-gray-600")}
        >
          {notice.text}
        </p>
      )}

      {stale && (
        <p className="mt-2.5 text-sm text-amber-800">O carrinho mudou. Calcule o frete de novo.</p>
      )}

      {quote && !stale && (
        <fieldset className="mt-3 space-y-[7px]">
          <legend className="mb-1 text-[12.5px] font-medium text-[#51607d]">Opções de entrega</legend>
          {quote.options.map((option) => (
            <label key={option.id} className={optionClass}>
              <input
                type="radio"
                name="shipping-option"
                className={radioClass}
                checked={quote.selectedId === option.id}
                onChange={() => handleChoose(option.id)}
              />
              <span className="min-w-0 flex-1 font-medium text-navy-950">
                {optionLabel(option)}
                <span className="block text-xs font-normal text-[#6b7a96]">
                  {deliveryText(option.deliveryDays)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-navy-950">
                {formatBRL(option.priceCents)}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
