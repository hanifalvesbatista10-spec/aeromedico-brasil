/** Aceita o CEP escrito de qualquer jeito ("01018-020", " 01018020 "); devolve os 8 dígitos ou `null`. */
export function normalizeCep(input: string): string | null {
  const text = input.trim();
  if (!/^[\d.\-\s]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

/** "01018020" → "01018-020". */
export function formatCep(digits: string): string {
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
