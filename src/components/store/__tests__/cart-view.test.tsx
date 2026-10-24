import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { PricedCart, PricedLine, UnavailableLine } from "@/lib/cart/pricing";
import type { CartCoupon } from "@/lib/cart/coupon";

const priceCartAction = vi.fn();
vi.mock("@/lib/actions/cart", () => ({
  priceCartAction: (...args: unknown[]) => priceCartAction(...args),
}));

const quoteShippingAction = vi.fn();
vi.mock("@/lib/actions/shipping", () => ({
  quoteShippingAction: (...args: unknown[]) => quoteShippingAction(...args),
}));

const quoteCheckoutAction = vi.fn();
vi.mock("@/lib/actions/checkout", () => ({
  quoteCheckoutAction: (...args: unknown[]) => quoteCheckoutAction(...args),
  placeOrderAction: vi.fn(),
}));

import { CartView } from "../cart-view";

const KEY = "aeromedico:cart:v1";

type StoredLine = { productId: string; variantId: string | null; quantity: number };
const stored = (): StoredLine[] => JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
const seed = (lines: StoredLine[]) => window.localStorage.setItem(KEY, JSON.stringify(lines));
const shirt = (quantity = 1): StoredLine => ({ productId: "camiseta", variantId: "m-preta", quantity });
const shirtG = (quantity = 1): StoredLine => ({ productId: "camiseta", variantId: "g-branca", quantity });
const cap = (quantity = 1): StoredLine => ({ productId: "bone", variantId: null, quantity });

function priced(over: Partial<PricedLine> = {}): PricedLine {
  return {
    key: "camiseta:m-preta",
    productId: "camiseta",
    variantId: "m-preta",
    slug: "camiseta-aeromedico",
    name: "Camiseta Aeromédico",
    size: "M",
    colorName: "Preta",
    imageUrl: null,
    unitPriceCents: 4990,
    quantity: 1,
    maxQuantity: null,
    lineTotalCents: 4990,
    reduced: false,
    ...over,
  };
}

function cartOf(lines: PricedLine[], unavailable: UnavailableLine[] = []): PricedCart {
  return {
    lines,
    unavailable,
    subtotalCents: lines.reduce((t, l) => t + l.lineTotalCents, 0),
    itemCount: lines.reduce((t, l) => t + l.quantity, 0),
  };
}

// "Servidor" falso: precifica o que veio do navegador, como a action real.
function fakeServer(
  maxByKey: Record<string, number> = {},
  extra: { coupon?: CartCoupon | null; couponError?: string | null } = {}
) {
  priceCartAction.mockImplementation(async (lines: StoredLine[], code?: string) => {
    const out = lines.map((l) => {
      const key = `${l.productId}:${l.variantId ?? "-"}`;
      const max = maxByKey[key] ?? null;
      const quantity = max === null ? l.quantity : Math.min(l.quantity, max);
      const base = l.productId === "bone"
        ? priced({ key, productId: "bone", variantId: null, slug: "bone", name: "Boné", size: null, colorName: null, unitPriceCents: 2000 })
        : priced({
            key,
            variantId: l.variantId,
            ...(l.variantId === "g-branca" ? { size: "G", colorName: "Branca" } : {}),
          });
      return { ...base, quantity, maxQuantity: max, reduced: quantity < l.quantity, lineTotalCents: base.unitPriceCents * quantity };
    });
    return { ok: true, cart: cartOf(out), coupon: code ? (extra.coupon ?? null) : null, couponError: code ? (extra.couponError ?? null) : null };
  });
}

const money = (text: string | null) => (text ?? "").replace(/ /g, " ");

beforeEach(() => {
  window.localStorage.clear();
  priceCartAction.mockReset();
});
afterEach(cleanup);

describe("CartView", () => {
  it("carrinho vazio mostra o estado vazio e não chama o servidor", () => {
    render(<CartView />);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /ver a loja/i }).getAttribute("href")).toBe("/loja");
    expect(priceCartAction).not.toHaveBeenCalled();
  });

  it("mostra item, variação, total da linha e subtotal vindos do servidor", async () => {
    seed([shirt(2), cap(1)]);
    fakeServer();
    render(<CartView />);

    expect(await screen.findByText("Camiseta Aeromédico")).toBeTruthy();
    expect(screen.getByText("M · Preta")).toBeTruthy();
    expect(money(document.body.textContent)).toContain("R$ 99,80");
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 119,80");
    expect(screen.getByRole("link", { name: "Camiseta Aeromédico" }).getAttribute("href")).toBe(
      "/loja/camiseta-aeromedico"
    );
  });

  it("'+' grava a nova quantidade e precifica de novo", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(stored()[0].quantity).toBe(2);
    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)]));
    await waitFor(() => expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 99,80"));
  });

  it("'+' fica desabilitado no limite do estoque e '−' na quantidade 1", async () => {
    seed([shirt(3)]);
    fakeServer({ "camiseta:m-preta": 3 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    expect(plus.getAttribute("aria-disabled")).toBe("true");

    seed([shirt(1)]);
    cleanup();
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    const minus = screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico, M, Preta" });
    expect(minus.getAttribute("aria-disabled")).toBe("true");
  });

  it("Remover tira a linha e volta ao estado vazio", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" }));

    expect(stored()).toEqual([]);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
  });

  it("estoque menor que o pedido: avisa e corrige a quantidade guardada", async () => {
    seed([shirt(5)]);
    fakeServer({ "camiseta:m-preta": 2 });
    render(<CartView />);

    expect(await screen.findByText("Só temos 2 unidades disponíveis. Ajustamos a quantidade.")).toBeTruthy();
    await waitFor(() => expect(stored()[0].quantity).toBe(2));
    // O aviso continua depois da correção.
    expect(screen.getByText("Só temos 2 unidades disponíveis. Ajustamos a quantidade.")).toBeTruthy();
  });

  it("itens indisponíveis ficam separados, fora do subtotal, e podem ser removidos", async () => {
    seed([cap(1), shirt(1)]);
    priceCartAction.mockResolvedValue({
      ok: true,
      coupon: null,
      couponError: null,
      cart: cartOf(
        [priced({ key: "bone:-", productId: "bone", variantId: null, slug: "bone", name: "Boné", size: null, colorName: null, unitPriceCents: 2000, lineTotalCents: 2000 })],
        [{ key: "camiseta:m-preta", productId: "camiseta", variantId: "m-preta", reason: "sold-out", name: "Camiseta Aeromédico" }]
      ),
    });
    render(<CartView />);

    const block = await screen.findByRole("region", { name: "Estes itens não estão mais disponíveis" });
    expect(within(block).getByText(/Camiseta Aeromédico/)).toBeTruthy();
    expect(within(block).getByText("Camiseta Aeromédico (esgotado)")).toBeTruthy();
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 20,00");

    fireEvent.click(within(block).getByRole("button", { name: /Remover/ }));
    expect(stored()).toEqual([cap(1)]);
  });

  it("falha do servidor mostra alerta e 'Tentar de novo' refaz a chamada", async () => {
    seed([cap(1)]);
    priceCartAction.mockResolvedValueOnce({ ok: false, error: "Não foi possível carregar o carrinho agora. Tente de novo." });
    render(<CartView />);

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o carrinho agora.");

    fakeServer();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Boné")).toBeTruthy();
    expect(priceCartAction).toHaveBeenCalledTimes(2);
  });

  it("erro de leitura oferece 'Esvaziar carrinho' como saída", async () => {
    seed([cap(1)]);
    priceCartAction.mockResolvedValue({ ok: false, error: "Não foi possível ler os itens do carrinho." });
    render(<CartView />);

    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Esvaziar carrinho" }));

    expect(stored()).toEqual([]);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
  });

  it("antes de hidratar, quem tem itens vê 'Carregando', nunca 'vazio'", () => {
    seed([shirt(1)]);
    const html = renderToString(<CartView />);
    expect(html).toContain("Carregando seu carrinho");
    expect(html).not.toContain("Seu carrinho está vazio.");
  });

  it("variações do mesmo produto têm botões com nomes diferentes", async () => {
    seed([shirt(1), shirtG(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findAllByText("Camiseta Aeromédico");

    expect(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, G, Branca" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, G, Branca" })).toBeTruthy();
  });

  it("remover anuncia o que saiu e mantém o foco dentro do carrinho", async () => {
    seed([shirt(1), cap(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" }));

    expect(screen.getByTestId("cart-announcer").textContent).toContain(
      "Camiseta Aeromédico, M, Preta removido do carrinho."
    );
    expect(document.activeElement).toBe(screen.getByTestId("cart-view"));
  });

  it("'+' no limite não faz nada e continua focável (aria-disabled, sem disabled)", async () => {
    seed([shirt(3)]);
    fakeServer({ "camiseta:m-preta": 3 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }) as HTMLButtonElement;
    expect(plus.disabled).toBe(false);
    fireEvent.click(plus);
    expect(stored()[0].quantity).toBe(3);
  });

  it("'+' em 99 unidades sem limite de estoque também não faz nada", async () => {
    seed([shirt(99)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    expect(plus.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(plus);
    expect(stored()[0].quantity).toBe(99);
  });

  it("alvos de toque de 44px nos controles do carrinho", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    const remove = screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" });
    expect(plus.className).toContain("size-11");
    expect(remove.className).toContain("min-h-11");
  });

  it("respostas fora de ordem: vale a mais recente", async () => {
    seed([cap(1)]);
    let releaseFirst!: (value: unknown) => void;
    priceCartAction.mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }));
    render(<CartView />);

    // A segunda chamada (carrinho mudou) responde antes da primeira.
    fakeServer();
    act(() => {
      seed([cap(3)]);
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    await waitFor(() => expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 60,00"));

    await act(async () => {
      releaseFirst({ ok: true, coupon: null, couponError: null, cart: cartOf([priced({ key: "bone:-", productId: "bone", variantId: null, name: "Boné", size: null, colorName: null, unitPriceCents: 1000, quantity: 1, lineTotalCents: 1000 })]) });
    });
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 60,00");
  });
});

const VERAO10: CartCoupon = {
  code: "VERAO10",
  kind: "percent",
  value: 10,
  minOrderCents: 0,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usesCount: 0,
};

async function applyCode(code = "verao10") {
  fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
}

describe("CartView com cupom", () => {
  it("há campo de cupom e botão Aplicar quando o carrinho tem itens", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    expect(screen.getByLabelText("Cupom de desconto")).toBeTruthy();
    const apply = screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(false);

    fireEvent.click(apply);
    expect((await screen.findByRole("alert")).textContent).toContain("Digite o código do cupom.");
    expect(priceCartAction).toHaveBeenCalledTimes(1);
  });

  it("sem nenhum item válido no carrinho não há campo de cupom", async () => {
    seed([shirt(1)]);
    priceCartAction.mockResolvedValue({
      ok: true,
      coupon: null,
      couponError: null,
      cart: cartOf(
        [],
        [{ key: "camiseta:m-preta", productId: "camiseta", variantId: "m-preta", reason: "removed", name: null }]
      ),
    });
    render(<CartView />);
    await screen.findByRole("region", { name: "Estes itens não estão mais disponíveis" });
    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull();
    expect(screen.queryByLabelText("CEP de entrega")).toBeNull();
  });

  it("aplicar envia o código, mostra o desconto e o total", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    await applyCode();

    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)], "verao10"));
    expect(await screen.findByText("Cupom VERAO10 aplicado")).toBeTruthy();
    expect(money(screen.getByTestId("cart-discount").textContent)).toContain("-R$ 9,98");
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 89,82");
  });

  it("mexer na quantidade recalcula desconto e total na hora, antes da nova resposta", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    // A próxima resposta do servidor nunca chega: só vale o cálculo local.
    priceCartAction.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(money(screen.getByTestId("cart-discount").textContent)).toContain("-R$ 14,97");
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 134,73");
  });

  it("cair abaixo do pedido mínimo tira o desconto e explica o mínimo", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: { ...VERAO10, minOrderCents: 9000 } });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    priceCartAction.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(screen.queryByTestId("cart-discount")).toBeNull();
    expect(screen.getByText(/Este cupom vale para pedidos a partir de/).textContent?.replace(/ /g, " ")).toContain(
      "R$ 90,00"
    );
    expect(screen.getByText("Cupom VERAO10 não está valendo agora")).toBeTruthy();
    expect(screen.queryByText("Cupom VERAO10 aplicado")).toBeNull();
  });

  it("mensagem do servidor sobre o código aparece em alerta, sem derrubar o carrinho", async () => {
    seed([shirt(1)]);
    fakeServer({}, { couponError: "Cupom não encontrado." });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    await applyCode("naoexiste");

    expect((await screen.findByRole("alert")).textContent).toContain("Cupom não encontrado.");
    expect(screen.getByText("Camiseta Aeromédico")).toBeTruthy();
    expect(screen.queryByTestId("cart-discount")).toBeNull();
  });

  it("'Remover cupom' volta a precificar sem código", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    fakeServer();
    fireEvent.click(screen.getByRole("button", { name: "Remover cupom" }));

    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)]));
    await waitFor(() => expect(screen.queryByTestId("cart-discount")).toBeNull());
    expect(screen.getByLabelText("Cupom de desconto")).toBeTruthy();
  });

});

// O carrinho calcula os totais com as condições que o servidor informa (Pix 5%, até 6x).
const checkoutQuote = {
  ok: true,
  terms: { pixDiscountBp: 500, maxInstallments: 6 },
  options: [],
  chosen: {},
  items: [],
  orderCents: 12000,
};

const PAC = { id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 };
const SEDEX = { id: "2", name: "SEDEX", company: "Correios", priceCents: 4120, deliveryDays: 2 };
const quoteOk = (options = [PAC, SEDEX]) => ({ ok: true, options, cep: "01018020" });

function calculate(cep = "01018020") {
  fireEvent.change(screen.getByLabelText("CEP de entrega"), { target: { value: cep } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular frete" }));
}

async function renderWithShirts(quantity = 2, coupon = false) {
  seed([shirt(quantity)]);
  fakeServer({}, coupon ? { coupon: VERAO10 } : {});
  render(<CartView />);
  await screen.findByText("Camiseta Aeromédico");
}

describe("CartView: cupom, ajustes da revisão", () => {
  const announcer = () => screen.getByTestId("cart-announcer").textContent;

  it("tentar de novo o mesmo código recusado volta a consultar o servidor", async () => {
    seed([shirt(1)]);
    fakeServer({}, { couponError: "Cupom não encontrado." });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    await applyCode("naoexiste");
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() =>
      expect(priceCartAction.mock.calls.filter((call) => call[1] === "naoexiste")).toHaveLength(2)
    );
  });

  it("apagar o campo depois de um código recusado tira o código e o alerta", async () => {
    seed([shirt(1)]);
    fakeServer({}, { couponError: "Cupom não encontrado." });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode("naoexiste");
    await screen.findByRole("alert");

    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: "" } });

    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(1)]));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("'Remover cupom' tira o desconto na hora, antes da resposta do servidor", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    priceCartAction.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Remover cupom" }));

    expect(screen.queryByTestId("cart-discount")).toBeNull();
    expect(screen.queryByText("Cupom VERAO10 aplicado")).toBeNull();
  });

  it("enquanto o cupom é verificado o botão diz 'Aplicando…' e não envia de novo", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");

    priceCartAction.mockImplementation(() => new Promise(() => {}));
    await applyCode();
    const button = await screen.findByRole("button", { name: "Aplicando…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");

    const calls = priceCartAction.mock.calls.length;
    fireEvent.click(button);
    expect(priceCartAction.mock.calls.length).toBe(calls);
  });

  it("aplicar e remover são anunciados, e o foco não se perde", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    expect(announcer()).toBe("Cupom VERAO10 aplicado. Desconto de R$ 9,98.".replace(" R$ ", " R$\u00a0"));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remover cupom" }))
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover cupom" }));
    expect(announcer()).toBe("Cupom removido.");
    expect(screen.getByTestId("cart-view").contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("campos e botões novos têm contorno de foco próprio", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView />);
    await screen.findByText("Camiseta Aeromédico");
    for (const element of [
      screen.getByLabelText("Cupom de desconto"),
      screen.getByRole("button", { name: "Aplicar" }),
      screen.getByLabelText("CEP de entrega"),
      screen.getByRole("button", { name: "Calcular frete" }),
    ]) {
      expect(element.className).toContain("focus-visible:outline-navy-700");
    }
  });
});

describe("CartView com frete", () => {
  beforeEach(() => {
    quoteShippingAction.mockReset();
  });

  it("CEP incompleto não chama o servidor e explica o que falta; com 8 dígitos o campo põe o hífen", async () => {
    await renderWithShirts();
    const button = screen.getByRole("button", { name: "Calcular frete" }) as HTMLButtonElement;
    const input = screen.getByLabelText("CEP de entrega") as HTMLInputElement;
    expect(button.disabled).toBe(false);

    fireEvent.change(input, { target: { value: "0101" } });
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).toContain("Informe um CEP com 8 números.");
    expect(quoteShippingAction).not.toHaveBeenCalled();

    quoteShippingAction.mockResolvedValue(quoteOk());
    fireEvent.change(input, { target: { value: "01018020" } });
    expect(input.value).toBe("01018-020");

    fireEvent.click(button);
    await waitFor(() => expect(quoteShippingAction).toHaveBeenCalledWith([shirt(2)], "01018-020"));
  });

  it("mostra as opções com a mais barata marcada e o frete e o total no resumo", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();

    const group = await screen.findByRole("group", { name: "Opções de entrega" });
    const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(2);
    expect(radios[0].checked).toBe(true);
    expect(money(group.textContent)).toContain("Correios PAC");
    expect(money(group.textContent)).toContain("até 6 dias úteis");
    expect(money(group.textContent)).toContain("R$ 23,45");
    expect(money(screen.getByTestId("cart-shipping").textContent)).toContain("R$ 23,45");
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 123,25");
  });

  it("trocar a opção troca o frete e o total", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    const group = await screen.findByRole("group", { name: "Opções de entrega" });

    fireEvent.click(within(group).getAllByRole("radio")[1]);

    expect(money(screen.getByTestId("cart-shipping").textContent)).toContain("R$ 41,20");
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 141,00");
  });

  it("cupom e frete juntos: total = subtotal − desconto + frete", async () => {
    await renderWithShirts(2, true);
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();

    await screen.findByRole("group", { name: "Opções de entrega" });
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 113,27");
  });

  it("mexer no carrinho invalida a cotação: some o frete do total e pede para calcular de novo", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    await screen.findByRole("group", { name: "Opções de entrega" });

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
    expect(screen.queryByTestId("cart-shipping")).toBeNull();
    // Sem frete, o total do resumo volta a ser só os produtos (3 camisas).
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 149,70");
    expect(screen.getAllByText("O carrinho mudou. Calcule o frete de novo.").length).toBeGreaterThan(0);
  });

  it("cotação que volta depois de o carrinho mudar não vale", async () => {
    await renderWithShirts();
    let release!: (value: unknown) => void;
    quoteShippingAction.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    calculate();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));
    await act(async () => {
      release(quoteOk());
    });

    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
    expect(screen.queryByTestId("cart-shipping")).toBeNull();
    expect(screen.getAllByText("O carrinho mudou. Calcule o frete de novo.").length).toBeGreaterThan(0);
  });

  it("frete não configurado: aviso em status e sem opções", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue({
      ok: false,
      code: "unconfigured",
      error: "O cálculo do frete não está disponível no momento. Tente de novo mais tarde.",
    });
    calculate();

    const note = await screen.findByText(/O cálculo do frete não está disponível no momento/);
    expect(note.getAttribute("role")).toBe("status");
    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
  });

  it.each([
    ["invalid-cep", "CEP não encontrado. Confira se digitou certo."],
    ["unavailable", "Não foi possível calcular o frete agora. Tente de novo."],
  ])("erro %s aparece em alerta e o botão volta a habilitar", async (code, error) => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue({ ok: false, code, error });
    calculate();

    const alert = await screen.findByText(error);
    expect(alert.getAttribute("role")).toBe("alert");
    expect((screen.getByRole("button", { name: "Calcular frete" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Camiseta Aeromédico")).toBeTruthy();
  });

});


describe("CartView: frete, ajustes da revisão", () => {
  const announcer = () => screen.getByTestId("cart-announcer").textContent;
  beforeEach(() => {
    quoteShippingAction.mockReset();
  });

  it("enquanto calcula, o botão diz 'Calculando…' e um segundo clique não envia de novo", async () => {
    await renderWithShirts();
    quoteShippingAction.mockImplementation(() => new Promise(() => {}));
    calculate();

    const button = await screen.findByRole("button", { name: "Calculando…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(quoteShippingAction).toHaveBeenCalledTimes(1);
  });

  it("editar o CEP depois de cotar apaga as opções e o frete", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    await screen.findByRole("group", { name: "Opções de entrega" });

    fireEvent.change(screen.getByLabelText("CEP de entrega"), { target: { value: "01018030" } });

    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
    expect(screen.queryByTestId("cart-shipping")).toBeNull();
  });

  it("cotar, escolher e carrinho mudado são anunciados", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    const group = await screen.findByRole("group", { name: "Opções de entrega" });
    expect(announcer()?.replace(/\u00a0/g, " ")).toBe(
      "Frete calculado: 2 opções. Entrega Correios PAC selecionada: R$ 23,45."
    );

    fireEvent.click(within(group).getAllByRole("radio")[1]);
    expect(announcer()?.replace(/\u00a0/g, " ")).toBe("Entrega Correios SEDEX selecionada: R$ 41,20.");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));
    await waitFor(() => expect(announcer()).toBe("O carrinho mudou. Calcule o frete de novo."));
  });

  it("a escolha de frete não sobrevive à tela de erro: ao voltar, o resumo não traz frete sem opções", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    await screen.findByRole("group", { name: "Opções de entrega" });

    // A próxima precificação falha: a tela de erro desmonta o bloco de frete.
    priceCartAction.mockResolvedValueOnce({ ok: false, error: "Não foi possível carregar o carrinho agora. Tente de novo." });
    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));
    await screen.findByRole("alert");

    // Volta ao mesmo conteúdo de antes (quantidade 2) e a precificação funciona de novo.
    fakeServer();
    seed([shirt(2)]);
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByText("Camiseta Aeromédico");

    expect(screen.queryByTestId("cart-shipping")).toBeNull();
    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
  });
});

describe("CartView: pagamento pelo site", () => {
  beforeEach(() => {
    quoteShippingAction.mockReset();
    quoteCheckoutAction.mockReset();
    quoteCheckoutAction.mockResolvedValue(checkoutQuote);
    quoteShippingAction.mockResolvedValue(quoteOk());
  });

  async function renderEnabled(quantity = 2, coupon = false) {
    seed([shirt(quantity)]);
    fakeServer({}, coupon ? { coupon: VERAO10 } : {});
    render(<CartView checkoutEnabled />);
    await screen.findByText("Camiseta Aeromédico");
  }

  it("desligado (padrão): com o frete escolhido, avisa que o pagamento ainda não está disponível", async () => {
    await renderWithShirts();
    calculate();
    await screen.findByRole("group", { name: "Opções de entrega" });

    expect(screen.queryByTestId("cart-checkout")).toBeNull();
    expect(quoteCheckoutAction).not.toHaveBeenCalled();
    expect(screen.getByText("O pagamento pelo site ainda não está disponível. Volte em breve.")).toBeTruthy();
  });

  it("ligado, mas sem frete escolhido: pede o frete para finalizar o pedido", async () => {
    await renderEnabled();

    expect(screen.queryByTestId("cart-checkout")).toBeNull();
    expect(quoteCheckoutAction).not.toHaveBeenCalled();
    expect(
      screen.getByText("Calcule o frete para escolher a forma de pagamento e finalizar o pedido.")
    ).toBeTruthy();
  });

  it("ligado e com o frete escolhido: mostra o pagamento e cota no servidor", async () => {
    await renderEnabled();
    calculate();

    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(screen.getByRole("button", { name: /Finalizar pedido/ })).toBeTruthy();
    expect(quoteCheckoutAction).toHaveBeenCalledWith({
      lines: [shirt(2)],
      couponCode: null,
      shipping: { optionId: "1", cep: "01018020", expectedCents: 2345 },
      method: "pix",
    });
  });

  it("cupom aceito vai junto na cotação do pagamento", async () => {
    await renderEnabled(2, true);
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");
    calculate();

    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ couponCode: "VERAO10" })
    );
  });

  it("cupom que deixou de valer (abaixo do mínimo) não vai na cotação", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: { ...VERAO10, minOrderCents: 9000 } });
    render(<CartView checkoutEnabled />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    priceCartAction.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico, M, Preta" }));
    await screen.findByText("Cupom VERAO10 não está valendo agora");
    calculate();

    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(quoteCheckoutAction).toHaveBeenLastCalledWith(expect.objectContaining({ couponCode: null }));
  });

  it("trocar a opção de frete refaz a cotação do pagamento com a nova opção", async () => {
    await renderEnabled();
    calculate();
    const shipping = await screen.findByRole("group", { name: "Opções de entrega" });
    await screen.findByRole("group", { name: "Forma de pagamento" });

    fireEvent.click(within(shipping).getAllByRole("radio")[1]);

    await waitFor(() =>
      expect(quoteCheckoutAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ shipping: { optionId: "2", cep: "01018020", expectedCents: 4120 } })
      )
    );
  });

  it("mexer no carrinho tira o pagamento da tela até o frete ser calculado de novo", async () => {
    await renderEnabled();
    calculate();
    await screen.findByRole("group", { name: "Forma de pagamento" });

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));

    await waitFor(() => expect(screen.queryByTestId("cart-checkout")).toBeNull());
    expect(
      screen.getByText("Calcule o frete para escolher a forma de pagamento e finalizar o pedido.")
    ).toBeTruthy();
  });
});

describe("CartView: pagamento pelo site, ajustes da revisão", () => {
  beforeEach(() => {
    quoteShippingAction.mockReset();
    quoteCheckoutAction.mockReset();
    quoteCheckoutAction.mockResolvedValue(checkoutQuote);
    quoteShippingAction.mockResolvedValue(quoteOk());
  });

  it("com o pagamento ligado, o resumo mostra o Pix com 5% de desconto sobre os produtos (sem o frete)", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView checkoutEnabled />);
    await screen.findByText("Camiseta Aeromédico");
    calculate();
    await screen.findByRole("group", { name: "Forma de pagamento" });

    // Produtos R$ 99,80 + frete R$ 23,45 = R$ 123,25; o Pix tira 5% de R$ 99,80 (R$ 4,99).
    expect(money(screen.getByTestId("cart-pix-discount").textContent)).toContain("R$ 4,99");
    expect(money(screen.getByTestId("cart-total").textContent)).toContain("R$ 118,26");
  });
});

describe("CartView: dados de entrega preservados", () => {
  beforeEach(() => {
    quoteShippingAction.mockReset();
    quoteCheckoutAction.mockReset();
    quoteCheckoutAction.mockResolvedValue(checkoutQuote);
    quoteShippingAction.mockResolvedValue(quoteOk());
  });

  it("o que o cliente digitou não se perde quando ele mexe no carrinho (o frete some) e calcula o frete de novo", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView checkoutEnabled />);
    await screen.findByText("Camiseta Aeromédico");
    calculate();
    await screen.findByRole("group", { name: "Forma de pagamento" });
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Maria Silva" } });

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));
    await waitFor(() => expect(screen.queryByLabelText("Nome completo")).toBeNull());

    calculate();
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect((screen.getByLabelText("Nome completo") as HTMLInputElement).value).toBe("Maria Silva");
  });
});

describe("CartView: só pedido, sem WhatsApp", () => {
  beforeEach(() => {
    quoteShippingAction.mockReset();
    quoteCheckoutAction.mockReset();
    quoteCheckoutAction.mockResolvedValue(checkoutQuote);
    quoteShippingAction.mockResolvedValue(quoteOk());
  });

  const noWhatsapp = () => {
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
    expect(document.body.innerHTML).not.toContain("wa.me");
    expect(document.body.textContent).not.toMatch(/whatsapp/i);
  };

  it("sem pagamento ligado, o carrinho não oferece WhatsApp e diz que o pagamento ainda não está disponível", async () => {
    await renderWithShirts();
    expect(screen.getByText("O pagamento pelo site ainda não está disponível. Volte em breve.")).toBeTruthy();
    noWhatsapp();
  });

  it("com o pagamento ligado, também não há WhatsApp: o caminho é Pagar", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView checkoutEnabled />);
    await screen.findByText("Camiseta Aeromédico");
    calculate();
    await screen.findByRole("group", { name: "Forma de pagamento" });
    expect(screen.getByRole("button", { name: /Finalizar pedido/ })).toBeTruthy();
    noWhatsapp();
  });

  it("itens todos indisponíveis: não há o que finalizar", async () => {
    seed([cap(1)]);
    priceCartAction.mockResolvedValue({
      ok: true,
      cart: cartOf([], [{ key: "bone:-", productId: "bone", variantId: null, reason: "sold-out", name: "Boné" }]),
      coupon: null,
      couponError: null,
    });
    render(<CartView checkoutEnabled />);
    await screen.findByText(/Boné/);
    expect(screen.getByText("Nenhum item disponível para finalizar.")).toBeTruthy();
    expect(screen.queryByTestId("cart-checkout")).toBeNull();
  });
});
