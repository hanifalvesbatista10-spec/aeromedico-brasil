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

// ---------------------------------------------------------------------
// Loja de produtos físicos da marca principal. Dinheiro sempre em centavos.
// ---------------------------------------------------------------------

export interface StoreCategory {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  sortOrder: number;
}

export interface StoreProduct {
  id: string;
  slug: string;
  categoryId: string | null;
  name: string;
  description: string;
  basePriceCents: number;
  /** Peso e dimensões de uma unidade embalada, usados no cálculo do frete. */
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** `true` quando o produto é vendido por tamanho/cor. A RLS esconde variações não publicadas do visitante, então a lista vazia sozinha não distingue "produto único" de "todas despublicadas". */
  hasVariants: boolean;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface StoreVariant {
  id: string;
  productId: string;
  sku: string | null;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  /** Preço próprio da variação; `null` usa `basePriceCents` do produto. */
  priceCents: number | null;
  /** Peso próprio da variação; `null` usa `weightGrams` do produto. */
  weightGrams: number | null;
  /** `null` = sem limite de estoque; `0` = esgotado. */
  stock: number | null;
  published: boolean;
  sortOrder: number;
}

export interface StoreProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  /** Quando preenchido, a foto aparece ao escolher essa cor. */
  colorName: string | null;
  sortOrder: number;
}

export type CouponKind = "percent" | "fixed";

export interface StoreCoupon {
  id: string;
  /** Sempre em maiúsculas; único sem diferenciar maiúsculas. */
  code: string;
  kind: CouponKind;
  /** `percent`: 1 a 100 · `fixed`: centavos (> 0). */
  value: number;
  /** `0` = sem pedido mínimo. */
  minOrderCents: number;
  /** ISO 8601; `null` = sem data. */
  startsAt: string | null;
  expiresAt: string | null;
  /** `null` = sem limite de usos. */
  maxUses: number | null;
  usesCount: number;
  active: boolean;
}

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "paid_review"
  | "preparing"
  | "shipped"
  | "delivered"
  | "canceled"
  | "expired";

/** Ambiente do Asaas em que o pedido foi criado: pedido de teste nunca deve ser enviado. */
export type OrderEnvironment = "sandbox" | "production";

export interface OrderItemInput {
  productId: string;
  variantId: string | null;
  name: string;
  size: string | null;
  colorName: string | null;
  unitPriceCents: number;
  quantity: number;
  weightGrams: number;
}

/** Pedido montado pelo SERVIDOR (nunca pelo navegador) antes de ser gravado. */
export interface OrderDraft {
  customer: { name: string; email: string; phone: string };
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
  };
  shipping: { optionId: string; label: string; cents: number };
  items: OrderItemInput[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  /** Desconto do Pix (só em pedido pago com Pix; o `discountCents` acima é do cupom). */
  pixDiscountCents: number;
  totalCents: number;
  paymentMethod: import("@/lib/payments/terms").PaymentMethod;
  /** Sem informar, vale `production`. */
  environment?: OrderEnvironment;
}

export interface StoreOrder extends OrderDraft {
  id: string;
  number: number;
  status: OrderStatus;
  environment: OrderEnvironment;
  checkoutId: string | null;
  trackingCode: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** O que a página do pedido mostra: sem e-mail, telefone nem endereço. */
export interface PublicOrder {
  id: string;
  number: number;
  status: OrderStatus;
  items: {
    name: string;
    size: string | null;
    colorName: string | null;
    quantity: number;
    unitPriceCents: number;
  }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  pixDiscountCents: number;
  totalCents: number;
  paymentMethod: import("@/lib/payments/terms").PaymentMethod;
  trackingCode: string | null;
}
