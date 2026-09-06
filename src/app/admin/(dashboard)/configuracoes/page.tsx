import { getRepositories } from "@/lib/repositories";
import { SettingsManager } from "@/components/admin/settings-manager";

export default async function AdminConfiguracoesPage() {
  const repositories = getRepositories();
  const [settings, faqItems] = await Promise.all([
    repositories.settings.get(),
    repositories.faq.list(),
  ]);
  return <SettingsManager initialSettings={settings} faqItems={faqItems} />;
}
