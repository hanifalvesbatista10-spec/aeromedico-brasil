import { PageHeader } from "@/components/admin/page-header";
import { MaterialManager } from "@/components/admin/material-manager";
export const metadata = { title: "Materiais gratuitos" };
export default function MaterialsPage() { return <main><PageHeader eyebrow="Captação de leads" title="Materiais gratuitos" description="Envie PDFs e e-books para o Storage e gerencie a biblioteca disponível para captação." /><MaterialManager /></main>; }
