import { PageHeader } from "@/components/admin/page-header";
import { CourseManager } from "@/components/admin/course-manager";
export const metadata = { title: "Gerenciar cursos" };
export default function CoursesPage() { return <main><PageHeader eyebrow="Catálogo comercial" title="Cursos e produtos" description="Cadastre produtos, defina preço, duração, capa e destino do checkout." /><CourseManager /></main>; }
