/**
 * `ORDERS_RPC_SECRET` é a única proteção do "marcar como pago" e das gravações
 * de pedido: quem o adivinha chama as funções SQL direto pela API pública do
 * Supabase. Por isso exige um valor longo (use 64 caracteres aleatórios).
 */
export const MIN_ORDERS_SECRET_LENGTH = 32;

/** O segredo sem espaços nas pontas, ou `null` se estiver ausente ou curto demais. */
export function usableOrdersSecret(value: string | undefined): string | null {
  const secret = value?.trim() ?? "";
  return secret.length >= MIN_ORDERS_SECRET_LENGTH ? secret : null;
}
