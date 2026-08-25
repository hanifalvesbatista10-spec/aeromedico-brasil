import { getRepositories } from "@/lib/repositories";
import { ProgramsManager } from "@/components/admin/programs-manager";

export default async function AdminFormacoesPage() {
  const programs = await getRepositories().programs.list();
  return <ProgramsManager initialPrograms={programs} />;
}
