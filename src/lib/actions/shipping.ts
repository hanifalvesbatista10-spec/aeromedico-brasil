"use server";

import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { priceCart } from "@/lib/cart/pricing";
import { normalizeCep } from "@/lib/shipping/cep";
import { getShippingProvider } from "@/lib/shipping/config";
import { buildShippingItems } from "@/lib/shipping/items";
import type { ShippingOption } from "@/lib/shipping/types";
import { cartLinesSchema } from "@/lib/validation/cart";

export type QuoteShippingResult =
  | {
      ok: true;
      options: ShippingOption[];
      /** CEP de destino já normalizado (8 dígitos). */
      cep: string;
    }
  | {
      ok: false;
      code: "invalid-input" | "invalid-cep" | "empty-cart" | "unconfigured" | "unavailable";
      error: string;
    };

const fail = (
  code: Extract<QuoteShippingResult, { ok: false }>["code"],
  error: string
): QuoteShippingResult => ({ ok: false, code, error });

const UNAVAILABLE = "Não foi possível calcular o frete agora. Tente de novo.";
const EMPTY_CART = "Não há itens disponíveis para calcular o frete.";

/**
 * Cota o frete do carrinho para um CEP. Leitura pública (qualquer visitante):
 * usa só ids, quantidades e o CEP vindos do navegador; peso e medidas saem do
 * catálogo. O token do Melhor Envio nunca sai do servidor e a mensagem do
 * fornecedor nunca chega ao cliente. Erros esperados voltam como valor porque
 * o Next esconde a mensagem de erros lançados em Server Actions em produção.
 */
export async function quoteShippingAction(
  lines: unknown,
  cep: unknown
): Promise<QuoteShippingResult> {
  const parsed = cartLinesSchema.safeParse(lines);
  if (!parsed.success) {
    return fail("invalid-input", "Não foi possível ler os itens do carrinho.");
  }
  if (parsed.data.length === 0) return fail("empty-cart", EMPTY_CART);

  const destinationCep = typeof cep === "string" ? normalizeCep(cep) : null;
  if (!destinationCep) return fail("invalid-cep", "CEP inválido. Confira os 8 números.");

  const provider = getShippingProvider();
  if (!provider) {
    return fail(
      "unconfigured",
      "O cálculo automático do frete não está disponível no momento. O frete é combinado no WhatsApp."
    );
  }

  let items;
  try {
    const store = getRepositories().store;
    const [details, categories] = await Promise.all([
      store.listProductDetails(),
      store.listCategories(),
    ]);
    items = buildShippingItems(priceCart(parsed.data, details, categories), details);
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[frete] catálogo indisponível", error);
    return fail("unavailable", UNAVAILABLE);
  }
  if (items.length === 0) return fail("empty-cart", EMPTY_CART);

  const result = await provider.quote({ destinationCep, items });
  if (result.ok) return { ok: true, options: result.options, cep: destinationCep };
  return result.reason === "invalid-cep"
    ? fail("invalid-cep", "CEP não encontrado. Confira se digitou certo.")
    : fail("unavailable", UNAVAILABLE);
}
