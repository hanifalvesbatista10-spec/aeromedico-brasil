import { normalizeCep } from "./cep";
import { createMelhorEnvioProvider, type MelhorEnvioConfig } from "./melhor-envio";
import type { ShippingProvider } from "./types";

// Variáveis de ambiente do servidor (sem NEXT_PUBLIC): MELHOR_ENVIO_TOKEN,
// MELHOR_ENVIO_ENV ("production"; qualquer outro valor ou ausente = sandbox),
// STORE_ORIGIN_CEP e MELHOR_ENVIO_CONTACT_EMAIL. Faltou algo: não há frete
// automático (nada é inventado).

export function readShippingConfig(
  env: Record<string, string | undefined>
): MelhorEnvioConfig | null {
  const token = env.MELHOR_ENVIO_TOKEN?.trim();
  const originCep = normalizeCep(env.STORE_ORIGIN_CEP ?? "");
  const contactEmail = env.MELHOR_ENVIO_CONTACT_EMAIL?.trim();

  if (!token || !originCep || !contactEmail || !contactEmail.includes("@")) return null;

  return {
    token,
    environment: env.MELHOR_ENVIO_ENV === "production" ? "production" : "sandbox",
    originCep,
    contactEmail,
  };
}

/** Provedor de frete configurado, ou `null` quando as variáveis não foram definidas. */
export function getShippingProvider(): ShippingProvider | null {
  const config = readShippingConfig(process.env);
  return config ? createMelhorEnvioProvider(config) : null;
}
