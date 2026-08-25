"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type Course = { id: string; slug: string; title: string; description: string | null; price_cents: number; duration: string | null; format: string | null; checkout_url: string | null; cover_url: string | null; featured: boolean; status: "draft" | "published" | "archived" };
const emptyForm = { title: "", slug: "", description: "", price: "", duration: "", format: "Online", checkoutUrl: "", coverUrl: "", featured: false, status: "draft" as Course["status"] };

export function CourseManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/courses", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setCourses(body.data ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os cursos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function startEdit(course?: Course) {
    if (course) {
      setEditingId(course.id);
      setForm({ title: course.title, slug: course.slug, description: course.description ?? "", price: (course.price_cents / 100).toFixed(2).replace(".", ","), duration: course.duration ?? "", format: course.format ?? "", checkoutUrl: course.checkout_url ?? "", coverUrl: course.cover_url ?? "", featured: course.featured, status: course.status });
    } else { setEditingId(null); setForm(emptyForm); }
    setMessage(""); setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const payload: Record<string, unknown> = { title: form.title, slug: form.slug, description: form.description, priceCents: Math.round(Number(form.price.replace(",", ".")) * 100), duration: form.duration, format: form.format, checkoutUrl: form.checkoutUrl, coverUrl: form.coverUrl, featured: form.featured, status: form.status };
    if (editingId) delete payload.slug;
    try {
      const response = await fetch(editingId ? `/api/admin/courses/${editingId}` : "/api/admin/courses", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setOpen(false); await load(); setMessage(editingId ? "Curso atualizado com sucesso." : "Curso criado com sucesso.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function remove(course: Course) {
    if (!window.confirm(`Excluir “${course.title}”? Essa ação não pode ser desfeita.`)) return;
    const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    if (response.ok) { await load(); setMessage("Curso excluído."); }
    else { const body = await response.json(); setMessage(body.error ?? "Não foi possível excluir."); }
  }

  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{loading ? "Sincronizando catálogo…" : `${courses.length} curso(s) cadastrado(s)`}</p><div className="flex gap-2"><Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" /> Atualizar</Button><Button onClick={() => startEdit()}><Plus className="size-4" /> Novo curso</Button></div></div>
    {message && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
    {open && <form onSubmit={save} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><h2 className="font-bold">{editingId ? "Editar curso" : "Novo curso"}</h2><button type="button" aria-label="Fechar formulário" onClick={() => setOpen(false)}><X className="size-5" /></button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Título<Input required className="mt-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Slug<Input required disabled={Boolean(editingId)} className="mt-2" placeholder="nome-do-curso" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></label>
        <label className="text-xs font-semibold text-slate-600">Preço (R$)<Input required inputMode="decimal" className="mt-2" placeholder="497,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Duração<Input className="mt-2" placeholder="8 semanas" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Formato<Input className="mt-2" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Status<select className="focus-ring mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Course["status"] })}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">Link de checkout<Input className="mt-2" type="url" placeholder="https://..." value={form.checkoutUrl} onChange={(e) => setForm({ ...form, checkoutUrl: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">URL da capa<Input className="mt-2" type="url" placeholder="https://..." value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">Descrição<textarea className="focus-ring mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm font-normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destacar na landing page</label>
      </div>
      <div className="mt-5 flex justify-end"><Button disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar curso</Button></div>
    </form>}
    {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-7 animate-spin text-red-600" /></div> : courses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Nenhum curso cadastrado. Use “Novo curso” para iniciar o catálogo.</div> : <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">{courses.map((course) => <article key={course.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="h-2 bg-red-600" /><div className="p-5"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.16em] text-red-600">{course.format || "Curso"}</span><h2 className="mt-2 text-lg font-bold text-slate-900">{course.title}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{course.status === "published" ? "Publicado" : course.status === "draft" ? "Rascunho" : "Arquivado"}</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{course.description || "Sem descrição."}</p><div className="mt-5 flex items-end justify-between"><div><strong className="text-xl">{formatCurrency(course.price_cents / 100)}</strong><span className="block text-xs text-slate-400">{course.duration || "Duração não informada"}</span></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => startEdit(course)}><Edit3 className="size-3.5" /> Editar</Button><Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove(course)}><Trash2 className="size-3.5" /></Button></div></div></div></article>)}</div>}
  </>;
}
