import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils/format-date";
import type { ContentPost } from "@/lib/types";

export function ContentHighlights({ posts }: { posts: ContentPost[] }) {
  const recent = [...posts]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, 3);

  if (recent.length === 0) return null;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <h2 className="text-h2 font-heading font-bold text-navy-950">
          Conteúdo científico e educacional
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((post) => {
            const href =
              post.kind === "link-externo" && post.externalUrl
                ? post.externalUrl
                : `/conteudos/${post.slug}`;
            const external = post.kind === "link-externo" && Boolean(post.externalUrl);

            return (
              <article key={post.slug} className="flex flex-col">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
                  {post.coverUrl ? (
                    <Image
                      src={post.coverUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-xs text-gray-600">
                        Imagem em breve
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs font-semibold tracking-wide text-navy-700 uppercase">
                  {post.category}
                </p>
                <h3 className="mt-1 font-heading text-h4 font-semibold text-navy-950">
                  <Link
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="hover:underline"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-gray-600">{post.summary}</p>
                <p className="mt-3 text-xs text-gray-600">
                  {formatDate(post.publishedAt)} · {post.author}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
