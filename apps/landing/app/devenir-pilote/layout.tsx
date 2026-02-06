import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic planning terrain gratuit en 48h | Praedixa",
  description:
    "Obtenez votre diagnostic planning terrain en 48h : trous de planning identifiés, coût chiffré, plan d'action avec ROI. Gratuit pour les entreprises pilotes. Sans intégration IT.",
  keywords: [
    "diagnostic planning terrain gratuit",
    "diagnostic planning opérationnel 48h",
    "trous de planning équipes terrain",
    "capacité vs charge planning",
    "coût intérim urgence",
    "entreprise pilote planning",
    "workforce management PME gratuit",
  ],
  alternates: {
    canonical: "/devenir-pilote",
  },
  openGraph: {
    title: "Diagnostic planning terrain gratuit en 48h | Praedixa",
    description:
      "Identifiez vos trous de planning terrain, chiffrez le coût évitable et recevez un plan d'action en 48h. Gratuit, sans intégration IT.",
    url: "https://praedixa.com/devenir-pilote",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — Diagnostic planning terrain gratuit en 48h pour PME/ETI multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic planning terrain gratuit en 48h | Praedixa",
    description:
      "Trous de planning terrain chiffrés + plan d'action en 48h. Gratuit, sans intégration IT.",
    images: ["/og-image.png"],
  },
};

export default function DevenirPiloteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
