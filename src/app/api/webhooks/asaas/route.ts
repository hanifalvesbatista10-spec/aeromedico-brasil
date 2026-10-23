import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/repositories";
import { getAsaasConfig } from "@/lib/payments/asaas";

// Webhook do Asaas (docs: "Receba eventos do Asaas no seu endpoint de Webhook").
// Autentica pelo cabeçalho `asaas-access-token`, grava o evento de forma
// idempotente (o `id` do evento é a chave) e responde RÁPIDO: o Asaas pausa a
// fila depois de 15 falhas seguidas. Só os eventos de checkout (com
// `checkout.id`) mudam pedido; o resto recebe 200 e é ignorado.

/** Comparação em tempo constante, mesmo com tamanhos diferentes (compara os hashes). */
function sameToken(received: string, expected: string): boolean {
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const config = getAsaasConfig();
  if (!config) return NextResponse.json({ ok: false }, { status: 503 });

  const received = request.headers.get("asaas-access-token") ?? "";
  if (!received || !sameToken(received, config.webhookToken)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    event?: unknown;
    checkout?: { id?: unknown; status?: unknown } | null;
  } | null;
  if (
    typeof body !== "object" ||
    body === null ||
    typeof body.id !== "string" ||
    body.id === "" ||
    typeof body.event !== "string" ||
    body.event === ""
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const checkoutId = body.checkout?.id;
  if (typeof checkoutId !== "string" || checkoutId === "") {
    return NextResponse.json({ ok: true });
  }

  // O corpo do Asaas pode trazer dados do pagador e o link de retorno (com a
  // chave do pedido): guardamos só o necessário para auditar o evento.
  const status = body.checkout?.status;
  const payload = {
    id: body.id,
    event: body.event,
    checkout: { id: checkoutId, ...(typeof status === "string" ? { status } : {}) },
  };

  try {
    await getRepositories().orders.applyEvent({
      eventId: body.id,
      type: body.event,
      checkoutId,
      payload,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // 500 faz o Asaas tentar de novo. Só o tipo do erro vai para o log.
    console.error("[webhook asaas] falha ao aplicar o evento:", error instanceof Error ? error.name : "erro");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
