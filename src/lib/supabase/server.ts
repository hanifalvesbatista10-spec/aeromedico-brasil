import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route
 * Handlers. Lê a sessão do cookie da requisição — nunca usa chave secreta;
 * toda leitura/escrita respeita RLS como o usuário autenticado (ou como
 * visitante anônimo, quando não há sessão).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component (sem permissão de
          // escrita de cookies fora de Server Actions/Route Handlers). O
          // Proxy já renova a sessão antes da requisição chegar aqui, então
          // é seguro ignorar — ver src/proxy.ts.
        }
      },
    },
  });
}
