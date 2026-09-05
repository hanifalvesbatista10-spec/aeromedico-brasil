"use client";

import { useEffect, useState } from "react";

const INTRO_SESSION_KEY = "aeromedico:intro-seen";

/**
 * Decide se a abertura cinematográfica deve rodar nesta navegação.
 * Roda apenas uma vez por sessão de aba (sessionStorage); em caso de
 * indisponibilidade (modo privado, storage bloqueado), a intro é exibida
 * normalmente em vez de quebrar a página.
 *
 * Este hook só é usado dentro de `SiteIntro`, carregado via `next/dynamic`
 * com `ssr: false` — ou seja, nunca roda no servidor nem na primeira
 * renderização de hidratação, então o valor inicial pode ler o
 * sessionStorage diretamente (sem risco de erro de hidratação e sem o
 * flash de uma verificação feita só depois, em useEffect).
 */
export function useIntroSession() {
  const [shouldPlayIntro] = useState(() => {
    try {
      return !window.sessionStorage.getItem(INTRO_SESSION_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {
      // sessionStorage indisponível — sem persistência, intro roda sempre
    }
  }, []);

  return shouldPlayIntro;
}
