"use client";

import { useCallback, useSyncExternalStore } from "react";

interface NetworkInformation extends EventTarget {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
}

function getConnection() {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function readSaveData() {
  const connection = getConnection();
  if (!connection) return false;
  return (
    Boolean(connection.saveData) ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  );
}

/**
 * `true` quando o navegador sinaliza economia de dados ativa ou uma conexão
 * lenta (2g/slow-2g) via `navigator.connection` (Network Information API).
 * Indisponível em boa parte dos navegadores (Safari, Firefox) — nesses
 * casos retorna `false` e o vídeo é liberado normalmente.
 */
export function useSaveData() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const connection = getConnection();
    if (!connection) return () => {};
    connection.addEventListener("change", onStoreChange);
    return () => connection.removeEventListener("change", onStoreChange);
  }, []);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, readSaveData, getServerSnapshot);
}
