import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { isCheckoutEnabled } from "@/lib/payments/enabled";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default function CarrinhoPage() {
  return (
    // Fundo azulado para os cartões brancos aparecerem; `pb-32` deixa o fim da página livre
    // da barra fixa "Total + Finalizar pedido" que o celular mostra embaixo.
    <div className="bg-[#f3f5f9]">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
        <h1 className="mb-6 text-h1 font-heading font-bold text-navy-950">Seu carrinho</h1>
        <CartView checkoutEnabled={isCheckoutEnabled()} />
      </div>
    </div>
  );
}
