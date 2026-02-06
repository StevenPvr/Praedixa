import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { JsonLd } from "../components/seo/JsonLd";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.praedixa.com"),
  title:
    "Praedixa — Intelligence de couverture operationnelle | Prevision + Interpretabilite",
  description:
    "Anticipez la sous-couverture de vos equipes multi-sites. Praedixa predit les risques, explique pourquoi ils existent et chiffre les options. Sans integration IT.",
  keywords: [
    "sous-couverture operationnelle",
    "risque de sous-couverture multi-sites",
    "intelligence de couverture",
    "capacite vs charge operations",
    "arbitrage economique operations",
    "preuve economique auditable",
    "interpretabilite previsions couverture",
    "facteurs explicatifs sous-couverture",
    "cout inaction sous-couverture",
    "playbook actions operationnelles",
    "couverture equipes terrain",
    "risque operationnel logistique",
    "SLA niveau de service operations",
    "couts urgence interim heures sup",
    "decision tracable operations",
    "audit trail decisions operationnelles",
    "early-warning operationnel",
    "couverture multi-sites logistique transport",
    "prevision sous-effectif 3 7 14 jours",
    "pilotage predictif couverture",
    "KPI economiques couverture terrain",
  ],
  authors: [{ name: "Praedixa" }],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title:
      "Praedixa — Anticipez la sous-couverture, comprenez pourquoi, chiffrez les options",
    description:
      "Anticipez la sous-couverture de vos equipes multi-sites. Previsions + facteurs explicatifs + arbitrage economique + preuve d'impact. Sans integration IT.",
    url: "https://www.praedixa.com",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — Intelligence de couverture operationnelle predictive pour entreprises multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Praedixa — Intelligence de couverture operationnelle | Prevision + Interpretabilite",
    description:
      "Anticipez la sous-couverture multi-sites. Previsions + causes expliquees + arbitrage chiffre + preuve economique. Programme pilote gratuit.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${jakarta.variable} ${dmSerif.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body className="min-h-screen bg-cream font-sans text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
