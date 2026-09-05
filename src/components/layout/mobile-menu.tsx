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
import { Logo } from "@/components/logo";
import { navLinks } from "./nav-links";
import { cn } from "@/lib/utils";
import type { CTAConfig } from "@/lib/types";

export function MobileMenu({ primaryCta }: { primaryCta: CTAConfig }) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menu de navegação"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-white hover:bg-white/10 hover:text-white lg:hidden"
        )}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="w-4/5 border-l border-border">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Logo size={32} />
        </SheetHeader>
        <nav
          aria-label="Navegação principal"
          className="flex flex-col gap-1 px-4"
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <SheetClose
                key={link.href}
                nativeButton={false}
                render={<Link href={link.href} />}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium hover:bg-muted",
                    isActive ? "text-brand-red" : "text-foreground"
                  )}
                >
                  {isActive && (
                    <span
                      className="size-1.5 rounded-full bg-brand-red"
                      aria-hidden="true"
                    />
                  )}
                  {link.label}
                </span>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <SheetClose
            nativeButton={false}
            render={<Link href={primaryCta.href} />}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "w-full")}
          >
            {primaryCta.label}
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
