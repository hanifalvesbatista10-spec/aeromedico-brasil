import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://aeromedico-brasil.com.br",
  ),
  title: {
    default: "Aeromédico Brasil | Formação, carreira e excelência operacional",
    template: "%s | Aeromédico Brasil",
  },
  description:
    "Conteúdo, cursos e materiais para profissionais que desejam compreender e atuar com excelência no universo aeromédico e no APH.",
  keywords: ["aeromédico", "transporte aeromédico", "APH", "resgate aeroespacial", "enfermagem aeromédica"],
  openGraph: {
    title: "Aeromédico Brasil",
    description: "Formação e conteúdo para quem quer elevar sua atuação no aeromédico e no APH.",
    type: "website",
    locale: "pt_BR",
    siteName: "Aeromédico Brasil",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Aeromédico Brasil — Formação, Carreira e APH" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aeromédico Brasil",
    description: "Formação e conteúdo para quem quer elevar sua atuação no aeromédico e no APH.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
