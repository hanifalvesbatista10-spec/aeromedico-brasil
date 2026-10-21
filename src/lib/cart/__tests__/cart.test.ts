import { describe, it, expect } from "vitest";
import {
  addLine,
  cartItemCount,
  lineKey,
  parseStoredCart,
  removeLine,
  serializeCart,
  setLineQuantity,
  type CartLine,
} from "../cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: "p1",
  variantId: "v1",
  quantity: 1,
  ...over,
});

describe("addLine", () => {
  it("soma a quantidade quando a chave é a mesma", () => {
    expect(addLine([line({ quantity: 2 })], line({ quantity: 3 }))).toEqual([
      line({ quantity: 5 }),
    ]);
  });

  it("respeita o teto de 99 por linha", () => {
    expect(addLine([line({ quantity: 98 })], line({ quantity: 5 }))[0].quantity).toBe(99);
  });

  it("linha nova entra no fim e a entrada não é alterada", () => {
    const before = [line()];
    const after = addLine(before, line({ variantId: "v2" }));
    expect(after.map((l) => l.variantId)).toEqual(["v1", "v2"]);
    expect(before).toHaveLength(1);
  });

  it("ignora a 51ª linha, mas ainda soma em linha que já existe", () => {
    const full = Array.from({ length: 50 }, (_, i) => line({ variantId: `v${i}` }));
    expect(addLine(full, line({ variantId: "novo" }))).toHaveLength(50);
    expect(addLine(full, line({ variantId: "v3" }))[3].quantity).toBe(2);
  });

  it("produto sem variação usa variantId nulo como chave própria", () => {
    expect(lineKey(line({ variantId: null }))).not.toBe(lineKey(line()));
    expect(addLine([line({ variantId: null })], line({ variantId: null }))).toEqual([
      line({ variantId: null, quantity: 2 }),
    ]);
  });
});

describe("setLineQuantity", () => {
  const key = lineKey(line());

  it("zero, negativo e NaN removem a linha", () => {
    for (const q of [0, -1, Number.NaN]) {
      expect(setLineQuantity([line()], key, q)).toEqual([]);
    }
  });

  it("grava inteiro entre 1 e 99", () => {
    expect(setLineQuantity([line()], key, 2.7)[0].quantity).toBe(2);
    expect(setLineQuantity([line()], key, 500)[0].quantity).toBe(99);
  });

  it("chave desconhecida não altera nada", () => {
    expect(setLineQuantity([line()], "outra", 4)).toEqual([line()]);
  });
});

describe("removeLine e cartItemCount", () => {
  it("remove pela chave; chave inexistente não altera", () => {
    expect(removeLine([line()], lineKey(line()))).toEqual([]);
    expect(removeLine([line()], "outra")).toEqual([line()]);
  });

  it("soma as quantidades", () => {
    expect(
      cartItemCount([line({ quantity: 2 }), line({ variantId: "v2", quantity: 3 })])
    ).toBe(5);
    expect(cartItemCount([])).toBe(0);
  });
});

describe("parseStoredCart", () => {
  it("texto ausente, vazio ou quebrado vira carrinho vazio", () => {
    for (const raw of [null, "", "{", "123", '{"a":1}', "null", '"x"']) {
      expect(parseStoredCart(raw)).toEqual([]);
    }
  });

  it("descarta só as linhas malformadas", () => {
    const raw = JSON.stringify([
      line({ quantity: 2 }),
      { variantId: "v9", quantity: 1 },
      { productId: "p2", variantId: null, quantity: "x" },
      { productId: "p3", variantId: 7, quantity: 1 },
      { productId: "p4", variantId: null, quantity: 0 },
    ]);
    expect(parseStoredCart(raw)).toEqual([line({ quantity: 2 })]);
  });

  it("ids acima de 64 caracteres são descartados (o servidor os rejeitaria e travaria o carrinho inteiro)", () => {
    const longo = "x".repeat(65);
    const raw = JSON.stringify([
      line({ productId: longo }),
      line({ variantId: longo }),
      line({ quantity: 2 }),
    ]);
    expect(parseStoredCart(raw)).toEqual([line({ quantity: 2 })]);
  });

  it("ajusta quantidade ao teto e une chaves repetidas", () => {
    const raw = JSON.stringify([line({ quantity: 500 }), line({ quantity: 3 })]);
    expect(parseStoredCart(raw)).toEqual([line({ quantity: 99 })]);
  });

  it("aceita no máximo 50 linhas", () => {
    const many = Array.from({ length: 80 }, (_, i) => line({ variantId: `v${i}` }));
    expect(parseStoredCart(JSON.stringify(many))).toHaveLength(50);
  });

  it("ida e volta com serializeCart devolve o mesmo carrinho", () => {
    const cart = [line({ quantity: 2 }), line({ variantId: null, quantity: 1 })];
    expect(parseStoredCart(serializeCart(cart))).toEqual(cart);
  });
});
