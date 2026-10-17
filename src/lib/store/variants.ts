import type { StoreProduct, StoreVariant } from "@/lib/types";

export type Availability = "available" | "sold-out";
export type ProductAvailability = Availability | "unavailable";

function bySortOrder(a: StoreVariant, b: StoreVariant): number {
  return a.sortOrder - b.sortOrder;
}

/** Variações publicadas, na ordem definida pelo dono. */
export function publishedVariants(variants: StoreVariant[]): StoreVariant[] {
  return variants.filter((variant) => variant.published).sort(bySortOrder);
}

/** Tamanhos e cores únicos (cor por nome), na ordem de `sortOrder`. */
export function variantOptions(variants: StoreVariant[]): {
  sizes: string[];
  colors: { name: string; hex: string | null }[];
} {
  const sizes: string[] = [];
  const colors: { name: string; hex: string | null }[] = [];

  for (const variant of [...variants].sort(bySortOrder)) {
    if (variant.size && !sizes.includes(variant.size)) {
      sizes.push(variant.size);
    }
    if (
      variant.colorName &&
      !colors.some((color) => color.name === variant.colorName)
    ) {
      colors.push({ name: variant.colorName, hex: variant.colorHex });
    }
  }

  return { sizes, colors };
}

/** Variação exata para a combinação escolhida; `null` conta como valor. */
export function resolveVariant(
  variants: StoreVariant[],
  size: string | null,
  colorName: string | null
): StoreVariant | null {
  return (
    variants.find(
      (variant) => variant.size === size && variant.colorName === colorName
    ) ?? null
  );
}

export function variantPriceCents(
  product: Pick<StoreProduct, "basePriceCents">,
  variant: StoreVariant | null
): number {
  return variant?.priceCents ?? product.basePriceCents;
}

/** `stock = 0` esgota; `null` é sem limite. Sem variação (produto único): disponível. */
export function variantAvailability(variant: StoreVariant | null): Availability {
  return variant !== null && variant.stock === 0 ? "sold-out" : "available";
}

/**
 * Disponibilidade do produto para a vitrine. `variants` deve ser o que o
 * visitante enxerga (a RLS já omite as despublicadas); por isso `hasVariants`
 * vem do produto: sem ele, lista vazia significa produto único à venda.
 */
export function productAvailability(
  hasVariants: boolean,
  variants: StoreVariant[]
): ProductAvailability {
  if (!hasVariants) return "available";
  const visible = publishedVariants(variants);
  if (visible.length === 0) return "unavailable";
  return visible.every((variant) => variantAvailability(variant) === "sold-out")
    ? "sold-out"
    : "available";
}
