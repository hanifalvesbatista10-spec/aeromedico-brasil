import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export function FinalCTA() {
  return (
    <section className="border-t-2 border-brand-red bg-navy-950">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24 lg:px-8">
        <Reveal>
          <h2 className="text-h1 font-heading font-bold text-white">
            Eleve sua preparação para atuar onde conhecimento, precisão e
            decisão salvam vidas.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/formacoes"
              className={cn(buttonVariants({ variant: "brand", size: "lg" }))}
            >
              Conheça as formações
            </Link>
            <Link
              href="/contato"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/40 bg-white/5 text-white hover:border-brand-red/70 hover:bg-white/15 hover:text-white"
              )}
            >
              Fale com a equipe
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
