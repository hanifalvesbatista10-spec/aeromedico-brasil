import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProgramCard } from "@/components/program-card";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";
import type { Program } from "@/lib/types";

export function FeaturedPrograms({ programs }: { programs: Program[] }) {
  const featured = programs.filter((program) => program.featured).slice(0, 3);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <Reveal className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-h2 font-heading font-bold text-navy-950">
            Formações em destaque
          </h2>
          <Link
            href="/formacoes"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Ver todas as formações
          </Link>
        </Reveal>

        {featured.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((program) => (
              <ProgramCard key={program.slug} program={program} />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="Nenhuma formação em destaque no momento"
              description="As formações aparecem aqui assim que forem publicadas e marcadas como destaque no painel administrativo."
              action={{ label: "Ver todas as formações", href: "/formacoes" }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
