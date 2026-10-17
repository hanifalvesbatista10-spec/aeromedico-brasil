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

  it("aceita número digitado com espaços, parênteses e hífen", () => {
    expect(buildWhatsappLink("https://wa.me/55 85999998888", "Oi")).toBe(
      "https://wa.me/5585999998888?text=Oi"
    );
    expect(buildWhatsappLink("https://wa.me/+55 (85) 99999-8888", "Oi")).toBe(
      "https://wa.me/5585999998888?text=Oi"
    );
  });

  it("mantém links curtos do WhatsApp Business sem inventar número", () => {
    expect(buildWhatsappLink("https://wa.me/message/ABCD1234567890", "Oi")).toBe(
      "https://wa.me/message/ABCD1234567890"
    );
    expect(buildWhatsappLink("https://wa.me/qr/XYZ98765432101", "Oi")).toBe(
      "https://wa.me/qr/XYZ98765432101"
    );
  });

  it("rejeita caminho com mais de um segmento que não seja link curto", () => {
    expect(buildWhatsappLink("https://wa.me/foo/5585999998888", "Oi")).toBeNull();
    expect(buildWhatsappLink("https://wa.me/message/", "Oi")).toBeNull();
  });
});
