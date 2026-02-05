import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic Couverture Terrain - Praedixa",
  description:
    "Obtenez votre diagnostic de sous-couverture (capacité vs charge) en 48h : où serez-vous sous-couverts, combien ça coûte, et quoi faire. Gratuit pour les entreprises pilotes. Sans intégration IT.",
  keywords: [
    "diagnostic couverture terrain",
    "plan de couverture PME",
    "sous-couverture effectifs",
    "capacité vs charge",
    "prévision trous planning",
    "coût intérim urgence",
    "entreprise pilote",
  ],
  alternates: {
    canonical: "/devenir-pilote",
  },
  openGraph: {
    title: "Diagnostic Couverture Terrain en 48h - Praedixa",
    description:
      "Où serez-vous sous-couverts (capacité vs charge) ? Combien ça coûte ? Quoi faire ? Diagnostic pour les entreprises pilotes.",
    url: "https://www.praedixa.com/devenir-pilote",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa - Diagnostic couverture terrain pour PME/ETI multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnostic Couverture Terrain en 48h - Praedixa",
    description:
      "Diagnostic de sous-couverture (capacité vs charge) en 48h : coût, actions, sans intégration.",
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
