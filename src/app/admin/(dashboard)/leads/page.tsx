import { getRepositories } from "@/lib/repositories";
import { LeadsManager } from "@/components/admin/leads-manager";

export default async function AdminLeadsPage() {
  const leads = await getRepositories().leads.list();
  return <LeadsManager initialLeads={leads} />;
}
