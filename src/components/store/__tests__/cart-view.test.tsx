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

import { CartView } from "../cart-view";

const KEY = "aeromedico:cart:v1";
const WHATSAPP = "https://wa.me/5585999998888";

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
    render(<CartView whatsappUrl={WHATSAPP} />);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /ver a loja/i }).getAttribute("href")).toBe("/loja");
    expect(priceCartAction).not.toHaveBeenCalled();
  });

  it("mostra item, variação, total da linha e subtotal vindos do servidor", async () => {
    seed([shirt(2), cap(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);

    expect(await screen.findByText("Camiseta Aeromédico")).toBeTruthy();
    expect(screen.getByText("M, Preta")).toBeTruthy();
    expect(money(document.body.textContent)).toContain("R$ 99,80");
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 119,80");
    expect(screen.getByRole("link", { name: "Camiseta Aeromédico" }).getAttribute("href")).toBe(
      "/loja/camiseta-aeromedico"
    );
  });

  it("'+' grava a nova quantidade e precifica de novo", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(stored()[0].quantity).toBe(2);
    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)]));
    await waitFor(() => expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 99,80"));
  });

  it("'+' fica desabilitado no limite do estoque e '−' na quantidade 1", async () => {
    seed([shirt(3)]);
    fakeServer({ "camiseta:m-preta": 3 });
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    expect(plus.getAttribute("aria-disabled")).toBe("true");

    seed([shirt(1)]);
    cleanup();
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    const minus = screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico, M, Preta" });
    expect(minus.getAttribute("aria-disabled")).toBe("true");
  });

  it("Remover tira a linha e volta ao estado vazio", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" }));

    expect(stored()).toEqual([]);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
  });

  it("estoque menor que o pedido: avisa e corrige a quantidade guardada", async () => {
    seed([shirt(5)]);
    fakeServer({ "camiseta:m-preta": 2 });
    render(<CartView whatsappUrl={WHATSAPP} />);

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
    render(<CartView whatsappUrl={WHATSAPP} />);

    const block = await screen.findByRole("region", { name: "Estes itens não estão mais disponíveis" });
    expect(within(block).getByText(/Camiseta Aeromédico/)).toBeTruthy();
    expect(within(block).getByText("Camiseta Aeromédico (esgotado)")).toBeTruthy();
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 20,00");

    fireEvent.click(within(block).getByRole("button", { name: /Remover/ }));
    expect(stored()).toEqual([cap(1)]);
  });

  it("o link do WhatsApp leva o pedido só com os itens válidos", async () => {
    seed([cap(2)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    const link = await screen.findByRole("link", { name: /Finalizar pelo WhatsApp/ });

    const href = link.getAttribute("href")!;
    expect(href.startsWith("https://wa.me/5585999998888?text=")).toBe(true);
    const text = decodeURIComponent(href.split("?text=")[1]);
    expect(text).toContain("- 2x Boné: R$ 40,00");
    expect(text).toContain("Subtotal: R$ 40,00");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("WhatsApp ainda sem número: botão desabilitado, nunca link quebrado", async () => {
    seed([cap(1)]);
    fakeServer();
    render(<CartView whatsappUrl="https://wa.me/" />);
    await screen.findByText("Boné");
    expect(screen.queryByRole("link", { name: /Finalizar pelo WhatsApp/ })).toBeNull();
    expect(screen.getByText("Finalização indisponível no momento")).toBeTruthy();
  });

  it("falha do servidor mostra alerta e 'Tentar de novo' refaz a chamada", async () => {
    seed([cap(1)]);
    priceCartAction.mockResolvedValueOnce({ ok: false, error: "Não foi possível carregar o carrinho agora. Tente de novo." });
    render(<CartView whatsappUrl={WHATSAPP} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o carrinho agora.");

    fakeServer();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Boné")).toBeTruthy();
    expect(priceCartAction).toHaveBeenCalledTimes(2);
  });

  it("erro de leitura oferece 'Esvaziar carrinho' como saída", async () => {
    seed([cap(1)]);
    priceCartAction.mockResolvedValue({ ok: false, error: "Não foi possível ler os itens do carrinho." });
    render(<CartView whatsappUrl={WHATSAPP} />);

    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Esvaziar carrinho" }));

    expect(stored()).toEqual([]);
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
  });

  it("antes de hidratar, quem tem itens vê 'Carregando', nunca 'vazio'", () => {
    seed([shirt(1)]);
    const html = renderToString(<CartView whatsappUrl={WHATSAPP} />);
    expect(html).toContain("Carregando seu carrinho");
    expect(html).not.toContain("Seu carrinho está vazio.");
  });

  it("variações do mesmo produto têm botões com nomes diferentes", async () => {
    seed([shirt(1), shirtG(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findAllByText("Camiseta Aeromédico");

    expect(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover Camiseta Aeromédico, G, Branca" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, G, Branca" })).toBeTruthy();
  });

  it("remover anuncia o que saiu e mantém o foco dentro do carrinho", async () => {
    seed([shirt(1), cap(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
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
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" }) as HTMLButtonElement;
    expect(plus.disabled).toBe(false);
    fireEvent.click(plus);
    expect(stored()[0].quantity).toBe(3);
  });

  it("'+' em 99 unidades sem limite de estoque também não faz nada", async () => {
    seed([shirt(99)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    expect(plus.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(plus);
    expect(stored()[0].quantity).toBe(99);
  });

  it("alvos de toque de 44px nos controles do carrinho", async () => {
    seed([shirt(2)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico, M, Preta" });
    const remove = screen.getByRole("button", { name: "Remover Camiseta Aeromédico, M, Preta" });
    const checkout = screen.getByRole("link", { name: /Finalizar pelo WhatsApp/ });
    expect(plus.className).toContain("size-11");
    expect(remove.className).toContain("min-h-11");
    expect(checkout.className).toContain("h-11");
  });

  it("respostas fora de ordem: vale a mais recente", async () => {
    seed([cap(1)]);
    let releaseFirst!: (value: unknown) => void;
    priceCartAction.mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }));
    render(<CartView whatsappUrl={WHATSAPP} />);

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
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    expect(screen.getByLabelText("Cupom de desconto")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement).disabled).toBe(true);
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
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByRole("region", { name: "Estes itens não estão mais disponíveis" });
    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull();
    expect(screen.queryByLabelText("CEP de entrega")).toBeNull();
  });

  it("aplicar envia o código, mostra o desconto e o total", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView whatsappUrl={WHATSAPP} />);
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
    render(<CartView whatsappUrl={WHATSAPP} />);
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
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    priceCartAction.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico, M, Preta" }));

    expect(screen.queryByTestId("cart-discount")).toBeNull();
    expect(screen.getByText(/Este cupom vale para pedidos a partir de/).textContent?.replace(/ /g, " ")).toContain(
      "R$ 90,00"
    );
  });

  it("mensagem do servidor sobre o código aparece em alerta, sem derrubar o carrinho", async () => {
    seed([shirt(1)]);
    fakeServer({}, { couponError: "Cupom não encontrado." });
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    await applyCode("naoexiste");

    expect((await screen.findByRole("alert")).textContent).toContain("Cupom não encontrado.");
    expect(screen.getByText("Camiseta Aeromédico")).toBeTruthy();
    expect(screen.queryByTestId("cart-discount")).toBeNull();
  });

  it("'Remover cupom' volta a precificar sem código", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    fakeServer();
    fireEvent.click(screen.getByRole("button", { name: "Remover cupom" }));

    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)]));
    await waitFor(() => expect(screen.queryByTestId("cart-discount")).toBeNull());
    expect(screen.getByLabelText("Cupom de desconto")).toBeTruthy();
  });

  it("o link do WhatsApp leva o cupom e o total", async () => {
    seed([shirt(2)]);
    fakeServer({}, { coupon: VERAO10 });
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    await applyCode();
    await screen.findByText("Cupom VERAO10 aplicado");

    const href = screen.getByRole("link", { name: /Finalizar pelo WhatsApp/ }).getAttribute("href")!;
    const text = decodeURIComponent(href.split("?text=")[1]);
    expect(text).toContain("Cupom VERAO10: -R$ 9,98");
    expect(text).toContain("Total: R$ 89,82");
  });
});

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
  render(<CartView whatsappUrl={WHATSAPP} />);
  await screen.findByText("Camiseta Aeromédico");
}

describe("CartView com frete", () => {
  beforeEach(() => quoteShippingAction.mockReset());

  it("o botão só habilita com 8 dígitos e o campo põe o hífen", async () => {
    await renderWithShirts();
    const button = screen.getByRole("button", { name: "Calcular frete" }) as HTMLButtonElement;
    const input = screen.getByLabelText("CEP de entrega") as HTMLInputElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "0101" } });
    expect(button.disabled).toBe(true);

    quoteShippingAction.mockResolvedValue(quoteOk());
    fireEvent.change(input, { target: { value: "01018020" } });
    expect(input.value).toBe("01018-020");
    expect(button.disabled).toBe(false);

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
    expect(money(group.textContent)).toContain("Correios PAC · R$ 23,45 · até 6 dias úteis");
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
    expect(screen.queryByTestId("cart-total")).toBeNull();
    expect(screen.getByText("O carrinho mudou. Calcule o frete de novo.")).toBeTruthy();
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
    expect(screen.getByText("O carrinho mudou. Calcule o frete de novo.")).toBeTruthy();
  });

  it("frete não configurado: aviso em status, sem opções, e o frete continua combinado no WhatsApp", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue({
      ok: false,
      code: "unconfigured",
      error: "O cálculo automático do frete ainda não está ativo. O frete é combinado no WhatsApp.",
    });
    calculate();

    const note = await screen.findByText(/O cálculo automático do frete ainda não está ativo/);
    expect(note.getAttribute("role")).toBe("status");
    expect(screen.queryByRole("group", { name: "Opções de entrega" })).toBeNull();
  });

  it.each([
    ["invalid-cep", "CEP não encontrado. Confira os 8 números."],
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

  it("o link do WhatsApp leva o frete, o total e a pergunta só sobre pagamento", async () => {
    await renderWithShirts();
    quoteShippingAction.mockResolvedValue(quoteOk());
    calculate();
    await screen.findByRole("group", { name: "Opções de entrega" });

    const href = screen.getByRole("link", { name: /Finalizar pelo WhatsApp/ }).getAttribute("href")!;
    const text = decodeURIComponent(href.split("?text=")[1]);
    expect(text).toContain("Frete (Correios PAC, CEP 01018-020): R$ 23,45");
    expect(text).toContain("Total: R$ 123,25");
    expect(text).toContain("Pode me passar as formas de pagamento?");
  });
});
