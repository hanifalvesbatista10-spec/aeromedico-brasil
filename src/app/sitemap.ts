import type { MetadataRoute } from "next";
import { unstable_rethrow } from "next/navigation";
import { getRepositories } from "@/lib/repositories";

const staticRoutes = [
  "",
  "/sobre",
  "/formacoes",
  "/conteudos",
  "/gratuito",
  "/loja",
  "/palestras",
  "/contato",
  "/politica-de-privacidade",
  "/termos-de-uso",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const repositories = getRepositories();
  const [programs, contentPosts, storeProducts] = await Promise.all([
    repositories.programs.list(),
    repositories.contentPosts.list(),
    // O sitemap não pode cair por causa da loja (ex.: tabelas ainda não criadas).
    repositories.store.listProducts().catch((error: unknown) => {
      unstable_rethrow(error);
      console.error("[sitemap] loja indisponível", error);
      return [];
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
  }));

  const programEntries: MetadataRoute.Sitemap = programs
    .filter((program) => program.published)
    .map((program) => ({
      url: `${siteUrl}/formacoes/${program.slug}`,
    }));

  const contentEntries: MetadataRoute.Sitemap = contentPosts
    .filter((post) => post.published && post.kind !== "link-externo")
    .map((post) => ({
      url: `${siteUrl}/conteudos/${post.slug}`,
      lastModified: post.publishedAt,
    }));

  const storeEntries: MetadataRoute.Sitemap = storeProducts
    .filter((product) => product.published)
    .map((product) => ({
      url: `${siteUrl}/loja/${product.slug}`,
    }));

  return [...staticEntries, ...programEntries, ...contentEntries, ...storeEntries];
}
