import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic de couverture gratuit en 48h | Praedixa",
  description:
    "Obtenez votre diagnostic de couverture en 48h : risques de sous-couverture identifies, cout de l'inaction chiffre, playbook d'actions avec arbitrage economique. Gratuit, sans integration IT.",
  keywords: [
    "diagnostic couverture gratuit 48h",
    "sous-couverture operationnelle diagnostic",
    "risque sous-couverture multi-sites",
    "capacite vs charge operations",
    "cout inaction sous-couverture",
    "entreprise pilote couverture",
    "arbitrage economique operations gratuit",
  ],
  alternates: {
    canonical: "/devenir-pilote",
  },
  openGraph: {
    title: "Diagnostic de couverture gratuit en 48h | Praedixa",
    description:
      "Identifiez vos risques de sous-couverture, chiffrez le cout de l'inaction et recevez un playbook d'actions en 48h. Gratuit, sans integration IT.",
    url: "https://www.praedixa.com/devenir-pilote",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — Diagnostic de couverture operationnelle gratuit en 48h pour entreprises multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic de couverture gratuit en 48h | Praedixa",
    description:
      "Risques de sous-couverture chiffres + playbook d'actions en 48h. Gratuit, sans integration IT.",
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
