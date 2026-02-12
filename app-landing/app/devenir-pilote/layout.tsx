import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cohorte pilote premium | Praedixa",
  description:
    "Candidature cohorte pilote Praedixa: qualification opérationnelle, cadrage des enjeux multi-sites et validation d'un premier périmètre de déploiement.",
  keywords: [
    "cohorte pilote operations",
    "sous-couverture multi-sites candidature",
    "coo pilotage couverture",
    "arbitrage operations plateforme",
    "qualification projet operations",
  ],
  alternates: {
    canonical: "/devenir-pilote",
  },
  openGraph: {
    title: "Cohorte pilote premium | Praedixa",
    description:
      "Rejoignez la cohorte fondatrice Praedixa pour structurer un pilotage couverture de niveau exécutif.",
    url: "https://www.praedixa.com/devenir-pilote",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — candidature cohorte pilote premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cohorte pilote premium | Praedixa",
    description:
      "Qualification premium pour un pilotage couverture multi-sites orienté décision.",
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
