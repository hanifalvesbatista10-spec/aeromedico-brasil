"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrderAction, quoteCheckoutAction } from "@/lib/actions/checkout";
import { serializeCart, type CartLine } from "@/lib/cart/cart";
import { formatBRL } from "@/lib/money";
import { buyerSchema } from "@/lib/orders/buyer";
import type { PaymentMethod, PaymentOption } from "@/lib/payments/fees";
import { formatCep } from "@/lib/shipping/cep";
import { cn } from "@/lib/utils";
import type { ShippingSelection } from "./cart-shipping";

type QuoteState =
  | { status: "loading" }
  | { status: "ready"; options: PaymentOption[] }
  | { status: "error"; message: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

function optionText(option: PaymentOption): string {
  const base = `${option.label} · ${formatBRL(option.totalCents)} (taxa de ${formatBRL(option.feeCents)})`;
  return option.installments && option.installmentCents
    ? `${base} · ${option.installments}x de ${formatBRL(option.installmentCents)}`
    : base;
}

/**
 * Pagamento pelo site: escolha da forma (com o total de cada uma, já com a taxa
 * do meio de pagamento), dados de contato e entrega e o botão "Pagar". Tudo que
 * aparece aqui vem da cotação do SERVIDOR; o servidor refaz o cálculo ao criar o
 * pedido e só entrega o link do Asaas se o total ainda bater com o que o
 * cliente viu.
 */
export function CartCheckout({
  lines,
  couponCode,
  shipping,
  onAnnounce,
}: {
  lines: CartLine[];
  couponCode: string | null;
  shipping: ShippingSelection;
  onAnnounce: (text: string) => void;
}) {
  const [quote, setQuote] = useState<QuoteState>({ status: "loading" });
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Preço do frete que o servidor acabou de informar para ESTA escolha de frete
  // (substitui o que o cliente viu; some sozinho quando a escolha muda).
  const [shippingOverride, setShippingOverride] = useState<{ key: string; cents: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latestRequest = useRef(0);

  const signature = serializeCart(lines);
  const shippingKey = `${shipping.optionId}|${shipping.cep}|${shipping.priceCents}`;
  const expectedShippingCents =
    shippingOverride && shippingOverride.key === shippingKey
      ? shippingOverride.cents
      : shipping.priceCents;

  useEffect(() => {
    const request = ++latestRequest.current;
    quoteCheckoutAction({
      lines,
      couponCode,
      shipping: { optionId: shipping.optionId, cep: shipping.cep, expectedCents: expectedShippingCents },
      // As três formas voltam em qualquer caso; o método só precisa ser válido.
      method: "pix",
    })
      .then((result) => {
        if (request !== latestRequest.current) return;
        if (result.ok) {
          setQuote({ status: "ready", options: result.options });
        } else if (result.code === "shipping-changed" && result.newShippingCents !== undefined) {
          setNotice(result.error);
          setShippingOverride({ key: shippingKey, cents: result.newShippingCents });
        } else {
          setQuote({ status: "error", message: result.error });
        }
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        setQuote({
          status: "error",
          message: "Não foi possível calcular o pagamento agora. Tente de novo.",
        });
      });
    // `lines` entra por `signature`: o array muda de referência sem mudar de conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, couponCode, shipping.optionId, shipping.cep, expectedShippingCents, attempt]);

  const chosen =
    quote.status === "ready" ? quote.options.find((option) => option.method === method) : undefined;

  function choose(option: PaymentOption) {
    setMethod(option.method);
    onAnnounce(`${option.label} selecionado: total ${formatBRL(option.totalCents)}.`);
  }

  function field(key: keyof typeof emptyForm) {
    return {
      value: form[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((current) => ({ ...current, [key]: event.target.value })),
    };
  }

  async function pay() {
    if (sending || !chosen) return;

    const buyer = { ...form, cep: shipping.cep };
    const parsed = buyerSchema.safeParse(buyer);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    setSending(true);
    setNotice(null);
    try {
      const result = await placeOrderAction(
        {
          lines,
          couponCode,
          shipping: { optionId: shipping.optionId, cep: shipping.cep, expectedCents: expectedShippingCents },
          method,
          expectedTotalCents: chosen.totalCents,
        },
        buyer
      );
      if (result.ok) {
        // Fica "enviando" até a página do Asaas abrir.
        window.location.assign(result.checkoutUrl);
        return;
      }
      setNotice(result.error);
      if (result.quote?.code === "shipping-changed" && result.quote.newShippingCents !== undefined) {
        setShippingOverride({ key: shippingKey, cents: result.quote.newShippingCents });
      } else if (result.quote?.code === "price-changed") {
        setAttempt((n) => n + 1);
      }
    } catch {
      setNotice("Não foi possível abrir o pagamento agora. Tente de novo.");
    }
    setSending(false);
  }

  return (
    <div data-testid="cart-checkout" className="mt-5 space-y-5 border-t border-border pt-5">
      {quote.status === "loading" && (
        <p className="text-sm text-gray-600">Calculando as formas de pagamento…</p>
      )}

      {quote.status === "error" && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">{quote.message}</p>
          <Button
            variant="outline"
            className="mt-3 h-11"
            onClick={() => {
              setQuote({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Tentar de novo
          </Button>
        </div>
      )}

      {quote.status === "ready" && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-navy-950">Forma de pagamento</legend>
          {quote.options.map((option) => (
            <label
              key={option.method}
              className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm has-[:checked]:border-navy-700 has-[:checked]:bg-navy-950/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy-700"
            >
              <input
                type="radio"
                name="payment-method"
                className="mt-1 size-4"
                checked={method === option.method}
                onChange={() => choose(option)}
              />
              <span>{optionText(option)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void pay();
        }}
        className="space-y-3"
      >
        <p className="text-sm font-medium text-navy-950">Contato e entrega</p>

        <div className="space-y-1">
          <Label htmlFor="buyer-name">Nome completo</Label>
          <Input id="buyer-name" autoComplete="name" className={cn("h-11", focusRing)} {...field("name")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-email">E-mail</Label>
          <Input
            id="buyer-email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            className={cn("h-11", focusRing)}
            {...field("email")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-phone">Telefone com DDD</Label>
          <Input
            id="buyer-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("h-11", focusRing)}
            {...field("phone")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-cep">CEP</Label>
          <Input
            id="buyer-cep"
            readOnly
            value={formatCep(shipping.cep)}
            className={cn("h-11 bg-muted", focusRing)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-street">Rua</Label>
          <Input
            id="buyer-street"
            autoComplete="address-line1"
            className={cn("h-11", focusRing)}
            {...field("street")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="buyer-number">Número</Label>
            <Input id="buyer-number" className={cn("h-11", focusRing)} {...field("number")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="buyer-complement">Complemento (opcional)</Label>
            <Input
              id="buyer-complement"
              autoComplete="address-line2"
              className={cn("h-11", focusRing)}
              {...field("complement")}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="buyer-district">Bairro</Label>
          <Input id="buyer-district" className={cn("h-11", focusRing)} {...field("district")} />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <div className="space-y-1">
            <Label htmlFor="buyer-city">Cidade</Label>
            <Input
              id="buyer-city"
              autoComplete="address-level2"
              className={cn("h-11", focusRing)}
              {...field("city")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="buyer-state">Estado (UF)</Label>
            <Input
              id="buyer-state"
              maxLength={2}
              autoCapitalize="characters"
              autoComplete="address-level1"
              className={cn("h-11 uppercase", focusRing)}
              {...field("state")}
            />
          </div>
        </div>

        {chosen && (
          <p className="flex items-baseline justify-between border-t border-border pt-3 text-base">
            <span className="font-medium text-navy-950">Total a pagar</span>
            <strong data-testid="checkout-total" className="text-xl text-navy-950">
              {formatBRL(chosen.totalCents)}
            </strong>
          </p>
        )}

        {notice && (
          <p role="alert" className="text-sm text-red-800">
            {notice}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          aria-disabled={sending}
          className={cn("h-11 w-full aria-disabled:opacity-60", focusRing)}
        >
          {sending ? "Abrindo o pagamento…" : "Pagar"}
        </Button>
      </form>
    </div>
  );
}
