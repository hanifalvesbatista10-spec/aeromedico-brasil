import { describe, it, expect } from "vitest";
import { buildCartWhatsappMessage } from "../whatsapp-message";
import type { PricedLine } from "../pricing";

function line(over: Partial<PricedLine> = {}): PricedLine {
  return {
    key: "p:v",
    productId: "p",
    variantId: "v",
    slug: "camiseta",
    name: "Camiseta Aeromédico",
    size: "M",
    colorName: "Preta",
    imageUrl: null,
    unitPriceCents: 4990,
    quantity: 2,
    maxQuantity: null,
    lineTotalCents: 9980,
    reduced: false,
    ...over,
  };
}

describe("buildCartWhatsappMessage", () => {
  it("escreve o pedido com itens, subtotal e a pergunta final", () => {
    const message = buildCartWhatsappMessage(
      [
        line(),
        line({
          key: "b:-",
          name: "Boné",
          size: null,
          colorName: null,
          variantId: null,
          quantity: 1,
          lineTotalCents: 4000,
        }),
      ],
      13980
    );
    expect(message).toBe(
      [
        "Olá! Quero finalizar este pedido:",
        "- 2x Camiseta Aeromédico (M, Preta): R$ 99,80",
        "- 1x Boné: R$ 40,00",
        "Subtotal: R$ 139,80",
        "Pode me passar o valor do frete e as formas de pagamento?",
      ].join("\n")
    );
  });

  it("com cupom, entram o desconto e o total entre o subtotal e a pergunta", () => {
    const message = buildCartWhatsappMessage([line()], 9980, {
      coupon: { code: "VERAO10", discountCents: 998 },
    });
    expect(message).toBe(
      [
        "Olá! Quero finalizar este pedido:",
        "- 2x Camiseta Aeromédico (M, Preta): R$ 99,80",
        "Subtotal: R$ 99,80",
        "Cupom VERAO10: -R$ 9,98",
        "Total: R$ 89,82",
        "Pode me passar o valor do frete e as formas de pagamento?",
      ].join("\n")
    );
  });

  const shipping = { label: "Correios PAC", cep: "01018020", priceCents: 2345 };

  it("com frete, entram a linha de frete e o total, e a pergunta passa a ser só sobre pagamento", () => {
    const message = buildCartWhatsappMessage([line()], 9980, { shipping });
    expect(message).toBe(
      [
        "Olá! Quero finalizar este pedido:",
        "- 2x Camiseta Aeromédico (M, Preta): R$ 99,80",
        "Subtotal: R$ 99,80",
        "Frete (Correios PAC, CEP 01018-020): R$ 23,45",
        "Total: R$ 123,25",
        "Pode me passar as formas de pagamento?",
      ].join("\n")
    );
  });

  it("com cupom e frete, a ordem é subtotal, cupom, frete, total", () => {
    const message = buildCartWhatsappMessage([line()], 9980, {
      coupon: { code: "VERAO10", discountCents: 998 },
      shipping,
    });
    expect(message.split("\n").slice(-5)).toEqual([
      "Subtotal: R$ 99,80",
      "Cupom VERAO10: -R$ 9,98",
      "Frete (Correios PAC, CEP 01018-020): R$ 23,45",
      "Total: R$ 113,27",
      "Pode me passar as formas de pagamento?",
    ]);
  });

  it("carrinho grande com cupom e frete continua dentro do limite e mantém frete e total", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      line({ key: `p${i}:v`, name: `Camiseta Aeromédico edição especial número ${i}` })
    );
    const message = buildCartWhatsappMessage(many, 50 * 9980, {
      coupon: { code: "VERAO10", discountCents: 49900 },
      shipping,
    });
    expect(encodeURIComponent(message).length).toBeLessThanOrEqual(1800);
    expect(message).toContain("Frete (Correios PAC, CEP 01018-020): R$ 23,45");
    expect(message).toContain("Total: R$ 4.514,45");
  });

  it("sem cupom a mensagem é a de sempre", () => {
    expect(buildCartWhatsappMessage([line()], 9980, {})).toBe(
      buildCartWhatsappMessage([line()], 9980)
    );
  });

  it("só tamanho ou só cor aparece sem vírgula sobrando", () => {
    expect(buildCartWhatsappMessage([line({ colorName: null })], 9980)).toContain(
      "(M):"
    );
    expect(buildCartWhatsappMessage([line({ size: null })], 9980)).toContain(
      "(Preta):"
    );
  });

  it("carrinho grande não passa de 1800 caracteres codificados e avisa quantos itens ficaram de fora", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      line({
        key: `p${i}:v`,
        name: `Camiseta Aeromédico edição especial número ${i}`,
        colorName: "Camuflada desértica",
      })
    );
    const message = buildCartWhatsappMessage(many, 50 * 9980, {
      coupon: { code: "VERAO10", discountCents: 49900 },
    });

    expect(encodeURIComponent(message).length).toBeLessThanOrEqual(1800);
    expect(message).toContain("Cupom VERAO10: -R$ 499,00");
    expect(message).toContain("Total: R$ 4.491,00");
    expect(message.startsWith("Olá! Quero finalizar este pedido:")).toBe(true);
    expect(message).toContain("Subtotal: R$ 4.990,00");
    expect(message.endsWith("Pode me passar o valor do frete e as formas de pagamento?")).toBe(
      true
    );

    const shown = message.split("\n").filter((l) => l.startsWith("- ")).length;
    const omitted = message.match(/…e mais (\d+) itens/);
    expect(omitted).not.toBeNull();
    expect(shown + Number(omitted![1])).toBe(50);
  });
});
