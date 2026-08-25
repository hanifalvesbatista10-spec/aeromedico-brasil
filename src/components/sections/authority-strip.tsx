import { Reveal } from "@/components/reveal";
import type { SocialProofStat } from "@/lib/types";

export function AuthorityStrip({ stats }: { stats: SocialProofStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="border-b border-navy-900 bg-navy-950" aria-label="Números de autoridade">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
        {stats.map((stat, index) => (
          <Reveal key={stat.id} delay={index * 0.08} className="text-center sm:text-left">
            <p className="font-heading text-2xl font-bold text-white">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-white/70">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
