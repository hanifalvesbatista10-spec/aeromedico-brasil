import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getRepositories } from "@/lib/repositories";
import { formatDate } from "@/lib/utils/format-date";
import { buildArticleJsonLd } from "@/lib/seo/json-ld";

// Sem `generateStaticParams` — mesmo motivo do formacoes/[slug]/page.tsx.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getRepositories().contentPosts.getBySlug(slug);
  if (!post || !post.published) return {};

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.summary,
  };
}

export default async function ConteudoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getRepositories().contentPosts.getBySlug(slug);
  if (!post || !post.published) notFound();
  if (post.kind === "link-externo" && post.externalUrl) {
    redirect(post.externalUrl);
  }
  const articleJsonLd = buildArticleJsonLd(post);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        {post.category}
      </p>
      <h1 className="mt-3 text-h1 font-heading font-bold text-navy-950">
        {post.title}
      </h1>
      <p className="mt-3 text-sm text-gray-600">
        {formatDate(post.publishedAt)} · {post.author}
      </p>

      <div className="relative mt-8 aspect-video overflow-hidden rounded-lg bg-gray-100">
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-gray-600">Imagem em breve</span>
          </div>
        )}
      </div>

      <p className="mt-8 text-base leading-relaxed text-gray-600">
        {post.summary}
      </p>

      {post.body && (
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-gray-600">
          {post.body}
        </div>
      )}

      {post.isDemoContent && (
        <p className="mt-8 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          Conteúdo de exemplo — o corpo completo do artigo/vídeo é publicado
          pelo administrador.
        </p>
      )}
    </div>
  );
}
