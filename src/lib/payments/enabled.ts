import { usableOrdersSecret } from "@/lib/orders/secret";
import { getShippingProvider } from "@/lib/shipping/config";
import { getAsaasConfig } from "./asaas";

/**
 * O pagamento pelo site só aparece quando TUDO está configurado: Asaas, frete,
 * segredo das funções de pedido e endereço do site (retorno do checkout).
 * Caso contrário o carrinho continua oferecendo só o WhatsApp.
 */
export function isCheckoutEnabled(): boolean {
  return (
    getAsaasConfig() !== null &&
    getShippingProvider() !== null &&
    usableOrdersSecret(process.env.ORDERS_RPC_SECRET) !== null &&
    Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim())
  );
}
