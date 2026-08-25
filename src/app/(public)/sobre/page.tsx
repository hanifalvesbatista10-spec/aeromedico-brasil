import type { Metadata } from "next";
import Image from "next/image";
import { getRepositories } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça a trajetória de Lucio Macêdo: enfermeiro, mestre em Ensino na Saúde e especialista em transporte aeromédico e APH.",
};

export default async function SobrePage() {
  const { profile } = await getRepositories().settings.get();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Sobre
      </p>
      <h1 className="mt-3 text-h1 font-heading font-bold text-navy-950">
        {profile.name}
      </h1>
      <p className="mt-2 text-base text-gray-600">{profile.role}</p>

      <div className="relative mt-10 aspect-3/4 max-w-md overflow-hidden rounded-lg bg-navy-950 sm:aspect-video sm:max-w-none">
        {profile.photoUrl ? (
          <Image
            src={profile.photoUrl}
            alt={profile.name}
            fill
            className="object-contain"
            sizes="(min-width: 640px) 768px, 448px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-heading text-lg font-semibold text-white">
              Foto profissional em breve
            </span>
          </div>
        )}
      </div>

      <p className="mt-10 text-base leading-relaxed text-gray-600">
        {profile.longBio}
      </p>

      <h2 className="mt-12 text-h4 font-heading font-semibold text-navy-950">
        Formação e atuação
      </h2>
      <ul className="mt-4 space-y-3 border-t border-gray-300 pt-4">
        {profile.credentials.map((credential) => (
          <li
            key={credential}
            className="border-l-2 border-navy-700 pl-4 text-sm text-gray-600"
          >
            {credential}
          </li>
        ))}
      </ul>
    </div>
  );
}
