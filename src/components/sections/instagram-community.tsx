import { AtSign } from "lucide-react";
import type { Profile, SiteSettings } from "@/lib/types";

export function InstagramCommunity({
  profile,
  settings,
}: {
  profile: Profile;
  settings: SiteSettings;
}) {
  const followers = settings.stats.find((stat) => stat.id === "followers");

  return (
    <section className="border-b border-navy-900 bg-navy-950">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20 lg:px-8">
        <AtSign className="mx-auto size-8 text-sky-500" aria-hidden="true" />
        <p className="mt-4 font-heading text-h3 font-semibold text-white">
          {profile.instagramHandle}
        </p>
        {followers && (
          <p className="mt-1 text-sm text-sky-100/70">{followers.value}</p>
        )}
        <p className="mx-auto mt-4 max-w-lg text-sm text-sky-100/80">
          Conteúdo educacional e científico sobre transporte aeromédico e
          atendimento pré-hospitalar, publicado semanalmente.
        </p>
        <a
          href={settings.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-sky-500/40 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-900"
        >
          Acompanhar no Instagram
        </a>
      </div>
    </section>
  );
}
