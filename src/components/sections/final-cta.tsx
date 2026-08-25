import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

export function FinalCTA() {
  return (
    <section className="bg-navy-950">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24 lg:px-8">
        <Reveal>
          <h2 className="text-h1 font-heading font-bold text-white">
            Eleve sua preparação para atuar onde conhecimento, precisão e
            decisão salvam vidas.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/formacoes"
              className={cn(buttonVariants({ size: "lg" }), "bg-white text-navy-950 hover:bg-white/90")}
            >
              Conheça as formações
            </Link>
            <Link
              href="/contato"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/40 text-white hover:bg-white/10"
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
