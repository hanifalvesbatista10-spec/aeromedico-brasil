import type { PaymentMethod } from "./terms";
import { CHECKOUT_ITEM_IMAGE_BASE64 } from "./checkout-image";

// Cliente do Asaas Checkout (docs.asaas.com: "Asaas Checkout", POST /v3/checkouts).
// A chave de API só existe no servidor e nunca vai para log. O pagamento é
// confirmado EXCLUSIVAMENTE pelo webhook; o retorno do navegador não prova nada.

export interface AsaasConfig {
  apiKey: string;
  environment: "sandbox" | "production";
  /** Valor que o Asaas manda no cabeçalho `asaas-access-token` do webhook. */
  webhookToken: string;
}

const TIMEOUT_MS = 10000;
const MIN_WEBHOOK_TOKEN_LENGTH = 32;
const USER_AGENT = "Aeromedico Brasil (loja online)";

export function readAsaasConfig(env: Record<string, string | undefined>): AsaasConfig | null {
  const apiKey = env.ASAAS_API_KEY?.trim();
  const webhookToken = env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!apiKey || !webhookToken || webhookToken.length < MIN_WEBHOOK_TOKEN_LENGTH) return null;
  return {
    apiKey,
    environment: env.ASAAS_ENV === "production" ? "production" : "sandbox",
    webhookToken,
  };
}

/** Configuração lida do ambiente do servidor, ou `null` se faltar algo. */
export function getAsaasConfig(): AsaasConfig | null {
  return readAsaasConfig(process.env);
}

export function asaasBaseUrl(environment: AsaasConfig["environment"]): string {
  return environment === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

/** Link da página de pagamento; só é usado se a resposta do Asaas não trouxer o `link`. */
export function checkoutLink(config: AsaasConfig, checkoutId: string): string {
  const host = config.environment === "production" ? "asaas.com" : "sandbox.asaas.com";
  return `https://${host}/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
}

export interface CheckoutInput {
  orderId: string;
  orderNumber: number;
  /** Total já com a taxa do meio de pagamento. */
  totalCents: number;
  method: PaymentMethod;
  maxInstallments: number;
  itemsSummary: string;
  siteUrl: string;
  accessToken: string;
}

// Limites da API: nome do item até 30 e descrição até 150 caracteres.
const NAME_MAX = 30;
const DESCRIPTION_MAX = 150;

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function buildCheckoutRequest(
  config: AsaasConfig,
  input: CheckoutInput
): { url: string; init: RequestInit } {
  const site = input.siteUrl.replace(/\/+$/, "");
  const orderLabel = `AB-${String(input.orderNumber).padStart(6, "0")}`;

  const body: Record<string, unknown> = {
    billingTypes: input.method === "pix" ? ["PIX"] : ["CREDIT_CARD"],
    chargeTypes: input.method === "card_installments" ? ["INSTALLMENT"] : ["DETACHED"],
    minutesToExpire: 30,
    externalReference: input.orderId,
    callback: {
      successUrl: `${site}/pedido/${input.orderId}?t=${input.accessToken}`,
      cancelUrl: `${site}/carrinho`,
      expiredUrl: `${site}/carrinho`,
    },
    // Um item só, com o total já somado: evita arredondar desconto, frete e
    // taxa linha a linha.
    items: [
      {
        name: cut(`Pedido ${orderLabel}`, NAME_MAX),
        description: cut(input.itemsSummary, DESCRIPTION_MAX),
        quantity: 1,
        value: Number((input.totalCents / 100).toFixed(2)),
        imageBase64: CHECKOUT_ITEM_IMAGE_BASE64,
      },
    ],
  };
  if (input.method === "card_installments") {
    body.installment = { maxInstallmentCount: input.maxInstallments };
  }

  return {
    url: `${asaasBaseUrl(config.environment)}/checkouts`,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        access_token: config.apiKey,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(body),
    },
  };
}

export type CreateCheckoutResult =
  | { ok: true; id: string; url: string }
  | { ok: false; reason: "unavailable" | "rejected" };

export async function createAsaasCheckout(
  config: AsaasConfig,
  input: CheckoutInput,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<CreateCheckoutResult> {
  const { url, init } = buildCheckoutRequest(config, input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    if (response.status === 400 || response.status === 422) {
      console.error("[pagamento] Asaas recusou o checkout (status", response.status, ")");
      return { ok: false, reason: "rejected" };
    }
    if (!response.ok) {
      // 401/403 = chave errada ou sem permissão; 5xx = Asaas fora do ar.
      console.error("[pagamento] Asaas respondeu com status", response.status);
      return { ok: false, reason: "unavailable" };
    }
    const data = (await response.json()) as { id?: unknown; link?: unknown } | null;
    if (!data || typeof data.id !== "string" || data.id === "") {
      console.error("[pagamento] resposta do Asaas sem id de checkout");
      return { ok: false, reason: "unavailable" };
    }
    const link = typeof data.link === "string" && data.link !== "" ? data.link : checkoutLink(config, data.id);
    return { ok: true, id: data.id, url: link };
  } catch (error) {
    // Só o tipo do erro: nada que possa carregar cabeçalhos ou a chave.
    console.error(
      "[pagamento] falha ao consultar o Asaas:",
      error instanceof Error ? error.name : "erro desconhecido"
    );
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
