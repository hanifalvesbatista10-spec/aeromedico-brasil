import { Reveal } from "@/components/reveal";

const pillars = [
  {
    title: "Educação profissional",
    description:
      "Formações estruturadas para quem atua ou quer atuar em saúde e emergência.",
  },
  {
    title: "Transporte aeromédico",
    description:
      "Conhecimento aplicado ao ambiente, à equipe e aos riscos do transporte por via aérea.",
  },
  {
    title: "Atendimento pré-hospitalar",
    description:
      "Raciocínio clínico e organização da equipe no atendimento de urgência e emergência.",
  },
  {
    title: "Divulgação científica",
    description:
      "Conteúdo baseado em evidência, traduzido para a prática do dia a dia.",
  },
  {
    title: "Cursos e mentorias",
    description:
      "Programas para profissionais que querem aprofundar ou iniciar a carreira na área.",
  },
  {
    title: "Palestras e treinamentos",
    description:
      "Formatos sob medida para equipes, instituições e eventos do setor de saúde.",
  },
];

export function ExpertisePillars() {
  return (
    <section className="border-b border-border bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <Reveal>
          <h2 className="max-w-2xl text-h2 font-heading font-bold text-navy-950">
            Áreas de atuação
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <Reveal
              key={pillar.title}
              delay={index * 0.05}
              className="border-l border-gray-300 pl-5"
            >
              <span className="font-heading text-sm text-gray-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-h4 font-heading font-semibold text-navy-950">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {pillar.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
