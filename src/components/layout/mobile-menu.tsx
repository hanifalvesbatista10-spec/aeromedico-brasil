"use client";

import Link from "next/link";
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
import { navLinks } from "./nav-links";
import { cn } from "@/lib/utils";
import type { CTAConfig } from "@/lib/types";

export function MobileMenu({ primaryCta }: { primaryCta: CTAConfig }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menu de navegação"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "md:hidden"
        )}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="w-4/5 border-l border-border">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav
          aria-label="Navegação principal"
          className="flex flex-col gap-1 px-4"
        >
          {navLinks.map((link) => (
            <SheetClose key={link.href} render={<Link href={link.href} />}>
              <span className="block rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted">
                {link.label}
              </span>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <SheetClose
            render={<Link href={primaryCta.href} />}
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            {primaryCta.label}
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
