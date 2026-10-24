"use server";

import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { buyerSchema } from "@/lib/orders/buyer";
import {
  checkoutSelectionSchema,
  computeCheckoutQuote,
  type CheckoutQuote,
} from "@/lib/orders/quote";
import { createAsaasCheckout, getAsaasConfig } from "@/lib/payments/asaas";
import { isCheckoutEnabled } from "@/lib/payments/enabled";
import { getShippingProvider } from "@/lib/shipping/config";
import type { OrderDraft } from "@/lib/types";

// Cotação e criação do pedido. Leitura/escrita públicas, então tudo que vem do
// navegador é tratado como pedido de cliente, nunca como verdade: preço, frete,
// desconto e desconto do Pix são refeitos aqui. Erros esperados voltam como valor porque o
// Next esconde a mensagem de erros lançados em Server Actions em produção.

const DISABLED = "O pagamento pelo site ainda não está disponível. Finalize pelo WhatsApp.";
const QUOTE_UNAVAILABLE = "Não foi possível calcular o pagamento agora. Tente de novo.";
// Nunca é dito ao comprador que o pagamento foi cobrado: o link só é entregue depois de o
// pedido estar vinculado ao checkout, então nesta mensagem nada foi cobrado.
const CHECKOUT_UNAVAILABLE =
  "Não conseguimos abrir o pagamento agora. Nenhuma cobrança foi feita. Tente de novo em instantes.";

type QuoteFailure = Extract<CheckoutQuote, { ok: false }>;

async function loadDeps() {
  const repositories = getRepositories();
  return {
    store: repositories.store,
    coupons: repositories.coupons,
    shippingProvider: getShippingProvider(),
    terms: await repositories.paymentSettings.get(),
    now: new Date(),
  };
}

/** Cotação com o catálogo e as taxas do servidor; infraestrutura fora do ar vira `unavailable`. */
async function safeQuote(selection: unknown): Promise<CheckoutQuote> {
  try {
    return await computeCheckoutQuote(selection, await loadDeps());
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[checkout] cotação indisponível", error instanceof Error ? error.name : "erro");
    return { ok: false, code: "unavailable", error: QUOTE_UNAVAILABLE };
  }
}

export async function quoteCheckoutAction(selection: unknown): Promise<CheckoutQuote> {
  if (!isCheckoutEnabled()) {
    return { ok: false, code: "unavailable", error: DISABLED };
  }
  return safeQuote(selection);
}

export type PlaceOrderResult =
  | { ok: true; checkoutUrl: string }
  | {
      ok: false;
      code: "disabled" | "invalid-buyer" | "quote" | "unavailable";
      error: string;
      quote?: QuoteFailure;
    };

const fail = (
  code: Extract<PlaceOrderResult, { ok: false }>["code"],
  error: string,
  quote?: QuoteFailure
): PlaceOrderResult => ({ ok: false, code, error, ...(quote ? { quote } : {}) });

function summarize(items: OrderDraft["items"]): string {
  return items
    .map((item) => {
      const details = [item.size, item.colorName].filter(Boolean).join(", ");
      return `${item.quantity}x ${item.name}${details ? ` (${details})` : ""}`;
    })
    .join("; ");
}

export async function placeOrderAction(
  selection: unknown,
  buyerInput: unknown
): Promise<PlaceOrderResult> {
  if (!isCheckoutEnabled()) return fail("disabled", DISABLED);

  const buyer = buyerSchema.safeParse(buyerInput);
  if (!buyer.success) {
    return fail("invalid-buyer", buyer.error.issues[0]?.message ?? "Confira os dados informados.");
  }

  // Ao criar o pedido o cliente PRECISA informar o total que viu.
  const parsed = checkoutSelectionSchema.safeParse(selection);
  if (parsed.success && parsed.data.expectedTotalCents === undefined) {
    const quote: QuoteFailure = {
      ok: false,
      code: "invalid-input",
      error: "Algo deu errado com os dados do pedido. Atualize a página e tente de novo.",
    };
    return fail("quote", quote.error, quote);
  }

  const quote = await safeQuote(selection);
  if (!quote.ok) {
    return quote.code === "unavailable"
      ? fail("unavailable", quote.error)
      : fail("quote", quote.error, quote);
  }

  // O frete foi cotado para um CEP; a entrega precisa ser nesse mesmo CEP, senão
  // dava para pagar o frete de um lugar e receber em outro.
  if (buyer.data.address.cep !== quote.shipping.cep) {
    return fail("invalid-buyer", "O CEP da entrega deve ser o mesmo do cálculo do frete.");
  }

  const draft: OrderDraft = {
    customer: buyer.data.customer,
    address: buyer.data.address,
    shipping: {
      optionId: quote.shipping.optionId,
      label: quote.shipping.label,
      cents: quote.shipping.cents,
    },
    items: quote.items,
    subtotalCents: quote.subtotalCents,
    discountCents: quote.discountCents,
    couponCode: quote.couponCode,
    pixDiscountCents: quote.chosen.discountCents,
    totalCents: quote.chosen.totalCents,
    paymentMethod: quote.chosen.method,
    environment: getAsaasConfig()?.environment ?? "production",
  };

  const orders = getRepositories().orders;
  const config = getAsaasConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!config || !siteUrl) return fail("disabled", DISABLED);

  let order: { id: string; number: number; accessToken: string };
  try {
    order = await orders.create(draft);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[checkout] falha ao gravar o pedido", error instanceof Error ? error.name : "erro");
    return fail("unavailable", CHECKOUT_UNAVAILABLE);
  }

  // Daqui em diante o pedido existe: qualquer falha antes do vínculo com o
  // checkout cancela o pedido, e o link só é entregue depois de vinculado.
  const cancel = async () => {
    try {
      await orders.cancelPending(order.id);
    } catch (error) {
      console.error(
        "[checkout] pedido pendente não pôde ser cancelado:",
        order.id,
        error instanceof Error ? error.name : "erro"
      );
    }
  };

  const checkout = await createAsaasCheckout(config, {
    orderId: order.id,
    orderNumber: order.number,
    totalCents: draft.totalCents,
    method: draft.paymentMethod,
    maxInstallments:
      quote.options.find((option) => option.method === "card_installments")?.installments ?? 1,
    itemsSummary: summarize(draft.items),
    siteUrl,
    accessToken: order.accessToken,
  });
  if (!checkout.ok) {
    await cancel();
    return fail("unavailable", CHECKOUT_UNAVAILABLE);
  }

  try {
    await orders.attachCheckout(order.id, { id: checkout.id, url: checkout.url });
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      "[checkout] checkout criado mas não vinculado ao pedido:",
      order.id,
      checkout.id,
      error instanceof Error ? error.name : "erro"
    );
    await cancel();
    return fail("unavailable", CHECKOUT_UNAVAILABLE);
  }

  return { ok: true, checkoutUrl: checkout.url };
}
