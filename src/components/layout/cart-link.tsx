"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { MiniCart } from "./mini-cart";

function label(count: number): string {
  if (count === 0) return "Carrinho vazio";
  return `Carrinho, ${count} ${count === 1 ? "item" : "itens"}`;
}

/** Aparelho com mouse ou teclado (em tela de toque o painel nunca abre). */
function canHover(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia("(hover: hover)").matches;
}

/**
 * Ícone do carrinho no cabeçalho, com o total de itens. Com mouse ou teclado, abre o
 * mini-carrinho; em tela de toque ele leva direto ao carrinho.
 */
export function CartLink() {
  const { count, lines } = useCart();
  // O painel só existe depois da primeira vez que alguém passa o mouse ou foca o ícone.
  const [armed, setArmed] = useState(false);
  // Escape fecha o painel sem mexer o ponteiro (WCAG 1.4.13); sair do ícone o libera de novo.
  const [dismissed, setDismissed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Escape vale em qualquer lugar da página (quem abriu só com o mouse não tem foco no ícone).
  // Com o foco dentro do painel, ele volta ao ícone: o painel escondido não deixa o foco cair no vazio.
  useEffect(() => {
    if (!armed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setDismissed(true);
      const active = document.activeElement;
      if (wrapperRef.current?.contains(active) && active !== linkRef.current) linkRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [armed]);

  return (
    <div
      ref={wrapperRef}
      data-testid="cart-hover"
      className="group relative"
      onMouseEnter={() => {
        if (!canHover()) return;
        setArmed(true);
        setDismissed(false);
      }}
      onFocus={() => {
        if (canHover()) setArmed(true);
      }}
      onMouseLeave={() => setDismissed(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDismissed(false);
      }}
    >
      <Link
        ref={linkRef}
        href="/carrinho"
        aria-label={label(count)}
        className="relative inline-flex size-11 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <ShoppingBag aria-hidden="true" className="size-5" />
        {count > 0 && (
          <span
            data-testid="cart-count"
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-semibold leading-5 text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
      {armed && <MiniCart lines={lines} dismissed={dismissed} />}
    </div>
  );
}
