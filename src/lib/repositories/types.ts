import type {
  ContentPost,
  FAQItem,
  Lead,
  Material,
  Program,
  SiteSettings,
  SpeakingTopic,
  StoreCategory,
  StoreCoupon,
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
  /** Produtos com variações e fotos em poucas consultas, na ordem de exibição. */
  listProductDetails(): Promise<StoreProductDetail[]>;
  getProductBySlug(slug: string): Promise<StoreProductDetail | null>;
  createProduct(input: Omit<StoreProduct, "id">): Promise<StoreProduct>;
  updateProduct(id: string, patch: Partial<StoreProduct>): Promise<StoreProduct | null>;
  removeProduct(id: string): Promise<void>;
  /**
   * Sincroniza o conjunto de variações e atualiza `hasVariants` do produto.
   * Com `id` de uma variação do mesmo produto, atualiza e mantém o id (pedidos e
   * carrinho dependem dele); sem `id` (ou com id de outro produto), cria; quem
   * não está na lista é apagado.
   */
  saveVariants(
    productId: string,
    variants: (Omit<StoreVariant, "id" | "productId"> & { id?: string })[]
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

export const DUPLICATE_COUPON_MESSAGE = "Já existe um cupom com este código.";

export interface CouponRepository {
  /** Administrador: todos os cupons, por código. */
  list(): Promise<StoreCoupon[]>;
  create(input: Omit<StoreCoupon, "id">): Promise<StoreCoupon>;
  update(
    id: string,
    patch: Partial<Omit<StoreCoupon, "id">>
  ): Promise<StoreCoupon | null>;
  remove(id: string): Promise<void>;
  /**
   * Público: o cupom ATIVO com este código (sem diferenciar maiúsculas e
   * ignorando espaços nas pontas), ou `null`. Cupom inativo e cupom que não
   * existe dão a mesma resposta.
   */
  findActiveByCode(code: string): Promise<StoreCoupon | null>;
}
