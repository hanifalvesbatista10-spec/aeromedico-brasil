import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { isCheckoutEnabled } from "@/lib/payments/enabled";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default function CarrinhoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <h1 className="text-h1 font-heading font-bold text-navy-950">Seu carrinho</h1>
      <div className="mt-8">
        <CartView checkoutEnabled={isCheckoutEnabled()} />
      </div>
    </div>
  );
}
