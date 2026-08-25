"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminMobileNav } from "./admin-mobile-nav";
import { adminTitles } from "./admin-nav-items";

function resolveTitle(pathname: string): string {
  if (adminTitles[pathname]) return adminTitles[pathname];
  const match = Object.keys(adminTitles)
    .filter((path) => path !== "/admin" && pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? adminTitles[match] : "Painel";
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <AdminMobileNav />
        <h1 className="font-heading text-lg font-semibold text-navy-950">
          {resolveTitle(pathname)}
        </h1>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sair
      </Button>
    </header>
  );
}
