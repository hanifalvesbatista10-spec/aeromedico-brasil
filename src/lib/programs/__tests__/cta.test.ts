import { describe, it, expect } from "vitest";
import { programTypeLabel, resolveProgramCta } from "../cta";

const WHATSAPP = "https://wa.me/5585999998888";

describe("resolveProgramCta", () => {
  it("usa a URL de inscrição quando existe, mesmo com WhatsApp válido", () => {
    expect(
      resolveProgramCta(
        {
          title: "Mentoria Aeromédico",
          enrollUrl: "https://pagamento.exemplo/checkout",
          ctaLabel: "Quero a mentoria",
        },
        WHATSAPP
      )
    ).toEqual({
      kind: "enroll",
      href: "https://pagamento.exemplo/checkout",
      label: "Quero a mentoria",
    });
  });

  it("cai para o WhatsApp com mensagem pré-preenchida quando não há inscrição", () => {
    const cta = resolveProgramCta(
      { title: "Mentoria Aeromédico", enrollUrl: null, ctaLabel: "Inscrever-se" },
      WHATSAPP
    );
    expect(cta.kind).toBe("whatsapp");
    expect(cta.label).toBe("Falar no WhatsApp");
    expect(cta.href).toBe(
      "https://wa.me/5585999998888?text=" +
        encodeURIComponent("Olá! Tenho interesse em Mentoria Aeromédico.")
    );
  });

  it("fica indisponível com o placeholder de WhatsApp sem número", () => {
    expect(
      resolveProgramCta(
        { title: "Mentoria", enrollUrl: null, ctaLabel: "Inscrever-se" },
        "https://wa.me/"
      )
    ).toEqual({ kind: "unavailable", href: null, label: "Inscrições em breve" });
  });

  it("trata URL de inscrição vazia ou só com espaços como ausente", () => {
    expect(
      resolveProgramCta(
        { title: "Curso", enrollUrl: "", ctaLabel: "Inscrever-se" },
        WHATSAPP
      ).kind
    ).toBe("whatsapp");
    expect(
      resolveProgramCta(
        { title: "Curso", enrollUrl: "   ", ctaLabel: "Inscrever-se" },
        WHATSAPP
      ).kind
    ).toBe("whatsapp");
  });
});

describe("programTypeLabel", () => {
  it("devolve o rótulo em português de cada tipo", () => {
    expect(programTypeLabel("curso")).toBe("Curso");
    expect(programTypeLabel("mentoria")).toBe("Mentoria");
    expect(programTypeLabel("treinamento")).toBe("Treinamento");
    expect(programTypeLabel("produto")).toBe("Produto");
  });
});
