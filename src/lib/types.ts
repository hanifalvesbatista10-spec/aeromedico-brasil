export interface Profile {
  name: string;
  role: string;
  credentials: string[];
  shortBio: string;
  longBio: string;
  resumeSummary: string | null;
  photoUrl: string | null;
  instagramHandle: string;
}

export interface SocialProofStat {
  id: string;
  label: string;
  value: string;
}

export interface CTAConfig {
  label: string;
  href: string;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  profile: Profile;
  stats: SocialProofStat[];
  whatsappUrl: string;
  email: string;
  instagramUrl: string;
  primaryCta: CTAConfig;
  secondaryCta: CTAConfig;
  footerNote: string;
  logoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type ProgramType = "curso" | "mentoria" | "treinamento" | "produto";
export type ProgramFormat = "presencial" | "online" | "hibrido";
export type ProgramStatus = "disponivel" | "proximas-turmas" | "em-breve";

export interface Program {
  slug: string;
  type: ProgramType;
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string | null;
  imageUrl: string | null;
  durationHours: number | null;
  format: ProgramFormat;
  status: ProgramStatus;
  enrollUrl: string | null;
  ctaLabel: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  isDemoContent: boolean;
}

export type ContentKind = "artigo" | "video" | "link-externo";

export interface ContentPost {
  slug: string;
  kind: ContentKind;
  title: string;
  category: string;
  summary: string;
  body: string | null;
  coverUrl: string | null;
  author: string;
  publishedAt: string;
  externalUrl: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  isDemoContent: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  profession: string;
  photoUrl: string | null;
  programOrEvent: string;
  quote: string;
  authorizedForDisplay: boolean;
  published: boolean;
  sortOrder: number;
}

export type SpeakingKind =
  | "palestra"
  | "treinamento"
  | "evento"
  | "aula"
  | "mentoria";

export interface SpeakingTopic {
  id: string;
  kind: SpeakingKind;
  title: string;
  description: string;
  themes: string[];
  hireUrl: string | null;
  published: boolean;
  sortOrder: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  sortOrder: number;
}

export type LeadOrigin = "contato" | "formacao" | "palestra";
export type LeadStatus = "novo" | "em-contato" | "convertido" | "descartado";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  profession: string;
  interest: string;
  message: string;
  origin: LeadOrigin;
  consentGiven: boolean;
  createdAt: string;
  status: LeadStatus;
  notes: string | null;
}

export type MaterialType = "pdf" | "imagem" | "link";

export interface Material {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  filePath: string | null;
  externalUrl: string | null;
  coverUrl: string | null;
  category: string;
  isPublic: boolean;
  published: boolean;
  sortOrder: number;
}
