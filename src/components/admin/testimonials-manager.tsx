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
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
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
};

export function TestimonialsManager({
  initialTestimonials,
}: {
  initialTestimonials: Testimonial[];
}) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [isPending, startTransition] = useTransition();

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
      header: "Publicado",
      render: (row) => (
        <Badge variant={row.authorizedForDisplay ? "default" : "secondary"}>
          {row.authorizedForDisplay ? "Sim" : "Não"}
        </Badge>
      ),
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
        rows={testimonials}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum depoimento cadastrado"
            description="Cadastre depoimentos reais e marque “publicar” apenas com autorização confirmada."
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
            <div className="flex items-center gap-2">
              <input
                id="testimonial-authorized"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.authorizedForDisplay}
                onChange={(e) =>
                  setForm({ ...form, authorizedForDisplay: e.target.checked })
                }
              />
              <Label htmlFor="testimonial-authorized" className="font-normal">
                Autorização de exibição confirmada
              </Label>
            </div>
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
