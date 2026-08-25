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
  createContentPost,
  updateContentPost,
  deleteContentPost,
  type ContentPostFormInput,
} from "@/lib/actions/content-posts";
import type { ContentKind, ContentPost } from "@/lib/types";

const kindLabels: Record<ContentKind, string> = {
  artigo: "Artigo",
  video: "Vídeo",
  "link-externo": "Link externo",
};

const emptyForm: ContentPostFormInput = {
  title: "",
  kind: "artigo",
  category: "",
  summary: "",
  coverUrl: null,
  author: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  externalUrl: null,
};

export function ContentManager({ initialPosts }: { initialPosts: ContentPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ContentPostFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingSlug(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(post: ContentPost) {
    setEditingSlug(post.slug);
    setForm({
      title: post.title,
      kind: post.kind,
      category: post.category,
      summary: post.summary,
      coverUrl: post.coverUrl,
      author: post.author,
      publishedAt: post.publishedAt,
      externalUrl: post.externalUrl,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingSlug) {
        const updated = await updateContentPost(editingSlug, form);
        if (updated) {
          setPosts((current) =>
            current.map((post) => (post.slug === editingSlug ? updated : post))
          );
        }
      } else {
        const created = await createContentPost(form);
        setPosts((current) => [...current, created]);
      }
      setFormOpen(false);
    });
  }

  function handleDelete(post: ContentPost) {
    startTransition(async () => {
      await deleteContentPost(post.slug);
      setPosts((current) => current.filter((item) => item.slug !== post.slug));
      setDeleteTarget(null);
    });
  }

  const columns: DataTableColumn<ContentPost>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "category", header: "Categoria", render: (row) => row.category },
    {
      key: "kind",
      header: "Tipo",
      render: (row) => <Badge variant="secondary">{kindLabels[row.kind]}</Badge>,
    },
    { key: "publishedAt", header: "Publicado em", render: (row) => row.publishedAt },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <p className="text-sm text-gray-600">
          {posts.length} conteúdo{posts.length === 1 ? "" : "s"} cadastrado
          {posts.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo conteúdo</Button>
      </div>

      <DataTable
        columns={columns}
        rows={posts}
        getRowId={(row) => row.slug}
        emptyState={
          <EmptyState
            title="Nenhum conteúdo cadastrado"
            description="Clique em “Novo conteúdo” para publicar o primeiro artigo, vídeo ou link."
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
            <DialogTitle>{editingSlug ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Título</Label>
              <Input
                id="post-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="post-kind">Tipo</Label>
                <select
                  id="post-kind"
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.kind}
                  onChange={(e) =>
                    setForm({ ...form, kind: e.target.value as ContentKind })
                  }
                >
                  <option value="artigo">Artigo</option>
                  <option value="video">Vídeo</option>
                  <option value="link-externo">Link externo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-category">Categoria</Label>
                <Input
                  id="post-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-summary">Resumo</Label>
              <Textarea
                id="post-summary"
                rows={3}
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="post-author">Autor</Label>
                <Input
                  id="post-author"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-date">Data de publicação</Label>
                <Input
                  id="post-date"
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                />
              </div>
            </div>
            {form.kind === "link-externo" && (
              <div className="space-y-2">
                <Label htmlFor="post-external-url">Link externo</Label>
                <Input
                  id="post-external-url"
                  value={form.externalUrl ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, externalUrl: e.target.value || null })
                  }
                  placeholder="https://..."
                />
              </div>
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
        title="Excluir conteúdo"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
