import type { SpeakingTopic } from "@/lib/types";

export const speakingTopics: SpeakingTopic[] = [
  {
    id: "palestra",
    kind: "palestra",
    title: "Palestras",
    description:
      "Apresentações sobre transporte aeromédico, APH e educação em saúde, adaptadas ao público e à duração do evento.",
  },
  {
    id: "treinamento",
    kind: "treinamento",
    title: "Treinamentos para equipes",
    description:
      "Programas práticos para equipes de saúde e resgate que atuam ou querem atuar em transporte aeromédico.",
  },
  {
    id: "evento",
    kind: "evento",
    title: "Participação em eventos",
    description:
      "Participação como palestrante convidado em congressos, encontros e eventos do setor de saúde e emergência.",
  },
  {
    id: "aula",
    kind: "aula",
    title: "Aulas e programas educacionais",
    description:
      "Aulas avulsas ou módulos dentro de programas de graduação, pós-graduação e educação continuada.",
  },
  {
    id: "mentoria",
    kind: "mentoria",
    title: "Consultoria e mentoria",
    description:
      "Acompanhamento para profissionais e instituições que querem estruturar ou revisar processos de transporte aeromédico.",
  },
];
