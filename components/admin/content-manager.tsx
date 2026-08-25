"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Section = { sectionKey: string; label: string; title: string; body: string; status: "draft" | "published" | "archived" };
const defaults: Section[] = [
  { sectionKey: "hero", label: "Hero principal", title: "O mundo aeromédico começa antes do voo.", body: "Formação, carreira e conteúdo para profissionais que querem compreender o ambiente e elevar a assistência.", status: "published" },
  { sectionKey: "about", label: "Sobre o projeto", title: "Vivência de campo transformada em clareza.", body: "Apresente o posicionamento, a experiência e os diferenciais do projeto.", status: "published" },
  { sectionKey: "final-cta", label: "Chamada final", title: "Sua preparação não começa na aeronave.", body: "Convide o visitante para a próxima ação com uma mensagem direta.", status: "published" },
];

export function ContentManager() {
  const [sections, setSections] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try { const response = await fetch("/api/admin/content", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); if (body.data?.length) setSections(defaults.map((section) => { const saved = body.data.find((row: { section_key: string }) => row.section_key === section.sectionKey); return saved ? { ...section, title: saved.title, body: saved.body ?? "", status: saved.status } : section; })); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar o conteúdo."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sections.map(({ sectionKey, title, body, status }) => ({ sectionKey, title, body, status }))) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setMessage("Conteúdo salvo e publicado no CMS."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar o conteúdo."); }
    finally { setSaving(false); }
  }

  function update(index: number, patch: Partial<Section>) { setSections((current) => current.map((section, position) => position === index ? { ...section, ...patch } : section)); }

  return <form onSubmit={save}>
    <div className="mb-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => void load()}><RefreshCw className="size-4" /> Recarregar</Button><Button disabled={saving || loading}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar alterações</Button></div>
    {message && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
    {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-7 animate-spin text-red-600" /></div> : <div className="space-y-4">{sections.map((section, index) => <section key={section.sectionKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-[.16em] text-red-600">{section.sectionKey}</span><h2 className="mt-1 font-bold">{section.label}</h2></div><select className="focus-ring h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs" value={section.status} onChange={(e) => update(index, { status: e.target.value as Section["status"] })}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></div><div className="mt-5 grid gap-4"><label className="text-xs font-semibold text-slate-600">Título<Input required className="mt-2" value={section.title} onChange={(e) => update(index, { title: e.target.value })} /></label><label className="text-xs font-semibold text-slate-600">Descrição<textarea required className="focus-ring mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-4 text-sm font-normal" value={section.body} onChange={(e) => update(index, { body: e.target.value })} /></label></div></section>)}</div>}
  </form>;
}
