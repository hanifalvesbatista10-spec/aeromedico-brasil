import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Program, ProgramFormat, ProgramStatus } from "@/lib/types";

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

export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="relative aspect-video bg-gray-100">
        {program.imageUrl ? (
          <Image
            src={program.imageUrl}
            alt={program.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-600">Imagem em breve</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-wide text-navy-700 uppercase">
          {program.category}
        </p>
        <h3 className="mt-2 font-heading text-h4 font-semibold text-navy-950">
          {program.title}
        </h3>
        <p className="mt-2 flex-1 text-sm text-gray-600">
          {program.shortDescription}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {program.durationHours && <Badge variant="secondary">{program.durationHours}h</Badge>}
          <Badge variant="secondary">{formatLabels[program.format]}</Badge>
          <Badge
            variant="secondary"
            className={
              program.status === "disponivel"
                ? "bg-brand-red-soft text-brand-red"
                : undefined
            }
          >
            {statusLabels[program.status]}
          </Badge>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/formacoes/${program.slug}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 hover:border-brand-red/60 hover:text-brand-red"
            )}
          >
            Ver formação
          </Link>
          {program.enrollUrl && (
            <a
              href={program.enrollUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "brand" }), "flex-1")}
            >
              Inscrever-se
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
