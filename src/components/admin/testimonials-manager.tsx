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
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialPublished,
  moveTestimonial,
  type TestimonialFormInput,
} from "@/lib/actions/testimonials";
import type { Testimonial } from "@/lib/types";

const emptyForm: TestimonialFormInput = {
  name: "",
  profession: "",
  photoUrl: null,
  programOrEvent: "",
  quote: "",
  authorizedForDisplay: false,
  published: false,
};

export function TestimonialsManager({
  initialTestimonials,
}: {
  initialTestimonials: Testimonial[];
}) {
  const [testimonials, setTestimonials] = useState(
    [...initialTestimonials].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(testimonial: Testimonial) {
    setEditingId(testimonial.id);
    setForm({
      name: testimonial.name,
      profession: testimonial.profession,
      photoUrl: testimonial.photoUrl,
      programOrEvent: testimonial.programOrEvent,
      quote: testimonial.quote,
      authorizedForDisplay: testimonial.authorizedForDisplay,
      published: testimonial.published,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingId) {
        const updated = await updateTestimonial(editingId, form);
        if (updated) {
          setTestimonials((current) =>
            current.map((item) => (item.id === editingId ? updated : item))
          );
        }
      } else {
        const created = await createTestimonial(form);
        setTestimonials((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(testimonial: Testimonial) {
    startTransition(async () => {
      await deleteTestimonial(testimonial.id);
      setTestimonials((current) => current.filter((item) => item.id !== testimonial.id));
      setDeleteTarget(null);
    });
  }

  function handleTogglePublished(testimonial: Testimonial) {
    if (!testimonial.published && !testimonial.authorizedForDisplay) return;
    setPendingId(testimonial.id);
    startTransition(async () => {
      const updated = await toggleTestimonialPublished(
        testimonial.id,
        !testimonial.published
      );
      if (updated) {
        setTestimonials((current) =>
          current.map((item) => (item.id === testimonial.id ? updated : item))
        );
      }
      setPendingId(null);
    });
  }

  function handleMove(testimonial: Testimonial, direction: "up" | "down") {
    setPendingId(testimonial.id);
    startTransition(async () => {
      await moveTestimonial(testimonial.id, direction);
      setTestimonials((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((item) => item.id === testimonial.id);
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

  const sorted = [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: DataTableColumn<Testimonial>[] = [
    { key: "name", header: "Nome", render: (row) => row.name },
    { key: "profession", header: "Profissão", render: (row) => row.profession },
    {
      key: "programOrEvent",
      header: "Curso/evento",
      render: (row) => row.programOrEvent,
    },
    {
      key: "authorizedForDisplay",
      header: "Autorizado",
      render: (row) => (
        <Badge variant={row.authorizedForDisplay ? "default" : "secondary"}>
          {row.authorizedForDisplay ? "Sim" : "Não"}
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
          disabled={(isPending && pendingId === row.id) || !row.authorizedForDisplay}
          title={
            !row.authorizedForDisplay
              ? "Marque a autorização de exibição antes de publicar"
              : undefined
          }
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
              aria-label={`Mover depoimento de "${row.name}" para cima`}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === -1 || index >= sorted.length - 1 || isPending}
              onClick={() => handleMove(row, "down")}
              aria-label={`Mover depoimento de "${row.name}" para baixo`}
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
          {testimonials.length} depoimento{testimonials.length === 1 ? "" : "s"}{" "}
          cadastrado{testimonials.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo depoimento</Button>
      </div>

      <DataTable
        columns={columns}
        rows={sorted}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum depoimento cadastrado"
            description="Cadastre depoimentos reais e marque “autorizado” apenas com autorização confirmada."
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
              {editingId ? "Editar depoimento" : "Novo depoimento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testimonial-name">Nome</Label>
                <Input
                  id="testimonial-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial-profession">Profissão</Label>
                <Input
                  id="testimonial-profession"
                  value={form.profession}
                  onChange={(e) => setForm({ ...form, profession: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="testimonial-program">Curso ou evento</Label>
              <Input
                id="testimonial-program"
                value={form.programOrEvent}
                onChange={(e) => setForm({ ...form, programOrEvent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testimonial-quote">Depoimento</Label>
              <Textarea
                id="testimonial-quote"
                rows={4}
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
            </div>
            <MediaUploader
              label="Foto (opcional)"
              value={form.photoUrl}
              onChange={(url) => setForm({ ...form, photoUrl: url })}
            />
            <div className="flex items-center gap-2">
              <input
                id="testimonial-authorized"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.authorizedForDisplay}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authorizedForDisplay: e.target.checked,
                    published: e.target.checked ? form.published : false,
                  })
                }
              />
              <Label htmlFor="testimonial-authorized" className="font-normal">
                Autorização de exibição confirmada
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="testimonial-published"
                type="checkbox"
                className="size-4 rounded border-border disabled:opacity-50"
                checked={form.published}
                disabled={!form.authorizedForDisplay}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="testimonial-published" className="font-normal">
                Publicado (visível no site)
              </Label>
            </div>
            {!form.authorizedForDisplay && (
              <p className="text-xs text-gray-600">
                É preciso confirmar a autorização de exibição antes de publicar.
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir depoimento"
        description={`Tem certeza que deseja excluir o depoimento de "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
