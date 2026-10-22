import { describe, it, expect, vi, afterEach } from "vitest";
import {
  asaasBaseUrl,
  buildCheckoutRequest,
  checkoutLink,
  createAsaasCheckout,
  readAsaasConfig,
  type AsaasConfig,
} from "../asaas";

const KEY = "$aact_hmlg_chave-super-secreta-123";
const WEBHOOK = "w".repeat(40);

const config: AsaasConfig = { apiKey: KEY, environment: "sandbox", webhookToken: WEBHOOK };

const input = {
  orderId: "11111111-2222-3333-4444-555555555555",
  orderNumber: 123,
  totalCents: 10413,
  method: "card_installments" as const,
  maxInstallments: 6,
  itemsSummary: "2x Camiseta Aeromédico (M, Preta); 1x Boné",
  siteUrl: "https://aeromedico.exemplo.com.br",
  accessToken: "tokenlongo123",
};

afterEach(() => vi.restoreAllMocks());

describe("readAsaasConfig", () => {
  const env = { ASAAS_API_KEY: KEY, ASAAS_WEBHOOK_TOKEN: WEBHOOK };

  it("configuração completa: sandbox por padrão", () => {
    expect(readAsaasConfig(env)).toEqual({ apiKey: KEY, environment: "sandbox", webhookToken: WEBHOOK });
  });

  it("só 'production' exato liga a produção", () => {
    expect(readAsaasConfig({ ...env, ASAAS_ENV: "production" })?.environment).toBe("production");
    expect(readAsaasConfig({ ...env, ASAAS_ENV: "producao" })?.environment).toBe("sandbox");
    expect(readAsaasConfig({ ...env, ASAAS_ENV: "" })?.environment).toBe("sandbox");
  });

  it("faltou a chave, ou o token do webhook é curto: não há configuração", () => {
    expect(readAsaasConfig({})).toBeNull();
    expect(readAsaasConfig({ ...env, ASAAS_API_KEY: " " })).toBeNull();
    expect(readAsaasConfig({ ...env, ASAAS_WEBHOOK_TOKEN: "curto" })).toBeNull();
    expect(readAsaasConfig({ ...env, ASAAS_WEBHOOK_TOKEN: undefined })).toBeNull();
  });
});

describe("asaasBaseUrl e checkoutLink", () => {
  it("endereços de sandbox e de produção", () => {
    expect(asaasBaseUrl("sandbox")).toBe("https://api-sandbox.asaas.com/v3");
    expect(asaasBaseUrl("production")).toBe("https://api.asaas.com/v3");
  });

  it("link montado a partir do id (usado só se a resposta não trouxer o link)", () => {
    expect(checkoutLink(config, "abc")).toBe("https://sandbox.asaas.com/checkoutSession/show?id=abc");
    expect(checkoutLink({ ...config, environment: "production" }, "abc")).toBe(
      "https://asaas.com/checkoutSession/show?id=abc"
    );
  });
});

describe("buildCheckoutRequest", () => {
  it("POST em /checkouts com os cabeçalhos da documentação (inclui User-Agent)", () => {
    const { url, init } = buildCheckoutRequest(config, input);
    expect(url).toBe("https://api-sandbox.asaas.com/v3/checkouts");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      access_token: KEY,
      "User-Agent": "Aeromedico Brasil (loja online)",
    });
  });

  it("cartão parcelado: um item, valor em reais, máximo de parcelas, 30 minutos e retornos", () => {
    const body = JSON.parse(buildCheckoutRequest(config, input).init.body as string);
    expect(body).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["INSTALLMENT"],
      installment: { maxInstallmentCount: 6 },
      minutesToExpire: 30,
      externalReference: input.orderId,
      callback: {
        successUrl: `https://aeromedico.exemplo.com.br/pedido/${input.orderId}?t=tokenlongo123`,
        cancelUrl: "https://aeromedico.exemplo.com.br/carrinho",
        expiredUrl: "https://aeromedico.exemplo.com.br/carrinho",
      },
    });
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ name: "Pedido AB-000123", quantity: 1, value: 104.13 });
    expect(body.items[0].imageBase64.length).toBeGreaterThan(100);
  });

  it("Pix e cartão à vista: tipos certos e sem objeto de parcelas", () => {
    const pix = JSON.parse(buildCheckoutRequest(config, { ...input, method: "pix" }).init.body as string);
    expect(pix.billingTypes).toEqual(["PIX"]);
    expect(pix.chargeTypes).toEqual(["DETACHED"]);
    expect(pix).not.toHaveProperty("installment");

    const single = JSON.parse(
      buildCheckoutRequest(config, { ...input, method: "card_single" }).init.body as string
    );
    expect(single.billingTypes).toEqual(["CREDIT_CARD"]);
    expect(single.chargeTypes).toEqual(["DETACHED"]);
    expect(single).not.toHaveProperty("installment");
  });

  it("respeita os limites da API: nome até 30 e descrição até 150 caracteres", () => {
    const long = "x".repeat(400);
    const body = JSON.parse(
      buildCheckoutRequest(config, { ...input, orderNumber: 1234567, itemsSummary: long }).init.body as string
    );
    expect(body.items[0].name.length).toBeLessThanOrEqual(30);
    expect(body.items[0].description.length).toBeLessThanOrEqual(150);
    expect(body.items[0].description.endsWith("…")).toBe(true);
  });

  it("não envia customer nem customerData (o pagador preenche na página do Asaas)", () => {
    const body = JSON.parse(buildCheckoutRequest(config, input).init.body as string);
    expect(body).not.toHaveProperty("customer");
    expect(body).not.toHaveProperty("customerData");
  });
});

function fakeFetch(response: { status: number; body?: unknown } | Error) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      json: async () => response.body,
    } as Response;
  });
}

describe("createAsaasCheckout", () => {
  it("200 com id e link devolve o link da resposta", async () => {
    const fetchImpl = fakeFetch({ status: 200, body: { id: "chk_1", link: "https://sandbox.asaas.com/checkoutSession/show?id=chk_1" } });
    const result = await createAsaasCheckout(config, input, fetchImpl);
    expect(result).toEqual({ ok: true, id: "chk_1", url: "https://sandbox.asaas.com/checkoutSession/show?id=chk_1" });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeDefined();
  });

  it("200 sem link monta o link a partir do id", async () => {
    const result = await createAsaasCheckout(config, input, fakeFetch({ status: 200, body: { id: "chk_2" } }));
    expect(result).toEqual({ ok: true, id: "chk_2", url: "https://sandbox.asaas.com/checkoutSession/show?id=chk_2" });
  });

  it("400 e 422 são recusa (rejected)", async () => {
    for (const status of [400, 422]) {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await createAsaasCheckout(config, input, fakeFetch({ status, body: { errors: [{ code: "x", description: "y" }] } }));
      expect(result).toEqual({ ok: false, reason: "rejected" });
      expect(JSON.stringify(spy.mock.calls)).toContain(String(status));
    }
  });

  it.each([
    ["401 (chave inválida)", { status: 401, body: { errors: [{ code: "invalid_access_token" }] } }],
    ["403", { status: 403, body: {} }],
    ["500", { status: 500, body: "erro" }],
    ["rede fora do ar", new Error("fetch failed")],
    ["tempo esgotado", Object.assign(new Error("aborted"), { name: "AbortError" })],
    ["corpo sem id", { status: 200, body: {} }],
  ])("%s vira unavailable e a chave nunca vai para o log", async (_name, response) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createAsaasCheckout(config, input, fakeFetch(response));
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain(KEY);
  });
});
