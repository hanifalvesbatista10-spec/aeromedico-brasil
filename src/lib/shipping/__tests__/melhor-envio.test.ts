import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildMelhorEnvioRequest,
  createMelhorEnvioProvider,
  melhorEnvioBaseUrl,
  parseMelhorEnvioResponse,
  type MelhorEnvioConfig,
} from "../melhor-envio";
import type { ShippingItem } from "../types";

const TOKEN = "token-super-secreto-123";

const config: MelhorEnvioConfig = {
  token: TOKEN,
  environment: "sandbox",
  originCep: "96020360",
  contactEmail: "contato@exemplo.com.br",
};

const items: ShippingItem[] = [
  {
    id: "camiseta:m-preta",
    name: "Camiseta Aeromédico",
    widthCm: 25,
    heightCm: 3,
    lengthCm: 30,
    weightGrams: 200,
    unitPriceCents: 4990,
    quantity: 2,
  },
  {
    id: "bone:-",
    name: "Boné",
    widthCm: 18,
    heightCm: 10,
    lengthCm: 20,
    weightGrams: 350,
    unitPriceCents: 2000,
    quantity: 1,
  },
];

const input = { destinationCep: "01018020", items };

afterEach(() => vi.restoreAllMocks());

describe("buildMelhorEnvioRequest", () => {
  it("usa o endereço de sandbox ou de produção", () => {
    expect(melhorEnvioBaseUrl("sandbox")).toBe("https://sandbox.melhorenvio.com.br");
    expect(melhorEnvioBaseUrl("production")).toBe("https://melhorenvio.com.br");
    expect(buildMelhorEnvioRequest(config, input).url).toBe(
      "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
    );
    expect(
      buildMelhorEnvioRequest({ ...config, environment: "production" }, input).url
    ).toBe("https://melhorenvio.com.br/api/v2/me/shipment/calculate");
  });

  it("POST com os cabeçalhos exigidos, inclusive o User-Agent", () => {
    const { init } = buildMelhorEnvioRequest(config, input);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "Aeromedico Brasil (contato@exemplo.com.br)",
    });
  });

  it("corpo: CEPs só com dígitos, produtos em cm/kg/reais e sem 'services'", () => {
    const { init } = buildMelhorEnvioRequest(config, input);
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      from: { postal_code: "96020360" },
      to: { postal_code: "01018020" },
      products: [
        {
          id: "camiseta:m-preta",
          width: 25,
          height: 3,
          length: 30,
          weight: 0.2,
          insurance_value: 49.9,
          quantity: 2,
        },
        {
          id: "bone:-",
          width: 18,
          height: 10,
          length: 20,
          weight: 0.35,
          insurance_value: 20,
          quantity: 1,
        },
      ],
      options: { receipt: false, own_hand: false },
    });
    expect(body).not.toHaveProperty("services");
  });
});

describe("parseMelhorEnvioResponse", () => {
  it("usa custom_price e custom_delivery_time, ignora serviço com erro e ordena por preço", () => {
    const options = parseMelhorEnvioResponse([
      { id: 3, name: ".Package", price: "50.00", delivery_time: 5, company: { name: "Jadlog" } },
      { id: 1, name: "PAC", price: "30.00", custom_price: "23.45", delivery_time: 8, custom_delivery_time: 6, company: { name: "Correios" } },
      { id: 2, name: "SEDEX", error: "Serviço indisponível", company: { name: "Correios" } },
    ]);
    expect(options).toEqual([
      { id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 },
      { id: "3", name: ".Package", company: "Jadlog", priceCents: 5000, deliveryDays: 5 },
    ]);
  });

  it("serviço com erro é descartado mesmo quando traz um preço válido", () => {
    const options = parseMelhorEnvioResponse([
      { id: 5, name: "Não atende o CEP", price: "10.00", error: "Serviço indisponível para este CEP" },
      { id: 6, name: "PAC", price: "20.00", company: { name: "Correios" } },
    ]);
    expect(options.map((o) => o.id)).toEqual(["6"]);
  });

  it("aceita preço em número e prazo ausente", () => {
    expect(parseMelhorEnvioResponse([{ id: 9, name: "X", price: 12.9 }])).toEqual([
      { id: "9", name: "X", company: "", priceCents: 1290, deliveryDays: null },
    ]);
  });

  it("descarta preço ausente, negativo ou inválido", () => {
    expect(
      parseMelhorEnvioResponse([
        { id: 1, name: "A" },
        { id: 2, name: "B", price: "-5.00" },
        { id: 3, name: "C", price: "abc" },
        { id: 4, name: "D", price: null },
      ])
    ).toEqual([]);
  });

  it("empate de preço: o de menor prazo vem primeiro", () => {
    const options = parseMelhorEnvioResponse([
      { id: 1, name: "Lento", price: 10, delivery_time: 9 },
      { id: 2, name: "Rápido", price: 10, delivery_time: 3 },
    ]);
    expect(options.map((o) => o.name)).toEqual(["Rápido", "Lento"]);
  });

  it("corpo que não é lista vira lista vazia", () => {
    for (const body of [{}, null, "x", 42, { message: "erro" }]) {
      expect(parseMelhorEnvioResponse(body)).toEqual([]);
    }
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

const goodBody = [{ id: 1, name: "PAC", price: "23.45", delivery_time: 6, company: { name: "Correios" } }];

describe("createMelhorEnvioProvider", () => {
  it("200 com opções válidas", async () => {
    const fetchImpl = fakeFetch({ status: 200, body: goodBody });
    const result = await createMelhorEnvioProvider(config, fetchImpl).quote(input);
    expect(result).toEqual({
      ok: true,
      options: [{ id: "1", name: "PAC", company: "Correios", priceCents: 2345, deliveryDays: 6 }],
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v2/me/shipment/calculate");
    expect(init.signal).toBeDefined();
  });

  it("422 (CEP recusado) vira invalid-cep e é registrado, porque 422 também vale para pedido mal formado", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createMelhorEnvioProvider(
      config,
      fakeFetch({ status: 422, body: { message: "CEP inválido" } })
    ).quote(input);
    expect(result).toEqual({ ok: false, reason: "invalid-cep" });
    expect(JSON.stringify(spy.mock.calls)).toContain("422");
    expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
  });

  it.each([
    ["401", { status: 401, body: { message: "Unauthenticated" } }],
    ["403", { status: 403, body: {} }],
    ["500", { status: 500, body: "erro" }],
    ["rede fora do ar", new Error("fetch failed")],
    ["tempo esgotado", Object.assign(new Error("aborted"), { name: "AbortError" })],
    ["corpo fora do formato", { status: 200, body: {} }],
    ["só serviços inválidos", { status: 200, body: [{ id: 1, name: "A", error: "x" }] }],
    ["lista vazia", { status: 200, body: [] }],
  ])("%s vira unavailable e o token nunca vai para o log", async (_name, response) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createMelhorEnvioProvider(config, fakeFetch(response)).quote(input);
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain(TOKEN);
  });
});
