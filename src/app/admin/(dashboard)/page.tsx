import { getRepositories } from "@/lib/repositories";
import { getCtaEventsCount } from "@/lib/analytics/cta-events";
import { MetricCard } from "@/components/admin/metric-card";
import { formatDate } from "@/lib/utils/format-date";

export default async function AdminDashboardPage() {
  const repositories = getRepositories();
  const [programs, contentPosts, testimonials, leads, ctaClicks] = await Promise.all([
    repositories.programs.list(),
    repositories.contentPosts.list(),
    repositories.testimonials.list(),
    repositories.leads.list(),
    getCtaEventsCount(),
  ]);

  const publishedPrograms = programs.filter((p) => p.published).length;
  const publishedContent = contentPosts.filter((p) => p.published).length;
  const testimonialsAwaitingPublication = testimonials.filter((t) => !t.published).length;
  const newLeads = leads.filter((lead) => lead.status === "novo").length;
  const speakingRequests = leads.filter((lead) => lead.origin === "palestra").length;
  const recentLeads = [...leads]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total de leads" value={leads.length} />
        <MetricCard label="Novos leads" value={newLeads} />
        <MetricCard label="Cliques em CTAs" value={ctaClicks} />
        <MetricCard label="Formações publicadas" value={publishedPrograms} />
        <MetricCard label="Conteúdos publicados" value={publishedContent} />
        <MetricCard
          label="Depoimentos aguardando publicação"
          value={testimonialsAwaitingPublication}
        />
        <MetricCard label="Solicitações de palestra" value={speakingRequests} />
      </div>

      <div>
        <h2 className="font-heading text-base font-semibold text-navy-950">
          Atividade recente
        </h2>
        {recentLeads.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-background">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-navy-950">{lead.name}</p>
                  <p className="text-xs text-gray-600">{lead.interest}</p>
                </div>
                <p className="text-xs text-gray-600">{formatDate(lead.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            Nenhum lead recebido ainda.
          </p>
        )}
      </div>
    </div>
  );
}
