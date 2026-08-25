import { PageHeader } from "@/components/admin/page-header";
import { LeadManager } from "@/components/admin/lead-manager";
export const metadata = { title: "Leads capturados" };
export default function LeadsPage() { return <main><PageHeader eyebrow="Relacionamento" title="Leads capturados" description="Consulte contatos, identifique o material de origem e exporte a base com consentimento registrado." /><LeadManager /></main>; }
