import type { Metadata } from "next";
import { getRepositories } from "@/lib/repositories";
import { LeadForm } from "@/components/lead-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Palestras",
  description:
    "Contrate palestras, treinamentos e programas educacionais sobre transporte aeromédico e APH.",
};

export default async function PalestrasPage() {
  const topics = await getRepositories().speaking.list();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Palestras
      </p>
      <h1 className="mt-3 text-h1 font-heading font-bold text-navy-950">
        Palestras e treinamentos
      </h1>
      <p className="mt-4 text-base text-gray-600">
        Formatos de contratação para equipes, instituições e eventos do
        setor de saúde.
      </p>

      <ul className="mt-10 divide-y divide-gray-300 border-t border-gray-300">
        {topics.map((topic) => (
          <li key={topic.id} className="py-5">
            <h2 className="font-heading text-h4 font-semibold text-navy-950">
              {topic.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{topic.description}</p>
            {topic.themes.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                Temas: {topic.themes.join(" · ")}
              </p>
            )}
            {topic.hireUrl && (
              <a
                href={topic.hireUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
              >
                Saiba mais
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-16 border-t border-gray-300 pt-10">
        <h2 className="text-h3 font-heading font-bold text-navy-950">
          Solicitar proposta
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Conte o tipo de evento, o público esperado e o tema desejado — a
          equipe retorna com os detalhes de formato e disponibilidade.
        </p>
        <div className="mt-8">
          <LeadForm
            origin="palestra"
            interestLabel="Tipo de evento e tema desejado"
            interestPlaceholder="Ex.: treinamento para equipe de resgate, tema: fisiologia de voo"
          />
        </div>
      </div>
    </div>
  );
}
