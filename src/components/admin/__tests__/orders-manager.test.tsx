import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const updateOrderFulfillment = vi.fn();
vi.mock("@/lib/actions/orders", () => ({
  updateOrderFulfillment: (...args: unknown[]) => updateOrderFulfillment(...args),
}));

import { OrdersManager } from "../orders-manager";
import type { StoreOrder } from "@/lib/types";

function order(over: Partial<StoreOrder> = {}): StoreOrder {
  return {
    id: "o1",
    number: 1,
    status: "paid",
    environment: "production",
    checkoutId: "chk_1",
    trackingCode: null,
    notes: null,
    createdAt: "2026-10-22T15:00:00Z",
    paidAt: "2026-10-22T15:05:00Z",
    customer: { name: "Maria Silva", email: "maria@exemplo.com", phone: "85999998888" },
    address: {
      cep: "01018020",
      street: "Rua das Flores",
      number: "100",
      complement: "Apto 12",
      district: "Centro",
      city: "São Paulo",
      state: "SP",
    },
    shipping: { optionId: "1", label: "Correios PAC", cents: 2345 },
    items: [
      {
        productId: "camiseta",
        variantId: "m-preta",
        name: "Camiseta Aeromédico",
        size: "M",
        colorName: "Preta",
        unitPriceCents: 4000,
        quantity: 2,
        weightGrams: 300,
      },
    ],
    subtotalCents: 8000,
    discountCents: 800,
    couponCode: "VERAO10",
    pixDiscountCents: 360,
    totalCents: 9185,
    paymentMethod: "pix",
    ...over,
  };
}

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");
const announcer = () => screen.getByTestId("orders-announcer").textContent;
const openOrder = (code = "AB-000001") =>
  fireEvent.click(screen.getByRole("button", { name: `Ver detalhes do pedido ${code}` }));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("OrdersManager: lista", () => {
  it("lista vazia mostra o aviso", () => {
    render(<OrdersManager initialOrders={[]} />);
    expect(screen.getByText("Nenhum pedido ainda.")).toBeTruthy();
  });

  it("mostra número, comprador, total, forma e situação de cada pedido", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    const row = screen.getAllByRole("row")[1];
    const text = plain(row.textContent);
    expect(text).toContain("AB-000001");
    expect(text).toContain("Maria Silva");
    expect(text).toContain("R$ 91,85");
    expect(text).toContain("Pix");
    expect(text).toContain("Pago");
  });

  it("pedido pago que precisa de conferência fica destacado, com aviso acima da lista", () => {
    render(
      <OrdersManager
        initialOrders={[order(), order({ id: "o2", number: 2, status: "paid_review" })]}
      />
    );
    expect(within(screen.getByRole("table")).getByText("Pago: conferir estoque")).toBeTruthy();
    expect(screen.getByTestId("review-banner").textContent).toContain(
      "1 pedido pago precisa de conferência"
    );
  });

  it("sem pedido para conferir, não há aviso", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    expect(screen.queryByTestId("review-banner")).toBeNull();
  });

  it("filtra por situação e avisa quando nada combina", () => {
    render(
      <OrdersManager
        initialOrders={[
          order(),
          order({ id: "o2", number: 2, status: "shipped", trackingCode: "AA123456789BR" }),
        ]}
      />
    );
    const filter = screen.getByLabelText("Filtrar por situação");

    fireEvent.change(filter, { target: { value: "shipped" } });
    expect(screen.getByText("AB-000002")).toBeTruthy();
    expect(screen.queryByText("AB-000001")).toBeNull();

    fireEvent.change(filter, { target: { value: "delivered" } });
    expect(screen.getByText("Nenhum pedido com esta situação.")).toBeTruthy();
  });
});

describe("OrdersManager: detalhe", () => {
  it("mostra comprador, contato, endereço completo, itens e valores", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();

    const dialog = screen.getByRole("dialog");
    const text = plain(dialog.textContent);
    expect(text).toContain("Maria Silva");
    expect(text).toContain("maria@exemplo.com");
    expect(text).toContain("85999998888");
    expect(text).toContain("Rua das Flores, 100 - Apto 12");
    expect(text).toContain("Centro");
    expect(text).toContain("São Paulo/SP");
    expect(text).toContain("01018-020");
    expect(text).toContain("2x Camiseta Aeromédico");
    expect(text).toContain("M, Preta");
    expect(text).toContain("Subtotal R$ 80,00");
    expect(text).toContain("Desconto (VERAO10) -R$ 8,00");
    expect(text).toContain("Frete (Correios PAC) R$ 23,45");
    expect(text).toContain("Desconto no Pix -R$ 3,60");
    expect(text).toContain("Total R$ 91,85");
  });
});

describe("OrdersManager: andamento", () => {
  it("pago → em separação: chama a ação, atualiza a linha e anuncia", async () => {
    updateOrderFulfillment.mockResolvedValue({ ok: true, data: order({ status: "preparing" }) });
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Marcar em separação" }));

    await waitFor(() => expect(updateOrderFulfillment).toHaveBeenCalledWith("o1", { status: "preparing" }));
    await waitFor(() => expect(announcer()).toBe("Pedido AB-000001: em separação."));
    expect(within(screen.getAllByRole("row", { hidden: true })[1]).getByText("Em separação")).toBeTruthy();
  });

  it("enviado pede o código de rastreio e o envia junto", async () => {
    updateOrderFulfillment.mockResolvedValue({
      ok: true,
      data: order({ status: "shipped", trackingCode: "AA123456789BR" }),
    });
    render(<OrdersManager initialOrders={[order({ status: "preparing" })]} />);
    openOrder();

    fireEvent.change(screen.getByLabelText("Código de rastreio"), { target: { value: "aa123456789br" } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como enviado" }));

    await waitFor(() =>
      expect(updateOrderFulfillment).toHaveBeenCalledWith("o1", {
        status: "shipped",
        trackingCode: "aa123456789br",
      })
    );
    await waitFor(() => expect(announcer()).toBe("Pedido AB-000001: enviado."));
  });

  it("enviado sem código: alerta e a ação nem é chamada", () => {
    render(<OrdersManager initialOrders={[order({ status: "preparing" })]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Marcar como enviado" }));

    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toContain(
      "Informe o código de rastreio"
    );
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
  });

  it("erro devolvido pela ação aparece em alerta e o pedido não muda", async () => {
    updateOrderFulfillment.mockResolvedValue({ ok: false, error: "Não foi possível salvar agora. Tente de novo." });
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Marcar em separação" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível salvar agora.");
    expect(within(screen.getAllByRole("row", { hidden: true })[1]).queryByText("Em separação")).toBeNull();
  });

  it("cancelar pede confirmação antes de chamar a ação e explica o estorno", async () => {
    updateOrderFulfillment.mockResolvedValue({ ok: true, data: order({ status: "canceled" }) });
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    expect(updateOrderFulfillment).not.toHaveBeenCalled();
    expect(plain(screen.getByRole("dialog").textContent)).toContain("estorno");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(updateOrderFulfillment).toHaveBeenCalledWith("o1", { status: "canceled" }));
    await waitFor(() => expect(announcer()).toBe("Pedido AB-000001: cancelado."));
  });

  it("pedido entregue não oferece mais nenhuma mudança", () => {
    render(<OrdersManager initialOrders={[order({ status: "delivered", trackingCode: "AA123456789BR" })]} />);
    openOrder();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Marcar|Cancelar pedido/ })).toBeNull();
    expect(dialog.textContent).toContain("Nada a marcar neste pedido.");
  });

  it("pedido enviado mostra o código de rastreio e permite copiá-lo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<OrdersManager initialOrders={[order({ status: "shipped", trackingCode: "AA123456789BR" })]} />);
    openOrder();

    expect(screen.getByRole("dialog").textContent).toContain("AA123456789BR");
    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("AA123456789BR"));
    await waitFor(() => expect(announcer()).toBe("Código de rastreio copiado."));
  });

  it("enquanto salva, o botão fica aria-disabled e um segundo clique não envia de novo", async () => {
    updateOrderFulfillment.mockImplementation(() => new Promise(() => {}));
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Marcar em separação" }));
    const busy = await screen.findByRole("button", { name: "Salvando…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(updateOrderFulfillment).toHaveBeenCalledTimes(1);
  });
});

describe("OrdersManager: ambiente e pedido órfão", () => {
  it("pedido de teste (sandbox) fica marcado na lista e avisa no detalhe para não enviar", () => {
    render(<OrdersManager initialOrders={[order({ environment: "sandbox" })]} />);
    expect(within(screen.getByRole("table")).getByText("Teste (sandbox)")).toBeTruthy();

    openOrder();
    expect(plain(screen.getByRole("dialog").textContent)).toContain("Pedido de teste");
  });

  it("pedido de produção não tem marca de teste", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    expect(screen.queryByText("Teste (sandbox)")).toBeNull();
  });

  it("aguardando pagamento SEM checkout (órfão) pode ser cancelado; com checkout aberto não", () => {
    const { unmount } = render(
      <OrdersManager initialOrders={[order({ status: "awaiting_payment", checkoutId: null })]} />
    );
    openOrder();
    expect(screen.getByRole("button", { name: "Cancelar pedido" })).toBeTruthy();
    unmount();

    render(<OrdersManager initialOrders={[order({ status: "awaiting_payment", checkoutId: "chk_9" })]} />);
    openOrder();
    expect(screen.queryByRole("button", { name: "Cancelar pedido" })).toBeNull();
  });
});

describe("OrdersManager: ajustes da revisão", () => {
  it("o botão da linha diz o mesmo que o texto visível (comando de voz) e identifica o pedido", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    const button = screen.getByRole("button", { name: "Ver detalhes do pedido AB-000001" });
    expect(button.textContent).toBe("Ver detalhes");
  });

  it("copiar o código mostra o aviso DENTRO do diálogo, visível e anunciado ali", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<OrdersManager initialOrders={[order({ status: "shipped", trackingCode: "AA123456789BR" })]} />);
    openOrder();

    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }));

    const status = await within(screen.getByRole("dialog")).findByRole("status");
    expect(status.textContent).toBe("Código de rastreio copiado.");
  });

  it("cancelar: o botão de confirmar é descrito pelo aviso do estorno e 'Voltar' devolve o foco", () => {
    render(<OrdersManager initialOrders={[order()]} />);
    openOrder();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));

    const confirm = screen.getByRole("button", { name: "Confirmar cancelamento" });
    const described = document.getElementById(confirm.getAttribute("aria-describedby") ?? "");
    expect(described?.textContent).toContain("Não devolve o dinheiro");

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar pedido" }));
  });

  it("enviado sem código: o foco vai para o campo e ele é marcado como inválido", () => {
    render(<OrdersManager initialOrders={[order({ status: "preparing" })]} />);
    openOrder();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como enviado" }));

    const input = screen.getByLabelText("Código de rastreio");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(input);
  });

  it("trocar o filtro anuncia quantos pedidos aparecem", () => {
    render(
      <OrdersManager
        initialOrders={[order(), order({ id: "o2", number: 2, status: "shipped", trackingCode: "AA123456789BR" })]}
      />
    );
    fireEvent.change(screen.getByLabelText("Filtrar por situação"), { target: { value: "shipped" } });
    expect(announcer()).toBe("1 pedido na lista.");

    fireEvent.change(screen.getByLabelText("Filtrar por situação"), { target: { value: "all" } });
    expect(announcer()).toBe("2 pedidos na lista.");
  });

  it("pedido aguardando pagamento explica por que não há o que marcar", () => {
    render(<OrdersManager initialOrders={[order({ status: "awaiting_payment", checkoutId: "chk_9" })]} />);
    openOrder();
    expect(plain(screen.getByRole("dialog").textContent)).toContain(
      "Este pedido aguarda o pagamento. A situação muda sozinha quando o Asaas avisar."
    );
  });

  it("avisa quando a lista foi cortada nos pedidos mais recentes", () => {
    render(<OrdersManager initialOrders={[order()]} showingLatest={200} />);
    expect(screen.getByText("Mostrando os 200 pedidos mais recentes.")).toBeTruthy();
  });
});
