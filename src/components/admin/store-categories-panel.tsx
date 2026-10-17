"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteStoreCategory, saveStoreCategory } from "@/lib/actions/store";
import type { StoreCategory } from "@/lib/types";

function CategoryRow({
  category,
  busy,
  onSave,
  onDelete,
}: {
  category: StoreCategory;
  busy: boolean;
  onSave: (category: StoreCategory, patch: { name: string; published: boolean }) => void;
  onDelete: (category: StoreCategory) => void;
}) {
  const [name, setName] = useState(category.name);
  const changed = name.trim() !== category.name;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor={`category-${category.id}`} className="sr-only">
          Nome da categoria
        </Label>
        <Input
          id={`category-${category.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`category-published-${category.id}`}
          type="checkbox"
          className="size-4 rounded border-border"
          checked={category.published}
          disabled={busy}
          onChange={(e) =>
            onSave(category, { name: category.name, published: e.target.checked })
          }
        />
        <Label htmlFor={`category-published-${category.id}`} className="font-normal">
          Visível na loja
        </Label>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!changed || busy}
        onClick={() => onSave(category, { name, published: category.published })}
      >
        Salvar nome
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={() => onDelete(category)}
      >
        Excluir
      </Button>
    </li>
  );
}

export function StoreCategoriesPanel({
  categories,
  onChange,
}: {
  categories: StoreCategory[];
  onChange: (categories: StoreCategory[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreCategory | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir agora.");
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    void run(async () => {
      const created = await saveStoreCategory({
        name: newName,
        published: true,
        sortOrder: categories.length,
      });
      onChange([...categories, created]);
      setNewName("");
    });
  }

  function handleSave(
    category: StoreCategory,
    patch: { name: string; published: boolean }
  ) {
    void run(async () => {
      const updated = await saveStoreCategory({
        id: category.id,
        name: patch.name,
        published: patch.published,
        sortOrder: category.sortOrder,
      });
      onChange(categories.map((item) => (item.id === category.id ? updated : item)));
    });
  }

  function handleDelete(category: StoreCategory) {
    void run(async () => {
      await deleteStoreCategory(category.id);
      onChange(categories.filter((item) => item.id !== category.id));
      setDeleteTarget(null);
    });
  }

  return (
    <section aria-labelledby="store-categories-title" className="space-y-3">
      <h2 id="store-categories-title" className="font-heading text-base font-semibold text-navy-950">
        Categorias
      </h2>
      <p className="text-sm text-gray-600">
        Agrupam os produtos na vitrine (por exemplo: Camisetas, Bonés, Patches).
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="store-new-category">Nova categoria</Label>
          <Input
            id="store-new-category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da categoria"
          />
        </div>
        <Button type="button" onClick={handleAdd} disabled={busy || !newName.trim()}>
          Adicionar
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {categories.length > 0 && (
        <ul className="space-y-2">
          {categories.map((category) => (
            <CategoryRow
              key={`${category.id}-${category.name}-${category.published}`}
              category={category}
              busy={busy}
              onSave={handleSave}
              onDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Os produtos dela continuam na loja, sem categoria.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </section>
  );
}
