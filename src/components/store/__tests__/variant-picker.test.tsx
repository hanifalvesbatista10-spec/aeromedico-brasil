import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { VariantPicker } from "../variant-picker";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

const CART_KEY = "aeromedico:cart:v1";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);


const shirt: StoreProduct = {
  id: "p1",
  slug: "camiseta-aeromedico",
  categoryId: null,
  name: "Camiseta Aeromédico",
  description: "Algodão",
  basePriceCents: 4990,
  weightGrams: 200,
  lengthCm: 30,
  widthCm: 25,
  heightCm: 3,
  hasVariants: true,
  featured: false,
  published: true,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
};

function variant(over: Partial<StoreVariant>): StoreVariant {
  return {
    id: "v",
    productId: "p1",
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

const variants = [
  variant({ id: "pp", size: "P", colorName: "Preta", colorHex: "#000000", sortOrder: 0 }),
  variant({ id: "pb", size: "P", colorName: "Branca", colorHex: "#ffffff", priceCents: 5990, sortOrder: 1 }),
  variant({ id: "gp", size: "G", colorName: "Preta", colorHex: "#000000", stock: 0, sortOrder: 2 }),
];

const images: StoreProductImage[] = [
  { id: "i1", productId: "p1", url: "/geral.jpg", alt: "Foto geral", colorName: null, sortOrder: 0 },
  { id: "i2", productId: "p1", url: "/branca.jpg", alt: "Foto branca", colorName: "Branca", sortOrder: 1 },
];

function renderShirt(overrides: Partial<StoreProduct> = {}, list = variants) {
  return render(<VariantPicker product={{ ...shirt, ...overrides }} variants={list} images={images} />);
}

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

const buyLink = () => screen.queryByRole("link", { name: /whatsapp/i });
const addButton = () => screen.queryByRole("button", { name: "Adicionar ao carrinho" });

describe("VariantPicker", () => {
  it("começa sem escolha: pede tamanho e cor e mostra o preço inicial", () => {
    renderShirt();
    expect(addButton()).toBeNull();
    expect(screen.getByText("Escolha o tamanho e a cor")).toBeTruthy();
    expect(screen.getByText(/A partir de/)).toBeTruthy();
  });

  it("com tamanho e cor, a compra é só pelo carrinho: nunca há botão de WhatsApp", () => {
    renderShirt();
    click("P");
    click(/Preta/);
    expect(addButton()).toBeTruthy();
    expect(buyLink()).toBeNull();
    expect(document.body.innerHTML).not.toContain("wa.me");
  });

  it("mostra o preço próprio da variação escolhida", () => {
    renderShirt();
    click("P");
    click(/Branca/);
    expect(document.body.textContent?.replace(/ /g, " ")).toContain("R$ 59,90");
  });

  it("combinação com estoque zero aparece como esgotada, sem botão de compra", () => {
    renderShirt();
    click("G");
    click(/Preta/);
    expect(addButton()).toBeNull();
    expect(screen.getByText("Esgotado")).toBeTruthy();
  });

  describe("carrinho", () => {
    const stored = () => JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");

    it("com tamanho e cor, adicionar grava a variação exata com quantidade 1", () => {
      renderShirt();
      click("P");
      click(/Branca/);
      fireEvent.click(addButton()!);
      expect(stored()).toEqual([{ productId: "p1", variantId: "pb", quantity: 1 }]);
    });

    it("adicionar duas vezes soma 2 e avisa com link para o carrinho", () => {
      renderShirt();
      click("P");
      click(/Preta/);
      fireEvent.click(addButton()!);
      fireEvent.click(addButton()!);
      expect(stored()).toEqual([{ productId: "p1", variantId: "pp", quantity: 2 }]);

      const status = screen.getByRole("status");
      expect(status.textContent).toContain("Adicionado ao carrinho.");
      expect(within(status).getByRole("link", { name: "Ver carrinho" }).getAttribute("href")).toBe(
        "/carrinho"
      );
    });

    it("a cada clique o aviso diz quantos deste item há no carrinho", () => {
      renderShirt();
      click("P");
      click(/Preta/);
      fireEvent.click(addButton()!);
      expect(screen.getByRole("status").textContent).toContain("Você tem 1 deste item.");
      fireEvent.click(addButton()!);
      expect(screen.getByRole("status").textContent).toContain("Você tem 2 deste item.");
    });

    it("no máximo de 99 unidades não adiciona e avisa em vez de confirmar", () => {
      window.localStorage.setItem(CART_KEY, JSON.stringify([{ productId: "p1", variantId: "pp", quantity: 99 }]));
      renderShirt();
      click("P");
      click(/Preta/);
      fireEvent.click(addButton()!);
      expect(stored()).toEqual([{ productId: "p1", variantId: "pp", quantity: 99 }]);
      const text = screen.getByRole("status").textContent ?? "";
      expect(text).toContain("máximo");
      expect(text).not.toContain("Adicionado");
    });

    it("carrinho com 50 itens diferentes não aceita um novo e avisa", () => {
      const cheio = Array.from({ length: 50 }, (_, i) => ({ productId: `outro${i}`, variantId: null, quantity: 1 }));
      window.localStorage.setItem(CART_KEY, JSON.stringify(cheio));
      renderShirt();
      click("P");
      click(/Preta/);
      fireEvent.click(addButton()!);
      expect(stored()).toHaveLength(50);
      const text = screen.getByRole("status").textContent ?? "";
      expect(text).toContain("cheio");
      expect(text).not.toContain("Adicionado");
    });

    it("sem escolha completa o botão não existe", () => {
      renderShirt();
      click("P");
      expect(addButton()).toBeNull();
      expect(screen.getByText("Escolha a cor")).toBeTruthy();
    });

    it("combinação esgotada não oferece o botão", () => {
      renderShirt();
      click("G");
      click(/Preta/);
      expect(addButton()).toBeNull();
    });

    it("produto sem variações adiciona com variantId nulo", () => {
      renderShirt({ hasVariants: false }, []);
      fireEvent.click(addButton()!);
      expect(stored()).toEqual([{ productId: "p1", variantId: null, quantity: 1 }]);
    });

    it("trocar a escolha apaga o aviso de 'adicionado'", () => {
      renderShirt();
      click("P");
      click(/Preta/);
      fireEvent.click(addButton()!);
      click(/Branca/);
      expect(screen.getByRole("status").textContent).not.toContain("Adicionado");
    });
  });

  it("produto sem variações vende direto, com o preço base", () => {
    renderShirt({ hasVariants: false }, []);
    expect(addButton()).toBeTruthy();
    expect(buyLink()).toBeNull();
    expect(document.body.textContent?.replace(/ /g, " ")).toContain("R$ 49,90");
  });

  it("produto com variações, mas nenhuma publicada, fica indisponível", () => {
    renderShirt({}, []);
    expect(buyLink()).toBeNull();
    expect(screen.getByText("Indisponível")).toBeTruthy();
  });

  it("escolher a cor troca a foto principal pela foto daquela cor", () => {
    renderShirt();
    const main = () =>
      document.querySelector("img[alt='Foto geral'], img[alt='Foto branca']")?.getAttribute("alt");
    expect(main()).toBe("Foto geral");
    click(/Branca/);
    expect(main()).toBe("Foto branca");
  });

  describe("grade em que nem toda combinação existe", () => {
    // Preta só tem P; Rosa só tem PP. Antes, escolher Preta + P desabilitava
    // Rosa e PP e o cliente ficava preso até recarregar a página.
    const grid = [
      variant({ id: "pp-preta", size: "P", colorName: "Preta", colorHex: "#000000", sortOrder: 0 }),
      variant({ id: "pp-rosa", size: "PP", colorName: "Rosa", colorHex: "#ff66aa", sortOrder: 1 }),
    ];

    it("escolher uma cor que não existe no tamanho atual troca a cor e limpa o tamanho", () => {
      renderShirt({}, grid);
      click("P");
      click(/Preta/);
      expect(addButton()).toBeTruthy();

      const rosa = screen.getByRole("button", { name: /Rosa/ }) as HTMLButtonElement;
      expect(rosa.disabled).toBe(false);
      fireEvent.click(rosa);

      expect(addButton()).toBeNull();
      expect(screen.getByText("Escolha o tamanho")).toBeTruthy();

      click("PP");
      expect(addButton()).toBeTruthy();
    });

    it("escolher um tamanho que não existe na cor atual troca o tamanho e limpa a cor", () => {
      renderShirt({}, grid);
      click(/Rosa/);
      click("PP");
      expect(addButton()).toBeTruthy();

      const tamanhoP = screen.getByRole("button", { name: "P" }) as HTMLButtonElement;
      expect(tamanhoP.disabled).toBe(false);
      fireEvent.click(tamanhoP);

      expect(addButton()).toBeNull();
      expect(screen.getByText("Escolha a cor")).toBeTruthy();

      click(/Preta/);
      expect(addButton()).toBeTruthy();
    });
  });
});
