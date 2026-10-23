import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { OrderSummary } from "@/components/store/order-summary";
import { EmptyState } from "@/components/empty-state";
import type { PublicOrder } from "@/lib/types";

export const metadata: Metadata = {
  title: "Seu pedido",
  robots: { index: false, follow: false },
  // A URL leva a chave do pedido: nada dela sai no cabeçalho Referer.
  referrer: "no-referrer",
};

/**
 * Página do pedido: só abre com a chave aleatória (`?t=`) que o comprador
 * recebe ao pagar. Chave errada e pedido inexistente dão a mesma resposta (404).
 */
export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  let order: PublicOrder | null;
  try {
    order = await getRepositories().orders.getPublic(id, token);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[pedido] falha ao carregar o pedido", error instanceof Error ? error.name : "erro");
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-24">
        <EmptyState
          title="Não foi possível carregar o pedido agora."
          description="Recarregue a página em alguns instantes."
        />
      </div>
    );
  }
  if (!order) notFound();

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <OrderSummary order={order} refreshHref={`/pedido/${id}?t=${encodeURIComponent(token)}`} />
    </div>
  );
}
