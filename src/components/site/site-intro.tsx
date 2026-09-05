"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/logo";
import { useIntroSession } from "@/hooks/use-intro-session";

/** Tempo visível antes de iniciar a saída (entrada da logo + linha técnica). */
const SEQUENCE_DURATION_MS = 1300;
const EXIT_DURATION_S = 0.45;
const REDUCED_MOTION_DURATION_MS = 150;
/** Libera a página mesmo se algo impedir a saída normal do preloader. */
const SAFETY_TIMEOUT_MS = 2200;

export function SiteIntro({ onComplete }: { onComplete: () => void }) {
  const shouldPlayIntro = useIntroSession();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(shouldPlayIntro);
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (!shouldPlayIntro) {
      finish();
      return;
    }

    const duration = reduceMotion
      ? REDUCED_MOTION_DURATION_MS
      : SEQUENCE_DURATION_MS;
    const exitTimer = window.setTimeout(() => setVisible(false), duration);
    const safetyTimer = window.setTimeout(finish, SAFETY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlayIntro, reduceMotion]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  if (!shouldPlayIntro) return null;

  return (
    <AnimatePresence onExitComplete={finish}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950"
          initial={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{
            opacity: 0,
            scale: reduceMotion ? 1 : 1.04,
            clipPath: reduceMotion
              ? "inset(0% 0% 0% 0%)"
              : "inset(0% 0% 100% 0%)",
          }}
          transition={{
            duration: reduceMotion ? 0.15 : EXIT_DURATION_S,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="flex flex-col items-center gap-7"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.94, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0.15 : 0.45,
              delay: reduceMotion ? 0 : 0.1,
              ease: "easeOut",
            }}
          >
            <Logo size={104} showWordmark={false} />
            <EcgTrace reduceMotion={Boolean(reduceMotion)} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Traçado eletrocardiográfico discreto abaixo da logo — dois ciclos
 * completos (P, PR, QRS, ST, T). Desenhado uma única vez via `pathLength`,
 * na mesma janela de tempo que a antiga linha técnica ocupava (delay 0.35s,
 * duração 0.5s), para não alterar o tempo total da introdução.
 */
function EcgTrace({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <svg
      className="h-auto w-[200px] sm:w-[280px]"
      viewBox="0 0 236 64"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M4,38 L12,38 Q15,29 18,30 Q21,31 24,38 L34,38 L37,44 L41,6 L45,48 L50,38 L64,38 Q68,30 74,31 Q80,32 84,38 L104,38 L112,38 Q115,29 118,30 Q121,31 124,38 L134,38 L137,44 L141,6 L145,48 L150,38 L164,38 Q168,30 174,31 Q180,32 184,38 L204,38 L232,38"
        stroke="var(--navy-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.5, delay: 0.35, ease: "easeInOut" }
        }
      />
      <motion.circle
        cx="141"
        cy="6"
        r="2.2"
        fill="var(--alert-600)"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.85, duration: 0.15 }}
      />
    </svg>
  );
}
