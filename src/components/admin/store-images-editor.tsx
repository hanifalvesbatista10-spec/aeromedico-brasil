"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/admin/media-uploader";
import { newImageDraft, type ImageDraft } from "@/lib/store/drafts";

/**
 * Galeria de fotos do produto. A primeira é a capa. Uma foto ligada a uma cor
 * aparece na vitrine quando o cliente escolhe essa cor.
 */
export function StoreImagesEditor({
  rows,
  colorNames,
  onChange,
}: {
  rows: ImageDraft[];
  colorNames: string[];
  onChange: (rows: ImageDraft[]) => void;
}) {
  function update(key: string, patch: Partial<ImageDraft>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Fotos</p>

      {rows.map((row, index) => {
        const id = `image-${row.key}`;
        return (
          <div
            key={row.key}
            className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-3"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
              <Image src={row.url} alt="" fill className="object-cover" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${id}-alt`}>Descrição da foto</Label>
                <Input
                  id={`${id}-alt`}
                  value={row.alt}
                  onChange={(e) => update(row.key, { alt: e.target.value })}
                  placeholder="Ex.: Camiseta preta, frente"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-color`}>Cor desta foto</Label>
                <select
                  id={`${id}-color`}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={row.colorName}
                  onChange={(e) => update(row.key, { colorName: e.target.value })}
                >
                  <option value="">Foto geral do produto</option>
                  {colorNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Mover foto ${index + 1} para cima`}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Mover foto ${index + 1} para baixo`}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(rows.filter((item) => item.key !== row.key))}
                aria-label={`Remover foto ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        );
      })}

      <MediaUploader
        label="Adicionar foto"
        value={null}
        onChange={(url) => {
          if (url) onChange([...rows, newImageDraft(url)]);
        }}
      />
    </div>
  );
}
