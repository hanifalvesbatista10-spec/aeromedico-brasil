import { getRepositories } from "@/lib/repositories";
import { SettingsManager } from "@/components/admin/settings-manager";

export default async function AdminConfiguracoesPage() {
  const settings = await getRepositories().settings.get();
  return <SettingsManager initialSettings={settings} />;
}
