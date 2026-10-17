import { describe, it, expect } from "vitest";
import {
  materialExternalHref,
  selectProductHighlights,
  selectPublicMaterials,
  selectRecentPosts,
} from "../select";
import type { ContentPost, Material, Program } from "@/lib/types";

function material(over: Partial<Material>): Material {
  return {
    id: "m",
    title: "Material",
    description: "",
    type: "pdf",
    filePath: "a.pdf",
    externalUrl: null,
    coverUrl: null,
    category: "",
    isPublic: true,
    published: true,
    sortOrder: 0,
    ...over,
  };
}

function post(over: Partial<ContentPost>): ContentPost {
  return {
    slug: "p",
    kind: "artigo",
    title: "Post",
    category: "",
    summary: "",
    body: null,
    coverUrl: null,
    author: "Autor",
    publishedAt: "2026-01-01",
    externalUrl: null,
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    isDemoContent: false,
    ...over,
  };
}

function program(over: Partial<Program>): Program {
  return {
    slug: "g",
    type: "curso",
    title: "Programa",
    category: "",
    shortDescription: "",
    fullDescription: null,
    imageUrl: null,
    durationHours: null,
    format: "online",
    status: "disponivel",
    enrollUrl: null,
    ctaLabel: "Inscrever-se",
    featured: false,
    published: true,
    sortOrder: 0,
    seoTitle: null,
    seoDescription: null,
    isDemoContent: false,
    ...over,
  };
}

describe("selectPublicMaterials", () => {
  it("exclui material não publicado ou não público", () => {
    const result = selectPublicMaterials([
      material({ id: "ok" }),
      material({ id: "rascunho", published: false }),
      material({ id: "privado", isPublic: false }),
    ]);
    expect(result.map((m) => m.id)).toEqual(["ok"]);
  });

  it("ordena por sortOrder sem alterar a lista recebida", () => {
    const input = [
      material({ id: "b", sortOrder: 2 }),
      material({ id: "a", sortOrder: 1 }),
    ];
    expect(selectPublicMaterials(input).map((m) => m.id)).toEqual(["a", "b"]);
    expect(input.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("devolve lista vazia quando não há nada", () => {
    expect(selectPublicMaterials([])).toEqual([]);
  });
});

describe("selectRecentPosts", () => {
  it("exclui rascunho, ordena do mais novo ao mais antigo e respeita o limite", () => {
    const result = selectRecentPosts(
      [
        post({ slug: "velho", publishedAt: "2026-01-01" }),
        post({ slug: "novo", publishedAt: "2026-06-01" }),
        post({ slug: "rascunho", publishedAt: "2026-09-01", published: false }),
        post({ slug: "meio", publishedAt: "2026-03-01" }),
      ],
      2
    );
    expect(result.map((p) => p.slug)).toEqual(["novo", "meio"]);
  });

  it("devolve lista vazia quando não há nada", () => {
    expect(selectRecentPosts([], 3)).toEqual([]);
  });
});

describe("selectProductHighlights", () => {
  it("põe destaque primeiro, exclui não publicado e respeita o limite", () => {
    const result = selectProductHighlights(
      [
        program({ slug: "comum-1", sortOrder: 1 }),
        program({ slug: "destaque", featured: true, sortOrder: 5 }),
        program({ slug: "rascunho", published: false, featured: true }),
        program({ slug: "comum-2", sortOrder: 2 }),
      ],
      2
    );
    expect(result.map((p) => p.slug)).toEqual(["destaque", "comum-1"]);
  });

  it("devolve lista vazia quando não há nada", () => {
    expect(selectProductHighlights([], 3)).toEqual([]);
  });
});

describe("materialExternalHref", () => {
  it("devolve a URL http/https do material do tipo link", () => {
    expect(
      materialExternalHref(
        material({ type: "link", filePath: null, externalUrl: "https://exemplo.com/guia" })
      )
    ).toBe("https://exemplo.com/guia");
  });

  it("rejeita esquemas perigosos e texto que não é URL", () => {
    expect(
      materialExternalHref(
        material({ type: "link", filePath: null, externalUrl: "javascript:alert(1)" })
      )
    ).toBeNull();
    expect(
      materialExternalHref(
        material({ type: "link", filePath: null, externalUrl: "isto não é url" })
      )
    ).toBeNull();
  });

  it("devolve null quando não há URL externa", () => {
    expect(
      materialExternalHref(material({ type: "link", filePath: null, externalUrl: null }))
    ).toBeNull();
  });
});
