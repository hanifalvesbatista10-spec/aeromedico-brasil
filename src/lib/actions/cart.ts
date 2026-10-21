"use server";

import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { priceCart, type PricedCart } from "@/lib/cart/pricing";
import { cartLinesSchema } from "@/lib/validation/cart";

export type PriceCartResult =
  | { ok: true; cart: PricedCart }
  | { ok: false; error: string };

/**
 * Precifica o carrinho com os dados do catálogo. Leitura pública (qualquer
 * visitante), então não exige admin: só devolve o que a loja já mostra, e
 * nunca usa preço vindo do navegador. Erros esperados voltam como valor porque
 * o Next esconde a mensagem de erros lançados em Server Actions em produção.
 */
export async function priceCartAction(input: unknown): Promise<PriceCartResult> {
  const parsed = cartLinesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Não foi possível ler os itens do carrinho." };

  if (parsed.data.length === 0) {
    return {
      ok: true,
      cart: { lines: [], unavailable: [], subtotalCents: 0, itemCount: 0 },
    };
  }

  try {
    const store = getRepositories().store;
    const [details, categories] = await Promise.all([
      store.listProductDetails(),
      store.listCategories(),
    ]);
    return { ok: true, cart: priceCart(parsed.data, details, categories) };
  } catch (error) {
    // Erros internos do Next (ex.: uso de cookies) precisam seguir adiante.
    unstable_rethrow(error);
    console.error("[carrinho] catálogo indisponível", error);
    return {
      ok: false,
      error: "Não foi possível carregar o carrinho agora. Tente de novo.",
    };
  }
}
