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
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  createSpeakingTopic,
  updateSpeakingTopic,
  deleteSpeakingTopic,
  type SpeakingTopicFormInput,
} from "@/lib/actions/speaking-topics";
import type { SpeakingKind, SpeakingTopic } from "@/lib/types";

const kindLabels: Record<SpeakingKind, string> = {
  palestra: "Palestra",
  treinamento: "Treinamento",
  evento: "Evento",
  aula: "Aula",
  mentoria: "Mentoria",
};

const emptyForm: SpeakingTopicFormInput = {
  kind: "palestra",
  title: "",
  description: "",
};

export function SpeakingManager({ initialTopics }: { initialTopics: SpeakingTopic[] }) {
  const [topics, setTopics] = useState(initialTopics);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpeakingTopicFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<SpeakingTopic | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(topic: SpeakingTopic) {
    setEditingId(topic.id);
    setForm({ kind: topic.kind, title: topic.title, description: topic.description });
    setFormOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingId) {
        const updated = await updateSpeakingTopic(editingId, form);
        if (updated) {
          setTopics((current) =>
            current.map((item) => (item.id === editingId ? updated : item))
          );
        }
      } else {
        const created = await createSpeakingTopic(form);
        setTopics((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(topic: SpeakingTopic) {
    startTransition(async () => {
      await deleteSpeakingTopic(topic.id);
      setTopics((current) => current.filter((item) => item.id !== topic.id));
      setDeleteTarget(null);
    });
  }

  const columns: DataTableColumn<SpeakingTopic>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "kind", header: "Tipo", render: (row) => kindLabels[row.kind] },
    { key: "description", header: "Descrição", render: (row) => row.description },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {topics.length} formato{topics.length === 1 ? "" : "s"} cadastrado
          {topics.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo formato</Button>
      </div>

      <DataTable
        columns={columns}
        rows={topics}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            title="Nenhum formato cadastrado"
            description="Cadastre os formatos de palestra, treinamento ou mentoria oferecidos."
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar formato" : "Novo formato"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic-kind">Tipo</Label>
              <select
                id="topic-kind"
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as SpeakingKind })}
              >
                <option value="palestra">Palestra</option>
                <option value="treinamento">Treinamento</option>
                <option value="evento">Evento</option>
                <option value="aula">Aula</option>
                <option value="mentoria">Mentoria</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-title">Título</Label>
              <Input
                id="topic-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-description">Descrição</Label>
              <Textarea
                id="topic-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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
        title="Excluir formato"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"?`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
