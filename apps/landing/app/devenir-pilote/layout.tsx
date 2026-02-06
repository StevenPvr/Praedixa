import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programme entreprise pilote | Praedixa",
  description:
    "Rejoignez le programme pilote Praedixa : co-construisez une solution de couverture predictive avec interpretabilite native. Risques identifies, causes expliquees, playbook d'actions chiffre. Gratuit, sans integration IT.",
  keywords: [
    "programme pilote couverture predictive",
    "sous-couverture operationnelle diagnostic",
    "risque sous-couverture multi-sites",
    "interpretabilite previsions operations",
    "capacite vs charge operations",
    "cout inaction sous-couverture",
    "entreprise pilote couverture",
    "arbitrage economique operations gratuit",
  ],
  alternates: {
    canonical: "/devenir-pilote",
  },
  openGraph: {
    title: "Programme entreprise pilote | Praedixa",
    description:
      "Co-construisez une solution de couverture predictive : risques identifies, causes expliquees, playbook d'actions chiffre. Gratuit, sans integration IT.",
    url: "https://www.praedixa.com/devenir-pilote",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — Programme entreprise pilote pour couverture operationnelle predictive multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Programme entreprise pilote | Praedixa",
    description:
      "Risques de sous-couverture identifies + causes expliquees + playbook d'actions. Gratuit, sans integration IT.",
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
