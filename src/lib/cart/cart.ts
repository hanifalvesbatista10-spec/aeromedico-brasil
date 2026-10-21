// Carrinho guardado no navegador: só ids e quantidade, nunca preço. O preço,
// o estoque e a disponibilidade vêm do servidor (src/lib/cart/pricing.ts).

export interface CartLine {
  productId: string;
  /** `null` em produto sem variações (produto único). */
  variantId: string | null;
  quantity: number;
}

export const MAX_LINE_QUANTITY = 99;
export const MAX_CART_LINES = 50;

export function lineKey(line: Pick<CartLine, "productId" | "variantId">): string {
  return `${line.productId}:${line.variantId ?? "-"}`;
}

function clampQuantity(quantity: number): number {
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  if (lines.some((existing) => lineKey(existing) === key)) {
    return lines.map((existing) =>
      lineKey(existing) === key
        ? { ...existing, quantity: clampQuantity(existing.quantity + line.quantity) }
        : existing
    );
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [...lines, { ...line, quantity: clampQuantity(line.quantity) }];
}

export function setLineQuantity(
  lines: CartLine[],
  key: string,
  quantity: number
): CartLine[] {
  if (!Number.isFinite(quantity) || quantity < 1) return removeLine(lines, key);
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line
  );
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => lineKey(line) !== key);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

function isStoredLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "string" &&
    line.productId.length > 0 &&
    (line.variantId === null ||
      (typeof line.variantId === "string" && line.variantId.length > 0)) &&
    typeof line.quantity === "number" &&
    Number.isFinite(line.quantity) &&
    line.quantity >= 1
  );
}

/** Lê o que está no `localStorage`; qualquer problema vira carrinho vazio. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  let lines: CartLine[] = [];
  for (const item of data) {
    if (!isStoredLine(item)) continue;
    lines = addLine(lines, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    });
  }
  return lines;
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify(lines);
}
