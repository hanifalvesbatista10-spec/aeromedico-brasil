"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Material = { id: string; title: string; slug: string; description: string | null; status: "draft" | "published" | "archived"; created_at: string };

export function MaterialManager() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try { const response = await fetch("/api/admin/materials", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setMaterials(body.data ?? []); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os materiais."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setUploading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try { const response = await fetch("/api/admin/materials", { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error); event.currentTarget.reset(); await load(); setMessage("Material enviado e salvo como rascunho."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar o material."); }
    finally { setUploading(false); }
  }

  async function remove(material: Material) {
    if (!window.confirm(`Excluir “${material.title}” e seu arquivo?`)) return;
    const response = await fetch(`/api/admin/materials/${material.id}`, { method: "DELETE" });
    if (response.ok) { await load(); setMessage("Material excluído."); }
    else { const body = await response.json(); setMessage(body.error ?? "Não foi possível excluir."); }
  }

  return <>
    {message && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
    <form onSubmit={upload} className="mb-6 rounded-2xl border-2 border-dashed border-red-200 bg-white p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-semibold text-slate-600">Título<Input required name="title" className="mt-2" placeholder="Guia de carreira aeromédica" /></label><label className="text-xs font-semibold text-slate-600">Slug<Input required name="slug" pattern="[a-z0-9-]+" className="mt-2" placeholder="guia-carreira-aeromedica" /></label><div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}><FileText className="size-4" /> Selecionar PDF</Button></div></div>
      <label className="mt-4 block text-xs font-semibold text-slate-600">Descrição<textarea name="description" className="focus-ring mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-4 text-sm font-normal" /></label>
      <input ref={fileRef} required name="file" type="file" accept="application/pdf" className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-red-50 file:px-4 file:py-2 file:font-semibold file:text-red-700" />
      <div className="mt-5 flex justify-end"><Button disabled={uploading}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Enviar material</Button></div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold">Biblioteca</h2><p className="mt-1 text-xs text-slate-400">PDFs armazenados com segurança no Supabase Storage.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="size-4" /> Atualizar</Button></div>
      {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="size-6 animate-spin text-red-600" /></div> : materials.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Nenhum material cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-[.14em] text-slate-400"><tr><th className="px-5 py-3">Material</th><th className="px-5 py-3">Slug</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Criado em</th><th className="px-5 py-3" /></tr></thead><tbody>{materials.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600"><FileText className="size-4" /></span><strong className="text-xs">{item.title}</strong></span></td><td className="px-5 py-4 text-xs text-slate-500">{item.slug}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold">{item.status === "published" ? "Publicado" : item.status === "draft" ? "Rascunho" : "Arquivado"}</span></td><td className="px-5 py-4 text-xs text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(item.created_at))}</td><td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove(item)}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
