"use client";

import { useSyncExternalStore } from "react";
import { cartItemCount, type CartLine } from "@/lib/cart/cart";
import { cartStore } from "@/lib/cart/cart-store";

export function useCart(): {
  lines: CartLine[];
  count: number;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
} {
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );
  return {
    lines,
    count: cartItemCount(lines),
    add: cartStore.add,
    setQuantity: cartStore.setQuantity,
    remove: cartStore.remove,
    clear: cartStore.clear,
  };
}
