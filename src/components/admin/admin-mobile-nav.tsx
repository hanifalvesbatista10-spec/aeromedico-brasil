"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminNavItems } from "./admin-nav-items";

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menu do painel"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-r border-border">
        <SheetHeader>
          <SheetTitle>Aeromédico Brasil</SheetTitle>
        </SheetHeader>
        <nav aria-label="Navegação do painel administrativo" className="flex flex-col gap-1 px-4">
          {adminNavItems.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <SheetClose
                key={item.href}
                nativeButton={false}
                render={<Link href={item.href} />}
              >
                <span
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
                    active ? "bg-navy-950 text-white" : "text-gray-600 hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </span>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
