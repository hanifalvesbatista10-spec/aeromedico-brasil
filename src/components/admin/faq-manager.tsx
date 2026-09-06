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
  createFAQItem,
  updateFAQItem,
  deleteFAQItem,
  toggleFAQItemPublished,
  moveFAQItem,
  type FAQItemFormInput,
} from "@/lib/actions/faq";
import type { FAQItem } from "@/lib/types";

const emptyForm: FAQItemFormInput = { question: "", answer: "", published: true };

export function FAQManager({ initialItems }: { initialItems: FAQItem[] }) {
  const [items, setItems] = useState([...initialItems].sort((a, b) => a.sortOrder - b.sortOrder));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FAQItemFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<FAQItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: FAQItem) {
    setEditingId(item.id);
    setForm({ question: item.question, answer: item.answer, published: item.published });
    setFormOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingId) {
        const updated = await updateFAQItem(editingId, form);
        if (updated) {
          setItems((current) => current.map((item) => (item.id === editingId ? updated : item)));
        }
      } else {
        const created = await createFAQItem(form);
        setItems((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(item: FAQItem) {
    startTransition(async () => {
      await deleteFAQItem(item.id);
      setItems((current) => current.filter((i) => i.id !== item.id));
      setDeleteTarget(null);
    });
  }

  function handleTogglePublished(item: FAQItem) {
    setPendingId(item.id);
    startTransition(async () => {
      const updated = await toggleFAQItemPublished(item.id, !item.published);
      if (updated) {
        setItems((current) => current.map((i) => (i.id === item.id ? updated : i)));
      }
      setPendingId(null);
    });
  }

  function handleMove(item: FAQItem, direction: "up" | "down") {
    setPendingId(item.id);
    startTransition(async () => {
      await moveFAQItem(item.id, direction);
      setItems((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((i) => i.id === item.id);
        const neighborIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return current;
        const nextSortOrder = sorted[neighborIndex].sortOrder;
        const currentSortOrder = sorted[index].sortOrder;
        return current.map((i) => {
          if (i.id === sorted[index].id) return { ...i, sortOrder: nextSortOrder };
          if (i.id === sorted[neighborIndex].id) return { ...i, sortOrder: currentSortOrder };
          return i;
        });
      });
      setPendingId(null);
    });
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: DataTableColumn<FAQItem>[] = [
    { key: "question", header: "Pergunta", render: (row) => row.question },
    {
      key: "published",
      header: "Publicado",
      render: (row) => (
        <button type="button" onClick={() => handleTogglePublished(row)} disabled={isPending && pendingId === row.id}>
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
        const index = sorted.findIndex((i) => i.id === row.id);
        return (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={index <= 0 || isPending} onClick={() => handleMove(row, "up")} aria-label="Mover para cima">
              ↑
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={index === -1 || index >= sorted.length - 1 || isPending} onClick={() => handleMove(row, "down")} aria-label="Mover para baixo">
              ↓
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {items.length} pergunta{items.length === 1 ? "" : "s"} cadastrada{items.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Nova pergunta</Button>
      </div>

      <DataTable
        columns={columns}
        rows={sorted}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState title="Nenhuma pergunta cadastrada" description="Cadastre as perguntas frequentes exibidas na landing." />
        }
        rowActions={(row) => (
          <>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Pergunta</Label>
              <Input id="faq-question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Resposta</Label>
              <Textarea id="faq-answer" rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="faq-published"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="faq-published" className="font-normal">
                Publicado (visível no site)
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
        title="Excluir pergunta"
        description={`Tem certeza que deseja excluir "${deleteTarget?.question}"?`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
