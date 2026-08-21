import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/services/auth";

const updateSchema = z.object({ title: z.string().min(3).max(160).optional(), description: z.string().max(1200).optional(), priceCents: z.number().int().nonnegative().optional(), duration: z.string().max(80).optional(), format: z.string().max(80).optional(), checkoutUrl: z.string().url().nullable().optional(), coverUrl: z.string().url().nullable().optional(), featured: z.boolean().optional(), status: z.enum(["draft", "published", "archived"]).optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  const { id } = await params; const input = parsed.data;
  const payload = { ...input, price_cents: input.priceCents, checkout_url: input.checkoutUrl, cover_url: input.coverUrl } as Record<string, unknown>;
  delete payload.priceCents; delete payload.checkoutUrl; delete payload.coverUrl;
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  const { data, error } = await session.supabase.from("courses").update(payload).eq("id", id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const { error } = await session.supabase.from("courses").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : new NextResponse(null, { status: 204 });
}
