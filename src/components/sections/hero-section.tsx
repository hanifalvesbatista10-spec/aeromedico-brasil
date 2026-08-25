import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";
import type { Profile, SocialProofStat } from "@/lib/types";

export function HeroSection({
  profile,
  followersStat,
}: {
  profile: Profile;
  followersStat: SocialProofStat | undefined;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24 lg:px-8">
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
            {profile.name} · {profile.role}
          </p>
          <h1 className="mt-4 text-hero font-heading font-bold text-navy-950">
            Conhecimento que prepara profissionais para os desafios do
            transporte aeromédico.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gray-600">
            Educação, ciência e experiência aplicadas à formação de
            profissionais que atuam na urgência, emergência e aviação
            médica.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/formacoes" className={cn(buttonVariants({ size: "lg" }))}>
              Conheça os cursos
            </Link>
            <Link
              href="/palestras"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Contrate uma palestra
            </Link>
          </div>

          {followersStat && (
            <p className="mt-8 text-sm text-gray-600">
              <span className="font-semibold text-navy-950">
                Comunidade com {followersStat.value.replace("+", "mais de ")}
              </span>{" "}
              no Instagram
            </p>
          )}
        </Reveal>

        <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-navy-950 lg:aspect-square">
          <TechnicalLines className="absolute inset-0 h-full w-full text-navy-500/25" />
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={profile.name}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="font-heading text-2xl font-bold tracking-tight text-white">
                Aeromédico Brasil
              </span>
              <span className="text-sm text-navy-500/80">
                Foto profissional em breve
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TechnicalLines({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <line x1="0" y1="80" x2="400" y2="80" />
      <line x1="0" y1="200" x2="400" y2="140" />
      <line x1="0" y1="320" x2="400" y2="360" />
      <circle cx="60" cy="80" r="3" fill="currentColor" stroke="none" />
      <circle cx="340" cy="140" r="3" fill="currentColor" stroke="none" />
      <circle cx="120" cy="320" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
