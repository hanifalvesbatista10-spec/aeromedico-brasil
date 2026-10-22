import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OrderSummary } from "../order-summary";
import type { OrderStatus, PublicOrder } from "@/lib/types";

afterEach(cleanup);

function order(over: Partial<PublicOrder> = {}): PublicOrder {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    number: 123,
    status: "paid",
    items: [
      { name: "Camiseta Aeromédico", size: "M", colorName: "Preta", quantity: 2, unitPriceCents: 4990 },
      { name: "Boné", size: null, colorName: null, quantity: 1, unitPriceCents: 2000 },
    ],
    subtotalCents: 11980,
    discountCents: 0,
    shippingCents: 2345,
    feeCents: 0,
    totalCents: 14325,
    paymentMethod: "pix",
    trackingCode: null,
    ...over,
  };
}

const text = () => document.body.textContent?.replace(/ /g, " ") ?? "";

describe("OrderSummary", () => {
  it("mostra o número do pedido, os itens e os valores em reais", () => {
    render(<OrderSummary order={order()} />);
    expect(screen.getByRole("heading", { name: "Pedido AB-000123" })).toBeTruthy();
    expect(text()).toContain("2x Camiseta Aeromédico");
    expect(text()).toContain("M, Preta");
    expect(text()).toContain("1x Boné");
    expect(text()).toContain("R$ 119,80");
    expect(text()).toContain("R$ 23,45");
    expect(text()).toContain("R$ 143,25");
  });

  it.each<[OrderStatus, string]>([
    ["awaiting_payment", "Aguardando pagamento"],
    ["paid", "Pagamento confirmado"],
    ["paid_review", "Pagamento confirmado. Estamos conferindo o seu pedido e entraremos em contato."],
    ["preparing", "Em separação"],
    ["shipped", "Enviado"],
    ["delivered", "Entregue"],
    ["canceled", "Cancelado"],
    ["expired", "Expirado"],
  ])("status %s aparece como '%s'", (status, label) => {
    render(<OrderSummary order={order({ status })} />);
    expect(screen.getByTestId("order-status").textContent).toBe(label);
  });

  it("Desconto e Taxa só aparecem quando maiores que zero", () => {
    const { rerender } = render(<OrderSummary order={order()} />);
    expect(text()).not.toContain("Desconto");
    expect(text()).not.toContain("Taxa do meio de pagamento");

    rerender(<OrderSummary order={order({ discountCents: 998, feeCents: 359, totalCents: 14325 - 998 + 359 })} />);
    expect(text()).toContain("Desconto");
    expect(text()).toContain("-R$ 9,98");
    expect(text()).toContain("Taxa do meio de pagamento");
    expect(text()).toContain("R$ 3,59");
  });

  it("rastreio só aparece quando existe", () => {
    const { rerender } = render(<OrderSummary order={order()} />);
    expect(text()).not.toContain("Código de rastreio");
    rerender(<OrderSummary order={order({ status: "shipped", trackingCode: "BR123456789BR" })} />);
    expect(text()).toContain("Código de rastreio");
    expect(text()).toContain("BR123456789BR");
  });

  it("aguardando pagamento: explica o que fazer e oferece Atualizar, sem afirmar que foi pago", () => {
    render(<OrderSummary order={order({ status: "awaiting_payment" })} refreshHref="/pedido/x?t=abc" />);
    expect(screen.getByRole("link", { name: "Atualizar" }).getAttribute("href")).toBe("/pedido/x?t=abc");
    expect(text()).toContain("Assim que o pagamento for confirmado, o status muda aqui.");
    expect(text()).not.toContain("Pagamento confirmado");
  });

  it("depois de pago não oferece o aviso de espera nem o link Atualizar", () => {
    render(<OrderSummary order={order()} refreshHref="/pedido/x?t=abc" />);
    expect(screen.queryByRole("link", { name: "Atualizar" })).toBeNull();
    expect(text()).not.toContain("Assim que o pagamento");
  });

  it("mostra a forma de pagamento em português", () => {
    const { rerender } = render(<OrderSummary order={order({ paymentMethod: "pix" })} />);
    expect(text()).toContain("Pix");
    rerender(<OrderSummary order={order({ paymentMethod: "card_single" })} />);
    expect(text()).toContain("Cartão à vista");
    rerender(<OrderSummary order={order({ paymentMethod: "card_installments" })} />);
    expect(text()).toContain("Cartão parcelado");
  });
});
