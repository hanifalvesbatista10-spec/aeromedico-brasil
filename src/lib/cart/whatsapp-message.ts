import { formatBRL } from "@/lib/money";
import { formatCep } from "@/lib/shipping/cep";
import type { PricedLine } from "./pricing";

// Links do WhatsApp têm limite de tamanho; acima disso o texto some ou quebra.
const MAX_ENCODED_LENGTH = 1800;

const HEADER = "Olá! Quero finalizar este pedido:";
const QUESTION = "Pode me passar o valor do frete e as formas de pagamento?";
const QUESTION_WITH_SHIPPING = "Pode me passar as formas de pagamento?";

// O Intl usa espaço sem quebra entre "R$" e o valor; no WhatsApp basta o comum.
function money(cents: number): string {
  return formatBRL(cents).replace(/ /g, " ");
}

function itemText(line: PricedLine): string {
  const details = [line.size, line.colorName].filter(Boolean).join(", ");
  return `- ${line.quantity}x ${line.name}${details ? ` (${details})` : ""}: ${money(
    line.lineTotalCents
  )}`;
}

export interface CartMessageExtras {
  coupon?: { code: string; discountCents: number };
  shipping?: { label: string; cep: string; priceCents: number };
}

/** Texto do pedido que o cliente envia ao WhatsApp do dono. */
export function buildCartWhatsappMessage(
  lines: PricedLine[],
  subtotalCents: number,
  extras: CartMessageExtras = {}
): string {
  const items = lines.map(itemText);
  const footer = [`Subtotal: ${money(subtotalCents)}`];
  if (extras.coupon) {
    footer.push(`Cupom ${extras.coupon.code}: -${money(extras.coupon.discountCents)}`);
  }
  if (extras.shipping) {
    footer.push(
      `Frete (${extras.shipping.label}, CEP ${formatCep(extras.shipping.cep)}): ${money(
        extras.shipping.priceCents
      )}`
    );
  }
  if (extras.coupon || extras.shipping) {
    const total =
      subtotalCents -
      (extras.coupon?.discountCents ?? 0) +
      (extras.shipping?.priceCents ?? 0);
    footer.push(`Total: ${money(total)}`);
  }
  footer.push(extras.shipping ? QUESTION_WITH_SHIPPING : QUESTION);

  for (let shown = items.length; shown >= 0; shown--) {
    const omitted = items.length - shown;
    const body = [...items.slice(0, shown)];
    if (omitted > 0) {
      body.push(
        `…e mais ${omitted} ${omitted === 1 ? "item" : "itens"} (confirmo o restante por aqui).`
      );
    }
    const message = [HEADER, ...body, ...footer].join("\n");
    if (encodeURIComponent(message).length <= MAX_ENCODED_LENGTH || shown === 0) {
      return message;
    }
  }
  return [HEADER, ...footer].join("\n");
}
