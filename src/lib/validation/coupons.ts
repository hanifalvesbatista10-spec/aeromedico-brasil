import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";
import { normalizeCouponCode } from "@/lib/cart/coupon";
import type { StoreCoupon } from "@/lib/types";

// O dono digita tudo como texto (como nos demais formulários do painel). As
// datas chegam em ISO: a conversão do campo `datetime-local` acontece no
// navegador, que conhece o fuso do dono (src/lib/store/coupon-drafts.ts).

/** Maior código aceito (a regra do formulário e a do carrinho são a mesma). */
export const MAX_COUPON_CODE_LENGTH = 32;
// Mínimo de 6: a consulta de cupom é pública e código curto é fácil de adivinhar
// por tentativa. O banco aceita a partir de 3 (migration), o painel não.
const CODE_RE = /^[A-Z0-9_-]{6,32}$/;
/** Maior valor das colunas `integer` do Postgres. */
const MAX_DB_INT = 2_147_483_647;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

const CODE_MESSAGE =
  "Use de 6 a 32 caracteres: letras sem acento, números, hífen ou sublinhado.";
const PERCENT_MESSAGE = "Informe um percentual inteiro entre 1 e 100.";
const FIXED_MESSAGE = "Informe um valor maior que zero, por exemplo 20,00.";
const MIN_ORDER_MESSAGE = "Informe um valor válido, por exemplo 50,00.";
const PERIOD_MESSAGE = "O fim da validade deve ser depois do início.";
const BIG_VALUE_MESSAGE = "O valor é grande demais.";
const BIG_NUMBER_MESSAGE = "O número é grande demais.";
const MAX_USES_MESSAGE = "Informe um limite de usos inteiro, maior que zero.";
const USES_COUNT_MESSAGE =
  "Informe quantos usos já foram feitos (número inteiro, zero ou mais).";

const text = z.string().nullish();

export const storeCouponSchema = z
  .object({
    code: z.string(),
    kind: z.enum(["percent", "fixed"]),
    value: z.string(),
    minOrder: text,
    startsAt: text,
    expiresAt: text,
    maxUses: text,
    usesCount: text,
    active: z.boolean(),
  })
  .transform((raw, ctx): Omit<StoreCoupon, "id"> => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    const clean = (value: string | null | undefined) => (value ?? "").trim();

    const code = normalizeCouponCode(raw.code);
    if (!CODE_RE.test(code)) return fail(CODE_MESSAGE);

    let value: number;
    if (raw.kind === "percent") {
      const digits = clean(raw.value);
      value = /^\d+$/.test(digits) ? Number(digits) : 0;
      if (value < 1 || value > 100) return fail(PERCENT_MESSAGE);
    } else {
      const cents = parseBRLToCents(raw.value);
      if (cents === null || cents <= 0) return fail(FIXED_MESSAGE);
      if (cents > MAX_DB_INT) return fail(BIG_VALUE_MESSAGE);
      value = cents;
    }

    let minOrderCents = 0;
    if (clean(raw.minOrder) !== "") {
      const cents = parseBRLToCents(clean(raw.minOrder));
      if (cents === null) return fail(MIN_ORDER_MESSAGE);
      if (cents > MAX_DB_INT) return fail(BIG_VALUE_MESSAGE);
      minOrderCents = cents;
    }

    const date = (input: string | null | undefined, label: string): string | null => {
      const value = clean(input);
      if (value === "") return null;
      const time = ISO_RE.test(value) ? Date.parse(value) : Number.NaN;
      if (Number.isNaN(time)) return fail(`Data de ${label} inválida.`);
      return new Date(time).toISOString();
    };
    const startsAt = date(raw.startsAt, "início");
    const expiresAt = date(raw.expiresAt, "fim");
    if (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt)) {
      return fail(PERIOD_MESSAGE);
    }

    let maxUses: number | null = null;
    if (clean(raw.maxUses) !== "") {
      const digits = clean(raw.maxUses);
      if (/^\d+$/.test(digits) && (digits.length > 10 || Number(digits) > MAX_DB_INT)) {
        return fail(BIG_NUMBER_MESSAGE);
      }
      maxUses = /^\d+$/.test(digits) ? Number(digits) : 0;
      if (maxUses < 1) return fail(MAX_USES_MESSAGE);
    }

    let usesCount = 0;
    if (clean(raw.usesCount) !== "") {
      const digits = clean(raw.usesCount);
      if (!/^\d+$/.test(digits)) return fail(USES_COUNT_MESSAGE);
      if (digits.length > 10 || Number(digits) > MAX_DB_INT) return fail(BIG_NUMBER_MESSAGE);
      usesCount = Number(digits);
    }

    return {
      code,
      kind: raw.kind,
      value,
      minOrderCents,
      startsAt,
      expiresAt,
      maxUses,
      usesCount,
      active: raw.active,
    };
  });

export type StoreCouponFormInput = z.input<typeof storeCouponSchema>;
