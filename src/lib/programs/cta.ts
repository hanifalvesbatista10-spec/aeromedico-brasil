import { buildWhatsappLink } from "@/lib/utils/whatsapp";
import type { Program, ProgramType } from "@/lib/types";

export interface ProgramCta {
  kind: "enroll" | "whatsapp" | "unavailable";
  href: string | null;
  label: string;
}

const typeLabels: Record<ProgramType, string> = {
  curso: "Curso",
  mentoria: "Mentoria",
  treinamento: "Treinamento",
  produto: "Produto",
};

export function programTypeLabel(type: ProgramType): string {
  return typeLabels[type];
}

/**
 * Decide o botão de compra de um programa. Ordem: URL de inscrição/checkout
 * (quando existir), WhatsApp do cliente com mensagem pré-preenchida (a
 * regra "até segunda ordem" da mentoria) e, sem nenhum dos dois, estado
 * indisponível. Trocar o WhatsApp por pagamento depois é só preencher
 * `enrollUrl` no painel.
 */
export function resolveProgramCta(
  program: Pick<Program, "title" | "enrollUrl" | "ctaLabel">,
  whatsappUrl: string
): ProgramCta {
  const enrollUrl = program.enrollUrl?.trim();
  if (enrollUrl) {
    return { kind: "enroll", href: enrollUrl, label: program.ctaLabel };
  }

  const whatsappHref = buildWhatsappLink(
    whatsappUrl,
    `Olá! Tenho interesse em ${program.title}.`
  );
  if (whatsappHref) {
    return { kind: "whatsapp", href: whatsappHref, label: "Falar no WhatsApp" };
  }

  return { kind: "unavailable", href: null, label: "Inscrições em breve" };
}
