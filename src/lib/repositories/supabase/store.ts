import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  StoreCategoryRow,
  StoreProductImageRow,
  StoreProductRow,
  StoreVariantRow,
} from "@/lib/supabase/types";
import type { StoreRepository } from "../types";
import {
  mapStoreError,
  storeCategoryToDomain,
  storeCategoryToRow,
  storeCategoryToRowPatch,
  storeImageToDomain,
  storeImageToRow,
  storeProductToDomain,
  storeProductToRow,
  storeProductToRowPatch,
  storeVariantToDomain,
  storeVariantToRow,
} from "./store-mapping";

// Visitante só recebe linhas publicadas (RLS, ver
// supabase/migrations/20261018120000_store_catalog.sql); o administrador
// recebe tudo. As páginas públicas ainda filtram `published` explicitamente.
export function createSupabaseStoreRepository(): StoreRepository {
  return {
    async listCategories() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
      return (data as StoreCategoryRow[]).map(storeCategoryToDomain);
    },

    async listProducts() {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);
      return (data as StoreProductRow[]).map(storeProductToDomain);
    },

    async listProductDetails() {
      const supabase = await createServerSupabaseClient();
      const [productsResult, variantsResult, imagesResult] = await Promise.all([
        supabase
          .from("store_products")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("store_variants")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("store_product_images")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);
      if (productsResult.error) {
        throw new Error(`Falha ao carregar produtos: ${productsResult.error.message}`);
      }
      if (variantsResult.error) {
        throw new Error(`Falha ao carregar variações: ${variantsResult.error.message}`);
      }
      if (imagesResult.error) {
        throw new Error(`Falha ao carregar fotos: ${imagesResult.error.message}`);
      }

      const variantsByProduct = new Map<string, ReturnType<typeof storeVariantToDomain>[]>();
      for (const row of variantsResult.data as StoreVariantRow[]) {
        const list = variantsByProduct.get(row.product_id) ?? [];
        list.push(storeVariantToDomain(row));
        variantsByProduct.set(row.product_id, list);
      }
      const imagesByProduct = new Map<string, ReturnType<typeof storeImageToDomain>[]>();
      for (const row of imagesResult.data as StoreProductImageRow[]) {
        const list = imagesByProduct.get(row.product_id) ?? [];
        list.push(storeImageToDomain(row));
        imagesByProduct.set(row.product_id, list);
      }

      return (productsResult.data as StoreProductRow[]).map((row) => {
        const product = storeProductToDomain(row);
        return {
          product,
          variants: variantsByProduct.get(product.id) ?? [],
          images: imagesByProduct.get(product.id) ?? [],
        };
      });
    },

    async getProductBySlug(slug) {
      const supabase = await createServerSupabaseClient();
      const { data: productRow, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(`Falha ao carregar produto: ${error.message}`);
      if (!productRow) return null;

      const product = storeProductToDomain(productRow as StoreProductRow);
      const [variantsResult, imagesResult] = await Promise.all([
        supabase
          .from("store_variants")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("store_product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
      ]);
      if (variantsResult.error) {
        throw new Error(`Falha ao carregar variações: ${variantsResult.error.message}`);
      }
      if (imagesResult.error) {
        throw new Error(`Falha ao carregar fotos: ${imagesResult.error.message}`);
      }

      return {
        product,
        variants: (variantsResult.data as StoreVariantRow[]).map(storeVariantToDomain),
        images: (imagesResult.data as StoreProductImageRow[]).map(storeImageToDomain),
      };
    },

    async createProduct(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_products")
        .insert(storeProductToRow(input))
        .select("*")
        .single();
      if (error) throw mapStoreError(error, "product", "Falha ao criar produto");
      return storeProductToDomain(data as StoreProductRow);
    },

    async updateProduct(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_products")
        .update(storeProductToRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw mapStoreError(error, "product", "Falha ao atualizar produto");
      return data ? storeProductToDomain(data as StoreProductRow) : null;
    },

    async removeProduct(id) {
      // Variações e fotos saem em cascata (on delete cascade).
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("store_products").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir produto: ${error.message}`);
    },

    // Sem transação (não usamos função SQL nem service_role): apaga o conjunto
    // antigo e insere o novo. As Server Actions validam duplicidade antes de
    // chamar, mas uma falha de rede entre os dois passos deixa o produto sem
    // variações até o dono salvar de novo.
    async saveVariants(productId, input) {
      const supabase = await createServerSupabaseClient();
      const { error: deleteError } = await supabase
        .from("store_variants")
        .delete()
        .eq("product_id", productId);
      if (deleteError) {
        throw new Error(`Falha ao atualizar variações: ${deleteError.message}`);
      }

      let saved: StoreVariantRow[] = [];
      if (input.length > 0) {
        const { data, error } = await supabase
          .from("store_variants")
          .insert(input.map((variant) => storeVariantToRow(productId, variant)))
          .select("*");
        if (error) throw mapStoreError(error, "variant", "Falha ao salvar variações");
        saved = data as StoreVariantRow[];
      }

      const { error: flagError } = await supabase
        .from("store_products")
        .update({ has_variants: input.length > 0 })
        .eq("id", productId);
      if (flagError) {
        throw new Error(`Falha ao atualizar o produto: ${flagError.message}`);
      }

      return saved
        .map(storeVariantToDomain)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },

    async saveImages(productId, input) {
      const supabase = await createServerSupabaseClient();
      const { error: deleteError } = await supabase
        .from("store_product_images")
        .delete()
        .eq("product_id", productId);
      if (deleteError) {
        throw new Error(`Falha ao atualizar fotos: ${deleteError.message}`);
      }
      if (input.length === 0) return [];

      const { data, error } = await supabase
        .from("store_product_images")
        .insert(input.map((image) => storeImageToRow(productId, image)))
        .select("*");
      if (error) throw new Error(`Falha ao salvar fotos: ${error.message}`);
      return (data as StoreProductImageRow[])
        .map(storeImageToDomain)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },

    async createCategory(input) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_categories")
        .insert(storeCategoryToRow(input))
        .select("*")
        .single();
      if (error) throw mapStoreError(error, "category", "Falha ao criar categoria");
      return storeCategoryToDomain(data as StoreCategoryRow);
    },

    async updateCategory(id, patch) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("store_categories")
        .update(storeCategoryToRowPatch(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw mapStoreError(error, "category", "Falha ao atualizar categoria");
      return data ? storeCategoryToDomain(data as StoreCategoryRow) : null;
    },

    async removeCategory(id) {
      // Produtos da categoria ficam sem categoria (on delete set null).
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("store_categories").delete().eq("id", id);
      if (error) throw new Error(`Falha ao excluir categoria: ${error.message}`);
    },
  };
}
