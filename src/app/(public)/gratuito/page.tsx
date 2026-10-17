import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getRepositories } from "@/lib/repositories";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ProgramCard } from "@/components/program-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format-date";
import {
  materialExternalHref,
  selectProductHighlights,
  selectPublicMaterials,
  selectRecentPosts,
} from "@/lib/free-area/select";
import type { Material } from "@/lib/types";

export const metadata: Metadata = {
  title: "Área gratuita",
  description:
    "Materiais e conteúdos gratuitos sobre transporte aeromédico e atendimento pré-hospitalar.",
};

const SIGNED_URL_SECONDS = 60 * 60;

const materialTypeLabels: Record<Material["type"], string> = {
  pdf: "PDF",
  imagem: "Imagem",
  link: "Link",
};

interface MaterialLink {
  material: Material;
  href: string;
}

// O bucket `materials` é privado: um material público só é lido pela
// política de storage (published + is_public). Geramos um link assinado de
// 1 hora com a sessão do visitante, sem chave secreta. Material sem link
// utilizável é omitido em vez de aparecer quebrado.
async function resolveMaterialLinks(
  materials: Material[]
): Promise<MaterialLink[]> {
  if (materials.length === 0) return [];
  const supabase = await createServerSupabaseClient();

  const resolved = await Promise.all(
    materials.map(async (material) => {
      if (material.type === "link") {
        return { material, href: materialExternalHref(material) };
      }
      if (!material.filePath) return { material, href: null };
      const { data } = await supabase.storage
        .from("materials")
        .createSignedUrl(material.filePath, SIGNED_URL_SECONDS);
      return { material, href: data?.signedUrl ?? null };
    })
  );

  return resolved.filter((item): item is MaterialLink => item.href !== null);
}

export default async function GratuitoPage() {
  const repositories = getRepositories();
  const [materials, posts, programs] = await Promise.all([
    repositories.materials.list(),
    repositories.contentPosts.list(),
    repositories.programs.list(),
  ]);

  const materialLinks = await resolveMaterialLinks(
    selectPublicMaterials(materials)
  );
  const recentPosts = selectRecentPosts(posts, 3);
  const highlights = selectProductHighlights(programs, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <p className="text-sm font-semibold tracking-wide text-navy-700 uppercase">
        Área gratuita
      </p>
      <h1 className="mt-3 max-w-2xl text-h1 font-heading font-bold text-navy-950">
        Conteúdo aberto para quem atua em urgência e transporte aeromédico
      </h1>
      <p className="mt-4 max-w-2xl text-base text-gray-600">
        Materiais e conteúdos disponíveis sem cadastro. Quando quiser ir mais
        fundo, conheça a mentoria e os cursos.
      </p>

      <section className="mt-16" aria-labelledby="materiais-gratuitos">
        <h2
          id="materiais-gratuitos"
          className="text-h2 font-heading font-bold text-navy-950"
        >
          Materiais gratuitos
        </h2>
        {materialLinks.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materialLinks.map(({ material, href }) => (
              <li
                key={material.id}
                className="flex flex-col rounded-lg border border-border bg-background p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {materialTypeLabels[material.type]}
                  </Badge>
                  {material.category && (
                    <span className="text-xs font-semibold tracking-wide text-navy-700 uppercase">
                      {material.category}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-heading text-h4 font-semibold text-navy-950">
                  {material.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-gray-600">
                  {material.description}
                </p>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
                >
                  Abrir material
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="Nenhum material gratuito no momento"
              description="Os materiais aparecem aqui assim que forem publicados como públicos no painel administrativo."
            />
          </div>
        )}
      </section>

      <section className="mt-16" aria-labelledby="conteudos-recentes">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2
            id="conteudos-recentes"
            className="text-h2 font-heading font-bold text-navy-950"
          >
            Conteúdos recentes
          </h2>
          <Link href="/conteudos" className={cn(buttonVariants({ variant: "outline" }))}>
            Ver todos os conteúdos
          </Link>
        </div>
        {recentPosts.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post) => {
              const external = post.kind === "link-externo" && Boolean(post.externalUrl);
              const href = external ? (post.externalUrl as string) : `/conteudos/${post.slug}`;
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
                        <span className="text-xs text-gray-600">Imagem em breve</span>
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
        ) : (
          <div className="mt-8">
            <EmptyState
              title="Nenhum conteúdo publicado no momento"
              description="Novos artigos e vídeos aparecem aqui assim que forem publicados no painel administrativo."
            />
          </div>
        )}
      </section>

      <section className="mt-16" aria-labelledby="conheca-os-produtos">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2
            id="conheca-os-produtos"
            className="text-h2 font-heading font-bold text-navy-950"
          >
            Conheça os produtos
          </h2>
          <Link href="/formacoes" className={cn(buttonVariants({ variant: "outline" }))}>
            Ver todas as formações
          </Link>
        </div>
        {highlights.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((program) => (
              <ProgramCard key={program.slug} program={program} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="Nenhuma formação publicada no momento"
              description="Mentoria e cursos aparecem aqui assim que forem publicados no painel administrativo."
              action={{ label: "Ver formações", href: "/formacoes" }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
