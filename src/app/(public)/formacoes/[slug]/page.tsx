import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getRepositories } from "@/lib/repositories";
import type { ProgramFormat, ProgramStatus } from "@/lib/types";

const formatLabels: Record<ProgramFormat, string> = {
  presencial: "Presencial",
  online: "On-line",
  hibrido: "Híbrido",
};

const statusLabels: Record<ProgramStatus, string> = {
  disponivel: "Disponível",
  "proximas-turmas": "Próximas turmas",
  "em-breve": "Em breve",
};

export async function generateStaticParams() {
  const programs = await getRepositories().programs.list();
  return programs.map((program) => ({ slug: program.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getRepositories().programs.getBySlug(slug);
  if (!program) return {};

  return {
    title: program.title,
    description: program.shortDescription,
  };
}

export default async function FormacaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getRepositories().programs.getBySlug(slug);
  if (!program) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        {program.category}
      </p>
      <h1 className="mt-3 text-h1 font-heading font-bold text-navy-950">
        {program.title}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {program.durationHours && (
          <Badge variant="secondary">{program.durationHours}h</Badge>
        )}
        <Badge variant="secondary">{formatLabels[program.format]}</Badge>
        <Badge variant={program.status === "disponivel" ? "default" : "secondary"}>
          {statusLabels[program.status]}
        </Badge>
        {program.isDemoContent && (
          <Badge variant="outline">Conteúdo de exemplo</Badge>
        )}
      </div>

      <p className="mt-8 text-base leading-relaxed text-gray-600">
        {program.shortDescription}
      </p>

      <div className="mt-10 border-t border-gray-300 pt-8">
        {program.enrollUrl ? (
          <a
            href={program.enrollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Inscrever-se
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "pointer-events-none opacity-60"
            )}
          >
            Inscrições em breve
          </span>
        )}
      </div>
    </div>
  );
}
