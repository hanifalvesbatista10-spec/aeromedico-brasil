import { NextResponse } from "next/server";
import { getAdminSession } from "@/services/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session.configured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await session.supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(1000);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
