import type { StoreProductDetail } from "@/lib/repositories/types";
import type { PricedCart } from "@/lib/cart/pricing";
import type { ShippingItem } from "./types";

/**
 * Itens da cotação a partir do carrinho JÁ precificado no servidor: só linhas
 * válidas entram, e peso e medidas vêm do catálogo (nunca do navegador). A
 * variação sobrepõe o peso do produto; as medidas são sempre as do produto.
 */
export function buildShippingItems(
  cart: PricedCart,
  details: StoreProductDetail[]
): ShippingItem[] {
  const items: ShippingItem[] = [];

  for (const line of cart.lines) {
    const detail = details.find((item) => item.product.id === line.productId);
    if (!detail) continue;
    const variant =
      line.variantId === null
        ? null
        : (detail.variants.find((v) => v.id === line.variantId) ?? null);

    items.push({
      id: line.key,
      name: line.name,
      widthCm: detail.product.widthCm,
      heightCm: detail.product.heightCm,
      lengthCm: detail.product.lengthCm,
      weightGrams: variant?.weightGrams ?? detail.product.weightGrams,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
    });
  }

  return items;
}
