"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrderAction, quoteCheckoutAction } from "@/lib/actions/checkout";
import { serializeCart, type CartLine } from "@/lib/cart/cart";
import { formatBRL } from "@/lib/money";
import { buyerSchema } from "@/lib/orders/buyer";
import { paymentOptions, type PaymentMethod, type PaymentOption, type PaymentTerms } from "@/lib/payments/terms";
import { formatCep } from "@/lib/shipping/cep";
import { cn } from "@/lib/utils";
import type { ShippingSelection } from "./cart-shipping";
import {
  ContinueShopping,
  SummaryPanel,
  cardClass,
  cardNoteClass,
  cardTitleClass,
  ctaClass,
  darkButtonClass,
  fieldClass,
  labelClass,
  optionClass,
  radioClass,
  type SummaryLine,
} from "./cart-ui";

type QuoteState =
  | { status: "loading" }
  | { status: "ready"; terms: PaymentTerms }
  | { status: "error"; message: string };

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

const ERROR_ID = "checkout-error";

/** 500 → "5"; 550 → "5,5". */
function percentText(bp: number): string {
  return (bp / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function optionHint(option: PaymentOption): string | null {
  if (option.method === "pix") return "Pague com o app do seu banco";
  if (option.installments && option.installmentCents) {
    return `${option.installments}x de ${formatBRL(option.installmentCents)} sem juros`;
  }
  return null;
}

export interface CheckoutParts {
  /** Cartão "Forma de pagamento" (nulo enquanto o pagamento não está ativo). */
  payment: ReactNode;
  /** Cartão "Contato e entrega" (o formulário que o botão do resumo envia). */
  contact: ReactNode;
  /** Resumo do pedido com o botão "Finalizar pedido". Nulo: o carrinho mostra o resumo simples. */
  summary: ReactNode;
}

/**
 * Pagamento pelo site: forma de pagamento (Pix com desconto, cartão à vista e
 * parcelado), dados de contato e entrega e o botão que cria o pedido e abre o
 * pagamento. O total é calculado aqui com as condições que o SERVIDOR informou e
 * com os valores que o cliente está vendo; o servidor refaz tudo ao criar o
 * pedido e só entrega o link do Asaas se o total ainda for o que o cliente viu.
 *
 * Fica sempre montado enquanto há itens, mas só está ATIVO com o pagamento ligado e
 * o frete escolhido: assim o que o cliente digitou nos dados de entrega não se perde
 * quando ele mexe no carrinho (o que apaga o frete) e escolhe o frete de novo.
 */
export function CartCheckout({
  enabled,
  lines,
  couponCode,
  shipping,
  productsCents,
  baseLines,
  onShippingChange,
  onStale,
  children,
}: {
  /** O pagamento pelo site está ligado (variáveis configuradas). */
  enabled: boolean;
  lines: CartLine[];
  couponCode: string | null;
  /** Frete escolhido, ou `null` enquanto o cliente não escolheu. */
  shipping: ShippingSelection | null;
  /** Valor dos produtos já sem o cupom. */
  productsCents: number;
  /** Linhas do resumo que o carrinho já calculou (subtotal, cupom e frete). */
  baseLines: SummaryLine[];
  /** O servidor informou outro preço para o frete escolhido. */
  onShippingChange: (priceCents: number) => void;
  /** O servidor discorda dos valores do carrinho (preço, cupom): o carrinho deve reprecificar. */
  onStale: () => void;
  children: (parts: CheckoutParts) => ReactNode;
}) {
  const [quote, setQuote] = useState<QuoteState>({ status: "loading" });
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  // Cada aviso tem um `id`: o mesmo texto repetido remonta o alerta e é anunciado de novo.
  const [notice, setNotice] = useState<{ text: string; id: number; context: string } | null>(null);
  // Campo do formulário com problema (o foco vai até ele e a mensagem o descreve).
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latestRequest = useRef(0);
  const noticeCount = useRef(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // Trava de duplo envio que não depende de uma renderização (dois cliques seguidos).
  const sendingRef = useRef(false);

  const signature = serializeCart(lines);
  const active = enabled && shipping !== null;

  // Um aviso só vale para o que estava na tela quando ele surgiu: mexer no carrinho, no cupom
  // ou trocar a entrega o esconde (ele falaria de valores que já não conferem).
  const noticeContext = `${signature}|${couponCode}|${shipping?.optionId}|${shipping?.cep}`;
  const visibleNotice = notice && notice.context === noticeContext ? notice : null;

  function showNotice(text: string) {
    noticeCount.current += 1;
    setNotice({ text, id: noticeCount.current, context: noticeContext });
  }

  useEffect(() => {
    if (!active || !shipping) {
      // Uma cotação ainda em andamento não pode mais mudar nada quando ela chegar.
      latestRequest.current += 1;
      return;
    }
    const request = ++latestRequest.current;
    quoteCheckoutAction({
      lines,
      couponCode,
      shipping: { optionId: shipping.optionId, cep: shipping.cep, expectedCents: shipping.priceCents },
      // O método só precisa ser válido: o que vale daqui é `terms`.
      method: "pix",
    })
      .then((result) => {
        if (request !== latestRequest.current) return;
        if (result.ok) {
          setQuote({ status: "ready", terms: result.terms });
          // A forma escolhida pode ter deixado de existir (ex.: parcelamento desligado).
          setMethod((current) =>
            paymentOptions({ productsCents: 0, shippingCents: 0 }, result.terms).some(
              (option) => option.method === current
            )
              ? current
              : "pix"
          );
        } else if (result.code === "shipping-changed" && result.newShippingCents !== undefined) {
          showNotice(result.error);
          onShippingChange(result.newShippingCents);
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
  }, [active, signature, couponCode, shipping?.optionId, shipping?.cep, shipping?.priceCents, attempt]);

  // Voltar do checkout do Asaas pelo botão do navegador pode devolver esta página
  // do cache já com "Abrindo o pagamento…": sem isto o botão ficaria travado.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        sendingRef.current = false;
        setSending(false);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // O botão que envia está no resumo, longe do aviso (no celular, fora da tela): leva o aviso à vista.
  useEffect(() => {
    if (visibleNotice) {
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      noticeRef.current?.scrollIntoView?.({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
  }, [visibleNotice]);

  const shippingCents = shipping?.priceCents ?? 0;
  const options =
    active && quote.status === "ready"
      ? paymentOptions({ productsCents, shippingCents }, quote.terms)
      : [];
  const chosen = options.find((option) => option.method === method);
  const fullCents = productsCents + shippingCents;
  const singleOption = options.find((option) => option.method === "card_single");
  const hasPixDiscount = chosen?.method === "pix" && chosen.discountCents > 0;
  const totalCents = chosen?.totalCents ?? fullCents;
  const pixPercent = quote.status === "ready" ? quote.terms.pixDiscountBp : 0;

  function field(key: keyof typeof emptyForm) {
    const invalid = invalidField === key;
    return {
      value: form[key],
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? ERROR_ID : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        if (invalid) setInvalidField(null);
        setForm((current) => ({ ...current, [key]: event.target.value }));
      },
    };
  }

  async function pay() {
    if (sendingRef.current || !shipping) return;
    if (!chosen) {
      showNotice(
        quote.status === "error"
          ? "As formas de pagamento não carregaram. Use o botão Tentar de novo."
          : "Aguarde o cálculo das formas de pagamento."
      );
      return;
    }

    const buyer = { ...form, cep: shipping.cep };
    const parsed = buyerSchema.safeParse(buyer);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = typeof issue?.path[0] === "string" ? issue.path[0] : null;
      setInvalidField(key);
      showNotice(issue?.message ?? "Confira os dados informados.");
      if (key) document.getElementById(`buyer-${key}`)?.focus();
      return;
    }
    setInvalidField(null);

    sendingRef.current = true;
    setSending(true);
    setNotice(null);
    try {
      const result = await placeOrderAction(
        {
          lines,
          couponCode,
          shipping: { optionId: shipping.optionId, cep: shipping.cep, expectedCents: shipping.priceCents },
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
      showNotice(result.error);
      if (result.quote?.code === "shipping-changed" && result.quote.newShippingCents !== undefined) {
        onShippingChange(result.quote.newShippingCents);
      } else if (result.quote?.code === "price-changed") {
        setAttempt((n) => n + 1);
        onStale();
      }
    } catch {
      showNotice("Não conseguimos abrir o pagamento agora. Tente de novo em instantes.");
    }
    sendingRef.current = false;
    setSending(false);
  }

  if (!active || !shipping) {
    return <>{children({ payment: null, contact: null, summary: null })}</>;
  }

  // ---------------------------------------------------------------- cartões
  const payment = (
    <section data-testid="cart-checkout" aria-labelledby="cart-payment-title" className={cardClass}>
      <h2 id="cart-payment-title" className={cardTitleClass}>
        Forma de pagamento
      </h2>

      {quote.status === "loading" && (
        <p className="text-sm text-gray-600">Calculando as formas de pagamento…</p>
      )}

      {quote.status === "error" && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">{quote.message}</p>
          <button
            type="button"
            className={cn(darkButtonClass, "mt-3 inline-flex items-center")}
            onClick={() => {
              setQuote({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {quote.status === "ready" && (
        <fieldset className="space-y-[7px]">
          <legend className="sr-only">Forma de pagamento</legend>
          {options.map((option) => {
            const hint = optionHint(option);
            return (
              <label key={option.method} className={optionClass}>
                <input
                  type="radio"
                  name="payment-method"
                  className={radioClass}
                  checked={method === option.method}
                  onChange={() => setMethod(option.method)}
                />
                <span className="min-w-0 flex-1 font-medium text-navy-950">
                  {option.label}
                  {option.method === "pix" && pixPercent > 0 && (
                    <span className="ml-2 inline-block rounded-full bg-alert-600 px-2 py-0.5 align-[1px] text-[10.5px] font-bold tracking-wide text-white">
                      {percentText(pixPercent)}% OFF
                    </span>
                  )}
                  {hint && <span className="block text-xs font-normal text-[#566580]">{hint}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-navy-950">
                  {formatBRL(option.totalCents)}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
    </section>
  );

  const contact = (
    <section aria-labelledby="cart-contact-title" className={cardClass}>
      <h2 id="cart-contact-title" className={cardTitleClass}>
        Contato e entrega
        <span className={cardNoteClass}>Usamos só para o envio do pedido</span>
      </h2>

      <form
        id="checkout-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void pay();
        }}
      >
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="sr-only">Contato e entrega</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            <div className="col-span-2 grid gap-1">
              <Label htmlFor="buyer-name" className={labelClass}>
                Nome completo
              </Label>
              <Input id="buyer-name" autoComplete="name" className={fieldClass} {...field("name")} />
            </div>
            <div className="col-span-2 grid gap-1 sm:col-span-1">
              <Label htmlFor="buyer-email" className={labelClass}>
                E-mail
              </Label>
              <Input
                id="buyer-email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className={fieldClass}
                {...field("email")}
              />
            </div>
            <div className="col-span-2 grid gap-1 sm:col-span-1">
              <Label htmlFor="buyer-phone" className={labelClass}>
                Telefone com DDD
              </Label>
              <Input
                id="buyer-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={fieldClass}
                {...field("phone")}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-cep" className={labelClass}>
                CEP <span className="font-normal text-[#566580]">(igual ao do frete)</span>
              </Label>
              <Input
                id="buyer-cep"
                readOnly
                autoComplete="postal-code"
                value={formatCep(shipping.cep)}
                className={cn(fieldClass, "bg-[#eef1f7] text-[#566580] shadow-[inset_0_1px_2px_rgba(14,20,33,0.06)]")}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-number" className={labelClass}>
                Número
              </Label>
              <Input id="buyer-number" className={fieldClass} {...field("number")} />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label htmlFor="buyer-street" className={labelClass}>
                Rua
              </Label>
              <Input id="buyer-street" autoComplete="address-line1" className={fieldClass} {...field("street")} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-complement" className={labelClass}>
                Complemento (opcional)
              </Label>
              <Input
                id="buyer-complement"
                autoComplete="address-line2"
                className={fieldClass}
                {...field("complement")}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-district" className={labelClass}>
                Bairro
              </Label>
              <Input id="buyer-district" className={fieldClass} {...field("district")} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-city" className={labelClass}>
                Cidade
              </Label>
              <Input id="buyer-city" autoComplete="address-level2" className={fieldClass} {...field("city")} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="buyer-state" className={labelClass}>
                Estado (UF)
              </Label>
              <Input
                id="buyer-state"
                maxLength={2}
                autoCapitalize="characters"
                autoComplete="address-level1"
                className={cn(fieldClass, "uppercase")}
                {...field("state")}
              />
            </div>
          </div>
        </fieldset>

        {visibleNotice && (
          <p
            key={visibleNotice.id}
            id={ERROR_ID}
            ref={noticeRef}
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {visibleNotice.text}
          </p>
        )}
      </form>
    </section>
  );

  // ---------------------------------------------------------------- resumo
  const summaryLines: SummaryLine[] = [...baseLines];
  if (hasPixDiscount && chosen) {
    const fretePosition = summaryLines.findIndex((line) => line.testId === "cart-shipping");
    const pixLine: SummaryLine = {
      testId: "cart-pix-discount",
      label: `Desconto no Pix${pixPercent > 0 ? ` (${percentText(pixPercent)}%)` : ""}`,
      value: `− ${formatBRL(chosen.discountCents)}`,
      tone: "saving",
    };
    summaryLines.splice(fretePosition === -1 ? summaryLines.length : fretePosition + 1, 0, pixLine);
  }

  const totalLabel = hasPixDiscount ? "Total no Pix" : "Total";
  const blocked = sending || !chosen;

  const summary = (
    <SummaryPanel
      lines={summaryLines}
      totalLabel={totalLabel}
      totalValue={formatBRL(totalCents)}
      totalNote={
        hasPixDiscount && singleOption ? `ou ${formatBRL(singleOption.totalCents)} nas outras formas` : undefined
      }
    >
      {/* No celular este bloco é a barra fixa de baixo (total + botão); no computador, o fim do resumo. */}
      <div
        data-cart-bar=""
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-navy-950/10 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_-12px_rgba(14,20,33,0.35)] backdrop-blur",
          "lg:static lg:mt-[18px] lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        )}
      >
        {/* O leitor de tela já leu o total do resumo: aqui é só para quem enxerga. */}
        <div aria-hidden="true" className="min-w-0 lg:hidden">
          <p className="text-xs text-gray-600">{totalLabel}</p>
          <p className="font-heading text-xl font-extrabold tabular-nums text-navy-950">{formatBRL(totalCents)}</p>
        </div>
        <span role="status" className="sr-only">
          {sending ? "Abrindo o pagamento…" : ""}
        </span>
        <button
          type="submit"
          form="checkout-form"
          aria-disabled={blocked}
          className={cn(ctaClass, "flex-1 lg:w-full")}
        >
          {sending ? (
            "Abrindo o pagamento…"
          ) : (
            <>
              Finalizar pedido <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </button>
      </div>
      <ContinueShopping />
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#9fb0d0]">
        <Lock aria-hidden="true" className="size-3" />
        Pagamento processado pelo Asaas
      </p>
    </SummaryPanel>
  );

  return <>{children({ payment, contact, summary })}</>;
}
