/**
 * Aceita apenas URLs http/https. Usado para validar todo link externo que
 * um administrador cadastra (inscrição, link de material, contratação de
 * palestra) antes de gravar no banco — evita esquemas como `javascript:`
 * e reduz o risco de redirecionamento aberto para protocolos inesperados.
 */
export function assertSafeExternalUrl(url: string | null, fieldLabel: string): void {
  if (!url) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${fieldLabel} inválido: informe uma URL completa (https://...).`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldLabel} inválido: só são aceitos links http:// ou https://.`);
  }
}
