import type {
  ContentPost,
  FAQItem,
  Lead,
  Material,
  Program,
  SiteSettings,
  SpeakingTopic,
  StoreCategory,
  StoreProduct,
  StoreProductImage,
  StoreVariant,
  Testimonial,
} from "@/lib/types";

export interface ProgramsRepository {
  list(): Promise<Program[]>;
  getBySlug(slug: string): Promise<Program | null>;
  create(input: Program): Promise<Program>;
  update(slug: string, patch: Partial<Program>): Promise<Program | null>;
  remove(slug: string): Promise<void>;
}

export interface ContentRepository {
  list(): Promise<ContentPost[]>;
  getBySlug(slug: string): Promise<ContentPost | null>;
  create(input: ContentPost): Promise<ContentPost>;
  update(slug: string, patch: Partial<ContentPost>): Promise<ContentPost | null>;
  remove(slug: string): Promise<void>;
}

export interface TestimonialsRepository {
  list(): Promise<Testimonial[]>;
  create(input: Testimonial): Promise<Testimonial>;
  update(id: string, patch: Partial<Testimonial>): Promise<Testimonial | null>;
  remove(id: string): Promise<void>;
}

export interface SpeakingRepository {
  list(): Promise<SpeakingTopic[]>;
  create(input: SpeakingTopic): Promise<SpeakingTopic>;
  update(id: string, patch: Partial<SpeakingTopic>): Promise<SpeakingTopic | null>;
  remove(id: string): Promise<void>;
}

export interface FAQRepository {
  list(): Promise<FAQItem[]>;
  create(input: FAQItem): Promise<FAQItem>;
  update(id: string, patch: Partial<FAQItem>): Promise<FAQItem | null>;
  remove(id: string): Promise<void>;
}

export interface LeadsRepository {
  list(): Promise<Lead[]>;
  create(input: Lead): Promise<Lead>;
  update(id: string, patch: Partial<Lead>): Promise<Lead | null>;
  remove(id: string): Promise<void>;
}

export interface MaterialsRepository {
  list(): Promise<Material[]>;
  create(input: Material): Promise<Material>;
  update(id: string, patch: Partial<Material>): Promise<Material | null>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<SiteSettings>;
  update(patch: Partial<SiteSettings>): Promise<SiteSettings>;
}

export const DUPLICATE_STORE_SLUG_MESSAGE =
  "Já existe um produto com este endereço (slug).";

export interface StoreProductDetail {
  product: StoreProduct;
  variants: StoreVariant[];
  images: StoreProductImage[];
}

export interface StoreRepository {
  listCategories(): Promise<StoreCategory[]>;
  /** O visitante só recebe publicados (RLS); o administrador recebe todos. */
  listProducts(): Promise<StoreProduct[]>;
  getProductBySlug(slug: string): Promise<StoreProductDetail | null>;
  createProduct(input: Omit<StoreProduct, "id">): Promise<StoreProduct>;
  updateProduct(id: string, patch: Partial<StoreProduct>): Promise<StoreProduct | null>;
  removeProduct(id: string): Promise<void>;
  /** Substitui o conjunto de variações e atualiza `hasVariants` do produto. */
  saveVariants(
    productId: string,
    variants: Omit<StoreVariant, "id" | "productId">[]
  ): Promise<StoreVariant[]>;
  /** Substitui o conjunto de fotos do produto. */
  saveImages(
    productId: string,
    images: Omit<StoreProductImage, "id" | "productId">[]
  ): Promise<StoreProductImage[]>;
  createCategory(input: Omit<StoreCategory, "id">): Promise<StoreCategory>;
  updateCategory(id: string, patch: Partial<StoreCategory>): Promise<StoreCategory | null>;
  removeCategory(id: string): Promise<void>;
}
