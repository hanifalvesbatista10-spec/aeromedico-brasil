import type { FAQItem } from "@/lib/types";

// Conteúdo de exemplo — usado só pelos testes do repositório mock. Em
// produção, os mesmos itens vivem no Supabase (ver
// supabase/migrations/20260905120300_cms_seed.sql) e são editados pelo
// painel administrativo.
export const faqItems: FAQItem[] = [
  {
    id: "para-quem-sao-as-formacoes",
    question: "Para quem são as formações?",
    answer:
      "As formações são voltadas a profissionais e estudantes da saúde — enfermeiros, técnicos, médicos, socorristas, bombeiros e integrantes do SAMU — interessados em transporte aeromédico e atendimento pré-hospitalar. Cada formação indica o público recomendado em sua página.",
    published: true,
    sortOrder: 0,
  },
  {
    id: "como-funcionam-as-inscricoes",
    question: "Como funcionam as inscrições?",
    answer:
      "Cada formação tem sua própria página com um botão de inscrição. Quando a inscrição ainda não está aberta, a página indica isso claramente em vez de um link de pagamento.",
    published: true,
    sortOrder: 1,
  },
  {
    id: "disponibilidade-de-cursos-online",
    question: "Os cursos estão disponíveis on-line?",
    answer:
      "Sim, várias formações são oferecidas no formato on-line. O formato de cada uma — presencial, on-line ou híbrido — está indicado na página específica.",
    published: true,
    sortOrder: 2,
  },
  {
    id: "contratacao-de-palestras",
    question: "Como contratar uma palestra?",
    answer:
      "Use o formulário de solicitação de proposta na página de Palestras, informando o tipo de evento e o público esperado. A equipe retorna com os detalhes de formato e disponibilidade.",
    published: true,
    sortOrder: 3,
  },
  {
    id: "certificacao",
    question: "As formações emitem certificado?",
    answer:
      "A carga horária e as condições de certificação de cada formação estão descritas em sua própria página, já que variam conforme o programa.",
    published: true,
    sortOrder: 4,
  },
  {
    id: "formas-de-contato",
    question: "Como posso entrar em contato?",
    answer:
      "Pelo formulário de contato do site ou pelos canais informados no rodapé, incluindo WhatsApp e Instagram.",
    published: true,
    sortOrder: 5,
  },
];
