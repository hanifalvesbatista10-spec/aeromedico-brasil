export interface Profile {
  name: string;
  role: string;
  credentials: string[];
  shortBio: string;
  longBio: string;
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
  profile: Profile;
  stats: SocialProofStat[];
  whatsappUrl: string;
  email: string;
  instagramUrl: string;
  primaryCta: CTAConfig;
  secondaryCta: CTAConfig;
  footerNote: string;
}

export type ProgramFormat = "presencial" | "online" | "hibrido";
export type ProgramStatus = "disponivel" | "proximas-turmas" | "em-breve";

export interface Program {
  slug: string;
  title: string;
  category: string;
  shortDescription: string;
  imageUrl: string | null;
  durationHours: number | null;
  format: ProgramFormat;
  status: ProgramStatus;
  enrollUrl: string | null;
  featured: boolean;
  isDemoContent: boolean;
}

export type ContentKind = "artigo" | "video" | "link-externo";

export interface ContentPost {
  slug: string;
  kind: ContentKind;
  title: string;
  category: string;
  summary: string;
  coverUrl: string | null;
  author: string;
  publishedAt: string;
  externalUrl: string | null;
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
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
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
