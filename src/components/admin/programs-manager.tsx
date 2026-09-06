"use client";

import { useMemo, useState, useTransition } from "react";
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
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  toggleProgramPublished,
  moveProgram,
  type ProgramFormInput,
} from "@/lib/actions/programs";
import type { Program, ProgramFormat, ProgramStatus, ProgramType } from "@/lib/types";

const typeLabels: Record<ProgramType, string> = {
  curso: "Curso",
  mentoria: "Mentoria",
  treinamento: "Treinamento",
  produto: "Produto",
};

const statusLabels: Record<ProgramStatus, string> = {
  disponivel: "Disponível",
  "proximas-turmas": "Próximas turmas",
  "em-breve": "Em breve",
};

const emptyForm: ProgramFormInput = {
  title: "",
  type: "curso",
  category: "",
  shortDescription: "",
  fullDescription: null,
  imageUrl: null,
  durationHours: null,
  format: "online",
  status: "em-breve",
  enrollUrl: null,
  ctaLabel: "Inscrever-se",
  featured: false,
  published: false,
  seoTitle: null,
  seoDescription: null,
};

export function ProgramsManager({ initialPrograms }: { initialPrograms: Program[] }) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | ProgramStatus>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return programs.filter((program) => {
      const matchesTerm =
        !term ||
        program.title.toLowerCase().includes(term) ||
        program.category.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "todos" || program.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [programs, search, statusFilter]);

  function openCreate() {
    setEditingSlug(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(program: Program) {
    setEditingSlug(program.slug);
    setForm({
      title: program.title,
      type: program.type,
      category: program.category,
      shortDescription: program.shortDescription,
      fullDescription: program.fullDescription,
      imageUrl: program.imageUrl,
      durationHours: program.durationHours,
      format: program.format,
      status: program.status,
      enrollUrl: program.enrollUrl,
      ctaLabel: program.ctaLabel,
      featured: program.featured,
      published: program.published,
      seoTitle: program.seoTitle,
      seoDescription: program.seoDescription,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingSlug) {
        const updated = await updateProgram(editingSlug, form);
        if (updated) {
          setPrograms((current) =>
            current.map((program) => (program.slug === editingSlug ? updated : program))
          );
        }
      } else {
        const created = await createProgram(form);
        setPrograms((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(program: Program) {
    startTransition(async () => {
      await deleteProgram(program.slug);
      setPrograms((current) => current.filter((item) => item.slug !== program.slug));
      setDeleteTarget(null);
    });
  }

  function handleTogglePublished(program: Program) {
    setPendingSlug(program.slug);
    startTransition(async () => {
      const updated = await toggleProgramPublished(program.slug, !program.published);
      if (updated) {
        setPrograms((current) =>
          current.map((item) => (item.slug === program.slug ? updated : item))
        );
      }
      setPendingSlug(null);
    });
  }

  function handleMove(program: Program, direction: "up" | "down") {
    setPendingSlug(program.slug);
    startTransition(async () => {
      await moveProgram(program.slug, direction);
      setPrograms((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((item) => item.slug === program.slug);
        const neighborIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return current;
        const nextSortOrder = sorted[neighborIndex].sortOrder;
        const currentSortOrder = sorted[index].sortOrder;
        return current.map((item) => {
          if (item.slug === sorted[index].slug) return { ...item, sortOrder: nextSortOrder };
          if (item.slug === sorted[neighborIndex].slug)
            return { ...item, sortOrder: currentSortOrder };
          return item;
        });
      });
      setPendingSlug(null);
    });
  }

  const sortedFiltered = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: DataTableColumn<Program>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "type", header: "Tipo", render: (row) => typeLabels[row.type] },
    { key: "category", header: "Categoria", render: (row) => row.category },
    {
      key: "status",
      header: "Status comercial",
      render: (row) => (
        <Badge variant={row.status === "disponivel" ? "default" : "secondary"}>
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      key: "published",
      header: "Publicado",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleTogglePublished(row)}
          disabled={isPending && pendingSlug === row.slug}
          className="cursor-pointer"
        >
          <Badge variant={row.published ? "default" : "secondary"}>
            {row.published ? "Publicado" : "Rascunho"}
          </Badge>
        </button>
      ),
    },
    {
      key: "featured",
      header: "Destaque",
      render: (row) => (row.featured ? "Sim" : "Não"),
    },
    {
      key: "order",
      header: "Ordem",
      render: (row) => {
        const index = sortedFiltered.findIndex((item) => item.slug === row.slug);
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
              disabled={index === -1 || index >= sortedFiltered.length - 1 || isPending}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {programs.length} formaç{programs.length === 1 ? "ão" : "ões"} cadastrada
          {programs.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Nova formação</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou categoria..."
          className="max-w-xs"
          aria-label="Buscar formações"
        />
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "todos" | ProgramStatus)}
          aria-label="Filtrar por status comercial"
        >
          <option value="todos">Todos os status</option>
          <option value="disponivel">Disponível</option>
          <option value="proximas-turmas">Próximas turmas</option>
          <option value="em-breve">Em breve</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={sortedFiltered}
        getRowId={(row) => row.slug}
        emptyState={
          <EmptyState
            title="Nenhuma formação encontrada"
            description="Ajuste a busca/filtro ou clique em “Nova formação” para cadastrar a primeira."
          />
        }
        rowActions={(row) => (
          <>
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(row)}
            >
              Excluir
            </Button>
          </>
        )}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlug ? "Editar formação" : "Nova formação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="program-title">Título</Label>
              <Input
                id="program-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program-type">Tipo</Label>
                <select
                  id="program-type"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ProgramType })}
                >
                  <option value="curso">Curso</option>
                  <option value="mentoria">Mentoria</option>
                  <option value="treinamento">Treinamento</option>
                  <option value="produto">Produto</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-category">Categoria</Label>
                <Input
                  id="program-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex.: Transporte Aeromédico"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-description">Descrição curta</Label>
              <Textarea
                id="program-description"
                rows={3}
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-full-description">
                Descrição completa (exibida na página da formação)
              </Label>
              <Textarea
                id="program-full-description"
                rows={5}
                value={form.fullDescription ?? ""}
                onChange={(e) =>
                  setForm({ ...form, fullDescription: e.target.value || null })
                }
              />
            </div>
            <MediaUploader
              label="Imagem"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program-duration">Carga horária</Label>
                <Input
                  id="program-duration"
                  type="number"
                  min={0}
                  value={form.durationHours ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationHours: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-format">Formato</Label>
                <select
                  id="program-format"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.format}
                  onChange={(e) =>
                    setForm({ ...form, format: e.target.value as ProgramFormat })
                  }
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">On-line</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-status">Status comercial</Label>
              <select
                id="program-status"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProgramStatus })
                }
              >
                <option value="disponivel">Disponível</option>
                <option value="proximas-turmas">Próximas turmas</option>
                <option value="em-breve">Em breve</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program-enroll-url">Link de inscrição</Label>
                <Input
                  id="program-enroll-url"
                  value={form.enrollUrl ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, enrollUrl: e.target.value || null })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program-cta-label">Texto do botão</Label>
                <Input
                  id="program-cta-label"
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-seo-title">Título de SEO (opcional)</Label>
              <Input
                id="program-seo-title"
                value={form.seoTitle ?? ""}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-seo-description">Descrição de SEO (opcional)</Label>
              <Textarea
                id="program-seo-description"
                rows={2}
                value={form.seoDescription ?? ""}
                onChange={(e) =>
                  setForm({ ...form, seoDescription: e.target.value || null })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="program-featured"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              <Label htmlFor="program-featured" className="font-normal">
                Exibir em destaque na home
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="program-published"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="program-published" className="font-normal">
                Publicado (visível no site)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir formação"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
