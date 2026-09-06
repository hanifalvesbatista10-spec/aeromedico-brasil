import { NextResponse, type NextRequest } from "next/server";
import { createProxySupabaseClient } from "@/lib/supabase/proxy";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const { supabase, getResponse } = createProxySupabaseClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    // Autenticado, mas sem permissão administrativa: acesso negado e
    // sessão encerrada — não deixamos uma sessão "meio autorizada" viva.
    await supabase.auth.signOut();
    const deniedUrl = new URL("/admin/login", request.url);
    deniedUrl.searchParams.set("erro", "sem-permissao");
    return NextResponse.redirect(deniedUrl);
  }

  return getResponse();
}

export const config = { matcher: ["/admin/:path*"] };
