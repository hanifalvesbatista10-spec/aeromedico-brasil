import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VariantPicker } from "../variant-picker";
import type { StoreProduct, StoreProductImage, StoreVariant } from "@/lib/types";

afterEach(cleanup);

const WHATSAPP = "https://wa.me/5585999998888";

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

function renderShirt(whatsappUrl = WHATSAPP, overrides: Partial<StoreProduct> = {}, list = variants) {
  return render(
    <VariantPicker
      product={{ ...shirt, ...overrides }}
      variants={list}
      images={images}
      whatsappUrl={whatsappUrl}
    />
  );
}

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

const buyLink = () => screen.queryByRole("link", { name: /Comprar pelo WhatsApp/ });

describe("VariantPicker", () => {
  it("começa sem escolha: pede tamanho e cor e mostra o preço inicial", () => {
    renderShirt();
    expect(buyLink()).toBeNull();
    expect(screen.getByText("Escolha o tamanho e a cor")).toBeTruthy();
    expect(screen.getByText(/A partir de/)).toBeTruthy();
  });

  it("com tamanho e cor, libera a compra no WhatsApp com a mensagem do produto", () => {
    renderShirt();
    click("P");
    click(/Preta/);
    const link = buyLink();
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe(
      "https://wa.me/5585999998888?text=" +
        encodeURIComponent("Olá! Quero comprar: Camiseta Aeromédico (P, Preta).")
    );
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
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
    expect(buyLink()).toBeNull();
    expect(screen.getByText("Esgotado")).toBeTruthy();
  });

  it("com o WhatsApp ainda sem número, a compra aparece como 'em breve', nunca um link quebrado", () => {
    renderShirt("https://wa.me/");
    click("P");
    click(/Preta/);
    expect(buyLink()).toBeNull();
    expect(screen.getByText("Compra em breve")).toBeTruthy();
  });

  it("produto sem variações vende direto, com o preço base", () => {
    renderShirt(WHATSAPP, { hasVariants: false }, []);
    const link = buyLink();
    expect(link?.getAttribute("href")).toContain(
      encodeURIComponent("Olá! Quero comprar: Camiseta Aeromédico.")
    );
    expect(document.body.textContent?.replace(/ /g, " ")).toContain("R$ 49,90");
  });

  it("produto com variações, mas nenhuma publicada, fica indisponível", () => {
    renderShirt(WHATSAPP, {}, []);
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
});
