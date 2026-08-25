import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Checkout em configuração" };
export default function CheckoutUnavailable() {
  return <main className="grid min-h-screen place-items-center bg-[#04101d] px-5 text-white"><div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><Settings className="mx-auto size-9 text-[#38c5ea]" /><h1 className="mt-6 text-3xl font-black">Checkout em configuração</h1><p className="mt-4 text-sm leading-7 text-slate-300">O produto já está cadastrado na vitrine. O administrador precisa informar o link de checkout ou as credenciais do gateway antes da venda.</p><Link href="/#cursos" className={cn(buttonVariants({ variant: "secondary" }), "mt-7")}><ArrowLeft className="size-4" /> Voltar aos cursos</Link></div></main>;
}
