"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useCart } from "@/hooks/use-cart";
import { priceCartAction } from "@/lib/actions/cart";
import { MAX_LINE_QUANTITY, lineKey, serializeCart } from "@/lib/cart/cart";
import type { PricedCart, PricedLine } from "@/lib/cart/pricing";
import { buildCartWhatsappMessage } from "@/lib/cart/whatsapp-message";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildWhatsappLink } from "@/lib/utils/whatsapp";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; cart: PricedCart }
  | { status: "error"; message: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

const stepper = cn(
  "inline-flex size-11 items-center justify-center rounded-md border border-border text-lg transition-colors hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  focusRing
);

const textAction = cn(
  "inline-flex min-h-11 items-center px-2 text-sm font-medium text-navy-700 underline underline-offset-2 hover:text-navy-950",
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
 * Enquanto não há pagamento, a finalização é pelo WhatsApp do cliente.
 */
export function CartView({ whatsappUrl }: { whatsappUrl: string }) {
  const cart = useCart();
  // O servidor não conhece o localStorage: antes de hidratar não dá para dizer "vazio".
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Aviso de estoque por item: continua na tela depois que a quantidade é corrigida.
  const [stockNotes, setStockNotes] = useState<Record<string, number>>({});
  // Região de status sempre montada: é ela que o leitor de tela anuncia.
  const [announcement, setAnnouncement] = useState("");
  const latestRequest = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Só reprecifica quando o conteúdo do carrinho muda de verdade.
  const cartSignature = serializeCart(cart.lines);
  const { setQuantity } = cart;

  useEffect(() => {
    if (cart.lines.length === 0) return;
    const request = ++latestRequest.current;

    priceCartAction(cart.lines)
      .then((result) => {
        if (request !== latestRequest.current) return;
        if (!result.ok) {
          setState({ status: "error", message: result.error });
          return;
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
        setState({ status: "ready", cart: result.cart });
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        setState({
          status: "error",
          message: "Não foi possível carregar o carrinho agora. Tente de novo.",
        });
      });
    // `cart.lines` entra por `cartSignature`: o array muda de referência sem mudar de conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSignature, attempt, setQuantity]);

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

    const whatsappHref =
      lines.length > 0
        ? buildWhatsappLink(whatsappUrl, buildCartWhatsappMessage(lines, subtotalCents))
        : null;

    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          {lines.length > 0 && (
            <ul
              aria-label="Itens do carrinho"
              className="divide-y divide-border border-y border-border"
            >
              {lines.map((line) => {
                const label = describeLine(line);
                const atMax =
                  line.quantity >= MAX_LINE_QUANTITY ||
                  (line.maxQuantity !== null && line.quantity >= line.maxQuantity);
                const atMin = line.quantity <= 1;
                return (
                  <li key={line.key} className="flex gap-4 py-5">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {line.imageUrl && (
                        <Image
                          src={line.imageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/loja/${line.slug}`}
                        className={cn(
                          "break-words font-medium text-navy-950 hover:underline focus-visible:underline",
                          focusRing
                        )}
                      >
                        {line.name}
                      </Link>
                      {(line.size || line.colorName) && (
                        <p className="mt-1 text-sm text-gray-600">
                          {[line.size, line.colorName].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-600">
                        {formatBRL(line.unitPriceCents)} cada
                      </p>
                      {stockNotes[line.key] !== undefined && (
                        <p className="mt-2 text-sm text-amber-800">
                          Só temos {stockNotes[line.key]}{" "}
                          {stockNotes[line.key] === 1
                            ? "unidade disponível"
                            : "unidades disponíveis"}
                          . Ajustamos a quantidade.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div role="group" aria-label="Quantidade" className="inline-flex items-center gap-2">
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
                          <span className="min-w-8 text-center text-sm font-medium">
                            {line.quantity}
                          </span>
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
                    <p className="shrink-0 text-sm font-semibold text-navy-950">
                      <span className="sr-only">Total do item: </span>
                      {formatBRL(line.lineTotalCents)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {unavailable.length > 0 && (
            <section
              aria-labelledby="indisponiveis"
              className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5"
            >
              <h2 id="indisponiveis" className="text-sm font-semibold text-amber-950">
                Estes itens não estão mais disponíveis
              </h2>
              <ul className="mt-3 space-y-1">
                {unavailable.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-4 text-sm text-amber-950"
                  >
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
          )}
        </div>

        <aside className="h-fit rounded-lg border border-border p-5" aria-label="Resumo do pedido">
          <p className="flex items-baseline justify-between text-base">
            <span className="font-medium text-navy-950">Subtotal</span>
            <span data-testid="cart-subtotal" className="text-xl font-semibold text-navy-950">
              {formatBRL(subtotalCents)}
            </span>
          </p>
          <p className="mt-3 text-sm text-gray-600">
            O frete e a forma de pagamento são combinados no WhatsApp.
          </p>
          <div className="mt-5">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}
              >
                Finalizar pelo WhatsApp
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            ) : (
              <span
                aria-disabled="true"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "pointer-events-none h-11 w-full opacity-60"
                )}
              >
                {lines.length > 0
                  ? "Finalização indisponível no momento"
                  : "Nenhum item disponível para finalizar"}
              </span>
            )}
          </div>
        </aside>
      </div>
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
