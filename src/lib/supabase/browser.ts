"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para componentes de cliente — usado hoje só pelo
 * upload de mídia (`MediaUploader`), que envia o arquivo direto para o
 * Storage a partir do navegador em vez de fazer proxy pelo servidor.
 * Mantém a sessão do usuário sincronizada via cookies (não localStorage),
 * compatível com o cliente de servidor e com o Proxy.
 */
export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
