import { NextResponse } from "next/server";
import { getAdminSession } from "@/services/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session.configured) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await session.supabase.from("materials").select("*").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 20 * 1024 * 1024 || title.length < 3 || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Arquivo ou dados inválidos." }, { status: 422 });
  const path = `${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error: uploadError } = await session.supabase.storage.from("materials").upload(path, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const { data, error } = await session.supabase.from("materials").insert({ slug, title, description: String(form.get("description") ?? ""), file_url: path, status: "draft" }).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { status: 201 });
}
