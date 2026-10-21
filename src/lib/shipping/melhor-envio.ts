import type {
  ShippingItem,
  ShippingOption,
  ShippingProvider,
  ShippingQuoteResult,
} from "./types";

// Cliente do Melhor Envio ("Cálculo de fretes por produtos",
// docs.melhorenvio.com.br): POST /api/v2/me/shipment/calculate. Dimensões em
// cm, peso em kg, valor declarado em reais por unidade. O token nunca sai do
// servidor e nunca vai para log.

export interface MelhorEnvioConfig {
  token: string;
  environment: "sandbox" | "production";
  /** CEP de origem, 8 dígitos. */
  originCep: string;
  /** Contato técnico: o `User-Agent` é obrigatório na API. */
  contactEmail: string;
}

const TIMEOUT_MS = 8000;

export function melhorEnvioBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "production"
    ? "https://melhorenvio.com.br"
    : "https://sandbox.melhorenvio.com.br";
}

export function buildMelhorEnvioRequest(
  config: MelhorEnvioConfig,
  input: { destinationCep: string; items: ShippingItem[] }
): { url: string; init: RequestInit } {
  const body = {
    from: { postal_code: config.originCep },
    to: { postal_code: input.destinationCep },
    products: input.items.map((item) => ({
      id: item.id,
      width: item.widthCm,
      height: item.heightCm,
      length: item.lengthCm,
      weight: item.weightGrams / 1000,
      insurance_value: item.unitPriceCents / 100,
      quantity: item.quantity,
    })),
    options: { receipt: false, own_hand: false },
  };

  return {
    url: `${melhorEnvioBaseUrl(config.environment)}/api/v2/me/shipment/calculate`,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        "User-Agent": `Aeromedico Brasil (${config.contactEmail})`,
      },
      body: JSON.stringify(body),
    },
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function toDays(value: unknown): number | null {
  const days = toNumber(value);
  return Number.isInteger(days) && days >= 0 ? days : null;
}

/**
 * Converte a resposta em opções. Serviço com `error`, sem preço ou com preço
 * inválido é descartado sem afetar os demais; `custom_price` e
 * `custom_delivery_time` (que refletem as regras da conta) têm prioridade.
 */
export function parseMelhorEnvioResponse(body: unknown): ShippingOption[] {
  if (!Array.isArray(body)) return [];

  const options: ShippingOption[] = [];
  for (const entry of body) {
    if (typeof entry !== "object" || entry === null) continue;
    const service = entry as Record<string, unknown>;
    if (service.error) continue;
    if (service.id === undefined || service.id === null) continue;
    if (typeof service.name !== "string") continue;

    const price = toNumber(service.custom_price ?? service.price);
    if (!Number.isFinite(price) || price < 0) continue;

    const company = service.company as { name?: unknown } | undefined;
    options.push({
      id: String(service.id),
      name: service.name,
      company: typeof company?.name === "string" ? company.name : "",
      priceCents: Math.round(price * 100),
      deliveryDays: toDays(service.custom_delivery_time ?? service.delivery_time),
    });
  }

  return options.sort(
    (a, b) =>
      a.priceCents - b.priceCents ||
      (a.deliveryDays ?? Number.MAX_SAFE_INTEGER) - (b.deliveryDays ?? Number.MAX_SAFE_INTEGER)
  );
}

export function createMelhorEnvioProvider(
  config: MelhorEnvioConfig,
  fetchImpl: typeof fetch = globalThis.fetch
): ShippingProvider {
  const unavailable: ShippingQuoteResult = { ok: false, reason: "unavailable" };

  return {
    async quote(input) {
      const { url, init } = buildMelhorEnvioRequest(config, input);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetchImpl(url, { ...init, signal: controller.signal });
        if (response.status === 422) return { ok: false, reason: "invalid-cep" };
        if (!response.ok) {
          console.error("[frete] Melhor Envio respondeu com status", response.status);
          return unavailable;
        }
        const options = parseMelhorEnvioResponse(await response.json());
        if (options.length === 0) {
          console.error("[frete] Melhor Envio não devolveu nenhuma opção válida");
          return unavailable;
        }
        return { ok: true, options };
      } catch (error) {
        // Só o tipo do erro: nada que possa carregar cabeçalhos ou token.
        console.error(
          "[frete] falha ao consultar o Melhor Envio:",
          error instanceof Error ? error.name : "erro desconhecido"
        );
        return unavailable;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
