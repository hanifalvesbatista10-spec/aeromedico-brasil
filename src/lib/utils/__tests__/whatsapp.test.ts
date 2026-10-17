import { describe, it, expect } from "vitest";
import { buildWhatsappLink } from "../whatsapp";

describe("buildWhatsappLink", () => {
  it("monta o link com a mensagem codificada (acentos incluídos)", () => {
    expect(
      buildWhatsappLink("https://wa.me/5585999998888", "Olá! Quero a mentoria.")
    ).toBe("https://wa.me/5585999998888?text=Ol%C3%A1!%20Quero%20a%20mentoria.");
  });

  it("devolve null para o placeholder atual sem número", () => {
    expect(buildWhatsappLink("https://wa.me/", "Oi")).toBeNull();
  });

  it("devolve null para vazio e para texto que não é URL", () => {
    expect(buildWhatsappLink("", "Oi")).toBeNull();
    expect(buildWhatsappLink("não é url", "Oi")).toBeNull();
  });

  it("mantém o número e substitui o texto antigo pela mensagem nova", () => {
    expect(
      buildWhatsappLink("https://wa.me/5585999998888?text=antigo", "Novo")
    ).toBe("https://wa.me/5585999998888?text=Novo");
  });

  it("aceita o formato api.whatsapp.com/send?phone=", () => {
    expect(
      buildWhatsappLink(
        "https://api.whatsapp.com/send?phone=5585999998888",
        "Oi"
      )
    ).toBe("https://wa.me/5585999998888?text=Oi");
  });

  it("rejeita número com menos de 10 dígitos", () => {
    expect(buildWhatsappLink("https://wa.me/123", "Oi")).toBeNull();
  });

  it("rejeita número com mais de 15 dígitos", () => {
    expect(buildWhatsappLink("https://wa.me/1234567890123456", "Oi")).toBeNull();
  });
});
