import { PageHeader } from "@/components/admin/page-header";
import { ContentManager as ContentEditor } from "@/components/admin/content-manager";
export const metadata = { title: "Gerenciar conteúdo" };
export default function ContentPage() { return <main><PageHeader eyebrow="CMS interno" title="Conteúdo da landing page" description="Edite e publique os textos das principais seções sem alterar o código." /><ContentEditor /></main>; }
