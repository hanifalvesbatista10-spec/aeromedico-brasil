/**
 * Fonte única dos caminhos de vídeo/poster do site. Nenhum outro componente
 * deve referenciar arquivos de `public/videos` ou `public/images` diretamente
 * — sempre importe daqui.
 */
export const siteMedia = {
  hero: {
    desktopVideo: "/videos/aeromedico/hero-desktop.mp4",
    mobileVideo: "/videos/aeromedico/hero-mobile.mp4",
    desktopPoster: "/images/video-posters/hero-desktop.webp",
    mobilePoster: "/images/video-posters/hero-mobile.webp",
  },
} as const;
