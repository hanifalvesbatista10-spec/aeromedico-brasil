import type { Metadata } from "next";
import { getRepositories } from "@/lib/repositories";
import { ProgramCard } from "@/components/program-card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Formações",
  description:
    "Cursos, mentorias e treinamentos em transporte aeromédico e atendimento pré-hospitalar.",
};

export default async function FormacoesPage() {
  const programs = await getRepositories().programs.list();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Formações
      </p>
      <h1 className="mt-3 max-w-2xl text-h1 font-heading font-bold text-navy-950">
        Cursos, mentorias e treinamentos para a carreira aeromédica
      </h1>

      {programs.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.slug} program={program} />
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="Nenhuma formação publicada no momento"
            description="Novas formações aparecem aqui assim que forem publicadas no painel administrativo."
          />
        </div>
      )}
    </div>
  );
}
