import { describe, it, expect } from "vitest";
import { readShippingConfig } from "../config";

const full = {
  MELHOR_ENVIO_TOKEN: "tok",
  STORE_ORIGIN_CEP: "96020-360",
  MELHOR_ENVIO_CONTACT_EMAIL: "contato@exemplo.com.br",
};

describe("readShippingConfig", () => {
  it("configuração completa: sandbox por padrão, CEP só com dígitos", () => {
    expect(readShippingConfig(full)).toEqual({
      token: "tok",
      environment: "sandbox",
      originCep: "96020360",
      contactEmail: "contato@exemplo.com.br",
    });
  });

  it("MELHOR_ENVIO_ENV=production liga a produção; qualquer outro valor fica em sandbox", () => {
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_ENV: "production" })?.environment).toBe("production");
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_ENV: "producao" })?.environment).toBe("sandbox");
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_ENV: "" })?.environment).toBe("sandbox");
  });

  it("faltou algo (ou veio inválido): não há configuração", () => {
    expect(readShippingConfig({})).toBeNull();
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_TOKEN: "  " })).toBeNull();
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_TOKEN: undefined })).toBeNull();
    expect(readShippingConfig({ ...full, STORE_ORIGIN_CEP: "123" })).toBeNull();
    expect(readShippingConfig({ ...full, MELHOR_ENVIO_CONTACT_EMAIL: "sem-arroba" })).toBeNull();
  });
});
