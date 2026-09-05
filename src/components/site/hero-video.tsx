"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { siteMedia } from "@/config/media";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSaveData } from "@/hooks/use-save-data";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Camada de mídia da Hero: poster responsivo (via `<picture>`, presente no
 * primeiro paint em servidor e cliente, sem depender de JS) com o vídeo
 * correspondente ao breakpoint carregado por cima assim que o cliente
 * hidrata. Nunca existem dois `<video>` no DOM ao mesmo tempo — a troca de
 * breakpoint remonta o elemento (via `key`) em vez de duplicá-lo.
 */
export function HeroVideo({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const saveData = useSaveData();
  const [videoFailed, setVideoFailed] = useState(false);

  // `isDesktop === null` só na primeira renderização do cliente, antes do
  // efeito rodar — igual à renderização do servidor, evita mismatch.
  const canPlayVideo =
    isDesktop !== null && !reduceMotion && !saveData && !videoFailed;
  const videoSrc = isDesktop
    ? siteMedia.hero.desktopVideo
    : siteMedia.hero.mobileVideo;
  const videoPoster = isDesktop
    ? siteMedia.hero.desktopPoster
    : siteMedia.hero.mobilePoster;

  return (
    <div className={className}>
      <picture>
        <source
          media={DESKTOP_QUERY}
          srcSet={siteMedia.hero.desktopPoster}
        />
        <img
          src={siteMedia.hero.mobilePoster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      {canPlayVideo && (
        <video
          key={videoSrc}
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          poster={videoPoster}
          aria-hidden="true"
          tabIndex={-1}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}
