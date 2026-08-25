import type { ContentPost, Profile, Program, SiteSettings } from "@/lib/types";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function buildPersonJsonLd(profile: Profile) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    description: profile.shortBio,
    ...(profile.photoUrl ? { image: profile.photoUrl } : {}),
    url: `${siteUrl()}/sobre`,
  };
}

export function buildOrganizationJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aeromédico Brasil",
    url: siteUrl(),
    email: settings.email,
    sameAs: [settings.instagramUrl],
  };
}

export function buildCourseJsonLd(program: Program) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.title,
    description: program.shortDescription,
    provider: {
      "@type": "Organization",
      name: "Aeromédico Brasil",
      sameAs: siteUrl(),
    },
    ...(program.durationHours
      ? {
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: program.format === "online" ? "online" : "onsite",
            courseWorkload: `PT${program.durationHours}H`,
          },
        }
      : {}),
  };
}

export function buildArticleJsonLd(post: ContentPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    author: { "@type": "Person", name: post.author },
    datePublished: post.publishedAt,
    ...(post.coverUrl ? { image: post.coverUrl } : {}),
  };
}
