"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { CartCheckout } from "@/components/store/cart-checkout";
import { CartShipping, type ShippingSelection } from "@/components/store/cart-shipping";
import {
  CartLayout,
  CartSteps,
  ContinueShopping,
  SummaryPanel,
  cardClass,
  cardTitleClass,
  fieldClass,
  focusRing,
  softButtonClass,
  type SummaryLine,
} from "@/components/store/cart-ui";
import { useCart } from "@/hooks/use-cart";
import { priceCartAction } from "@/lib/actions/cart";
import { MAX_LINE_QUANTITY, lineKey, serializeCart } from "@/lib/cart/cart";
import { evaluateCoupon, type CartCoupon } from "@/lib/cart/coupon";
import type { PricedCart, PricedLine } from "@/lib/cart/pricing";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      cart: PricedCart;
      coupon: CartCoupon | null;
      couponError: string | null;
    }
  | { status: "error"; message: string };

// Alvos de toque de 44 px; com mouse (`pointer-fine`) o controle encolhe para o desenho compacto.
const stepper = cn(
  "inline-flex size-11 items-center justify-center rounded-[9px] text-lg text-[#51607d] transition-colors hover:bg-white/70 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 pointer-fine:size-[30px]",
  focusRing
);

const textAction = cn(
  "inline-flex min-h-11 items-center px-1 text-[12.5px] font-medium text-[#6b7a96] underline underline-offset-[3px] hover:text-navy-950 pointer-fine:min-h-8",
  focusRing
);

const noopSubscribe = () => () => {};

/** "Camiseta, M, Preta": distingue variações do mesmo produto nos nomes dos botões. */
function describeLine(line: { name: string; size?: string | null; colorName?: string | null }) {
  return [line.name, line.size, line.colorName].filter(Boolean).join(", ");
}

/**
 * Carrinho do cliente. O navegador guarda só ids e quantidades; nome, foto,
 * preço e disponibilidade vêm do servidor (`priceCartAction`) a cada mudança.
 * Com o pagamento pelo site ligado (`checkoutEnabled`) e o frete escolhido, a
 * finalização é o `CartCheckout`, que cria o pedido e leva ao pagamento. Sem o
 * pagamento ligado, o carrinho só avisa que ainda não está disponível.
 */
export function CartView({ checkoutEnabled = false }: { checkoutEnabled?: boolean }) {
  const cart = useCart();
  // O servidor não conhece o localStorage: antes de hidratar não dá para dizer "vazio".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Aviso de estoque por item: continua na tela depois que a quantidade é corrigida.
  const [stockNotes, setStockNotes] = useState<Record<string, number>>({});
  // Região de status sempre montada: é ela que o leitor de tela anuncia.
  const [announcement, setAnnouncement] = useState("");
  // Texto digitado no campo e código já enviado ao servidor (cupom aplicado ou tentado).
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  // Cada clique em "Aplicar" conta, mesmo com o mesmo código (tentar de novo manda de novo).
  const [couponAttempt, setCouponAttempt] = useState(0);
  const [couponPending, setCouponPending] = useState(false);
  const [couponLocalError, setCouponLocalError] = useState<string | null>(null);
  // O que fazer quando a resposta do servidor chegar: anunciar e levar o foco ao cupom aplicado.
  const justApplied = useRef(false);
  const couponBoxRef = useRef<HTMLDivElement>(null);
  const removeCouponRef = useRef<HTMLButtonElement>(null);
  // Entrega escolhida: só vale enquanto o carrinho for o mesmo da cotação.
  const [shippingChoice, setShippingChoice] = useState<ShippingSelection | null>(null);
  const latestRequest = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Só reprecifica quando o conteúdo do carrinho muda de verdade.
  const cartSignature = serializeCart(cart.lines);
  const { setQuantity } = cart;

  useEffect(() => {
    if (cart.lines.length === 0) return;
    const request = ++latestRequest.current;

    const pricing = appliedCode
      ? priceCartAction(cart.lines, appliedCode)
      : priceCartAction(cart.lines);

    pricing
      .then((result) => {
        if (request !== latestRequest.current) return;
        setCouponPending(false);
        if (!result.ok) {
          justApplied.current = false;
          setState({ status: "error", message: result.error });
          return;
        }
        if (justApplied.current) {
          if (result.coupon) {
            const applied = evaluateCoupon(result.coupon, result.cart.subtotalCents, new Date());
            if (applied.ok) {
              setAnnouncement(
                `Cupom ${result.coupon.code} aplicado. Desconto de ${formatBRL(applied.discountCents)}.`
              );
            }
          } else {
            justApplied.current = false;
          }
        }
        const reduced = result.cart.lines.filter((line) => line.reduced);
        if (reduced.length > 0) {
          setStockNotes((notes) => ({
            ...notes,
            ...Object.fromEntries(reduced.map((line) => [line.key, line.quantity])),
          }));
          setAnnouncement(
            reduced
              .map(
                (line) =>
                  `Ajustamos a quantidade de ${describeLine(line)}: só temos ${line.quantity}.`
              )
              .join(" ")
          );
          reduced.forEach((line) => setQuantity(line.key, line.quantity));
        }
        setState({
          status: "ready",
          cart: result.cart,
          coupon: result.coupon,
          couponError: result.couponError,
        });
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        setCouponPending(false);
        justApplied.current = false;
        setState({
          status: "error",
          message: "Não foi possível carregar o carrinho agora. Tente de novo.",
        });
      });
    // `cart.lines` entra por `cartSignature`: o array muda de referência sem mudar de conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature, attempt, appliedCode, couponAttempt, setQuantity]);

  // Cupom aceito: o formulário saiu da tela, então o foco vai para "Remover cupom".
  const acceptedCode = state.status === "ready" ? (state.coupon?.code ?? null) : null;
  useEffect(() => {
    if (acceptedCode && justApplied.current) {
      removeCouponRef.current?.focus();
      justApplied.current = false;
    }
  }, [acceptedCode]);

  function dropNote(key: string) {
    setStockNotes(({ [key]: _dropped, ...rest }) => {
      void _dropped;
      return rest;
    });
  }

  function changeQuantity(line: PricedLine, quantity: number) {
    dropNote(line.key);
    cart.setQuantity(line.key, quantity);
    setAnnouncement(`Quantidade de ${describeLine(line)}: ${quantity}.`);
  }

  // O botão clicado sai da tela: o foco vai para o carrinho (não para o topo da página).
  function removeKey(key: string, label: string) {
    dropNote(key);
    rootRef.current?.focus();
    cart.remove(key);
    setAnnouncement(`${label} removido do carrinho.`);
  }

  function applyCoupon() {
    if (couponPending) return;
    const code = couponInput.trim();
    if (!code) {
      setCouponLocalError("Digite o código do cupom.");
      return;
    }
    setCouponLocalError(null);
    setCouponPending(true);
    justApplied.current = true;
    // Limpa o erro anterior: o alerta remonta e é anunciado de novo se repetir.
    setState((current) => (current.status === "ready" ? { ...current, couponError: null } : current));
    setAppliedCode(code);
    setCouponAttempt((n) => n + 1);
  }

  function changeCouponInput(value: string) {
    setCouponInput(value);
    setCouponLocalError(null);
    // Campo apagado = desistiu do código recusado: não deixa o código "grudado".
    if (value.trim() === "" && appliedCode !== null) setAppliedCode(null);
  }

  function removeCoupon() {
    // O botão clicado sai da tela: o foco fica no bloco do cupom.
    couponBoxRef.current?.focus();
    justApplied.current = false;
    setAppliedCode(null);
    setCouponInput("");
    setCouponLocalError(null);
    // O desconto sai na hora, sem esperar a resposta do servidor.
    setState((current) =>
      current.status === "ready" ? { ...current, coupon: null, couponError: null } : current
    );
    setAnnouncement("Cupom removido.");
  }

  function renderContent(): ReactNode {
    if (!hydrated) return <LoadingText />;

    if (cart.lines.length === 0) {
      return (
        <EmptyState
          title="Seu carrinho está vazio."
          description="Escolha produtos na loja e eles aparecem aqui."
          action={{ label: "Ver a loja", href: "/loja" }}
        />
      );
    }

    if (state.status === "error") {
      return (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-900">{state.message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Tentar de novo
            </Button>
            <Button variant="ghost" className="h-11" onClick={cart.clear}>
              Esvaziar carrinho
            </Button>
          </div>
        </div>
      );
    }

    if (state.status === "loading") return <LoadingText />;

    // A quantidade mostrada é a guardada (resposta imediata ao clique), limitada
    // ao estoque; o preço unitário é sempre o do servidor.
    const stored = new Map(cart.lines.map((line) => [lineKey(line), line.quantity]));
    const lines: PricedLine[] = state.cart.lines
      .filter((line) => stored.has(line.key))
      .map((line) => {
        const quantity = Math.min(stored.get(line.key)!, line.maxQuantity ?? Infinity);
        return { ...line, quantity, lineTotalCents: line.unitPriceCents * quantity };
      });
    const unavailable = state.cart.unavailable.filter((item) => stored.has(item.key));
    const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);

    // Itens que acabaram de entrar (ex.: outra aba) ainda não foram precificados.
    if (lines.length === 0 && unavailable.length === 0) return <LoadingText />;

    // O desconto é recalculado aqui com as regras que o servidor aprovou, para
    // responder na hora a mudanças de quantidade; o servidor reconfere a cada resposta.
    const coupon = state.coupon;
    const evaluation = coupon ? evaluateCoupon(coupon, subtotalCents, new Date()) : null;
    const discountCents = evaluation?.ok ? evaluation.discountCents : 0;
    const couponMessage = evaluation && !evaluation.ok ? evaluation.message : null;
    const shipping =
      shippingChoice && shippingChoice.signature === cartSignature ? shippingChoice : null;
    const productsCents = subtotalCents - discountCents;
    const totalCents = productsCents + (shipping?.priceCents ?? 0);
    const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
    const checkoutCouponCode = coupon && evaluation?.ok ? coupon.code : null;

    // Linhas do resumo que não dependem da forma de pagamento.
    const baseLines: SummaryLine[] = [
      {
        testId: "cart-subtotal",
        label: `Subtotal (${itemCount} ${itemCount === 1 ? "item" : "itens"})`,
        value: formatBRL(subtotalCents),
      },
    ];
    if (coupon && discountCents > 0) {
      baseLines.push({
        testId: "cart-discount",
        label: `Desconto (${coupon.code})`,
        value: `-${formatBRL(discountCents)}`,
        tone: "saving",
      });
    }
    if (shipping) {
      baseLines.push({
        testId: "cart-shipping",
        label: `Frete · ${shipping.label}`,
        value: formatBRL(shipping.priceCents),
      });
    }

    const plainNote =
      lines.length === 0
        ? "Nenhum item disponível para finalizar."
        : !checkoutEnabled
          ? "O pagamento pelo site ainda não está disponível. Volte em breve."
          : "Calcule o frete para escolher a forma de pagamento e finalizar o pedido.";

    const itemsCard = lines.length > 0 && (
      <div className={cardClass}>
        <ul aria-label="Itens do carrinho" className="divide-y divide-[#e9edf4]">
          {lines.map((line) => {
            const label = describeLine(line);
            const atMax =
              line.quantity >= MAX_LINE_QUANTITY ||
              (line.maxQuantity !== null && line.quantity >= line.maxQuantity);
            const atMin = line.quantity <= 1;
            return (
              <li key={line.key} className="flex gap-3.5 py-4 first:pt-0 last:pb-0 sm:gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-navy-700 to-navy-950 shadow-[0_8px_18px_-8px_rgba(14,20,33,0.5)] sm:size-[88px]">
                  {line.imageUrl ? (
                    <Image src={line.imageUrl} alt="" fill sizes="88px" className="object-cover" />
                  ) : (
                    <Package aria-hidden="true" className="absolute inset-0 m-auto size-6 text-white/90 sm:size-8" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/loja/${line.slug}`}
                    className={cn(
                      "break-words font-heading text-[15px] font-bold tracking-tight text-navy-950 hover:underline focus-visible:underline sm:text-base",
                      focusRing
                    )}
                  >
                    {line.name}
                  </Link>
                  {(line.size || line.colorName) && (
                    <p className="mt-0.5 text-[12.5px] text-[#6b7a96]">
                      {[line.size, line.colorName].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-[12.5px] text-[#6b7a96]">{formatBRL(line.unitPriceCents)} cada</p>
                  {stockNotes[line.key] !== undefined && (
                    <p className="mt-2 text-sm text-amber-800">
                      Só temos {stockNotes[line.key]}{" "}
                      {stockNotes[line.key] === 1 ? "unidade disponível" : "unidades disponíveis"}. Ajustamos a
                      quantidade.
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <div
                      role="group"
                      aria-label="Quantidade"
                      className="inline-flex items-center rounded-[9px] border border-[#e1e6ef] bg-[#f6f8fb] shadow-[inset_0_1px_3px_rgba(14,20,33,0.14),0_8px_14px_-10px_rgba(14,20,33,0.3)]"
                    >
                      <button
                        type="button"
                        className={stepper}
                        aria-label={`Diminuir quantidade de ${label}`}
                        aria-disabled={atMin}
                        onClick={() => {
                          if (!atMin) changeQuantity(line, line.quantity - 1);
                        }}
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        className={stepper}
                        aria-label={`Aumentar quantidade de ${label}`}
                        aria-disabled={atMax}
                        onClick={() => {
                          if (!atMax) changeQuantity(line, line.quantity + 1);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKey(line.key, label)}
                      aria-label={`Remover ${label}`}
                      className={textAction}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <p className="shrink-0 text-right font-heading text-[15px] font-bold tabular-nums text-navy-950 sm:text-[17px]">
                  <span className="sr-only">Total do item: </span>
                  {formatBRL(line.lineTotalCents)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    );

    const unavailableCard = unavailable.length > 0 && (
      <section
        aria-labelledby="indisponiveis"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_20px_40px_-26px_rgba(146,64,14,0.4)]"
      >
        <h2 id="indisponiveis" className="text-sm font-semibold text-amber-950">
          Estes itens não estão mais disponíveis
        </h2>
        <ul className="mt-3 space-y-1">
          {unavailable.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 text-sm text-amber-950">
              <span>
                {item.name
                  ? `${item.name} (${item.reason === "sold-out" ? "esgotado" : "não está mais à venda"})`
                  : "Item que saiu da loja"}
              </span>
              <button
                type="button"
                onClick={() => removeKey(item.key, item.name ?? "Item indisponível")}
                aria-label={`Remover ${item.name ?? "item indisponível"}`}
                className={cn(textAction, "text-amber-950 hover:text-amber-950")}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      </section>
    );

    const couponCard = lines.length > 0 && (
      <div ref={couponBoxRef} tabIndex={-1} className={cn(cardClass, "outline-none")}>
        <h2 className={cardTitleClass}>Cupom de desconto</h2>
        {coupon ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-navy-950">
              {couponMessage ? `Cupom ${coupon.code} não está valendo agora` : `Cupom ${coupon.code} aplicado`}
            </p>
            {couponMessage && <p className="text-sm text-amber-800">{couponMessage}</p>}
            <button ref={removeCouponRef} type="button" onClick={removeCoupon} className={textAction}>
              Remover cupom
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyCoupon();
            }}
            className="space-y-2"
          >
            <Label htmlFor="cart-coupon" className="sr-only">
              Cupom de desconto
            </Label>
            <div className="flex gap-2.5">
              <Input
                id="cart-coupon"
                value={couponInput}
                onChange={(e) => changeCouponInput(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Digite o código"
                className={fieldClass}
              />
              <button
                type="submit"
                aria-disabled={couponPending}
                className={cn(softButtonClass, "inline-flex items-center")}
              >
                {couponPending ? "Aplicando…" : "Aplicar"}
              </button>
            </div>
            {(couponLocalError ?? state.couponError) && (
              <p role="alert" className="text-sm text-red-800">
                {couponLocalError ?? state.couponError}
              </p>
            )}
          </form>
        )}
      </div>
    );

    const shippingCard = lines.length > 0 && (
      <CartShipping
        lines={cart.lines}
        signature={cartSignature}
        onSelect={setShippingChoice}
        onAnnounce={setAnnouncement}
      />
    );

    return (
      <>
        {lines.length > 0 && <CartSteps current={shipping ? 2 : 1} />}
        <CartCheckout
          enabled={checkoutEnabled && lines.length > 0}
          lines={cart.lines}
          couponCode={checkoutCouponCode}
          shipping={shipping}
          productsCents={productsCents}
          baseLines={baseLines}
          // O servidor informou outro preço para o frete escolhido: o resumo passa a usá-lo.
          onShippingChange={(priceCents) =>
            setShippingChoice((current) => (current ? { ...current, priceCents } : current))
          }
          // O servidor discorda dos valores do carrinho (preço ou cupom): reprecifica.
          onStale={() => setAttempt((n) => n + 1)}
        >
          {({ payment, contact, summary }) => (
            <CartLayout
              left={
                <>
                  {itemsCard}
                  {unavailableCard}
                  {shippingCard}
                  {couponCard}
                  {payment}
                  {contact}
                </>
              }
              summary={
                summary ?? (
                  <SummaryPanel lines={baseLines} totalLabel="Total" totalValue={formatBRL(totalCents)}>
                    <p className="mt-[18px] text-sm text-[#9fb0d0]">{plainNote}</p>
                    <ContinueShopping />
                  </SummaryPanel>
                )
              }
            />
          )}
        </CartCheckout>
      </>
    );
  }

  return (
    <div ref={rootRef} tabIndex={-1} data-testid="cart-view" className="outline-none">
      <p data-testid="cart-announcer" role="status" className="sr-only">
        {announcement}
      </p>
      {renderContent()}
    </div>
  );
}

function LoadingText() {
  return <p className="min-h-24 text-sm text-gray-600">Carregando seu carrinho…</p>;
}
