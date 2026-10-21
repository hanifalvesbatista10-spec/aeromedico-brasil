"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

function label(count: number): string {
  if (count === 0) return "Carrinho vazio";
  return `Carrinho, ${count} ${count === 1 ? "item" : "itens"}`;
}

/** Ícone do carrinho no cabeçalho, com o total de itens. */
export function CartLink() {
  const { count } = useCart();

  return (
    <Link
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
  );
}
