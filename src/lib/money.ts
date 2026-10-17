const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em centavos como reais pt-BR (ex.: 4990 → "R$ 49,90"). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Converte o que o dono digita no painel ("49,90", "49.90", "R$ 1.234,56",
 * "50") em centavos inteiros. Devolve `null` para vazio, texto, negativo ou
 * mais de duas casas decimais: nunca `NaN` nem 0 silencioso.
 *
 * Com vírgula, a vírgula é o decimal e os pontos são milhar. Só com ponto,
 * "49.90" é decimal (1 ou 2 dígitos depois do ponto) e "1.234" é milhar.
 */
export function parseBRLToCents(input: string): number | null {
  const text = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;

  let normalized: string;
  if (text.includes(",")) {
    if (!/^(\d{1,3}(\.\d{3})+|\d+),\d{1,2}$/.test(text)) return null;
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(".")) {
    if (/^\d+\.\d{1,2}$/.test(text)) {
      normalized = text;
    } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
      normalized = text.replace(/\./g, "");
    } else {
      return null;
    }
  } else if (/^\d+$/.test(text)) {
    normalized = text;
  } else {
    return null;
  }

  const cents = Math.round(Number(normalized) * 100);
  return Number.isFinite(cents) ? cents : null;
}

/** Valor em centavos como o dono o digita no campo de preço (ex.: 4990 → "49,90"). */
export function formatCentsForInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
