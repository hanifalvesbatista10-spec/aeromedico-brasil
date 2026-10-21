import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CartLink } from "../cart-link";

const KEY = "aeromedico:cart:v1";

function seed(quantities: number[]) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify(
      quantities.map((quantity, i) => ({ productId: "p", variantId: `v${i}`, quantity }))
    )
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("CartLink", () => {
  it("vazio: rótulo 'Carrinho vazio' e sem selo", () => {
    render(<CartLink />);
    const link = screen.getByRole("link", { name: "Carrinho vazio" });
    expect(link.getAttribute("href")).toBe("/carrinho");
    expect(screen.queryByTestId("cart-count")).toBeNull();
  });

  it("um item: singular", () => {
    seed([1]);
    render(<CartLink />);
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeTruthy();
  });

  it("vários itens: soma as quantidades e mostra o selo", () => {
    seed([1, 2]);
    render(<CartLink />);
    expect(screen.getByRole("link", { name: "Carrinho, 3 itens" })).toBeTruthy();
    expect(screen.getByTestId("cart-count").textContent).toBe("3");
  });

  it("acima de 99 mostra 99+", () => {
    seed([99, 21]);
    render(<CartLink />);
    expect(screen.getByTestId("cart-count").textContent).toBe("99+");
    expect(screen.getByRole("link", { name: "Carrinho, 120 itens" })).toBeTruthy();
  });
});
