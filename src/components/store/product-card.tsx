import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/money";
import { fromPriceCents } from "@/lib/store/selection";
import { productAvailability, publishedVariants } from "@/lib/store/variants";
import type { StoreProductDetail } from "@/lib/repositories/types";

export function StoreProductCard({ detail }: { detail: StoreProductDetail }) {
  const { product, variants, images } = detail;
  const cover = [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const availability = productAvailability(product.hasVariants, variants);
  const startingPrice = fromPriceCents(product, variants);
  const hasPriceRange =
    product.hasVariants &&
    new Set(publishedVariants(variants).map((v) => v.priceCents ?? product.basePriceCents))
      .size > 1;

  return (
    <article className="group flex flex-col">
      <Link
        href={`/loja/${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-lg bg-gray-100"
      >
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-gray-600">
            Foto em breve
          </span>
        )}
        {availability !== "available" && (
          <Badge variant="secondary" className="absolute top-3 left-3">
            {availability === "sold-out" ? "Esgotado" : "Indisponível"}
          </Badge>
        )}
      </Link>

      <h3 className="mt-3 font-heading text-h4 font-semibold text-navy-950">
        <Link href={`/loja/${product.slug}`} className="hover:underline focus-visible:underline">
          {product.name}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        {hasPriceRange && "A partir de "}
        <span className="font-semibold text-navy-950">{formatBRL(startingPrice)}</span>
      </p>
    </article>
  );
}
