import type { Course, Material } from "@/types";

export const services = [
  { number: "01", title: "Formação aeromédica", description: "Trilhas construídas para conectar fundamentos clínicos, segurança de voo e tomada de decisão.", icon: "plane" },
  { number: "02", title: "APH e emergência", description: "Conteúdo aplicável ao atendimento pré-hospitalar, com raciocínio crítico e foco operacional.", icon: "activity" },
  { number: "03", title: "Carreira e mercado", description: "Orientação para profissionais que desejam compreender requisitos, rotas e oportunidades na área.", icon: "route" },
  { number: "04", title: "Aulas e eventos", description: "Palestras, encontros e experiências educacionais para equipes e instituições de saúde.", icon: "mic" },
];
export const materials: Material[] = [
  { id: "checklist-embarque-seguro", title: "Checklist do embarque seguro", description: "Um roteiro objetivo para revisar paciente, equipe, equipamentos e riscos antes do voo.", format: "Checklist", pages: 8 },
  { id: "guia-carreira-aeromedica", title: "Guia de carreira aeromédica", description: "Entenda competências, etapas de preparação e caminhos possíveis para ingressar no setor.", format: "E-book", pages: 22 },
  { id: "estabilizacao-pre-voo", title: "Estabilização pré-voo", description: "Pontos críticos para antecipar intercorrências e organizar o transporte com segurança.", format: "PDF", pages: 14 },
];
export const courses: Course[] = [
  { id: "fundamentos-aeromedicos", title: "Fundamentos do transporte aeromédico", description: "Uma visão estruturada do ambiente, da equipe, dos riscos e da assistência durante o transporte.", price: 297, duration: "10 horas", format: "Online e gravado", badge: "Formação essencial" },
  { id: "preparacao-carreira", title: "Preparação para a carreira aeromédica", description: "Do posicionamento profissional às competências que diferenciam candidatos preparados.", price: 497, duration: "16 horas", format: "Online + encontros", badge: "Mais procurado", featured: true },
  { id: "aph-alta-performance", title: "APH de alta performance", description: "Raciocínio clínico, comunicação e tomada de decisão em cenários de maior complexidade.", price: 397, duration: "12 horas", format: "Online e gravado", badge: "Prática aplicada" },
];
export const faqs = [
  { question: "Para quem são os conteúdos da Aeromédico Brasil?", answer: "Para médicos, enfermeiros, fisioterapeutas, técnicos e demais profissionais ou estudantes interessados em transporte aeromédico, APH e emergência." },
  { question: "Preciso já trabalhar no aeromédico para começar?", answer: "Não. Os materiais podem apoiar tanto quem está conhecendo o setor quanto profissionais que desejam organizar e aprofundar sua preparação." },
  { question: "Como recebo um material gratuito?", answer: "Escolha o material, informe seu nome e e-mail e confirme o envio. O sistema registra o lead e libera o acesso configurado pelo administrador." },
  { question: "Os cursos oferecem certificado?", answer: "Cada curso possui regras próprias. A carga horária, o formato e as condições de certificação ficam detalhados na página e no checkout de cada produto." },
  { question: "Posso solicitar uma palestra para minha instituição?", answer: "Sim. Use o canal de contato no rodapé para informar o perfil da instituição, a cidade, o público estimado e o tema desejado." },
];
