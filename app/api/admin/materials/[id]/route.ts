import { NextResponse } from "next/server";
import { getAdminSession } from "@/services/auth";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.authorized || !session.supabase) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const { data, error: readError } = await session.supabase.from("materials").select("file_url").eq("id", id).single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 404 });
  if (data.file_url) {
    const { error: storageError } = await session.supabase.storage.from("materials").remove([data.file_url]);
    if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });
  }
  const { error } = await session.supabase.from("materials").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : new NextResponse(null, { status: 204 });
}
