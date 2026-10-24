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
import type { SummaryLine } from "../cart-ui";

const lines = [{ productId: "bone", variantId: null, quantity: 2 }];
const shipping: ShippingSelection = {
  optionId: "1",
  label: "Correios PAC",
  cep: "01018020",
  priceCents: 2345,
  signature: "s1",
};

// 2 bonés de R$ 20,00 + frete de R$ 23,45. Pix: 5% sobre os produtos (R$ 2,00).
const PRODUCTS = 4000;
const baseLines: SummaryLine[] = [
  { testId: "cart-subtotal", label: "Subtotal (2 itens)", value: "R$ 40,00" },
  { testId: "cart-shipping", label: "Frete · Correios PAC", value: "R$ 23,45" },
];

const terms = { pixDiscountBp: 500, maxInstallments: 6 };
const quoteOk = { ok: true, terms, options: [], chosen: {}, items: [], orderCents: 6345 };

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");
const assign = vi.fn();
const onShippingChange = vi.fn();
const onStale = vi.fn();

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

function Checkout(props: { enabled?: boolean; shipping?: ShippingSelection | null; couponCode?: string | null }) {
  return (
    <CartCheckout
      enabled={props.enabled ?? true}
      lines={lines}
      couponCode={props.couponCode ?? null}
      shipping={props.shipping === undefined ? shipping : props.shipping}
      productsCents={PRODUCTS}
      baseLines={baseLines}
      onShippingChange={onShippingChange}
      onStale={onStale}
    >
      {({ payment, contact, summary }) =>
        summary === null ? (
          <p>pagamento inativo</p>
        ) : (
          <>
            {payment}
            {contact}
            {summary}
          </>
        )
      }
    </CartCheckout>
  );
}

async function ready() {
  render(<Checkout />);
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

const finish = () => screen.getByRole("button", { name: /Finalizar pedido/ });
const total = () => plain(screen.getByTestId("cart-total").textContent);

describe("CartCheckout: formas de pagamento", () => {
  it("cota no servidor com os dados do carrinho", async () => {
    await ready();
    expect(quoteCheckoutAction).toHaveBeenCalledWith({
      lines,
      couponCode: null,
      shipping: { optionId: "1", cep: "01018020", expectedCents: 2345 },
      method: "pix",
    });
  });

  it("mostra Pix com desconto, cartão à vista e parcelado sem juros, cada um com o total", async () => {
    const group = await ready();
    const text = plain(group.textContent);
    expect(text).toContain("Pix");
    expect(text).toContain("5% OFF");
    expect(text).toContain("R$ 61,45");
    expect(text).toContain("Cartão à vista");
    expect(text).toContain("R$ 63,45");
    expect(text).toContain("Cartão parcelado em até 6x");
    expect(text).toContain("6x de R$ 10,58 sem juros");
  });

  it("o cupom aceito vai junto na cotação", async () => {
    render(<Checkout couponCode="VERAO10" />);
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenCalledWith(expect.objectContaining({ couponCode: "VERAO10" }));
  });

  it("Pix vem marcado: o resumo mostra o desconto de 5% sobre os produtos e 'ou R$ 63,45 nas outras formas'", async () => {
    const group = await ready();
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios[0].checked).toBe(true);

    expect(plain(screen.getByTestId("cart-pix-discount").textContent)).toContain("R$ 2,00");
    expect(screen.getByText("Desconto no Pix (5%)")).toBeTruthy();
    expect(total()).toContain("R$ 61,45");
    // O rótulo aparece no resumo e na barra fixa do celular.
    expect(screen.getAllByText("Total no Pix").length).toBeGreaterThanOrEqual(1);
    expect(plain(document.body.textContent)).toContain("ou R$ 63,45 nas outras formas");
  });

  it("trocar para o cartão tira o desconto e mostra o preço cheio", async () => {
    const group = await ready();
    fireEvent.click(within(group).getAllByRole("radio")[1]);

    expect(screen.queryByTestId("cart-pix-discount")).toBeNull();
    expect(total()).toContain("R$ 63,45");
    expect(screen.getAllByText("Total").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Total no Pix")).toBeNull();
    expect(plain(document.body.textContent)).not.toContain("nas outras formas");
  });

  it("sem desconto no Pix configurado: sem selo, sem linha de desconto", async () => {
    quoteCheckoutAction.mockResolvedValue({ ...quoteOk, terms: { ...terms, pixDiscountBp: 0 } });
    const group = await ready();
    expect(plain(group.textContent)).not.toContain("OFF");
    expect(screen.queryByTestId("cart-pix-discount")).toBeNull();
    expect(total()).toContain("R$ 63,45");
  });

  it("máximo de 1 parcela: só Pix e cartão à vista", async () => {
    quoteCheckoutAction.mockResolvedValue({ ...quoteOk, terms: { ...terms, maxInstallments: 1 } });
    const group = await ready();
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(plain(group.textContent)).not.toContain("parcelado");
  });

  it("falha na cotação: alerta e botão para tentar de novo", async () => {
    quoteCheckoutAction.mockResolvedValueOnce({
      ok: false,
      code: "unavailable",
      error: "Não foi possível calcular o pagamento agora. Tente de novo.",
    });
    render(<Checkout />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível calcular o pagamento agora.");

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenCalledTimes(2);
  });

  it("inativo (pagamento desligado ou frete ainda não escolhido): nada é cotado nem desenhado", () => {
    const { unmount } = render(<Checkout enabled={false} />);
    expect(screen.getByText("pagamento inativo")).toBeTruthy();
    unmount();
    render(<Checkout shipping={null} />);
    expect(screen.getByText("pagamento inativo")).toBeTruthy();
    expect(quoteCheckoutAction).not.toHaveBeenCalled();
  });

  it("o que o cliente digitou não se perde quando o frete some e volta (o cliente mexe no carrinho)", async () => {
    const { rerender } = render(<Checkout />);
    await screen.findByRole("group", { name: "Forma de pagamento" });
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Maria Silva" } });

    rerender(<Checkout shipping={null} />);
    expect(screen.queryByLabelText("Nome completo")).toBeNull();

    rerender(<Checkout />);
    expect((screen.getByLabelText("Nome completo") as HTMLInputElement).value).toBe("Maria Silva");
  });
});

describe("CartCheckout: dados do comprador", () => {
  it("o CEP vem da cotação do frete, formatado e travado", async () => {
    await ready();
    const cep = screen.getByLabelText("CEP (igual ao do frete)") as HTMLInputElement;
    expect(cep.value).toBe("01018-020");
    expect(cep.readOnly).toBe(true);
    expect(cep.getAttribute("autocomplete")).toBe("postal-code");
  });

  it("os campos formam um grupo nomeado", async () => {
    await ready();
    const group = screen.getByRole("group", { name: "Contato e entrega" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group.contains(screen.getByLabelText("Nome completo"))).toBe(true);
  });

  it("Finalizar com o formulário vazio mostra o primeiro erro e não chama o servidor", async () => {
    await ready();
    fireEvent.click(finish());
    expect((await screen.findByRole("alert")).textContent).toContain("Informe seu nome completo.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });

  it("e-mail inválido é apontado antes de enviar", async () => {
    await ready();
    fillBuyer({ "E-mail": "sem-arroba" });
    fireEvent.click(finish());
    expect((await screen.findByRole("alert")).textContent).toContain("Informe um e-mail válido.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });
});

describe("CartCheckout: finalizar o pedido", () => {
  it("o botão fica no resumo e envia o formulário de dados (atributo form)", async () => {
    await ready();
    const button = finish();
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.getAttribute("form")).toBe("checkout-form");
    expect(document.getElementById("checkout-form")?.tagName).toBe("FORM");
    expect(document.getElementById("checkout-form")?.contains(button)).toBe(false);
  });

  it("envia seleção + total que o cliente viu + comprador e redireciona para o checkout do Asaas", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });
    const group = await ready();
    fireEvent.click(within(group).getAllByRole("radio")[1]);
    fillBuyer();
    fireEvent.click(finish());

    await waitFor(() => expect(placeOrderAction).toHaveBeenCalledTimes(1));
    expect(placeOrderAction).toHaveBeenCalledWith(
      {
        lines,
        couponCode: null,
        shipping: { optionId: "1", cep: "01018020", expectedCents: 2345 },
        method: "card_single",
        expectedTotalCents: 6345,
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

  it("no Pix o total enviado já leva o desconto", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });
    await ready();
    fillBuyer();
    fireEvent.click(finish());
    await waitFor(() => expect(placeOrderAction).toHaveBeenCalledTimes(1));
    expect(placeOrderAction.mock.calls[0][0]).toMatchObject({ method: "pix", expectedTotalCents: 6145 });
  });

  it("enquanto envia, o botão fica aria-disabled e um segundo clique não envia de novo", async () => {
    placeOrderAction.mockImplementation(() => new Promise(() => {}));
    await ready();
    fillBuyer();
    fireEvent.click(finish());

    const busy = await screen.findByRole("button", { name: "Abrindo o pagamento…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(placeOrderAction).toHaveBeenCalledTimes(1);
  });

  it("frete que mudou: avisa, o carrinho passa a usar o valor novo e NÃO redireciona", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "quote",
      error: "O frete mudou para R$ 25,00. Confira o novo total e clique em Pagar de novo.",
      quote: { ok: false, code: "shipping-changed", error: "x", newShippingCents: 2500 },
    });
    await ready();
    fillBuyer();
    fireEvent.click(finish());

    expect(plain((await screen.findByRole("alert")).textContent)).toContain("O frete mudou para R$ 25,00.");
    expect(onShippingChange).toHaveBeenCalledWith(2500);
    expect(assign).not.toHaveBeenCalled();
    // O botão volta a funcionar para o cliente confirmar de novo.
    expect(finish().getAttribute("aria-disabled")).not.toBe("true");
  });

  it("frete que mudou na cotação (antes de pagar): avisa e atualiza o valor", async () => {
    quoteCheckoutAction.mockResolvedValueOnce({
      ok: false,
      code: "shipping-changed",
      error: "O frete mudou para R$ 25,00. Confira o novo total e clique em Pagar de novo.",
      newShippingCents: 2500,
    });
    render(<Checkout />);
    expect(plain((await screen.findByRole("alert")).textContent)).toContain("O frete mudou para R$ 25,00.");
    expect(onShippingChange).toHaveBeenCalledWith(2500);
  });

  it("total que mudou (price-changed): avisa, refaz a cotação e pede ao carrinho para reprecificar", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "quote",
      error: "O total do pedido mudou para R$ 70,00. Se estiver de acordo, clique em Pagar de novo.",
      quote: { ok: false, code: "price-changed", error: "x", newTotalCents: 7000 },
    });
    await ready();
    fillBuyer();
    const before = quoteCheckoutAction.mock.calls.length;
    fireEvent.click(finish());

    expect(plain((await screen.findByRole("alert")).textContent)).toContain("O total do pedido mudou");
    await waitFor(() => expect(quoteCheckoutAction.mock.calls.length).toBeGreaterThan(before));
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("falha ao abrir o pagamento: mensagem do servidor e o botão volta", async () => {
    placeOrderAction.mockResolvedValue({
      ok: false,
      code: "unavailable",
      error: "Não conseguimos abrir o pagamento agora. Nenhuma cobrança foi feita. Tente de novo em instantes.",
    });
    await ready();
    fillBuyer();
    fireEvent.click(finish());

    expect((await screen.findByRole("alert")).textContent).toContain("Nenhuma cobrança foi feita");
    expect(assign).not.toHaveBeenCalled();
    expect(finish().getAttribute("aria-disabled")).not.toBe("true");
  });

  it("erro do comprador devolvido pelo servidor também aparece em alerta", async () => {
    placeOrderAction.mockResolvedValue({ ok: false, code: "invalid-buyer", error: "Informe a cidade." });
    await ready();
    fillBuyer();
    fireEvent.click(finish());
    expect((await screen.findByRole("alert")).textContent).toContain("Informe a cidade.");
  });
});

describe("CartCheckout: ajustes de acessibilidade e celular", () => {
  it("voltar do Asaas pelo botão do navegador (página restaurada do cache) destrava o botão", async () => {
    placeOrderAction.mockResolvedValue({ ok: true, checkoutUrl: "https://asaas.com/checkout/chk_1" });
    await ready();
    fillBuyer();
    fireEvent.click(finish());
    const busy = await screen.findByRole("button", { name: "Abrindo o pagamento…" });
    expect(busy.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      const event = new Event("pageshow") as Event & { persisted: boolean };
      event.persisted = true;
      window.dispatchEvent(event);
    });

    expect(finish().getAttribute("aria-disabled")).not.toBe("true");
  });

  it("Finalizar antes de as formas carregarem: avisa em alerta e o botão fica aria-disabled", async () => {
    quoteCheckoutAction.mockImplementation(() => new Promise(() => {}));
    render(<Checkout />);
    const button = finish();
    expect(button.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(button);

    expect((await screen.findByRole("alert")).textContent).toContain("Aguarde o cálculo das formas de pagamento.");
    expect(placeOrderAction).not.toHaveBeenCalled();
  });

  it("o mesmo erro repetido é anunciado de novo (o alerta é recriado)", async () => {
    await ready();
    fireEvent.click(finish());
    const first = await screen.findByRole("alert");

    fireEvent.click(finish());

    const second = await screen.findByRole("alert");
    expect(second.textContent).toBe(first.textContent);
    expect(second).not.toBe(first);
  });

  it("as formas de pagamento ficam em fieldset, e os controles têm alvo de 44px em tela de toque e contorno de foco", async () => {
    const group = await ready();
    expect(group.tagName).toBe("FIELDSET");
    expect(finish().className).toContain("focus-visible:outline-navy-700");
    const name = screen.getByLabelText("Nome completo");
    expect(name.className).toContain("pointer-coarse:h-11");
    expect(name.className).toContain("pointer-coarse:text-base");
    expect(name.className).toContain("focus-visible:outline-navy-700");
  });

  it("no celular o total e o botão viram uma barra fixa embaixo; no computador voltam para o resumo", async () => {
    await ready();
    const bar = finish().parentElement!;
    expect(bar.className).toContain("fixed");
    expect(bar.className).toContain("bottom-0");
    expect(bar.className).toContain("lg:static");
    expect(plain(bar.textContent)).toContain("R$ 61,45");
  });

  it("o resumo traz o atalho para a loja e diz quem processa o pagamento", async () => {
    await ready();
    expect(screen.getByRole("link", { name: "Escolher mais produtos" }).getAttribute("href")).toBe("/loja");
    expect(screen.getByText("Pagamento processado pelo Asaas")).toBeTruthy();
  });
});

describe("CartCheckout: ajustes da revisão", () => {
  it("o aviso some quando o cliente troca a entrega (ele já não vale para o que está na tela)", async () => {
    const { rerender } = render(<Checkout />);
    await screen.findByRole("group", { name: "Forma de pagamento" });
    fireEvent.click(finish());
    expect(await screen.findByRole("alert")).toBeTruthy();

    rerender(<Checkout shipping={{ ...shipping, optionId: "2", priceCents: 4120, label: "Correios SEDEX" }} />);
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cotação que chega depois de o frete ter sumido não muda mais nada", async () => {
    let release!: (value: unknown) => void;
    quoteCheckoutAction.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    const { rerender } = render(<Checkout />);
    rerender(<Checkout shipping={null} />);

    await act(async () => {
      release({ ok: false, code: "shipping-changed", error: "O frete mudou.", newShippingCents: 2500 });
    });

    expect(onShippingChange).not.toHaveBeenCalled();
  });

  it("erro do formulário: o campo com problema recebe o foco, fica marcado e é descrito pela mensagem", async () => {
    await ready();
    fillBuyer({ "E-mail": "sem-arroba" });
    fireEvent.click(finish());

    const alert = await screen.findByRole("alert");
    const email = screen.getByLabelText("E-mail");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe(alert.id);
    expect(document.activeElement).toBe(email);
    // Os outros campos não ficam marcados.
    expect(screen.getByLabelText("Nome completo").getAttribute("aria-invalid")).not.toBe("true");
  });

  it("ao corrigir o campo, a marca de erro sai", async () => {
    await ready();
    fillBuyer({ "E-mail": "sem-arroba" });
    fireEvent.click(finish());
    await screen.findByRole("alert");

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "maria@exemplo.com" } });
    expect(screen.getByLabelText("E-mail").getAttribute("aria-invalid")).not.toBe("true");
  });

  it("enquanto abre o pagamento, o leitor de tela é avisado (região de status ao lado do botão)", async () => {
    placeOrderAction.mockImplementation(() => new Promise(() => {}));
    await ready();
    fillBuyer();
    fireEvent.click(finish());
    await screen.findByRole("button", { name: "Abrindo o pagamento…" });
    const status = screen.getAllByRole("status").find((el) => el.textContent === "Abrindo o pagamento…");
    expect(status).toBeTruthy();
  });

  it("o total repetido da barra do celular não é lido de novo (o leitor já leu o do resumo)", async () => {
    await ready();
    const bar = finish().parentElement!;
    const repeated = bar.querySelector('[aria-hidden="true"]');
    expect(plain(repeated?.textContent ?? "")).toContain("R$ 61,45");
  });

  it("a barra fixa leva um marcador para a página reservar espaço no fim (rodapé não fica coberto)", async () => {
    await ready();
    expect(finish().parentElement?.hasAttribute("data-cart-bar")).toBe(true);
  });
});
