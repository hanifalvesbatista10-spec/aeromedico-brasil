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
  createContentPost,
  updateContentPost,
  deleteContentPost,
  toggleContentPostPublished,
  moveContentPost,
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
  body: null,
  coverUrl: null,
  author: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  externalUrl: null,
  featured: false,
  published: false,
  seoTitle: null,
  seoDescription: null,
};

export function ContentManager({ initialPosts }: { initialPosts: ContentPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"todos" | ContentKind>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ContentPostFormInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesTerm =
        !term ||
        post.title.toLowerCase().includes(term) ||
        post.category.toLowerCase().includes(term);
      const matchesKind = kindFilter === "todos" || post.kind === kindFilter;
      return matchesTerm && matchesKind;
    });
  }, [posts, search, kindFilter]);

  const sortedFiltered = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);

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
      body: post.body,
      coverUrl: post.coverUrl,
      author: post.author,
      publishedAt: post.publishedAt,
      externalUrl: post.externalUrl,
      featured: post.featured,
      published: post.published,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
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

  function handleTogglePublished(post: ContentPost) {
    setPendingSlug(post.slug);
    startTransition(async () => {
      const updated = await toggleContentPostPublished(post.slug, !post.published);
      if (updated) {
        setPosts((current) => current.map((item) => (item.slug === post.slug ? updated : item)));
      }
      setPendingSlug(null);
    });
  }

  function handleMove(post: ContentPost, direction: "up" | "down") {
    setPendingSlug(post.slug);
    startTransition(async () => {
      await moveContentPost(post.slug, direction);
      setPosts((current) => {
        const sorted = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
        const index = sorted.findIndex((item) => item.slug === post.slug);
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

  const columns: DataTableColumn<ContentPost>[] = [
    { key: "title", header: "Título", render: (row) => row.title },
    { key: "category", header: "Categoria", render: (row) => row.category },
    {
      key: "kind",
      header: "Tipo",
      render: (row) => <Badge variant="secondary">{kindLabels[row.kind]}</Badge>,
    },
    { key: "publishedAt", header: "Publicado em", render: (row) => row.publishedAt },
    {
      key: "published",
      header: "Status",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleTogglePublished(row)}
          disabled={isPending && pendingSlug === row.slug}
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
          {posts.length} conteúdo{posts.length === 1 ? "" : "s"} cadastrado
          {posts.length === 1 ? "" : "s"}.
        </p>
        <Button onClick={openCreate}>Novo conteúdo</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou categoria..."
          className="max-w-xs"
          aria-label="Buscar conteúdos"
        />
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as "todos" | ContentKind)}
          aria-label="Filtrar por tipo"
        >
          <option value="todos">Todos os tipos</option>
          <option value="artigo">Artigo</option>
          <option value="video">Vídeo</option>
          <option value="link-externo">Link externo</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={sortedFiltered}
        getRowId={(row) => row.slug}
        emptyState={
          <EmptyState
            title="Nenhum conteúdo encontrado"
            description="Ajuste a busca/filtro ou clique em “Novo conteúdo” para publicar o primeiro."
          />
        }
        rowActions={(row) => (
          <>
            {row.published && (
              <a
                href={
                  row.kind === "link-externo" && row.externalUrl
                    ? row.externalUrl
                    : `/conteudos/${row.slug}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-navy-700 underline-offset-2 hover:underline"
              >
                Ver
              </a>
            )}
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
            <div className="space-y-2">
              <Label htmlFor="post-body">
                Corpo completo (texto simples — exibido na página do conteúdo)
              </Label>
              <Textarea
                id="post-body"
                rows={8}
                value={form.body ?? ""}
                onChange={(e) => setForm({ ...form, body: e.target.value || null })}
              />
            </div>
            <MediaUploader
              label="Capa"
              value={form.coverUrl}
              onChange={(url) => setForm({ ...form, coverUrl: url })}
            />
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
            <div className="space-y-2">
              <Label htmlFor="post-seo-title">Título de SEO (opcional)</Label>
              <Input
                id="post-seo-title"
                value={form.seoTitle ?? ""}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value || null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-seo-description">Descrição de SEO (opcional)</Label>
              <Textarea
                id="post-seo-description"
                rows={2}
                value={form.seoDescription ?? ""}
                onChange={(e) =>
                  setForm({ ...form, seoDescription: e.target.value || null })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="post-featured"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              <Label htmlFor="post-featured" className="font-normal">
                Exibir em destaque na home
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="post-published"
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <Label htmlFor="post-published" className="font-normal">
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
        title="Excluir conteúdo"
        description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  );
}
