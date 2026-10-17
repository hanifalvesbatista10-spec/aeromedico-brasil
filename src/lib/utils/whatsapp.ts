const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

/**
 * Monta o link `https://wa.me/<número>?text=<mensagem>` a partir da URL de
 * WhatsApp salva nas configurações. Devolve `null` quando não há um número
 * válido (ex.: o placeholder `https://wa.me/`), para a página esconder o
 * botão em vez de exibir um link quebrado. Só aceita `wa.me` e
 * `api.whatsapp.com`; qualquer outro host é rejeitado.
 */
export function buildWhatsappLink(
  whatsappUrl: string,
  message: string
): string | null {
  let url: URL;
  try {
    url = new URL(whatsappUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let rawNumber: string;
  if (host === "wa.me") {
    rawNumber = url.pathname;
  } else if (host === "api.whatsapp.com") {
    rawNumber = url.searchParams.get("phone") ?? "";
  } else {
    return null;
  }

  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
