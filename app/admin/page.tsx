import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { PageHeader } from "@/components/admin/page-header";
export const metadata = { title: "Dashboard" };
export default function AdminDashboard() { return <main><PageHeader eyebrow="Visão geral" title="Dashboard" description="Acompanhe os principais indicadores de aquisição, conteúdo e vendas da plataforma." /><DashboardOverview /></main>; }
