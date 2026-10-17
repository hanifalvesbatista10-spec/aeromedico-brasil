import {
  publishedVariants,
  resolveVariant,
  variantAvailability,
  variantOptions,
  variantPriceCents,
} from "@/lib/store/variants";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

export type SelectionStatus = "incomplete" | "unavailable" | "sold-out" | "ready";

export interface Selection {
  status: SelectionStatus;
  variant: StoreVariant | null;
  priceCents: number;
}

/** Menor preço entre as variações publicadas (o "a partir de" da vitrine). */
export function fromPriceCents(
  product: Pick<StoreProduct, "basePriceCents">,
  variants: StoreVariant[]
): number {
  const published = publishedVariants(variants);
  if (published.length === 0) return product.basePriceCents;
  return Math.min(...published.map((variant) => variantPriceCents(product, variant)));
}

/**
 * Estado da escolha do cliente na página do produto. Só exige tamanho se
 * existir algum tamanho cadastrado, e só exige cor se existir alguma cor.
 */
export function resolveSelection(
  product: Pick<StoreProduct, "basePriceCents" | "hasVariants">,
  variants: StoreVariant[],
  size: string | null,
  colorName: string | null
): Selection {
  if (!product.hasVariants) {
    return { status: "ready", variant: null, priceCents: product.basePriceCents };
  }

  const published = publishedVariants(variants);
  if (published.length === 0) {
    return { status: "unavailable", variant: null, priceCents: product.basePriceCents };
  }

  const startingPrice = fromPriceCents(product, published);
  const options = variantOptions(published);
  const needsSize = options.sizes.length > 0;
  const needsColor = options.colors.length > 0;

  if ((needsSize && !size) || (needsColor && !colorName)) {
    return { status: "incomplete", variant: null, priceCents: startingPrice };
  }

  const variant = resolveVariant(
    published,
    needsSize ? size : null,
    needsColor ? colorName : null
  );
  if (!variant) {
    return { status: "unavailable", variant: null, priceCents: startingPrice };
  }

  return {
    status: variantAvailability(variant) === "sold-out" ? "sold-out" : "ready",
    variant,
    priceCents: variantPriceCents(product, variant),
  };
}

/**
 * Fotos a exibir para a cor escolhida: as da cor primeiro, depois as gerais.
 * Cor sem foto própria mostra as gerais; sem gerais, mostra todas.
 */
export function imagesForColor(
  images: StoreProductImage[],
  colorName: string | null
): StoreProductImage[] {
  const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!colorName) return ordered;

  const ofColor = ordered.filter((image) => image.colorName === colorName);
  const general = ordered.filter((image) => image.colorName === null);
  const result = [...ofColor, ...general];
  return result.length > 0 ? result : ordered;
}

export function buildStoreWhatsappMessage(
  productName: string,
  size: string | null,
  colorName: string | null
): string {
  const details = [size, colorName].filter(Boolean).join(", ");
  return `Olá! Quero comprar: ${productName}${details ? ` (${details})` : ""}.`;
}
