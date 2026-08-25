import type { MetadataRoute } from "next";
import { getRepositories } from "@/lib/repositories";

const staticRoutes = [
  "",
  "/sobre",
  "/formacoes",
  "/conteudos",
  "/palestras",
  "/contato",
  "/politica-de-privacidade",
  "/termos-de-uso",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const repositories = getRepositories();
  const [programs, contentPosts] = await Promise.all([
    repositories.programs.list(),
    repositories.contentPosts.list(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
  }));

  const programEntries: MetadataRoute.Sitemap = programs.map((program) => ({
    url: `${siteUrl}/formacoes/${program.slug}`,
  }));

  const contentEntries: MetadataRoute.Sitemap = contentPosts
    .filter((post) => post.kind !== "link-externo")
    .map((post) => ({
      url: `${siteUrl}/conteudos/${post.slug}`,
      lastModified: post.publishedAt,
    }));

  return [...staticEntries, ...programEntries, ...contentEntries];
}
