import {
  LayoutDashboard,
  GraduationCap,
  Newspaper,
  Quote,
  Mic,
  Users,
  FolderOpen,
  ShoppingBag,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/formacoes", label: "Formações", icon: GraduationCap },
  { href: "/admin/conteudos", label: "Conteúdos", icon: Newspaper },
  { href: "/admin/depoimentos", label: "Depoimentos", icon: Quote },
  { href: "/admin/loja", label: "Loja", icon: ShoppingBag },
  { href: "/admin/palestras", label: "Palestras", icon: Mic },
  { href: "/admin/materiais", label: "Materiais", icon: FolderOpen },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export const adminTitles: Record<string, string> = Object.fromEntries(
  adminNavItems.map((item) => [item.href, item.label])
);
