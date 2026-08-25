"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Lead = { id: string; name: string; email: string; material_id: string; source: string; consent_at: string; created_at: string };

export function LeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try { const response = await fetch("/api/admin/leads", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setLeads(body.data ?? []); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os leads."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const filtered = useMemo(() => leads.filter((lead) => `${lead.name} ${lead.email} ${lead.material_id}`.toLowerCase().includes(query.toLowerCase())), [leads, query]);

  function exportCsv() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [["Nome", "Email", "Material", "Origem", "Consentimento"], ...filtered.map((lead) => [lead.name, lead.email, lead.material_id, lead.source, lead.consent_at])];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `leads-aeromedico-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-10" placeholder="Buscar por nome, e-mail ou material" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" /> Atualizar</Button><Button onClick={exportCsv} disabled={!filtered.length}><Download className="size-4" /> Exportar CSV</Button></div>
    {message && <div className="m-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
    {loading ? <div className="grid min-h-44 place-items-center"><Loader2 className="size-6 animate-spin text-red-600" /></div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Nenhum lead encontrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-[.14em] text-slate-400"><tr><th className="px-5 py-3">Contato</th><th className="px-5 py-3">Material</th><th className="px-5 py-3">Origem</th><th className="px-5 py-3">Consentimento</th></tr></thead><tbody>{filtered.map((lead) => <tr key={lead.id} className="border-t border-slate-100"><td className="px-5 py-4"><strong className="block text-xs">{lead.name}</strong><span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400"><Mail className="size-3" />{lead.email}</span></td><td className="px-5 py-4 text-xs text-slate-600">{lead.material_id}</td><td className="px-5 py-4 text-xs text-slate-500">{lead.source}</td><td className="px-5 py-4 text-xs text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(lead.consent_at))}</td></tr>)}</tbody></table></div>}
  </section>;
}
