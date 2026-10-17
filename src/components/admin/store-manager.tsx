"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { StoreProductDialog } from "@/components/admin/store-product-dialog";
import { StoreCategoriesPanel } from "@/components/admin/store-categories-panel";
import {
  deleteStoreProduct,
  moveStoreProduct,
  toggleStoreProductPublished,
} from "@/lib/actions/store";
import { formatBRL } from "@/lib/money";
import { reorderBySwap } from "@/lib/store/order";
import type { StoreProductDetail } from "@/lib/repositories/types";
import type { StoreCategory } from "@/lib/types";

type DialogState = { detail: StoreProductDetail | null } | null;

export function StoreManager({
  initialCategories,
  initialDetails,
}: {
  initialCategories: StoreCategory[];
  initialDetails: StoreProductDetail[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [details, setDetails] = useState(initialDetails);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreProductDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const sorted = useMemo(
    () => [...details].sort((a, b) => a.product.sortOrder - b.product.sortOrder),
    [details]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter(({ product }) => {
      const category = product.categoryId ? categoryName.get(product.categoryId) ?? "" : "";
      return (
        product.name.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term)
      );
    });
  }, [sorted, search, categoryName]);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir agora.");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(saved: StoreProductDetail) {
    setDetails((current) =>
      current.some((item) => item.product.id === saved.product.id)
        ? current.map((item) => (item.product.id === saved.product.id ? saved : item))
        : [...current, saved]
    );
  }

  function handleTogglePublished({ product }: StoreProductDetail) {
    void run(product.id, async () => {
      const updated = await toggleStoreProductPublished(product.id, !product.published);
      if (!updated) return;
      setDetails((current) =>
        current.map((item) =>
          item.product.id === product.id ? { ...item, product: updated } : item
        )
      );
    });
  }

  function handleMove({ product }: StoreProductDetail, direction: "up" | "down") {
    void run(product.id, async () => {
      await moveStoreProduct(product.id, direction);
      const changes = new Map(
        reorderBySwap(
          details.map((item) => ({ id: item.product.id, sortOrder: item.product.sortOrder })),
          product.id,
          direction
        ).map((change) => [change.id, change.sortOrder])
      );
      setDetails((current) =>
        current.map((item) =>
          changes.has(item.product.id)
            ? { ...item, product: { ...item.product, sortOrder: changes.get(item.product.id)! } }
            : item
        )
      );
    });
  }

  function handleDelete({ product }: StoreProductDetail) {
    void run(product.id, async () => {
      await deleteStoreProduct(product.id);
      setDetails((current) => current.filter((item) => item.product.id !== product.id));
      setDeleteTarget(null);
    });
  }

  const columns: DataTableColumn<StoreProductDetail>[] = [
    {
      key: "photo",
      header: "Foto",
      render: ({ images, product }) => (
        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
          {images[0] ? (
            <Image src={images[0].url} alt={images[0].alt || product.name} fill className="object-cover" />
          ) : null}
        </div>
      ),
    },
    { key: "name", header: "Produto", render: ({ product }) => product.name },
    {
      key: "category",
      header: "Categoria",
      render: ({ product }) =>
        product.categoryId ? categoryName.get(product.categoryId) ?? "—" : "—",
    },
    { key: "price", header: "Preço", render: ({ product }) => formatBRL(product.basePriceCents) },
    {
      key: "variants",
      header: "Variações",
      render: ({ variants }) =>
        variants.length === 0 ? "Item único" : `${variants.length} variaç${variants.length === 1 ? "ão" : "ões"}`,
    },
    {
      key: "published",
      header: "Publicado",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleTogglePublished(row)}
          disabled={busyId === row.product.id}
          className="cursor-pointer"
          aria-label={`${row.product.published ? "Despublicar" : "Publicar"} ${row.product.name}`}
        >
          <Badge variant={row.product.published ? "default" : "secondary"}>
            {row.product.published ? "Publicado" : "Rascunho"}
          </Badge>
        </button>
      ),
    },
    { key: "featured", header: "Destaque", render: ({ product }) => (product.featured ? "Sim" : "Não") },
    {
      key: "order",
      header: "Ordem",
      render: (row) => {
        const index = sorted.findIndex((item) => item.product.id === row.product.id);
        return (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index <= 0 || busyId !== null}
              onClick={() => handleMove(row, "up")}
              aria-label={`Mover "${row.product.name}" para cima`}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === -1 || index >= sorted.length - 1 || busyId !== null}
              onClick={() => handleMove(row, "down")}
              aria-label={`Mover "${row.product.name}" para baixo`}
            >
              ↓
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-10">
      <section aria-labelledby="store-products-title" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="store-products-title" className="font-heading text-base font-semibold text-navy-950">
              Produtos
            </h2>
            <p className="text-sm text-gray-600">
              {details.length} produto{details.length === 1 ? "" : "s"} cadastrado
              {details.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Button onClick={() => setDialog({ detail: null })}>Novo produto</Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou categoria..."
          className="max-w-xs"
          aria-label="Buscar produtos"
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(row) => row.product.id}
          emptyState={
            <EmptyState
              title="Nenhum produto cadastrado"
              description="Clique em “Novo produto” para cadastrar o primeiro. As fotos podem ser enviadas depois."
            />
          }
          rowActions={(row) => (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialog({ detail: row })}>
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row)}>
                Excluir
              </Button>
            </>
          )}
        />
      </section>

      <StoreCategoriesPanel categories={categories} onChange={setCategories} />

      {dialog && (
        <StoreProductDialog
          key={dialog.detail?.product.id ?? "novo"}
          categories={categories}
          detail={dialog.detail}
          onSaved={handleSaved}
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deleteTarget?.product.name}"? As variações e fotos dele também serão excluídas. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
