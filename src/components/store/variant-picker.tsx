"use client";

import { useState } from "react";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { buildWhatsappLink } from "@/lib/utils/whatsapp";
import {
  buildStoreWhatsappMessage,
  imagesForColor,
  resolveSelection,
} from "@/lib/store/selection";
import {
  publishedVariants,
  variantAvailability,
  variantOptions,
} from "@/lib/store/variants";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

const optionBase =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

function statusLabel(status: string, missingSize: boolean, missingColor: boolean): string {
  if (status === "sold-out") return "Esgotado";
  if (status === "unavailable") return "Indisponível";
  const missing = [missingSize ? "o tamanho" : null, missingColor ? "a cor" : null]
    .filter(Boolean)
    .join(" e ");
  return `Escolha ${missing}`;
}

/**
 * Galeria, escolha de tamanho/cor, preço e botão de compra de um produto.
 * Enquanto não há carrinho nem pagamento, a compra é pelo WhatsApp do cliente.
 */
export function VariantPicker({
  product,
  variants,
  images,
  whatsappUrl,
}: {
  product: StoreProduct;
  variants: StoreVariant[];
  images: StoreProductImage[];
  whatsappUrl: string;
}) {
  const published = publishedVariants(variants);
  const options = variantOptions(published);
  const needsSize = options.sizes.length > 0;
  const needsColor = options.colors.length > 0;

  // Uma única opção já vem escolhida: o cliente não precisa clicar à toa.
  const [size, setSize] = useState<string | null>(
    options.sizes.length === 1 ? options.sizes[0] : null
  );
  const [colorName, setColorName] = useState<string | null>(
    options.colors.length === 1 ? options.colors[0].name : null
  );
  const [photoIndex, setPhotoIndex] = useState(0);

  const selection = resolveSelection(product, variants, size, colorName);
  const gallery = imagesForColor(images, colorName);
  const photo = gallery[Math.min(photoIndex, Math.max(gallery.length - 1, 0))];

  const prices = new Set(published.map((v) => v.priceCents ?? product.basePriceCents));
  const showFrom = selection.status === "incomplete" && prices.size > 1;

  const whatsappHref =
    selection.status === "ready"
      ? buildWhatsappLink(
          whatsappUrl,
          buildStoreWhatsappMessage(product.name, size, colorName)
        )
      : null;

  // Nunca prender o cliente: escolher uma opção que não combina com a outra
  // já escolhida aceita a nova e limpa a outra (ex.: Preta só tem P, Rosa só
  // tem PP: clicar em Rosa com P marcado troca a cor e pede o tamanho).
  function chooseColor(name: string) {
    setColorName(name);
    setPhotoIndex(0);
    if (size !== null && !published.some((v) => v.colorName === name && v.size === size)) {
      setSize(null);
    }
  }
  function chooseSize(value: string) {
    setSize(value);
    if (colorName !== null && !published.some((v) => v.size === value && v.colorName === colorName)) {
      setColorName(null);
    }
  }

  function sizeExists(value: string) {
    return published.some(
      (v) => v.size === value && (colorName === null || v.colorName === colorName)
    );
  }
  function colorExists(value: string) {
    return published.some(
      (v) => v.colorName === value && (size === null || v.size === size)
    );
  }
  function soldOut(kind: "size" | "color", value: string) {
    const matches = published.filter((v) =>
      kind === "size"
        ? v.size === value && (colorName === null || v.colorName === colorName)
        : v.colorName === value && (size === null || v.size === size)
    );
    return matches.length > 0 && matches.every((v) => variantAvailability(v) === "sold-out");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          {photo ? (
            <Image
              src={photo.url}
              alt={photo.alt || product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-gray-600">
              Foto em breve
            </span>
          )}
        </div>
        {gallery.length > 1 && (
          <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Fotos do produto">
            {gallery.map((image, index) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-current={photo?.id === image.id}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-md border-2 bg-gray-100",
                    photo?.id === image.id ? "border-navy-700" : "border-transparent"
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h1 className="text-h1 font-heading font-bold text-navy-950">{product.name}</h1>

        <p className="mt-4 text-2xl font-semibold text-navy-950" aria-live="polite">
          {showFrom && <span className="mr-1 text-sm font-normal text-gray-600">A partir de</span>}
          {formatBRL(selection.priceCents)}
        </p>

        {product.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-gray-600">
            {product.description}
          </p>
        )}

        {needsColor && (
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-navy-950">
              Cor{colorName ? `: ${colorName}` : ""}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.colors.map((color) => {
                const exists = colorExists(color.name);
                const selected = colorName === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseColor(color.name)}
                    className={cn(
                      optionBase,
                      "gap-2",
                      selected ? "border-navy-700 bg-navy-950/5" : "border-border",
                      !exists && "opacity-60",
                      soldOut("color", color.name) && "line-through"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color.hex ?? "#e5e7eb" }}
                    />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {needsSize && (
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-navy-950">
              Tamanho{size ? `: ${size}` : ""}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.sizes.map((value) => {
                const exists = sizeExists(value);
                const selected = size === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseSize(value)}
                    className={cn(
                      optionBase,
                      selected ? "border-navy-700 bg-navy-950/5" : "border-border",
                      !exists && "opacity-60",
                      soldOut("size", value) && "line-through"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-10">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              Comprar pelo WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "pointer-events-none w-full opacity-60 sm:w-auto"
              )}
            >
              {selection.status === "ready"
                ? "Compra em breve"
                : statusLabel(
                    selection.status,
                    needsSize && size === null,
                    needsColor && colorName === null
                  )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
