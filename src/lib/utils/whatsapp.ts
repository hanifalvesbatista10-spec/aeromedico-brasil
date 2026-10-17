const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

// `wa.me/message/<código>` e `wa.me/qr/<código>` são links curtos do WhatsApp
// Business: o código não é um número de telefone e o link não aceita texto
// pré-preenchido, então é mantido como está.
const SHORT_LINK_PATH = /^\/(message|qr)\/([A-Za-z0-9]+)\/?$/;
// Um único segmento numérico, com os separadores que as pessoas digitam
// (+, espaço, parênteses, hífen, ponto).
const NUMBER_PATH = /^\/\+?[\d\s().-]+\/?$/;

/**
 * Monta o link do WhatsApp a partir da URL salva nas configurações. Devolve
 * `null` quando não há um destino válido (ex.: o placeholder `https://wa.me/`),
 * para a página esconder o botão em vez de exibir um link quebrado. Só aceita
 * `wa.me` e `api.whatsapp.com`; qualquer outro host é rejeitado. O link de
 * saída é sempre reconstruído: nada da URL original (esquema, host, query)
 * chega ao `href`.
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
    let path: string;
    try {
      // `new URL` codifica espaços como %20; sem decodificar, o "20" viraria
      // dígito do número.
      path = decodeURIComponent(url.pathname);
    } catch {
      return null;
    }

    const shortLink = SHORT_LINK_PATH.exec(path);
    if (shortLink) return `https://wa.me/${shortLink[1]}/${shortLink[2]}`;

    if (!NUMBER_PATH.test(path)) return null;
    rawNumber = path;
  } else if (host === "api.whatsapp.com") {
    rawNumber = url.searchParams.get("phone") ?? "";
  } else {
    return null;
  }

  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
