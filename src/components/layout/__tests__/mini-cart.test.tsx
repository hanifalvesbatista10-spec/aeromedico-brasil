import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const priceCartAction = vi.fn();
vi.mock("@/lib/actions/cart", () => ({
  priceCartAction: (...args: unknown[]) => priceCartAction(...args),
}));

import { CartLink } from "../cart-link";
import { cartStore } from "@/lib/cart/cart-store";
import type { PricedLine } from "@/lib/cart/pricing";

const KEY = "aeromedico:cart:v1";

type Stored = { productId: string; variantId: string | null; quantity: number };
const seed = (lines: Stored[]) => window.localStorage.setItem(KEY, JSON.stringify(lines));

function priced(key: string, over: Partial<PricedLine> = {}): PricedLine {
  const [productId, variantId] = key.split(":");
  return {
    key,
    productId,
    variantId: variantId === "-" ? null : variantId,
    slug: `produto-${productId}`,
    name: "Camisa Aeromédico",
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

// "Servidor" falso: precifica o que veio do navegador, como a action real.
function fakeServer() {
  priceCartAction.mockImplementation(async (lines: Stored[]) => {
    const out = lines.map((line) => {
      const key = `${line.productId}:${line.variantId ?? "-"}`;
      return priced(key, {
        name: line.productId === "bone" ? "Boné" : `Camisa ${line.variantId}`,
        quantity: line.quantity,
        lineTotalCents: 4990 * line.quantity,
      });
    });
    return {
      ok: true,
      cart: {
        lines: out,
        unavailable: [],
        subtotalCents: out.reduce((total, line) => total + line.lineTotalCents, 0),
        itemCount: out.reduce((total, line) => total + line.quantity, 0),
      },
      coupon: null,
      couponError: null,
    };
  });
}

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");
const hover = () => fireEvent.mouseEnter(screen.getByTestId("cart-hover"));

beforeEach(() => {
  window.localStorage.clear();
  priceCartAction.mockReset();
  fakeServer();
});
afterEach(cleanup);

describe("Mini-carrinho do ícone", () => {
  it("sem passar o mouse nem focar, não busca preços e não desenha o painel", () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 2 }]);
    render(<CartLink />);
    expect(priceCartAction).not.toHaveBeenCalled();
    expect(screen.queryByTestId("mini-cart")).toBeNull();
  });

  it("ao passar o mouse mostra os itens, o subtotal e os dois caminhos (ver carrinho e finalizar)", async () => {
    seed([
      { productId: "camisa", variantId: "m", quantity: 2 },
      { productId: "bone", variantId: null, quantity: 1 },
    ]);
    render(<CartLink />);
    hover();

    const panel = await screen.findByTestId("mini-cart");
    await waitFor(() => expect(plain(panel.textContent)).toContain("Boné"));
    const text = plain(panel.textContent);
    expect(priceCartAction).toHaveBeenCalledWith([
      { productId: "camisa", variantId: "m", quantity: 2 },
      { productId: "bone", variantId: null, quantity: 1 },
    ]);
    expect(text).toContain("Seu carrinho");
    expect(text).toContain("3 itens");
    expect(text).toContain("Camisa m");
    expect(text).toContain("2 × R$ 49,90");
    expect(text).toContain("R$ 149,70");
    expect(screen.getByRole("link", { name: "Ver carrinho" }).getAttribute("href")).toBe("/carrinho");
    expect(screen.getByRole("link", { name: "Finalizar pedido" }).getAttribute("href")).toBe(
      "/carrinho#resumo-do-pedido"
    );
  });

  it("o ícone continua com o nome de sempre (o painel não o confunde)", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    await screen.findByTestId("mini-cart");
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" }).getAttribute("href")).toBe("/carrinho");
  });

  it("carrinho vazio: avisa e leva à loja, sem consultar o servidor", async () => {
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    expect(plain(panel.textContent)).toContain("Seu carrinho está vazio");
    expect(screen.getByRole("link", { name: "Ver a loja" }).getAttribute("href")).toBe("/loja");
    expect(priceCartAction).not.toHaveBeenCalled();
  });

  it("mostra só os 3 primeiros itens e diz quantos faltam", async () => {
    seed(
      ["a", "b", "c", "d", "e"].map((variantId) => ({ productId: "camisa", variantId, quantity: 1 }))
    );
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    await waitFor(() => expect(plain(panel.textContent)).toContain("Camisa a"));
    const text = plain(panel.textContent);
    expect(text).toContain("Camisa c");
    expect(text).not.toContain("Camisa d");
    expect(text).toContain("e mais 2 itens");
    expect(text).toContain("R$ 249,50");
  });

  it("falha do servidor: mensagem curta e o caminho para o carrinho continua", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    priceCartAction.mockResolvedValue({ ok: false, error: "x" });
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    await waitFor(() => expect(plain(panel.textContent)).toContain("Não foi possível carregar o carrinho agora."));
    expect(screen.getByRole("link", { name: "Ver carrinho" })).toBeTruthy();
  });

  it("não busca de novo se nada mudou, e busca de novo quando a quantidade muda", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    await screen.findByTestId("mini-cart");
    await waitFor(() => expect(priceCartAction).toHaveBeenCalledTimes(1));

    fireEvent.mouseLeave(screen.getByTestId("cart-hover"));
    hover();
    expect(priceCartAction).toHaveBeenCalledTimes(1);

    act(() => cartStore.setQuantity("camisa:m", 3));
    await waitFor(() => expect(priceCartAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(plain(screen.getByTestId("mini-cart").textContent)).toContain("3 × R$ 49,90"));
  });

  it("o subtotal acompanha a quantidade guardada, mesmo antes da nova resposta do servidor", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    await waitFor(() => expect(plain(panel.textContent)).toContain("R$ 49,90"));

    priceCartAction.mockImplementation(() => new Promise(() => {}));
    act(() => cartStore.setQuantity("camisa:m", 2));
    expect(plain(screen.getByTestId("mini-cart").textContent)).toContain("R$ 99,80");
  });

  it("Escape fecha o painel sem mexer o ponteiro, e ele volta a poder abrir depois", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    expect(panel.getAttribute("data-dismissed")).toBe("false");

    // Com o mouse sobre o ícone e o foco em outro lugar, o Escape chega ao documento, não ao ícone.
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel.getAttribute("data-dismissed")).toBe("true");

    fireEvent.mouseLeave(screen.getByTestId("cart-hover"));
    expect(panel.getAttribute("data-dismissed")).toBe("false");
  });

  it("navegando pelo teclado (foco no ícone) o painel também abre", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    fireEvent.focus(screen.getByRole("link", { name: "Carrinho, 1 item" }));
    expect(await screen.findByTestId("mini-cart")).toBeTruthy();
  });

  it("o painel só aparece com mouse ou teclado: no toque o ícone vai direto ao carrinho (classes de hover)", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    expect(panel.className).toContain("invisible");
    expect(panel.className).toContain("group-hover:visible");
    expect(panel.className).toContain("group-has-[:focus-visible]:visible");
  });
});

describe("Mini-carrinho: ajustes da revisão", () => {
  it("Escape com o foco dentro do painel devolve o foco ao ícone (o foco não cai no vazio)", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    await screen.findByTestId("mini-cart");
    const inside = await screen.findByRole("link", { name: "Ver carrinho" });
    inside.focus();
    expect(document.activeElement).toBe(inside);

    fireEvent.keyDown(inside, { key: "Escape" });

    expect(screen.getByTestId("mini-cart").getAttribute("data-dismissed")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Carrinho, 1 item" }));
  });

  it("voltar com o mouse ao ícone reabre o painel depois de um Escape", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(panel.getAttribute("data-dismissed")).toBe("true");

    hover();
    expect(panel.getAttribute("data-dismissed")).toBe("false");
  });

  it("em aparelho sem mouse (toque) passar o dedo não monta o painel nem consulta preços", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as unknown as typeof window.matchMedia;
    try {
      seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
      render(<CartLink />);
      hover();
      expect(screen.queryByTestId("mini-cart")).toBeNull();
      expect(priceCartAction).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });

  it("em tela estreita o painel cabe (não passa da borda esquerda do aparelho)", async () => {
    seed([{ productId: "camisa", variantId: "m", quantity: 1 }]);
    render(<CartLink />);
    hover();
    const panel = await screen.findByTestId("mini-cart");
    expect(panel.className).toContain("max-w-[calc(100vw-4.5rem)]");
    expect(panel.className).toContain("xl:max-w-[calc(100vw-2rem)]");
  });
});
