"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroVideo } from "@/components/site/hero-video";
import type { Profile, SocialProofStat } from "@/lib/types";

const SiteIntro = dynamic(
  () => import("@/components/site/site-intro").then((mod) => mod.SiteIntro),
  { ssr: false }
);

/** Intervalo entre elementos da revelação escalonada (80–140ms pedidos). */
const STEP_SECONDS = 0.11;
const ITEM_DURATION = 0.6;

export function HeroSection({
  profile,
  followersStat,
}: {
  profile: Profile;
  followersStat: SocialProofStat | undefined;
}) {
  const [introDone, setIntroDone] = useState(false);
  const reduceMotion = useReducedMotion();

  // Com movimento reduzido a Hero aparece direto, sem esperar o preloader.
  const revealed = introDone || Boolean(reduceMotion);

  // `initial={false}` (em vez de `undefined`) é o que garante que o elemento
  // renderize direto no estado de `animate` quando o movimento é reduzido —
  // deixar `animate` também `undefined` nesse caso faz o Motion não ter
  // nenhum alvo para reconciliar, preservando para sempre o `opacity: 0` que
  // o SSR (que sempre assume "sem preferência reduzida") gravou no HTML.
  const stagger = (step: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    animate: revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    transition: {
      duration: ITEM_DURATION,
      delay: step * STEP_SECONDS,
      ease: "easeOut" as const,
    },
  });

  return (
    <section className="relative -mt-16 overflow-hidden bg-navy-950">
      <SiteIntro onComplete={() => setIntroDone(true)} />

      {/*
        -mt-16 acima pulla a seção para trás do header (que é `sticky`, não
        `fixed`, e por isso ocupa espaço normal no fluxo em vez de flutuar
        sobre o conteúdo). Os min-h abaixo somam 64px (altura do header) ao
        valor original para que o vídeo continue visível atrás do header
        transparente sem esconder nenhum conteúdo — o `pt-16` no bloco de
        texto logo abaixo devolve exatamente esse espaço ao conteúdo.
      */}
      <div className="relative min-h-[624px] sm:min-h-[684px] lg:min-h-[824px] lg:max-h-[924px]">
        <motion.div
          className="absolute inset-0"
          initial={
            reduceMotion
              ? false
              : { opacity: 0, scale: 1.04, clipPath: "inset(0% 0% 6% 0%)" }
          }
          animate={
            revealed
              ? { opacity: 1, scale: 1, clipPath: "inset(0% 0% 0% 0%)" }
              : { opacity: 0, scale: 1.04, clipPath: "inset(0% 0% 6% 0%)" }
          }
          transition={{ duration: ITEM_DURATION + 0.15, ease: "easeOut" }}
        >
          <HeroVideo className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/92 via-navy-950/72 to-navy-950/90 lg:bg-gradient-to-r lg:from-navy-950/95 lg:via-navy-950/55 lg:to-navy-950/5" />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={revealed ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: ITEM_DURATION,
            delay: 6 * STEP_SECONDS,
            ease: "easeOut",
          }}
        >
          <TechnicalLines className="h-full w-full text-white/15" />
        </motion.div>

        <div className="relative z-10 mx-auto flex min-h-[624px] max-w-6xl flex-col justify-end px-4 pt-16 pb-10 sm:min-h-[684px] sm:px-6 sm:pb-14 lg:min-h-[824px] lg:flex-row lg:items-center lg:justify-start lg:px-8 lg:pb-0">
          <div className="max-w-xl lg:max-w-lg">
            <motion.p
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-white/85 uppercase"
              {...stagger(1)}
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-brand-red"
                aria-hidden="true"
              />
              {profile.name} · {profile.role}
            </motion.p>
            <motion.h1
              className="mt-4 text-hero font-heading font-bold text-white"
              {...stagger(2)}
            >
              Conhecimento que prepara profissionais para os desafios do
              transporte aeromédico.
            </motion.h1>
            <motion.p
              className="mt-6 max-w-xl text-lg text-white/80"
              {...stagger(3)}
            >
              Educação, ciência e experiência aplicadas à formação de
              profissionais que atuam na urgência, emergência e aviação
              médica.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              {...stagger(4)}
            >
              <Link
                href="/formacoes"
                className={cn(buttonVariants({ variant: "brand", size: "lg" }))}
              >
                Conheça os cursos
              </Link>
              <Link
                href="/palestras"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/40 bg-white/5 text-white hover:border-brand-red/70 hover:bg-white/15 hover:text-white"
                )}
              >
                Contrate uma palestra
              </Link>
            </motion.div>

            {followersStat && (
              <motion.p className="mt-8 text-sm text-white/80" {...stagger(5)}>
                <span className="font-semibold text-white">
                  Comunidade com {followersStat.value.replace("+", "mais de ")}
                </span>{" "}
                no Instagram
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Linha técnica decorativa — traço de rota aérea sobre a mídia da Hero. */
function TechnicalLines({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <line
        vectorEffect="non-scaling-stroke"
        strokeWidth="1"
        x1="0"
        y1="20"
        x2="42"
        y2="12"
      />
      <line
        vectorEffect="non-scaling-stroke"
        strokeWidth="1"
        x1="0"
        y1="52"
        x2="34"
        y2="40"
      />
      <line
        vectorEffect="non-scaling-stroke"
        strokeWidth="1"
        x1="0"
        y1="84"
        x2="26"
        y2="90"
      />
      <circle cx="42" cy="12" r="0.6" fill="var(--brand-red)" fillOpacity="0.55" stroke="none" />
      <circle cx="34" cy="40" r="0.6" fill="var(--brand-red)" fillOpacity="0.55" stroke="none" />
      <circle cx="26" cy="90" r="0.6" fill="var(--brand-red)" fillOpacity="0.55" stroke="none" />
    </svg>
  );
}
