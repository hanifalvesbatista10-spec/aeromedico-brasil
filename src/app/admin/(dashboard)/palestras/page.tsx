import { getRepositories } from "@/lib/repositories";
import { SpeakingManager } from "@/components/admin/speaking-manager";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils/format-date";

export default async function AdminPalestrasPage() {
  const repositories = getRepositories();
  const [topics, leads] = await Promise.all([
    repositories.speaking.list(),
    repositories.leads.list(),
  ]);
  const requests = leads
    .filter((lead) => lead.origin === "palestra")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-12">
      <section>
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Formatos de contratação
        </h2>
        <div className="mt-4">
          <SpeakingManager initialTopics={topics} />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Solicitações recebidas
        </h2>
        <div className="mt-4">
          {requests.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-600">Nome</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Contato</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Tema/evento</th>
                    <th className="px-4 py-2 font-medium text-gray-600">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((lead) => (
                    <tr key={lead.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{lead.name}</td>
                      <td className="px-4 py-2">
                        {lead.email} · {lead.phone}
                      </td>
                      <td className="px-4 py-2">{lead.interest}</td>
                      <td className="px-4 py-2">{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhuma solicitação recebida"
              description="Solicitações enviadas pelo formulário da página de Palestras aparecem aqui."
            />
          )}
        </div>
      </section>
    </div>
  );
}
