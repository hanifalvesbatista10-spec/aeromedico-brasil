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
  createProgram,
  updateProgram,
  deleteProgram,
  type ProgramFormInput,
} from "@/lib/actions/programs";
import type { Program, ProgramFormat, ProgramStatus } from "@/lib/types";

const emptyForm: ProgramFormInput = {
  title: "",
  category: "",
  shortDescription: "",
  imageUrl: null,
  durationHours: null,
  format: "online",
  status: "em-breve",
  enrollUrl: null,
  featured: false,
};

export function ProgramsManager({ initialPrograms }: { initialPrograms: Program[] }) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingSlug(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(program: Program) {
    setEditingSlug(program.slug);
    setForm({
      title: program.title,
      category: program.category,
      shortDescription: program.shortDescription,
      imageUrl: program.imageUrl,
      durationHours: program.durationHours,
      format: program.format,
      status: program.status,
      enrollUrl: program.enrollUrl,
      featured: program.featured,
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

  const columns: DataTableColumn<Program>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "category", header: "Categoria", render: (row) => row.category },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "disponivel" ? "default" : "secondary"}>
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      key: "featured",
      header: "Destaque",
      render: (row) => (row.featured ? "Sim" : "Não"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {programs.length} formaç{programs.length === 1 ? "ão" : "ões"} cadastrada
          {programs.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Nova formação</Button>
      </div>

      <DataTable
        columns={columns}
        rows={programs}
        getRowId={(row) => row.slug}
        emptyState={
          <EmptyState
            title="Nenhuma formação cadastrada"
            description="Clique em “Nova formação” para cadastrar a primeira."
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
            <div className="space-y-2">
              <Label htmlFor="program-category">Categoria</Label>
              <Input
                id="program-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Curso, Mentoria, Treinamento..."
              />
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
              <Label htmlFor="program-status">Status</Label>
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

const statusLabels: Record<ProgramStatus, string> = {
  disponivel: "Disponível",
  "proximas-turmas": "Próximas turmas",
  "em-breve": "Em breve",
};
