"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, FileText, GraduationCap, LayoutDashboard, LogOut, Menu, Plane, Settings, Users, X } from "lucide-react";
import { AdminProvider, useAdmin } from "@/context/admin-context";
import { cn } from "@/lib/utils";

const links = [
  ["Visão geral", "/admin", LayoutDashboard],
  ["Conteúdo", "/admin/conteudo", FileText],
  ["Materiais", "/admin/materiais", BookOpen],
  ["Cursos", "/admin/cursos", GraduationCap],
  ["Leads", "/admin/leads", Users],
  ["Relatórios", "/admin/relatorios", BarChart3],
  ["Configurações", "/admin/configuracoes", Settings],
] as const;

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAdmin();
  if (pathname === "/admin/login") return <>{children}</>;
  return <div className="min-h-screen bg-[#f4f7fa] text-[#07182b]">
    {sidebarOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-[#04101d]/55 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#07182b] text-white transition-transform lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6"><Link href="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#0c2944] text-[#38c5ea]"><Plane className="size-5 -rotate-12" /></span><span><strong className="display-font block text-sm tracking-[.08em]">AEROMÉDICO</strong><small className="tracking-[.28em] text-[#8fe9ff]">ADMIN</small></span></Link><button onClick={() => setSidebarOpen(false)} className="p-2 lg:hidden" aria-label="Fechar menu"><X className="size-5" /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">{links.map(([label, href, Icon]) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition", active ? "bg-[#1175d1] text-white shadow-lg" : "text-slate-400 hover:bg-white/5 hover:text-white")}><Icon className="size-4" />{label}</Link>; })}</nav>
      <div className="border-t border-white/10 p-4"><Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LogOut className="size-4" /> Sair do painel</Link></div>
    </aside>
    <div className="lg:pl-72"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-7"><button className="rounded-xl border border-slate-200 p-2.5 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu className="size-5" /></button><div className="hidden sm:block"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Central de gestão</p><strong className="text-sm">Aeromédico Brasil</strong></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><strong className="block text-xs">Administrador</strong><span className="text-[11px] text-slate-400">Modo demonstrativo</span></div><span className="grid size-10 place-items-center rounded-full bg-[#07182b] text-xs font-black text-white">ADM</span></div></header><div className="p-4 sm:p-7 lg:p-9">{children}</div></div>
  </div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) { return <AdminProvider><Shell>{children}</Shell></AdminProvider>; }
