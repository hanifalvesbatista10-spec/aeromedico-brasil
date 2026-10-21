import { z } from "zod";
import { parseBRLToCents } from "@/lib/money";
import { normalizeCouponCode } from "@/lib/cart/coupon";
import type { StoreCoupon } from "@/lib/types";

// O dono digita tudo como texto (como nos demais formulários do painel). As
// datas chegam em ISO: a conversão do campo `datetime-local` acontece no
// navegador, que conhece o fuso do dono (src/lib/store/coupon-drafts.ts).

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

const CODE_MESSAGE = "Use de 3 a 32 letras, números, hífen ou sublinhado.";
const PERCENT_MESSAGE = "Informe um percentual entre 1 e 100.";
const FIXED_MESSAGE = "Informe um valor válido, por exemplo 20,00.";
const MIN_ORDER_MESSAGE = "Informe um valor válido, por exemplo 50,00.";
const DATE_MESSAGE = "Data inválida.";
const PERIOD_MESSAGE = "A data final deve ser depois da inicial.";
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
      value = cents;
    }

    let minOrderCents = 0;
    if (clean(raw.minOrder) !== "") {
      const cents = parseBRLToCents(clean(raw.minOrder));
      if (cents === null) return fail(MIN_ORDER_MESSAGE);
      minOrderCents = cents;
    }

    const date = (input: string | null | undefined): string | null => {
      const value = clean(input);
      if (value === "") return null;
      const time = ISO_RE.test(value) ? Date.parse(value) : Number.NaN;
      if (Number.isNaN(time)) return fail(DATE_MESSAGE);
      return new Date(time).toISOString();
    };
    const startsAt = date(raw.startsAt);
    const expiresAt = date(raw.expiresAt);
    if (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt)) {
      return fail(PERIOD_MESSAGE);
    }

    let maxUses: number | null = null;
    if (clean(raw.maxUses) !== "") {
      const digits = clean(raw.maxUses);
      maxUses = /^\d+$/.test(digits) ? Number(digits) : 0;
      if (maxUses < 1) return fail(MAX_USES_MESSAGE);
    }

    let usesCount = 0;
    if (clean(raw.usesCount) !== "") {
      const digits = clean(raw.usesCount);
      if (!/^\d+$/.test(digits)) return fail(USES_COUNT_MESSAGE);
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
