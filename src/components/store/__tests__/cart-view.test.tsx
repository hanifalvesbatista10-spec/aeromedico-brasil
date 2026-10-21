import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { PricedCart, PricedLine, UnavailableLine } from "@/lib/cart/pricing";

const priceCartAction = vi.fn();
vi.mock("@/lib/actions/cart", () => ({
  priceCartAction: (...args: unknown[]) => priceCartAction(...args),
}));

import { CartView } from "../cart-view";

const KEY = "aeromedico:cart:v1";
const WHATSAPP = "https://wa.me/5585999998888";

type StoredLine = { productId: string; variantId: string | null; quantity: number };
const stored = (): StoredLine[] => JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
const seed = (lines: StoredLine[]) => window.localStorage.setItem(KEY, JSON.stringify(lines));
const shirt = (quantity = 1): StoredLine => ({ productId: "camiseta", variantId: "m-preta", quantity });
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
function fakeServer(maxByKey: Record<string, number> = {}) {
  priceCartAction.mockImplementation(async (lines: StoredLine[]) => {
    const out = lines.map((l) => {
      const key = `${l.productId}:${l.variantId ?? "-"}`;
      const max = maxByKey[key] ?? null;
      const quantity = max === null ? l.quantity : Math.min(l.quantity, max);
      const base = l.productId === "bone"
        ? priced({ key, productId: "bone", variantId: null, slug: "bone", name: "Boné", size: null, colorName: null, unitPriceCents: 2000 })
        : priced({ key });
      return { ...base, quantity, maxQuantity: max, reduced: quantity < l.quantity, lineTotalCents: base.unitPriceCents * quantity };
    });
    return { ok: true, cart: cartOf(out) };
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

    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico" }));

    expect(stored()[0].quantity).toBe(2);
    await waitFor(() => expect(priceCartAction).toHaveBeenLastCalledWith([shirt(2)]));
    await waitFor(() => expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 99,80"));
  });

  it("'+' fica desabilitado no limite do estoque e '−' na quantidade 1", async () => {
    seed([shirt(3)]);
    fakeServer({ "camiseta:m-preta": 3 });
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    const plus = screen.getByRole("button", { name: "Aumentar quantidade de Camiseta Aeromédico" }) as HTMLButtonElement;
    expect(plus.disabled).toBe(true);

    seed([shirt(1)]);
    cleanup();
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");
    const minus = screen.getByRole("button", { name: "Diminuir quantidade de Camiseta Aeromédico" }) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
  });

  it("Remover tira a linha e volta ao estado vazio", async () => {
    seed([shirt(1)]);
    fakeServer();
    render(<CartView whatsappUrl={WHATSAPP} />);
    await screen.findByText("Camiseta Aeromédico");

    fireEvent.click(screen.getByRole("button", { name: "Remover Camiseta Aeromédico" }));

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
      cart: cartOf(
        [priced({ key: "bone:-", productId: "bone", variantId: null, slug: "bone", name: "Boné", size: null, colorName: null, unitPriceCents: 2000, lineTotalCents: 2000 })],
        [{ key: "camiseta:m-preta", productId: "camiseta", variantId: "m-preta", reason: "sold-out", name: "Camiseta Aeromédico" }]
      ),
    });
    render(<CartView whatsappUrl={WHATSAPP} />);

    const block = await screen.findByRole("region", { name: "Estes itens não estão mais disponíveis" });
    expect(within(block).getByText(/Camiseta Aeromédico/)).toBeTruthy();
    expect(within(block).getByText(/Esgotado/)).toBeTruthy();
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
    expect(screen.getByText("Finalização em breve")).toBeTruthy();
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
      releaseFirst({ ok: true, cart: cartOf([priced({ key: "bone:-", productId: "bone", variantId: null, name: "Boné", size: null, colorName: null, unitPriceCents: 1000, quantity: 1, lineTotalCents: 1000 })]) });
    });
    expect(money(screen.getByTestId("cart-subtotal").textContent)).toContain("R$ 60,00");
  });
});
