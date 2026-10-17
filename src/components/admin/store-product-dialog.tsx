"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StoreVariantsEditor } from "@/components/admin/store-variants-editor";
import { StoreImagesEditor } from "@/components/admin/store-images-editor";
import { saveStoreProductBundle } from "@/lib/actions/store";
import {
  draftToInput,
  emptyProductForm,
  imageDraftToInput,
  imageToDraft,
  productFormToInput,
  productToForm,
  variantToDraft,
  type ImageDraft,
  type ProductForm,
  type VariantDraft,
} from "@/lib/store/drafts";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory } from "@/lib/types";

/**
 * Cria ou edita um produto com suas variações e fotos. O componente é
 * montado só enquanto o diálogo está aberto (o gerenciador usa `key`), então
 * o estado interno sempre começa do produto que está sendo editado.
 */
export function StoreProductDialog({
  categories,
  detail,
  onSaved,
  onClose,
}: {
  categories: StoreCategory[];
  detail: StoreProductDetail | null;
  onSaved: (detail: StoreProductDetail) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    detail ? productToForm(detail.product) : emptyProductForm
  );
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(
    detail ? detail.variants.map(variantToDraft) : []
  );
  const [imageRows, setImageRows] = useState<ImageDraft[]>(
    detail ? detail.images.map(imageToDraft) : []
  );
  // Depois do primeiro salvamento com sucesso, um novo "Salvar" (por exemplo
  // após falha nas variações) atualiza o MESMO produto em vez de criar outro.
  const [productId, setProductId] = useState<string | undefined>(
    detail?.product.id
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorNames = [
    ...new Set(variantRows.map((row) => row.colorName.trim()).filter(Boolean)),
  ];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveStoreProductBundle({
        id: productId,
        product: productFormToInput(form),
        variants: variantRows.map((row, index) => draftToInput(row, index)),
        images: imageRows.map((row, index) => imageDraftToInput(row, index)),
      });

      // O servidor devolve o estado REAL do produto, também quando a gravação
      // falha pela metade: o painel mostra o que de fato ficou salvo, e um novo
      // "Salvar" atualiza o MESMO produto em vez de tentar criar outro.
      if (result.detail) {
        setProductId(result.detail.product.id);
        onSaved(result.detail);
      }
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
      onClose();
    } catch {
      // Falha inesperada (ex.: sessão expirada): em produção o Next não repassa
      // a mensagem original de erros lançados por Server Actions.
      setError("Não foi possível salvar agora. Atualize a página e tente de novo.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Nome</Label>
            <Input
              id="store-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-description">Descrição</Label>
            <Textarea
              id="store-description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-price">Preço (R$)</Label>
              <Input
                id="store-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Ex.: 49,90"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-category">Categoria</Label>
              <select
                id="store-category"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium text-foreground">
              Peso e tamanho do pacote (base do cálculo do frete)
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="store-weight">Peso (g)</Label>
                <Input
                  id="store-weight"
                  inputMode="numeric"
                  value={form.weightGrams}
                  onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-length">Comprimento (cm)</Label>
                <Input
                  id="store-length"
                  inputMode="numeric"
                  value={form.lengthCm}
                  onChange={(e) => setForm({ ...form, lengthCm: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-width">Largura (cm)</Label>
                <Input
                  id="store-width"
                  inputMode="numeric"
                  value={form.widthCm}
                  onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="store-height">Altura (cm)</Label>
                <Input
                  id="store-height"
                  inputMode="numeric"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                />
              </div>
            </div>
          </fieldset>

          <StoreVariantsEditor rows={variantRows} onChange={setVariantRows} />
          <StoreImagesEditor
            rows={imageRows}
            colorNames={colorNames}
            onChange={setImageRows}
          />

          <div className="space-y-2">
            <Label htmlFor="store-seo-title">Título de SEO (opcional)</Label>
            <Input
              id="store-seo-title"
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-seo-description">Descrição de SEO (opcional)</Label>
            <Textarea
              id="store-seo-description"
              rows={2}
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="store-featured"
              type="checkbox"
              className="size-4 rounded border-border"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            <Label htmlFor="store-featured" className="font-normal">
              Exibir em destaque
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="store-published"
              type="checkbox"
              className="size-4 rounded border-border"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            <Label htmlFor="store-published" className="font-normal">
              Publicado (visível na loja)
            </Label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
