"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Não carrega o analytics na página do pedido: o endereço dela leva a chave de
 * acesso (`?t=`), e o Google Analytics e o Pixel da Meta enviariam a URL completa
 * a terceiros.
 */
export function AnalyticsGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/pedido/")) return null;
  return <>{children}</>;
}
