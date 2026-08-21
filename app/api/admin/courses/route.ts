import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/services/auth";

const courseSchema = z.object({
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(160),
  description: z.string().max(1200).optional(),
  priceCents: z.number().int().nonnegative(),
  duration: z.string().max(80).optional(),
  format: z.string().max(80).optional(),
  checkoutUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session.configured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await session.supabase.from("courses").select("*").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = courseSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 422 });
  const input = parsed.data;
  const { data, error } = await session.supabase.from("courses").insert({ slug: input.slug, title: input.title, description: input.description, price_cents: input.priceCents, duration: input.duration, format: input.format, checkout_url: input.checkoutUrl || null, cover_url: input.coverUrl || null, featured: input.featured, status: input.status }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { status: 201 });
}
