import type { SiteSettings } from "@/lib/types";
import { profile } from "./profile";

// Dados de contato ainda não confirmados pelo administrador — placeholders
// explícitos, substituir antes de publicar (ver README, seção "Pendências").
export const siteSettings: SiteSettings = {
  siteName: "Aeromédico Brasil",
  siteDescription:
    "Educação, ciência e experiência aplicadas à formação de profissionais que atuam na urgência, emergência e aviação médica.",
  profile,
  stats: [
    {
      id: "followers",
      label: "Comunidade no Instagram",
      value: "+120 mil seguidores",
    },
    {
      id: "focus",
      label: "Área de atuação",
      value: "Transporte aeromédico e APH",
    },
    {
      id: "content",
      label: "Conteúdo",
      value: "Ciência aplicada à prática",
    },
  ],
  whatsappUrl: "https://wa.me/",
  email: "contato@aeromedicobrasil.com.br",
  instagramUrl: "https://www.instagram.com/aeromedico.brasil/",
  primaryCta: { label: "Conheça as formações", href: "/formacoes" },
  secondaryCta: { label: "Fale com a equipe", href: "/contato" },
  footerNote:
    "Os conteúdos educacionais deste site não substituem protocolos institucionais, regulamentações vigentes ou treinamento prático supervisionado.",
  logoUrl: "/brand/logo.jpg",
  seoTitle: null,
  seoDescription: null,
};
