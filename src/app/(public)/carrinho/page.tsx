import type { Metadata } from "next";
import { getRepositories } from "@/lib/repositories";
import { CartView } from "@/components/store/cart-view";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
};

export default async function CarrinhoPage() {
  const settings = await getRepositories().settings.get();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <h1 className="text-h1 font-heading font-bold text-navy-950">Seu carrinho</h1>
      <div className="mt-8">
        <CartView whatsappUrl={settings.whatsappUrl} />
      </div>
    </div>
  );
}
