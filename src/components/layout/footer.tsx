import Link from "next/link";
import { AtSign } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks } from "./nav-links";
import type { SiteSettings } from "@/lib/types";

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-brand-red bg-brand-navy-deep">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo size={44} wordmarkClassName="text-white" />
          <p className="mt-4 max-w-sm text-sm text-white/70">
            {settings.profile.shortBio}
          </p>
          <a
            href={settings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
          >
            <AtSign className="size-4" aria-hidden="true" />
            {settings.profile.instagramHandle}
          </a>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Navegação</p>
          <ul className="mt-3 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Contato</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <a
                href={`mailto:${settings.email}`}
                className="break-words hover:text-white"
              >
                {settings.email}
              </a>
            </li>
            <li>
              <Link href="/politica-de-privacidade" className="hover:text-white">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos-de-uso" className="hover:text-white">
                Termos de Uso
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs text-white/60">
            © {year} Aeromédico Brasil. Todos os direitos reservados.
          </p>
          <p className="mt-2 max-w-3xl text-xs text-white/60">
            {settings.footerNote}
          </p>
        </div>
      </div>
    </footer>
  );
}
