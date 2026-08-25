"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/formacoes": "Formações",
  "/admin/conteudos": "Conteúdos",
  "/admin/depoimentos": "Depoimentos",
  "/admin/palestras": "Palestras",
  "/admin/leads": "Leads",
  "/admin/configuracoes": "Configurações",
};

function resolveTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  const match = Object.keys(titles)
    .filter((path) => path !== "/admin" && pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? titles[match] : "Painel";
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="font-heading text-lg font-semibold text-navy-950">
        {resolveTitle(pathname)}
      </h1>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sair
      </Button>
    </header>
  );
}
