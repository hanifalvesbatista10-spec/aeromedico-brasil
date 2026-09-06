import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para uso exclusivo dentro de `src/proxy.ts`. Cookies são
 * mutáveis aqui (diferente de Server Components): quando o Supabase renova
 * o token de sessão, a renovação precisa ser escrita tanto na requisição
 * (para os Server Components desta mesma navegação lerem a sessão nova)
 * quanto na resposta (para o navegador guardar o cookie renovado).
 */
export function createProxySupabaseClient(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, getResponse: () => response };
}
