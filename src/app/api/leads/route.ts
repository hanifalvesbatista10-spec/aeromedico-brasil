import { NextResponse } from "next/server";
import { z } from "zod";
import { leadSchema } from "@/lib/validation/lead";
import { getRepositories } from "@/lib/repositories";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // Honeypot: bots costumam preencher todo campo de formulário, inclusive
  // os que uma pessoa nunca veria. Resposta 201 idêntica à de sucesso, sem
  // gravar nada — não avisamos o bot de que foi identificado.
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const lead = await getRepositories().leads.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "novo",
    notes: null,
  });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
