"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { MobileMenu } from "./mobile-menu";
import { navLinks } from "./nav-links";
import { cn } from "@/lib/utils";
import type { CTAConfig } from "@/lib/types";

export function Header({ primaryCta }: { primaryCta: CTAConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sobre a Hero (vídeo escuro) o header flutua transparente; em qualquer
  // outro momento — rolado, ou em páginas sem Hero escura — assume o
  // azul-marinho profundo da marca. Nunca uma barra branca: a logomarca
  // permanece sempre sobre um fundo escuro, com o mesmo texto claro.
  const solid = scrolled || !isHome;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        solid
          ? "border-brand-red/70 bg-brand-navy-deep/95 shadow-sm backdrop-blur"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <Logo size={40} wordmarkClassName="hidden text-white sm:inline" />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-6 lg:flex"
        >
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                  isActive ? "text-white" : "text-white/75 hover:text-white"
                )}
              >
                {isActive && (
                  <span
                    className="size-1.5 rounded-full bg-brand-red"
                    aria-hidden="true"
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-white">
          <Link
            href={primaryCta.href}
            className={cn(buttonVariants({ variant: "brand" }), "hidden lg:inline-flex")}
          >
            {primaryCta.label}
          </Link>
          <MobileMenu primaryCta={primaryCta} />
        </div>
      </div>
    </header>
  );
}
