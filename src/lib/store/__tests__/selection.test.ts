import { describe, it, expect } from "vitest";
import {
  fromPriceCents,
  imagesForColor,
  resolveSelection,
} from "../selection";
import type { StoreProductImage, StoreVariant } from "@/lib/types";

function variant(over: Partial<StoreVariant>): StoreVariant {
  return {
    id: "v",
    productId: "p",
    sku: null,
    size: null,
    colorName: null,
    colorHex: null,
    priceCents: null,
    weightGrams: null,
    stock: null,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

function image(over: Partial<StoreProductImage>): StoreProductImage {
  return { id: "i", productId: "p", url: "u", alt: "", colorName: null, sortOrder: 0, ...over };
}

const single = { basePriceCents: 2500, hasVariants: false };
const shirt = { basePriceCents: 4990, hasVariants: true };

describe("fromPriceCents", () => {
  it("usa o menor preço entre as variações publicadas", () => {
    expect(
      fromPriceCents(shirt, [
        variant({ priceCents: 5990 }),
        variant({ id: "2", priceCents: null }),
        variant({ id: "3", priceCents: 3990, published: false }),
      ])
    ).toBe(4990);
  });

  it("sem variações publicadas, usa o preço base", () => {
    expect(fromPriceCents(shirt, [])).toBe(4990);
    expect(fromPriceCents(shirt, [variant({ published: false, priceCents: 100 })])).toBe(4990);
  });
});

describe("resolveSelection", () => {
  const variants = [
    variant({ id: "pp", size: "P", colorName: "Preta", sortOrder: 0 }),
    variant({ id: "pb", size: "P", colorName: "Branca", sortOrder: 1, priceCents: 5990 }),
    variant({ id: "gp", size: "G", colorName: "Preta", sortOrder: 2, stock: 0 }),
  ];

  it("produto sem variações está pronto para comprar com o preço base", () => {
    expect(resolveSelection(single, [], null, null)).toEqual({
      status: "ready",
      variant: null,
      priceCents: 2500,
    });
  });

  it("com variações publicadas ausentes, fica indisponível", () => {
    expect(resolveSelection(shirt, [], null, null).status).toBe("unavailable");
    expect(
      resolveSelection(shirt, [variant({ published: false })], null, null).status
    ).toBe("unavailable");
  });

  it("escolha incompleta mostra o preço inicial", () => {
    expect(resolveSelection(shirt, variants, "P", null)).toEqual({
      status: "incomplete",
      variant: null,
      priceCents: 4990,
    });
    expect(resolveSelection(shirt, variants, null, null).status).toBe("incomplete");
  });

  it("combinação completa devolve a variação e o preço dela", () => {
    const selection = resolveSelection(shirt, variants, "P", "Branca");
    expect(selection.status).toBe("ready");
    expect(selection.variant?.id).toBe("pb");
    expect(selection.priceCents).toBe(5990);
  });

  it("estoque zero marca esgotado", () => {
    expect(resolveSelection(shirt, variants, "G", "Preta").status).toBe("sold-out");
  });

  it("combinação que não existe fica indisponível", () => {
    expect(resolveSelection(shirt, variants, "G", "Branca").status).toBe("unavailable");
  });

  it("produto só com tamanho não exige cor", () => {
    const onlySizes = [variant({ id: "m", size: "M" }), variant({ id: "g", size: "G" })];
    const selection = resolveSelection(shirt, onlySizes, "M", null);
    expect(selection.status).toBe("ready");
    expect(selection.variant?.id).toBe("m");
  });

  it("produto só com cor não exige tamanho", () => {
    const onlyColors = [variant({ id: "v", colorName: "Verde" })];
    expect(resolveSelection(shirt, onlyColors, null, "Verde").status).toBe("ready");
  });
});

describe("imagesForColor", () => {
  const images = [
    image({ id: "geral", colorName: null, sortOrder: 0 }),
    image({ id: "preta", colorName: "Preta", sortOrder: 1 }),
    image({ id: "branca", colorName: "Branca", sortOrder: 2 }),
  ];

  it("sem cor escolhida, mostra todas na ordem", () => {
    expect(imagesForColor(images, null).map((i) => i.id)).toEqual(["geral", "preta", "branca"]);
  });

  it("com cor escolhida, as fotos dela vêm primeiro, depois as gerais", () => {
    expect(imagesForColor(images, "Preta").map((i) => i.id)).toEqual(["preta", "geral"]);
  });

  it("cor sem foto própria mostra as gerais; sem gerais, mostra todas", () => {
    expect(imagesForColor(images, "Verde").map((i) => i.id)).toEqual(["geral"]);
    expect(
      imagesForColor([image({ id: "so-branca", colorName: "Branca" })], "Verde").map((i) => i.id)
    ).toEqual(["so-branca"]);
  });

  it("lista vazia continua vazia", () => {
    expect(imagesForColor([], "Preta")).toEqual([]);
  });
});
