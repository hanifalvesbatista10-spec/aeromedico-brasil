import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";
import type { SpeakingTopic } from "@/lib/types";

export function SpeakingSection({ topics }: { topics: SpeakingTopic[] }) {
  return (
    <section className="border-b border-border bg-brand-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-16">
          <Reveal>
            <h2 className="text-h2 font-heading font-bold text-navy-950">
              Palestras e treinamentos
            </h2>
            <p className="mt-4 text-sm text-gray-600">
              Formatos de contratação para equipes, instituições e eventos do
              setor de saúde.
            </p>
            <Link
              href="/palestras"
              className={cn(buttonVariants({ variant: "brand" }), "mt-6")}
            >
              Solicitar proposta
            </Link>
          </Reveal>

          <ul className="mt-10 divide-y divide-gray-300 border-t border-gray-300 lg:col-span-2 lg:mt-0">
            {topics.map((topic) => (
              <li key={topic.id} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-8">
                <h3 className="font-heading text-h4 font-semibold text-navy-950 sm:w-56 sm:shrink-0">
                  {topic.title}
                </h3>
                <p className="text-sm text-gray-600">{topic.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
