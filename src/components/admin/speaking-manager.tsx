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
  createSpeakingTopic,
  updateSpeakingTopic,
  deleteSpeakingTopic,
  toggleSpeakingTopicPublished,
  moveSpeakingTopic,
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
  themes: [],
  hireUrl: null,
  published: true,
};

export function SpeakingManager({ initialTopics }: { initialTopics: SpeakingTopic[] }) {
  const [topics, setTopics] = useState([...initialTopics].sort((a, b) => a.sortOrder - b.sortOrder));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpeakingTopicFormInput>(emptyForm);
  const [themesText, setThemesText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SpeakingTopic | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setThemesText("");
    setFormOpen(true);
  }

  function openEdit(topic: SpeakingTopic) {
    setEditingId(topic.id);
    setForm({
      kind: topic.kind,
      title: topic.title,
      description: topic.description,
      themes: topic.themes,
      hireUrl: topic.hireUrl,
      published: topic.published,
    });
    setThemesText(topic.themes.join(", "));
    setFormOpen(true);
  }

  function handleSubmit() {
    const themes = themesText
      .split(",")
      .map((theme) => theme.trim())
      .filter(Boolean);
    const payload = { ...form, themes };

    startTransition(async () => {
      if (editingId) {
        const updated = await updateSpeakingTopic(editingId, payload);
        if (updated) {
          setTopics((current) =>
            current.map((item) => (item.id === editingId ? updated : item))
          );
        }
      } else {
        const created = await createSpeakingTopic(payload);
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

  function handleTogglePublished(topic: SpeakingTopic) {
    setPendingId(topic.id);
    startTransition(async () => {
      const updated = await toggleSpeakingTopicPublished(topic.id, !topic.published);
      if (updated) {
        setTopics((current) => current.map((item) => (item.id === topic.id ? updated : item)));
      }
      setPendingId(null);
    });
  }

  function handleMove(topic: SpeakingTopic, direction: "up" | "down") {
    setPendingId(topic.id);
    startTransition(async () => {
      await moveSpeakingTopic(topic.id, direction);
      setTopics((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((item) => item.id === topic.id);
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

  const sorted = [...topics].sort((a, b) => a.sortOrder - b.sortOrder);

  const columns: DataTableColumn<SpeakingTopic>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "kind", header: "Tipo", render: (row) => kindLabels[row.kind] },
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
          {topics.length} formato{topics.length === 1 ? "" : "s"} cadastrado
          {topics.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo formato</Button>
      </div>

      <DataTable
        columns={columns}
        rows={sorted}
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
            <div className="space-y-2">
              <Label htmlFor="topic-themes">Temas (separados por vírgula)</Label>
              <Input
                id="topic-themes"
                value={themesText}
                onChange={(e) => setThemesText(e.target.value)}
                placeholder="Fisiologia de voo, Biossegurança, Trabalho em equipe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-hire-url">Link de contratação (opcional)</Label>
              <Input
                id="topic-hire-url"
                value={form.hireUrl ?? ""}
                onChange={(e) => setForm({ ...form, hireUrl: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="topic-published"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="topic-published" className="font-normal">
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
        title="Excluir formato"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"?`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
