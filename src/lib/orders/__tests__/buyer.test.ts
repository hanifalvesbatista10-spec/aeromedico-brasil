import { describe, it, expect } from "vitest";
import { buyerSchema, type BuyerInput } from "../buyer";

function input(over: Partial<BuyerInput> = {}): BuyerInput {
  return {
    name: "Maria Silva",
    email: "maria@exemplo.com",
    phone: "(85) 99999-8888",
    cep: "01018-020",
    street: "Rua das Flores",
    number: "100",
    complement: "",
    district: "Centro",
    city: "São Paulo",
    state: "sp ",
    ...over,
  };
}

function parse(over: Partial<BuyerInput> = {}) {
  return buyerSchema.safeParse(input(over));
}

function message(over: Partial<BuyerInput>): string | null {
  const result = parse(over);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

describe("buyerSchema", () => {
  it("normaliza: telefone e CEP só com dígitos, UF em maiúsculas, complemento vazio vira null", () => {
    const result = parse();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      customer: { name: "Maria Silva", email: "maria@exemplo.com", phone: "85999998888" },
      address: {
        cep: "01018020",
        street: "Rua das Flores",
        number: "100",
        complement: null,
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      },
    });
  });

  it("e-mail é aparado e vai para minúsculas", () => {
    const result = parse({ email: "  Maria@Exemplo.COM " });
    expect(result.success && result.data.customer.email).toBe("maria@exemplo.com");
  });

  it("mantém o complemento preenchido", () => {
    const result = parse({ complement: " Apto 12 " });
    expect(result.success && result.data.address.complement).toBe("Apto 12");
  });

  it("recusa nome curto, e-mail inválido e telefone fora de 10 ou 11 dígitos", () => {
    expect(message({ name: "M" })).toBe("Informe seu nome completo.");
    expect(message({ email: "sem-arroba" })).toBe("Informe um e-mail válido.");
    expect(message({ phone: "99999" })).toBe("Informe um telefone com DDD (10 ou 11 números).");
    expect(message({ phone: "859999988889" })).toBe("Informe um telefone com DDD (10 ou 11 números).");
    expect(parse({ phone: "8533334444" }).success).toBe(true);
  });

  it("recusa CEP que não tem 8 dígitos", () => {
    expect(message({ cep: "0101" })).toBe("Informe um CEP com 8 números.");
  });

  it("campos de endereço obrigatórios; número aceita S/N", () => {
    expect(message({ street: " " })).toBe("Informe a rua.");
    expect(message({ number: "" })).toBe("Informe o número (ou S/N).");
    expect(message({ district: "" })).toBe("Informe o bairro.");
    expect(message({ city: "" })).toBe("Informe a cidade.");
    expect(parse({ number: "S/N" }).success).toBe(true);
  });

  it("UF precisa ser uma sigla brasileira válida", () => {
    const text = "Informe o estado (sigla com 2 letras, como SP).";
    expect(message({ state: "XX" })).toBe(text);
    expect(message({ state: "São Paulo" })).toBe(text);
    expect(parse({ state: "ce" }).success).toBe(true);
  });

  it("limita o tamanho dos textos (nada de campo gigante)", () => {
    expect(parse({ name: "a".repeat(121) }).success).toBe(false);
    expect(parse({ street: "a".repeat(201) }).success).toBe(false);
    expect(parse({ complement: "a".repeat(101) }).success).toBe(false);
  });
});
