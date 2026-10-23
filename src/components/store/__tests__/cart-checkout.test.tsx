import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const quoteCheckoutAction = vi.fn();
const placeOrderAction = vi.fn();
vi.mock("@/lib/actions/checkout", () => ({
  quoteCheckoutAction: (...args: unknown[]) => quoteCheckoutAction(...args),
  placeOrderAction: (...args: unknown[]) => placeOrderAction(...args),
}));

import { CartCheckout } from "../cart-checkout";
import type { ShippingSelection } from "../cart-shipping";

const lines = [{ productId: "bone", variantId: null, quantity: 2 }];
const shipping: ShippingSelection = {
  optionId: "1",
  label: "Correios PAC",
  cep: "01018020",
  priceCents: 2345,
  signature: "s1",
};

const options = [
  { method: "pix", label: "Pix", feeCents: 199, totalCents: 6544, installments: null, installmentCents: null },
  { method: "card_single", label: "Cartão à vista", feeCents: 247, totalCents: 6592, installments: null, installmentCents: null },
  { method: "card_installments", label: "Cartão parcelado em até 6x", feeCents: 281, totalCents: 6626, installments: 6, installmentCents: 1105 },
];

const quoteOk = {
  ok: true,
  subtotalCents: 4000,
  discountCents: 0,
  couponCode: null,
  shipping: { optionId: "1", label: "Correios PAC", cents: 2345, cep: "01018020" },
  orderCents: 6345,
  options,
  chosen: options[0],
  items: [],
};

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");
const assign = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  quoteCheckoutAction.mockResolvedValue(quoteOk);
  Object.defineProperty(window, "location", {
    value: { ...window.location, assign },
    writable: true,
    configurable: true,
  });
});
afterEach(cleanup);

function renderCheckout(props: Partial<{ couponCode: string | null }> = {}) {
  return render(
    <CartCheckout lines={lines} couponCode={props.couponCode ?? null} shipping={shipping} />
  );
}

async function ready() {
  renderCheckout();
  return screen.findByRole("group", { name: "Forma de pagamento" });
}

function fillBuyer(over: Record<string, string> = {}) {
  const values: Record<string, string> = {
    "Nome completo": "Maria Silva",
    "E-mail": "maria@exemplo.com",
    "Telefone com DDD": "85999998888",
    Rua: "Rua das Flores",
    "Número": "100",
    Bairro: "Centro",
    Cidade: "São Paulo",
    "Estado (UF)": "SP",
    ...over,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("CartCheckout: formas de pagamento", () => {
  it("cota no servidor com os dados do carrinho e mostra as três formas com total e taxa", async () => {
    const group = await ready();
    expect(quoteCheckoutAction).toHaveBeenCalledWith({
      lines,
      couponCode: null,
      shipping: { optionId: "1", cep: "01018020", expectedCents: 2345 },
      method: "pix",
    });

    const text = plain(group.textContent);
    expect(text).toContain("Pix: R$ 65,44 (inclui R$ 1,99 de taxa de pagamento)");
    expect(text).toContain("Cartão à vista: R$ 65,92 (inclui R$ 2,47 de taxa de pagamento)");
    expect(text).toContain(
      "Cartão parcelado em até 6x: 6x de R$ 11,05, total de R$ 66,26 (inclui R$ 2,81 de taxa de pagamento)"
    );
  });

  it("o cupom aceito vai junto na cotação", async () => {
    renderCheckout({ couponCode: "VERAO10" });
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenCalledWith(expect.objectContaining({ couponCode: "VERAO10" }));
  });

  it("Pix vem marcado; trocar a forma troca o total a pagar", async () => {
    const group = await ready();
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);
    expect(plain(screen.getByTestId("checkout-total").textContent)).toContain("R$ 65,44");

    fireEvent.click(radios[2]);
    expect(plain(screen.getByTestId("checkout-total").textContent)).toContain("R$ 66,26");
  });

  it("falha na cotação: alerta e botão para tentar de novo", async () => {
    quoteCheckoutAction.mockResolvedValueOnce({
      ok: false,
      code: "unavailable",
      error: "Não foi possível calcular o pagamento agora. Tente de novo.",
    });
    renderCheckout();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Não foi possível calcular o pagamento agora."
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenCalledTimes(2);
  });
});

describe("CartCheckout: dados do comprador", () => {
  it("o CEP vem da cotação do frete, formatado e travado", async () => {
    await ready();
    const cep = screen.getByLabelText("CEP (o mesmo do cálculo do frete)") as HTMLInputElement;
    expect(cep.value).toBe("01018-020");
    expect(cep.readOnly).toBe(true);
  });

  it("Pagar com o formulário vazio mostra o primeiro erro e não chama o servidor", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Informe seu nome completo.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });

  it("e-mail inválido é apontado antes de enviar", async () => {
    await ready();
    fillBuyer({ "E-mail": "sem-arroba" });
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Informe um e-mail válido.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });
});

describe("CartCheckout: pagar", () => {
  it("envia seleção + total que o cliente viu + comprador, e redireciona para o checkout do Asaas", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });
    const group = await ready();
    fireEvent.click(within(group).getAllByRole("radio")[1]);
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(placeOrderAction).toHaveBeenCalledTimes(1));
    expect(placeOrderAction).toHaveBeenCalledWith(
      {
        lines,
        couponCode: null,
        shipping: { optionId: "1", cep: "01018020", expectedCents: 2345 },
        method: "card_single",
        expectedTotalCents: 6592,
      },
      expect.objectContaining({
        name: "Maria Silva",
        email: "maria@exemplo.com",
        phone: "85999998888",
        cep: "01018020",
        street: "Rua das Flores",
        number: "100",
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      })
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://asaas.com/checkout/chk_1"));
  });

  it("enquanto envia, o botão fica aria-disabled e um segundo clique não envia de novo", async () => {
    placeOrderAction.mockImplementation(() => new Promise(() => {}));
    await ready();
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    const busy = await screen.findByRole("button", { name: "Abrindo o pagamento…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(placeOrderAction).toHaveBeenCalledTimes(1);
  });

  it("frete que mudou: avisa, refaz a cotação com o valor novo e NÃO redireciona", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "quote",
      error: "O valor do frete mudou para R$ 25,00. Confira e confirme de novo.",
      quote: { ok: false, code: "shipping-changed", error: "x", newShippingCents: 2500 },
    });
    await ready();
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    expect(plain((await screen.findByRole("alert")).textContent)).toContain("O valor do frete mudou para R$ 25,00.");
    await waitFor(() =>
      expect(quoteCheckoutAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ shipping: { optionId: "1", cep: "01018020", expectedCents: 2500 } })
      )
    );
    expect(assign).not.toHaveBeenCalled();
    // O botão volta a funcionar para o cliente confirmar de novo.
    expect(screen.getByRole("button", { name: "Pagar" }).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("total que mudou (price-changed): avisa e refaz a cotação", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "quote",
      error: "O valor do pedido mudou para R$ 70,00. Confira e confirme de novo.",
      quote: { ok: false, code: "price-changed", error: "x", newTotalCents: 7000 },
    });
    await ready();
    fillBuyer();
    const before = quoteCheckoutAction.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    expect(plain((await screen.findByRole("alert")).textContent)).toContain("O valor do pedido mudou");
    await waitFor(() => expect(quoteCheckoutAction.mock.calls.length).toBeGreaterThan(before));
    expect(assign).not.toHaveBeenCalled();
  });

  it("falha ao abrir o pagamento: mensagem do servidor e o botão volta", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "unavailable",
      error: "Não foi possível abrir o pagamento agora. Tente de novo.",
    });
    await ready();
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível abrir o pagamento agora.");
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Pagar" }).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("erro do comprador devolvido pelo servidor também aparece em alerta", async () => {
    placeOrderAction.mockResolvedValue({ ok: false, code: "invalid-buyer", error: "Informe a cidade." });
    await ready();
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Informe a cidade.");
  });
});

describe("CartCheckout: acessibilidade", () => {
  it("botão e campos têm alvo de 44px e contorno de foco próprio; as formas ficam em fieldset", async () => {
    const group = await ready();
    expect(group.tagName).toBe("FIELDSET");
    const pay = screen.getByRole("button", { name: "Pagar" });
    expect(pay.className).toContain("h-11");
    expect(pay.className).toContain("focus-visible:outline-navy-700");
    expect(screen.getByLabelText("Nome completo").className).toContain("focus-visible:outline-navy-700");
  });
});

describe("CartCheckout: ajustes da revisão", () => {
  it("voltar do Asaas pelo botão do navegador (página restaurada do cache) destrava o botão Pagar", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });
    await ready();
    fillBuyer();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    const busy = await screen.findByRole("button", { name: "Abrindo o pagamento…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      const event = new Event("pageshow") as Event & { persisted: boolean };
      event.persisted = true;
      window.dispatchEvent(event);
    });

    expect(screen.getByRole("button", { name: "Pagar" }).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("Pagar antes de as formas carregarem: avisa em alerta e o botão fica aria-disabled", async () => {
    quoteCheckoutAction.mockImplementation(() => new Promise(() => {}));
    renderCheckout();
    const button = screen.getByRole("button", { name: "Pagar" });
    expect(button.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("Aguarde o cálculo das formas de pagamento.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });

  it("o mesmo erro repetido é anunciado de novo (o alerta é recriado)", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));
    const first = await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Pagar" }));

    const second = await screen.findByRole("alert");
    expect(second.textContent).toBe(first.textContent);
    expect(second).not.toBe(first);
  });

  it("os campos de contato e entrega formam um grupo nomeado e o CEP explica por que não edita", async () => {
    await ready();
    const group = screen.getByRole("group", { name: "Contato e entrega" });
    expect(group.tagName).toBe("FIELDSET");
    const cep = screen.getByLabelText("CEP (o mesmo do cálculo do frete)") as HTMLInputElement;
    expect(cep.getAttribute("autocomplete")).toBe("postal-code");
    expect(group.contains(cep)).toBe(true);
  });
});
