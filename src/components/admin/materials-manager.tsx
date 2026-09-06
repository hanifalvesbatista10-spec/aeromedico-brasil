"use client";

import { useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  toggleMaterialPublished,
  moveMaterial,
  getMaterialSignedUrl,
  type MaterialFormInput,
} from "@/lib/actions/materials";
import { uploadMaterialFile, UploadValidationError } from "@/lib/storage/upload";
import type { Material, MaterialType } from "@/lib/types";

const typeLabels: Record<MaterialType, string> = {
  pdf: "PDF",
  imagem: "Imagem",
  link: "Link externo",
};

const emptyForm: MaterialFormInput = {
  title: "",
  description: "",
  type: "pdf",
  filePath: null,
  externalUrl: null,
  coverUrl: null,
  category: "",
  isPublic: false,
  published: false,
};

export function MaterialsManager({ initialMaterials }: { initialMaterials: Material[] }) {
  const [materials, setMaterials] = useState(
    [...initialMaterials].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setUploadStatus("idle");
    setUploadError(null);
    setFormOpen(true);
  }

  function openEdit(material: Material) {
    setEditingId(material.id);
    setForm({
      title: material.title,
      description: material.description,
      type: material.type,
      filePath: material.filePath,
      externalUrl: material.externalUrl,
      coverUrl: material.coverUrl,
      category: material.category,
      isPublic: material.isPublic,
      published: material.published,
    });
    setUploadStatus("idle");
    setUploadError(null);
    setFormOpen(true);
  }

  async function handleFileUpload(file: File) {
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const { path } = await uploadMaterialFile(file);
      setForm((current) => ({ ...current, filePath: path, externalUrl: null }));
      setUploadStatus("idle");
    } catch (err) {
      setUploadStatus("error");
      setUploadError(
        err instanceof UploadValidationError
          ? err.message
          : "Não foi possível enviar o arquivo agora. Tente novamente."
      );
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingId) {
        const updated = await updateMaterial(editingId, form);
        if (updated) {
          setMaterials((current) =>
            current.map((item) => (item.id === editingId ? updated : item))
          );
        }
      } else {
        const created = await createMaterial(form);
        setMaterials((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(material: Material) {
    startTransition(async () => {
      await deleteMaterial(material.id);
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setDeleteTarget(null);
    });
  }

  function handleTogglePublished(material: Material) {
    setPendingId(material.id);
    startTransition(async () => {
      const updated = await toggleMaterialPublished(material.id, !material.published);
      if (updated) {
        setMaterials((current) =>
          current.map((item) => (item.id === material.id ? updated : item))
        );
      }
      setPendingId(null);
    });
  }

  function handleMove(material: Material, direction: "up" | "down") {
    setPendingId(material.id);
    startTransition(async () => {
      await moveMaterial(material.id, direction);
      setMaterials((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((item) => item.id === material.id);
        const neighborIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return current;
        const nextSortOrder = sorted[neighborIndex].sortOrder;
        const currentSortOrder = sorted[index].sortOrder;
        return current.map((item) => {
          if (item.id === sorted[index].id) return { ...item, sortOrder: nextSortOrder };
          if (item.id === sorted[neighborIndex].id)
            return { ...item, sortOrder: currentSortOrder };
          return item;
        });
      });
      setPendingId(null);
    });
  }

  async function handleOpenFile(material: Material) {
    if (!material.filePath) return;
    const url = await getMaterialSignedUrl(material.filePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const sorted = [...materials].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: DataTableColumn<Material>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "category", header: "Categoria", render: (row) => row.category },
    {
      key: "type",
      header: "Tipo",
      render: (row) => <Badge variant="secondary">{typeLabels[row.type]}</Badge>,
    },
    {
      key: "isPublic",
      header: "Acesso",
      render: (row) => (row.isPublic ? "Público" : "Privado"),
    },
    {
      key: "published",
      header: "Publicado",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleTogglePublished(row)}
          disabled={isPending && pendingId === row.id}
        >
          <Badge variant={row.published ? "default" : "secondary"}>
            {row.published ? "Publicado" : "Rascunho"}
          </Badge>
        </button>
      ),
    },
    {
      key: "order",
      header: "Ordem",
      render: (row) => {
        const index = sorted.findIndex((item) => item.id === row.id);
        return (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index <= 0 || isPending}
              onClick={() => handleMove(row, "up")}
              aria-label={`Mover "${row.title}" para cima`}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === -1 || index >= sorted.length - 1 || isPending}
              onClick={() => handleMove(row, "down")}
              aria-label={`Mover "${row.title}" para baixo`}
            >
              ↓
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {materials.length} material{materials.length === 1 ? "" : "is"} cadastrado
          {materials.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo material</Button>
      </div>

      <DataTable
        columns={columns}
        rows={sorted}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum material cadastrado"
            description="Cadastre PDFs, imagens ou links externos para a biblioteca de materiais."
          />
        }
        rowActions={(row) => (
          <>
            {row.filePath && (
              <Button variant="outline" size="sm" onClick={() => handleOpenFile(row)}>
                Abrir
              </Button>
            )}
            {row.externalUrl && !row.filePath && (
              <a
                href={row.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-navy-700 underline-offset-2 hover:underline"
              >
                Abrir
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(row)}>
              Excluir
            </Button>
          </>
        )}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material-title">Título</Label>
              <Input
                id="material-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material-type">Tipo</Label>
                <select
                  id="material-type"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as MaterialType })
                  }
                >
                  <option value="pdf">PDF</option>
                  <option value="imagem">Imagem</option>
                  <option value="link">Link externo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="material-category">Categoria</Label>
                <Input
                  id="material-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-description">Descrição</Label>
              <Textarea
                id="material-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {form.type === "link" ? (
              <div className="space-y-2">
                <Label htmlFor="material-external-url">Link externo</Label>
                <Input
                  id="material-external-url"
                  value={form.externalUrl ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, externalUrl: e.target.value || null, filePath: null })
                  }
                  placeholder="https://..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="material-file">Arquivo ({form.type === "pdf" ? "PDF" : "imagem"})</Label>
                <input
                  id="material-file"
                  type="file"
                  accept={form.type === "pdf" ? "application/pdf" : "image/webp,image/png,image/jpeg"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                  disabled={uploadStatus === "uploading"}
                  className="block w-full text-sm"
                />
                {uploadStatus === "uploading" && (
                  <p className="text-xs text-gray-600">Enviando arquivo...</p>
                )}
                {form.filePath && uploadStatus !== "uploading" && (
                  <p className="text-xs text-navy-700">Arquivo enviado.</p>
                )}
                {uploadError && (
                  <p role="alert" className="text-xs text-destructive">
                    {uploadError}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  PDF até 20 MB, ou imagem WebP/PNG/JPEG até 20 MB.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="material-public"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              />
              <Label htmlFor="material-public" className="font-normal">
                Acesso público (visitantes podem baixar)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="material-published"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="material-published" className="font-normal">
                Publicado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={
                isPending ||
                uploadStatus === "uploading" ||
                (form.type !== "link" && !form.filePath) ||
                (form.type === "link" && !form.externalUrl)
              }
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir material"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
