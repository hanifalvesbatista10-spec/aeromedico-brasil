import { formatBRL } from "@/lib/money";
import type { PricedLine } from "./pricing";

// Links do WhatsApp têm limite de tamanho; acima disso o texto some ou quebra.
const MAX_ENCODED_LENGTH = 1800;

const HEADER = "Olá! Quero finalizar este pedido:";
const QUESTION = "Pode me passar o valor do frete e as formas de pagamento?";

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

/** Texto do pedido que o cliente envia ao WhatsApp do dono. */
export function buildCartWhatsappMessage(
  lines: PricedLine[],
  subtotalCents: number
): string {
  const items = lines.map(itemText);
  const footer = [`Subtotal: ${money(subtotalCents)}`, QUESTION];

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
