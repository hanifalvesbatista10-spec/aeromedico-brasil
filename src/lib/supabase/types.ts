// Tipos manuais das tabelas do Supabase (schema em supabase/migrations).
// Mantidos por entidade para refletir exatamente as colunas criadas nas
// migrations — sem `supabase gen types`, pois este ambiente não tem o
// projeto linkado via CLI.

export type ProgramType = "curso" | "mentoria" | "treinamento" | "produto";
export type ProgramFormatDb = "presencial" | "online" | "hibrido";
export type ProgramStatusDb = "disponivel" | "proximas-turmas" | "em-breve";
export type ContentKindDb = "artigo" | "video" | "link-externo";
export type SpeakingKindDb = "palestra" | "treinamento" | "evento" | "aula" | "mentoria";
export type LeadOriginDb = "contato" | "formacao" | "palestra";
export type LeadStatusDb = "novo" | "em-contato" | "convertido" | "descartado";
export type MaterialTypeDb = "pdf" | "imagem" | "link";

export interface SiteStatRow {
  id: string;
  label: string;
  value: string;
}

export interface ProfileRow {
  id: boolean;
  name: string;
  role: string;
  credentials: string[];
  short_bio: string;
  long_bio: string;
  resume_summary: string | null;
  photo_url: string | null;
  instagram_handle: string;
  updated_at: string;
}

export interface SiteSettingsRow {
  id: boolean;
  site_name: string;
  site_description: string;
  stats: SiteStatRow[];
  whatsapp_url: string;
  email: string;
  instagram_url: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  footer_note: string;
  logo_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
}

export interface ProgramRow {
  id: string;
  slug: string;
  type: ProgramType;
  category: string;
  title: string;
  short_description: string;
  full_description: string | null;
  image_url: string | null;
  duration_hours: number | null;
  format: ProgramFormatDb;
  status: ProgramStatusDb;
  enroll_url: string | null;
  cta_label: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  is_demo_content: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentPostRow {
  id: string;
  slug: string;
  kind: ContentKindDb;
  category: string;
  title: string;
  summary: string;
  body: string | null;
  cover_url: string | null;
  author: string;
  published_at: string;
  external_url: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  is_demo_content: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestimonialRow {
  id: string;
  name: string;
  profession: string;
  photo_url: string | null;
  program_or_event: string;
  quote: string;
  authorized_for_display: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpeakingTopicRow {
  id: string;
  kind: SpeakingKindDb;
  title: string;
  description: string;
  themes: string[];
  hire_url: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FAQItemRow {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  profession: string;
  interest: string;
  message: string;
  origin: LeadOriginDb;
  consent_given: boolean;
  status: LeadStatusDb;
  notes: string | null;
  created_at: string;
}

export interface MaterialRow {
  id: string;
  title: string;
  description: string;
  type: MaterialTypeDb;
  file_path: string | null;
  external_url: string | null;
  cover_url: string | null;
  category: string;
  is_public: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUserRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
}

export interface StoreCategoryRow {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreProductRow {
  id: string;
  slug: string;
  category_id: string | null;
  name: string;
  description: string;
  base_price_cents: number;
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  has_variants: boolean;
  featured: boolean;
  published: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreVariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  size: string | null;
  color_name: string | null;
  color_hex: string | null;
  price_cents: number | null;
  weight_grams: number | null;
  stock: number | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreProductImageRow {
  id: string;
  product_id: string;
  url: string;
  alt: string;
  color_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface StoreCouponRow {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_order_cents: number;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreOrderRow {
  id: string;
  number: number;
  access_token: string;
  status:
    | "awaiting_payment"
    | "paid"
    | "paid_review"
    | "preparing"
    | "shipped"
    | "delivered"
    | "canceled"
    | "expired";
  environment: "sandbox" | "production";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  ship_cep: string;
  ship_street: string;
  ship_number: string;
  ship_complement: string | null;
  ship_district: string;
  ship_city: string;
  ship_state: string;
  ship_option_id: string;
  ship_label: string;
  subtotal_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  shipping_cents: number;
  fee_cents: number;
  total_cents: number;
  payment_method: "pix" | "card_single" | "card_installments";
  asaas_checkout_id: string | null;
  asaas_checkout_url: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
}

export interface StoreOrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  name: string;
  size: string | null;
  color_name: string | null;
  unit_price_cents: number;
  quantity: number;
  weight_grams: number;
}

export interface StorePaymentSettingsRow {
  id: boolean;
  pix_fixed_cents: number;
  pix_percent_bp: number;
  card_single_fixed_cents: number;
  card_single_percent_bp: number;
  card_installments_fixed_cents: number;
  card_installments_percent_bp: number;
  max_installments: number;
  updated_at: string;
}
