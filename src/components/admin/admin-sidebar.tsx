"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Newspaper,
  Quote,
  Mic,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/formacoes", label: "Formações", icon: GraduationCap },
  { href: "/admin/conteudos", label: "Conteúdos", icon: Newspaper },
  { href: "/admin/depoimentos", label: "Depoimentos", icon: Quote },
  { href: "/admin/palestras", label: "Palestras", icon: Mic },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação do painel administrativo"
      className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-background p-4"
    >
      <p className="mb-4 px-2 font-heading text-sm font-bold text-navy-950">
        Aeromédico Brasil
      </p>
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-navy-950 text-white"
                : "text-gray-600 hover:bg-muted hover:text-navy-950"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
