"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const navigation = [
  ["Atuação", "#atuacao"],
  ["Materiais", "#materiais"],
  ["Cursos", "#cursos"],
  ["Sobre", "#sobre"],
  ["Dúvidas", "#faq"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="absolute inset-x-0 top-0 z-50 border-b border-white/10 bg-[#03111d]/78 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg text-white" aria-label="Aeromédico Brasil — início">
          <BrandLogo className="size-12 shrink-0 border-2 border-white/15 shadow-lg" priority />
          <span className="leading-none"><strong className="display-font block text-lg tracking-[.08em]">AEROMÉDICO</strong><span className="text-[10px] font-semibold tracking-[.42em] text-[#ef9a9d]">BRASIL</span></span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {navigation.map(([label, href]) => <Link key={href} href={href} className="focus-ring rounded text-sm font-medium text-slate-300 transition hover:text-white">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/admin/login" className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white">Área do ADM</Link>
          <Link href="#cursos" className={cn(buttonVariants({ size: "sm" }))}>Ver formações</Link>
        </div>
        <button className="focus-ring rounded-lg p-2 text-white lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#071b2c] px-4 py-5 lg:hidden">
          <nav className="mx-auto flex max-w-lg flex-col gap-2">
            {navigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="focus-ring rounded-xl px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/5">{label}</Link>)}
            <Link href="/admin/login" className="focus-ring mt-2 rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white">Área do ADM</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
