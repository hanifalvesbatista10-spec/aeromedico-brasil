"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newVariantDraft, type VariantDraft } from "@/lib/store/drafts";

/**
 * Editor das variações de um produto (tamanho e/ou cor). Sem nenhuma linha,
 * o produto é vendido como item único (ex.: patch). Estoque vazio = sem limite;
 * preço vazio = usa o preço do produto.
 */
export function StoreVariantsEditor({
  rows,
  onChange,
}: {
  rows: VariantDraft[];
  onChange: (rows: VariantDraft[]) => void;
}) {
  function update(key: string, patch: Partial<VariantDraft>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Tamanhos e cores</p>
          <p className="text-xs text-gray-600">
            Deixe vazio para vender o produto como item único.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, newVariantDraft()])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar variação
        </Button>
      </div>

      {rows.map((row, index) => {
        const id = `variant-${row.key}`;
        return (
          <fieldset
            key={row.key}
            className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"
          >
            <legend className="px-1 text-xs text-gray-600">
              Variação {index + 1}
            </legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-size`}>Tamanho</Label>
              <Input
                id={`${id}-size`}
                value={row.size}
                onChange={(e) => update(row.key, { size: e.target.value })}
                placeholder="Ex.: M"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-color`}>Cor</Label>
              <Input
                id={`${id}-color`}
                value={row.colorName}
                onChange={(e) => update(row.key, { colorName: e.target.value })}
                placeholder="Ex.: Preta"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-hex`}>Amostra da cor</Label>
              <input
                id={`${id}-hex`}
                type="color"
                className="h-8 w-full cursor-pointer rounded-md border border-border bg-background p-1"
                value={row.colorHex || "#000000"}
                onChange={(e) => update(row.key, { colorHex: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-price`}>Preço próprio (R$)</Label>
              <Input
                id={`${id}-price`}
                inputMode="decimal"
                value={row.price}
                onChange={(e) => update(row.key, { price: e.target.value })}
                placeholder="Igual ao do produto"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-stock`}>Estoque</Label>
              <Input
                id={`${id}-stock`}
                inputMode="numeric"
                value={row.stock}
                onChange={(e) => update(row.key, { stock: e.target.value })}
                placeholder="Sem limite"
              />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex items-center gap-2 pb-1">
                <input
                  id={`${id}-published`}
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={row.published}
                  onChange={(e) => update(row.key, { published: e.target.checked })}
                />
                <Label htmlFor={`${id}-published`} className="font-normal">
                  À venda
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
                aria-label={`Remover variação ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
