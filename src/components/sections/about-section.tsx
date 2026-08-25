import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AboutSection({ profile }: { profile: Profile }) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24 lg:px-8">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 lg:order-first">
          {profile.photoUrl ? (
            <Image
              src={profile.photoUrl}
              alt={profile.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center">
              <span className="font-heading text-xl font-semibold text-gray-600">
                Aeromédico Brasil
              </span>
            </div>
          )}
        </div>

        <Reveal>
          <h2 className="text-h2 font-heading font-bold text-navy-950">
            Experiência, educação e propósito no atendimento aeromédico.
          </h2>
          <p className="mt-4 text-base text-gray-600">
            {profile.credentials.join(" · ")}
          </p>
          <p className="mt-6 text-base text-gray-600">{profile.shortBio}</p>
          <Link
            href="/sobre"
            className={cn(buttonVariants({ variant: "outline" }), "mt-8")}
          >
            Conheça a trajetória
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
