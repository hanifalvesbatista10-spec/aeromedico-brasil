"use client";

// Fase 1 — retorna uma URL de objeto local (não persiste); integração real
// de storage (Supabase Storage) é não-objetivo desta fase (ver design doc §12).
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MediaUploader({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onChange(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center ${
          dragging ? "border-navy-700 bg-navy-950/5" : "border-gray-300"
        }`}
      >
        {value ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-md bg-gray-100">
            <Image src={value} alt="" fill className="object-cover" />
          </div>
        ) : (
          <Upload className="size-6 text-gray-600" aria-hidden="true" />
        )}
        <p className="text-xs text-gray-600">
          Arraste um arquivo aqui ou escolha um arquivo do computador.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Escolher arquivo
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
            >
              <X className="size-4" aria-hidden="true" />
              Remover
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
    </div>
  );
}
