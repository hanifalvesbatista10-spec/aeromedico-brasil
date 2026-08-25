"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { adminNavItems } from "./admin-nav-items";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação do painel administrativo"
      className="hidden h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-background p-4 md:flex"
    >
      <div className="mb-4 px-2">
        <Logo size={28} wordmarkClassName="text-sm" />
      </div>
      {adminNavItems.map((item) => {
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
