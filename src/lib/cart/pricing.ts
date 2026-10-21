import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory, StoreVariant } from "@/lib/types";
import { imagesForColor } from "@/lib/store/selection";
import { isStoreProductVisible } from "@/lib/store/visibility";
import { publishedVariants, variantPriceCents } from "@/lib/store/variants";
import { MAX_LINE_QUANTITY, lineKey, type CartLine } from "./cart";

export interface PricedLine {
  key: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  size: string | null;
  colorName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  /** Já ajustada ao estoque. */
  quantity: number;
  /** `null` = sem limite. */
  maxQuantity: number | null;
  lineTotalCents: number;
  /** A quantidade pedida passou do estoque e foi reduzida. */
  reduced: boolean;
}

export type UnavailableReason = "removed" | "sold-out";

export interface UnavailableLine {
  key: string;
  productId: string;
  variantId: string | null;
  reason: UnavailableReason;
  name: string | null;
}

export interface PricedCart {
  lines: PricedLine[];
  unavailable: UnavailableLine[];
  subtotalCents: number;
  itemCount: number;
}

/**
 * Precifica o carrinho com os dados do catálogo: o preço, o estoque e a
 * visibilidade nunca vêm do navegador. Item que saiu da loja ou esgotou vai
 * para `unavailable` e não entra no subtotal.
 */
export function priceCart(
  lines: CartLine[],
  details: StoreProductDetail[],
  categories: StoreCategory[]
): PricedCart {
  const grouped = new Map<string, CartLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const current = grouped.get(key);
    grouped.set(key, {
      ...line,
      quantity: (current?.quantity ?? 0) + line.quantity,
    });
  }

  const priced: PricedLine[] = [];
  const unavailable: UnavailableLine[] = [];

  for (const [key, line] of grouped) {
    const detail = details.find((item) => item.product.id === line.productId);
    const visible =
      detail !== undefined && isStoreProductVisible(detail.product, categories);
    if (!detail || !visible) {
      unavailable.push({ ...ref(key, line), reason: "removed", name: null });
      continue;
    }

    let variant: StoreVariant | null = null;
    if (detail.product.hasVariants) {
      variant =
        line.variantId === null
          ? null
          : (publishedVariants(detail.variants).find((v) => v.id === line.variantId) ??
            null);
      if (!variant) {
        unavailable.push({ ...ref(key, line), reason: "removed", name: detail.product.name });
        continue;
      }
    } else if (line.variantId !== null) {
      unavailable.push({ ...ref(key, line), reason: "removed", name: detail.product.name });
      continue;
    }

    if (variant !== null && variant.stock === 0) {
      unavailable.push({
        ...ref(key, line),
        reason: "sold-out",
        name: detail.product.name,
      });
      continue;
    }

    const wanted = Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(line.quantity)));
    const maxQuantity = variant?.stock ?? null;
    const quantity = maxQuantity === null ? wanted : Math.min(wanted, maxQuantity);
    const unitPriceCents = variantPriceCents(detail.product, variant);
    const colorName = variant?.colorName ?? null;

    priced.push({
      key,
      productId: line.productId,
      variantId: line.variantId,
      slug: detail.product.slug,
      name: detail.product.name,
      size: variant?.size ?? null,
      colorName,
      imageUrl: imagesForColor(detail.images, colorName)[0]?.url ?? null,
      unitPriceCents,
      quantity,
      maxQuantity,
      lineTotalCents: unitPriceCents * quantity,
      reduced: quantity < wanted,
    });
  }

  return {
    lines: priced,
    unavailable,
    subtotalCents: priced.reduce((total, l) => total + l.lineTotalCents, 0),
    itemCount: priced.reduce((total, l) => total + l.quantity, 0),
  };
}

function ref(key: string, line: CartLine) {
  return { key, productId: line.productId, variantId: line.variantId };
}
