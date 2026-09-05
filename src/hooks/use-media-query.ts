"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `null` no servidor / antes da hidratação — usado para adiar decisões que
 * dependem do viewport (ex.: qual vídeo carregar) até depois do primeiro
 * paint no cliente, sem arriscar mismatch entre servidor e cliente.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
