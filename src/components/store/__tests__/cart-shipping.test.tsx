import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const quoteShippingAction = vi.fn();
vi.mock("@/lib/actions/shipping", () => ({
  quoteShippingAction: (...args: unknown[]) => quoteShippingAction(...args),
}));

import { CartShipping } from "../cart-shipping";

const lines = [{ productId: "p", variantId: null, quantity: 1 }];
const option = { id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 };

beforeEach(() => quoteShippingAction.mockReset());
afterEach(cleanup);

function setup() {
  const onSelect = vi.fn();
  const onAnnounce = vi.fn();
  const view = render(
    <CartShipping lines={lines} signature="s1" onSelect={onSelect} onAnnounce={onAnnounce} />
  );
  return { onSelect, onAnnounce, ...view };
}

describe("CartShipping", () => {
  it("ao sair da tela, a escolha de frete é desfeita", () => {
    const { onSelect, unmount } = setup();
    onSelect.mockClear();
    unmount();
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("cotar entrega a opção mais barata ao carrinho com a assinatura do pedido", async () => {
    quoteShippingAction.mockResolvedValue({ ok: true, options: [option], cep: "01018020" });
    const { onSelect } = setup();

    fireEvent.change(screen.getByLabelText("CEP de entrega"), { target: { value: "01018020" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular frete" }));

    await waitFor(() =>
      expect(onSelect).toHaveBeenLastCalledWith({
        optionId: "1",
        label: "Correios PAC",
        cep: "01018020",
        priceCents: 2345,
        signature: "s1",
      })
    );
  });

  it("começar uma nova cotação ou editar o CEP desfaz a escolha anterior", async () => {
    quoteShippingAction.mockResolvedValue({ ok: true, options: [option], cep: "01018020" });
    const { onSelect } = setup();
    fireEvent.change(screen.getByLabelText("CEP de entrega"), { target: { value: "01018020" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular frete" }));
    await screen.findByRole("group", { name: "Opções de entrega" });

    onSelect.mockClear();
    fireEvent.change(screen.getByLabelText("CEP de entrega"), { target: { value: "01018030" } });
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
