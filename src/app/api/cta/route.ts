import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCtaEvent } from "@/lib/analytics/cta-events";

const ctaEventSchema = z.object({
  ctaId: z.string().min(1).max(100),
  pagePath: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ctaEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordCtaEvent(parsed.data);
  } catch {
    // Registro de clique é best-effort — nunca deve quebrar a navegação do
    // visitante nem expor detalhes de erro do banco no cliente.
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
