import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/services/auth";

const contentSchema = z.object({
  sectionKey: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(180),
  body: z.string().max(1500),
  imageUrl: z.string().url().nullable().optional(),
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().max(240).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session.configured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await session.supabase.from("site_content").select("*").order("section_key");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = z.array(contentSchema).min(1).max(20).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Conteúdo inválido.", details: parsed.error.flatten() }, { status: 422 });
  const rows = parsed.data.map((item) => ({ section_key: item.sectionKey, title: item.title, body: item.body, image_url: item.imageUrl || null, cta_label: item.ctaLabel || null, cta_url: item.ctaUrl || null, status: item.status, updated_at: new Date().toISOString() }));
  const { data, error } = await session.supabase.from("site_content").upsert(rows, { onConflict: "section_key" }).select();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
