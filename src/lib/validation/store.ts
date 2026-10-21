import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";

const PRICE_MESSAGE = "Informe um preço válido, por exemplo 49,90.";
const HEX_MESSAGE = "Cor inválida. Use o formato #RRGGBB.";

function emptyToNull(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}

const optionalText = z.string().nullish().transform(emptyToNull);

/** Preço obrigatório, digitado em reais (ex.: "49,90") → centavos > 0. */
const requiredPrice = z.string().transform((value, ctx) => {
  const cents = parseBRLToCents(value);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: "custom", message: PRICE_MESSAGE });
    return z.NEVER;
  }
  return cents;
});

/** Preço opcional: vazio herda o do produto (null); preenchido precisa ser válido. */
const optionalPrice = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined || value.trim() === "") return null;
    const cents = parseBRLToCents(value);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: PRICE_MESSAGE });
      return z.NEVER;
    }
    return cents;
  });

function positiveInt(message: string) {
  return z.coerce.number({ error: message }).int(message).positive(message);
}

/** Inteiro opcional: vazio = null; preenchido precisa ser inteiro >= min. */
function optionalInt(min: number, message: string) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "")
      ) {
        return null;
      }
      const number = typeof value === "number" ? value : Number(value.trim());
      if (!Number.isInteger(number) || number < min) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return number;
    });
}

const WEIGHT_MESSAGE = "Informe o peso em gramas (número inteiro maior que zero).";
const SIZE_MESSAGE = "Informe a medida em centímetros (número inteiro maior que zero).";

export const storeProductSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do produto."),
    description: z.string().trim(),
    price: requiredPrice,
    weightGrams: positiveInt(WEIGHT_MESSAGE),
    lengthCm: positiveInt(SIZE_MESSAGE),
    widthCm: positiveInt(SIZE_MESSAGE),
    heightCm: positiveInt(SIZE_MESSAGE),
    categoryId: optionalText,
    featured: z.boolean(),
    published: z.boolean(),
    seoTitle: optionalText,
    seoDescription: optionalText,
  })
  .transform(({ price, ...rest }) => ({ ...rest, basePriceCents: price }));

export type StoreProductFormInput = z.input<typeof storeProductSchema>;

export const storeVariantSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    sku: optionalText,
    size: optionalText,
    colorName: optionalText,
    colorHex: optionalText.refine(
      (value) => value === null || /^#[0-9a-fA-F]{6}$/.test(value),
      HEX_MESSAGE
    ),
    price: optionalPrice,
    weightGrams: optionalInt(1, WEIGHT_MESSAGE),
    stock: optionalInt(
      0,
      "Estoque deve ser um número inteiro, zero ou maior (ou deixe vazio para sem limite)."
    ),
    published: z.boolean(),
    sortOrder: z.coerce.number().int().default(0),
  })
  .refine((variant) => variant.size !== null || variant.colorName !== null, {
    message: "Informe o tamanho ou a cor da variação.",
    path: ["size"],
  })
  .transform(({ price, ...rest }) => ({ ...rest, priceCents: price }));

export type StoreVariantFormInput = z.input<typeof storeVariantSchema>;

export const storeVariantsSchema = z
  .array(storeVariantSchema)
  .superRefine((variants, ctx) => {
    const combos = new Set<string>();
    const skus = new Set<string>();
    const ids = new Set<string>();
    for (const variant of variants) {
      if (variant.id !== undefined) {
        if (ids.has(variant.id)) {
          ctx.addIssue({ code: "custom", message: "Há variações repetidas." });
          return;
        }
        ids.add(variant.id);
      }
      const combo = `${variant.size ?? ""}|${variant.colorName ?? ""}`;
      if (combos.has(combo)) {
        ctx.addIssue({
          code: "custom",
          message: "Há variações repetidas (mesmo tamanho e cor).",
        });
        return;
      }
      combos.add(combo);
      if (variant.sku !== null) {
        if (skus.has(variant.sku)) {
          ctx.addIssue({
            code: "custom",
            message: "Há variações com o mesmo SKU.",
          });
          return;
        }
        skus.add(variant.sku);
      }
    }
  });

export const storeImageSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Endereço da foto inválido."),
  alt: z.string().trim(),
  colorName: optionalText,
  sortOrder: z.coerce.number().int().default(0),
});

export const storeImagesSchema = z.array(storeImageSchema);

export type StoreImageFormInput = z.input<typeof storeImageSchema>;

export const storeCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria."),
  published: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export type StoreCategoryFormInput = z.input<typeof storeCategorySchema>;
