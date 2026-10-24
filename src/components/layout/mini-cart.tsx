"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { priceCartAction } from "@/lib/actions/cart";
import { lineKey, serializeCart, type CartLine } from "@/lib/cart/cart";
import type { PricedCart } from "@/lib/cart/pricing";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

type State = { status: "loading" } | { status: "ready"; cart: PricedCart } | { status: "error" };

const MAX_SHOWN = 3;

const linkBase =
  "flex h-[38px] items-center justify-center rounded-[10px] font-heading text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 pointer-coarse:h-11";

/**
 * Painel que abre ao passar o mouse (ou focar pelo teclado) no ícone do carrinho: itens,
 * subtotal e os caminhos para o carrinho. Os preços vêm do servidor (como no carrinho) e só
 * são buscados depois da primeira vez que alguém abre o painel e quando o carrinho muda.
 * Em tela de toque ele nunca abre: o ícone leva direto ao carrinho.
 */
export function MiniCart({ lines, dismissed }: { lines: CartLine[]; dismissed: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const latestRequest = useRef(0);
  const signature = serializeCart(lines);

  useEffect(() => {
    if (lines.length === 0) return;
    const request = ++latestRequest.current;
    priceCartAction(lines)
      .then((result) => {
        if (request !== latestRequest.current) return;
        setState(result.ok ? { status: "ready", cart: result.cart } : { status: "error" });
      })
      .catch(() => {
        if (request !== latestRequest.current) return;
        setState({ status: "error" });
      });
    // `lines` entra por `signature`: o array muda de referência sem mudar de conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // A quantidade mostrada é a guardada (resposta imediata a mudanças), limitada ao estoque;
  // o preço unitário é sempre o do servidor.
  const stored = new Map(lines.map((line) => [lineKey(line), line.quantity]));
  const priced =
    state.status === "ready"
      ? state.cart.lines
          .filter((line) => stored.has(line.key))
          .map((line) => {
            const quantity = Math.min(stored.get(line.key)!, line.maxQuantity ?? Infinity);
            return { ...line, quantity, lineTotalCents: line.unitPriceCents * quantity };
          })
      : [];
  const subtotalCents = priced.reduce((total, line) => total + line.lineTotalCents, 0);
  const itemCount = priced.reduce((total, line) => total + line.quantity, 0);
  const shown = priced.slice(0, MAX_SHOWN);
  const hidden = priced.length - shown.length;

  const empty = lines.length === 0;

  return (
    <div
      data-testid="mini-cart"
      data-dismissed={String(dismissed)}
      className={cn(
        "invisible absolute right-0 top-full z-50 w-[350px] max-w-[calc(100vw-2rem)] pt-2 opacity-0 transition duration-150",
        "group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100",
        "data-[dismissed=true]:invisible! data-[dismissed=true]:opacity-0!"
      )}
    >
      <div
        role="region"
        aria-label="Resumo do carrinho"
        className="relative rounded-2xl border border-navy-950/[0.06] bg-white p-4 text-navy-950 shadow-[0_2px_6px_rgba(14,20,33,0.10),0_36px_70px_-18px_rgba(14,20,33,0.55)] before:absolute before:-top-[7px] before:right-[30px] before:size-3.5 before:rotate-45 before:border-l before:border-t before:border-navy-950/[0.06] before:bg-white before:content-['']"
      >
        {empty ? (
          <div className="space-y-3 py-1">
            <p className="font-heading text-[13px] font-bold">Seu carrinho está vazio.</p>
            <Link
              href="/loja"
              className={cn(linkBase, "bg-[#f1f4f9] text-navy-900 shadow-[0_1px_2px_rgba(14,20,33,0.1),0_8px_14px_-10px_rgba(14,20,33,0.3)]")}
            >
              Ver a loja
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 flex items-baseline justify-between font-heading text-[13px] font-bold">
              Seu carrinho
              {state.status === "ready" && (
                <small className="font-body text-xs font-normal text-[#6b7a96]">
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </small>
              )}
            </p>

            {state.status === "loading" && <p className="py-3 text-sm text-[#6b7a96]">Carregando…</p>}
            {state.status === "error" && (
              <p className="py-3 text-sm text-red-800">Não foi possível carregar o carrinho agora.</p>
            )}

            {state.status === "ready" && (
              <>
                <ul className="divide-y divide-[#e9edf4] border-b border-[#e9edf4]">
                  {shown.map((line) => (
                    <li key={line.key} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <div className="relative size-[52px] shrink-0 overflow-hidden rounded-[11px] bg-gradient-to-br from-navy-700 to-navy-950 shadow-[0_8px_14px_-8px_rgba(14,20,33,0.6)]">
                        {line.imageUrl ? (
                          <Image src={line.imageUrl} alt="" fill sizes="52px" className="object-cover" />
                        ) : (
                          <Package aria-hidden="true" className="absolute inset-0 m-auto size-5 text-white/90" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-[13px]">
                        <p className="truncate font-semibold">{line.name}</p>
                        <p className="truncate text-xs text-[#6b7a96]">
                          {[line.size, line.colorName].filter(Boolean).join(" · ")}
                          {(line.size || line.colorName) && " · "}
                          {line.quantity} × {formatBRL(line.unitPriceCents)}
                        </p>
                      </div>
                      <p className="shrink-0 font-heading text-[13px] font-bold tabular-nums">
                        {formatBRL(line.lineTotalCents)}
                      </p>
                    </li>
                  ))}
                </ul>
                {hidden > 0 && (
                  <p className="pt-2 text-xs text-[#6b7a96]">
                    e mais {hidden} {hidden === 1 ? "item" : "itens"}
                  </p>
                )}
                <div className="flex items-baseline justify-between pb-1 pt-3 text-[13px] text-[#6b7a96]">
                  <span>Subtotal</span>
                  <b className="font-heading text-lg tabular-nums text-navy-950">{formatBRL(subtotalCents)}</b>
                </div>
                <p className="mb-3 text-[11.5px] text-[#6b7a96]">Frete e desconto do Pix são calculados no carrinho.</p>
              </>
            )}

            <div className="grid grid-cols-[1fr_1.25fr] gap-2">
              <Link
                href="/carrinho"
                className={cn(linkBase, "bg-[#f1f4f9] text-navy-900 shadow-[0_1px_2px_rgba(14,20,33,0.1),0_8px_14px_-10px_rgba(14,20,33,0.3)]")}
              >
                Ver carrinho
              </Link>
              <Link
                href="/carrinho#resumo-do-pedido"
                className={cn(
                  linkBase,
                  "bg-gradient-to-b from-[#d9000b] to-[#b00007] text-white shadow-[0_12px_22px_-8px_rgba(200,0,8,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]"
                )}
              >
                Finalizar pedido
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
