import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Identidade visual do carrinho (direção "Cabine", aprovada): cartões brancos sobre
// fundo azulado, sombras largas e suaves, campos compactos com sombra interna e
// resumo escuro com botão vermelho. Em tela de toque (`pointer-coarse`) os
// controles voltam para 44 px e o texto dos campos para 16 px (sem zoom no iPhone).

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

export const cardClass =
  "rounded-2xl border border-navy-950/[0.06] bg-white p-4 shadow-[0_2px_4px_rgba(14,20,33,0.06),0_30px_60px_-22px_rgba(14,20,33,0.38)] sm:p-[18px]";

export const cardTitleClass =
  "mb-3.5 flex items-baseline justify-between gap-3 font-heading text-sm font-bold text-navy-950";

export const cardNoteClass = "font-body text-xs font-normal text-[#6b7a96]";

export const fieldClass = cn(
  "h-[34px] w-full min-w-0 rounded-[9px] border border-[#e1e6ef] bg-[#f6f8fb] px-[11px] text-[13px] text-navy-950",
  "shadow-[inset_0_1px_3px_rgba(14,20,33,0.14),0_1px_0_rgba(255,255,255,0.9),0_8px_16px_-10px_rgba(14,20,33,0.35)]",
  "placeholder:text-[#8a97b0] focus-visible:border-navy-500 focus-visible:ring-[3px] focus-visible:ring-navy-500/20",
  "pointer-coarse:h-11 pointer-coarse:text-base",
  focusRing
);

export const labelClass = "text-[11.5px] font-medium text-[#51607d]";

export const darkButtonClass = cn(
  "h-[34px] shrink-0 rounded-[9px] bg-navy-900 px-3.5 text-[12.5px] font-semibold text-white",
  "shadow-[0_1px_2px_rgba(14,20,33,0.2),0_8px_14px_-8px_rgba(14,20,33,0.45)] hover:bg-navy-700",
  "aria-disabled:opacity-60 pointer-coarse:h-11 pointer-coarse:text-sm",
  focusRing
);

export const softButtonClass = cn(
  "h-[34px] shrink-0 rounded-[9px] border border-navy-950/[0.06] bg-[#eef1f7] px-3.5 text-[12.5px] font-semibold text-navy-900",
  "shadow-[0_1px_2px_rgba(14,20,33,0.08),0_8px_14px_-10px_rgba(14,20,33,0.3)] hover:bg-[#e6eaf2]",
  "aria-disabled:opacity-60 pointer-coarse:h-11 pointer-coarse:text-sm",
  focusRing
);

export const optionClass = cn(
  "flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#e1e6ef] bg-[#f6f8fb] px-[11px] py-2 text-[13px]",
  "shadow-[0_1px_1px_rgba(14,20,33,0.05),0_10px_18px_-12px_rgba(14,20,33,0.35)] pointer-coarse:min-h-11",
  "has-[:checked]:border-navy-900 has-[:checked]:shadow-[0_0_0_3px_rgba(30,42,68,0.12),0_12px_20px_-10px_rgba(14,20,33,0.45)]",
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-navy-700"
);

export const radioClass = "size-[18px] shrink-0 accent-navy-900";

export const ctaClass = cn(
  "flex h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-b from-[#d9000b] to-[#b00007]",
  "font-heading text-[15px] font-bold text-white",
  "shadow-[0_14px_28px_-8px_rgba(200,0,8,0.65),0_2px_4px_rgba(200,0,8,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]",
  // No celular o botão fica sobre a barra branca (contorno azul); no computador, sobre o painel escuro (contorno branco).
  "aria-disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 lg:focus-visible:outline-white"
);

/** Grade da página: itens e etapas à esquerda, resumo à direita (embaixo no celular). */
export function CartLayout({ left, summary }: { left: ReactNode; summary: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="grid min-w-0 gap-4">{left}</div>
      <aside aria-label="Resumo do pedido" className="lg:sticky lg:top-24">
        {summary}
      </aside>
    </div>
  );
}

export interface SummaryLine {
  testId: string;
  label: string;
  value: string;
  tone?: "default" | "saving";
}

/** Painel escuro do resumo. O botão principal (`action`) é o último elemento do cartão. */
export function SummaryPanel({
  lines,
  totalLabel,
  totalValue,
  totalNote,
  children,
}: {
  lines: SummaryLine[];
  totalLabel: string;
  totalValue: string;
  /** Linha pequena sob o total (por exemplo, o valor nas outras formas de pagamento). */
  totalNote?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#18243f] to-navy-950 p-5 text-white shadow-[0_4px_10px_rgba(14,20,33,0.14),0_40px_70px_-26px_rgba(14,20,33,0.7)]">
      <h2 className="mb-3.5 font-heading text-[15px] font-bold">Resumo do pedido</h2>
      <dl>
        {lines.map((line) => (
          <div
            key={line.testId}
            className={cn(
              "flex items-baseline justify-between gap-4 py-[7px] text-[13.5px]",
              line.tone === "saving" ? "text-[#4ade80]" : "text-[#9fb0d0]"
            )}
          >
            <dt>{line.label}</dt>
            <dd
              data-testid={line.testId}
              className={cn("font-medium tabular-nums", line.tone === "saving" ? "text-[#4ade80]" : "text-white")}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-end justify-between gap-4 border-t border-white/10 pt-3.5">
        <span className="text-[13px] text-[#9fb0d0]">{totalLabel}</span>
        <span
          data-testid="cart-total"
          className="font-heading text-[28px] font-extrabold leading-none tracking-tight tabular-nums"
        >
          {totalValue}
        </span>
      </div>
      {totalNote && <p className="mt-1.5 text-right text-xs text-[#9fb0d0]">{totalNote}</p>}
      {children}
    </div>
  );
}

/** Atalho para voltar à loja, no fim do resumo. */
export function ContinueShopping() {
  return (
    <Link
      href="/loja"
      className="mt-3 block text-center text-[12.5px] text-[#9fb0d0] underline underline-offset-[3px] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      Escolher mais produtos
    </Link>
  );
}

const STEPS = ["Carrinho", "Entrega", "Pagamento"];

/**
 * Indicador de etapas (só informativo): 1 enquanto falta escolher o frete, 2 com o frete
 * escolhido. O pagamento em si acontece na página do Asaas, depois de finalizar o pedido.
 */
export function CartSteps({ current }: { current: 1 | 2 }) {
  return (
    <ol aria-label="Etapas da compra" className="mb-5 flex items-center gap-2 text-xs text-[#6b7a96]">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="h-px w-6 bg-[#d9dfeb]" />}
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                number <= current ? "bg-navy-900 text-white" : "bg-[#e9edf4] text-[#6b7a96]"
              )}
            >
              {number}
            </span>
            <span className={cn(active && "font-semibold text-navy-950")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
