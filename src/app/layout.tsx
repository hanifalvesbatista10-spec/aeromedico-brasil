import type { Metadata } from "next";
import { fontHeading, fontBody } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Aeromédico Brasil — Educação em transporte aeromédico e APH",
    template: "%s | Aeromédico Brasil",
  },
  description:
    "Educação, ciência e experiência aplicadas à formação de profissionais que atuam na urgência, emergência e aviação médica.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
