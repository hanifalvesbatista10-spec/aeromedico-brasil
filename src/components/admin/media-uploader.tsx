"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadSiteMedia, UploadValidationError } from "@/lib/storage/upload";

const ACCEPT = "image/webp,image/png,image/jpeg";

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
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    try {
      const { publicUrl } = await uploadSiteMedia(file);
      onChange(publicUrl);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof UploadValidationError
          ? err.message
          : "Não foi possível enviar o arquivo agora. Tente novamente."
      );
    }
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
          void handleFiles(event.dataTransfer.files);
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
          {status === "uploading"
            ? "Enviando arquivo..."
            : "Arraste um arquivo aqui ou escolha um arquivo do computador (WebP, PNG ou JPEG, até 5 MB)."}
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={status === "uploading"}
            onClick={() => inputRef.current?.click()}
          >
            {status === "uploading" ? "Enviando..." : "Escolher arquivo"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={status === "uploading"}
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
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
    </div>
  );
}
