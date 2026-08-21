import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/services/supabase/server";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(160),
  materialId: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ accepted: true, demo: true }, { status: 202 });
  const { error } = await supabase.from("leads").insert({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    material_id: parsed.data.materialId,
    source: "landing-page",
  });
  if (error) return NextResponse.json({ error: "Não foi possível registrar o lead." }, { status: 500 });
  return NextResponse.json({ accepted: true }, { status: 201 });
}
