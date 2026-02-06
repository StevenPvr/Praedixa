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
  title: "Praedixa — Planning équipes terrain | Diagnostic 48h",
  description:
    "Anticipez les trous de planning de vos équipes terrain multi-sites. Diagnostic en 48h : coût chiffré, plan d'action, sans intégration IT. Essai gratuit.",
  keywords: [
    "gestion planning équipes terrain",
    "logiciel planning multi-sites",
    "workforce management PME",
    "planification effectifs",
    "optimisation planning opérationnel",
    "prévision absentéisme entreprise",
    "outil planning logistique",
    "capacité vs charge planning",
    "réduire coût intérim urgence",
    "anticiper sous-effectif multi-sites",
    "diagnostic planning opérationnel 48h",
    "calculer coût trous de planning",
    "couverture terrain PME ETI",
    "SaaS planning opérations France",
    "logiciel RGPD gestion planning",
    "alternative SIRH PME",
    "pilotage prédictif opérations",
    "prévision absences terrain",
    "optimisation sous contraintes planning",
    "KPI économiques couverture terrain",
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
      "Praedixa — Anticipez les trous de planning terrain et chiffrez le coût en 48h",
    description:
      "Anticipez les trous de planning de vos équipes terrain multi-sites. Diagnostic en 48h : coût chiffré, plan d'action, sans intégration IT. Essai gratuit.",
    url: "https://www.praedixa.com",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — Diagnostic planning terrain en 48h pour PME/ETI multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Praedixa — Planning équipes terrain | Diagnostic 48h",
    description:
      "Anticipez les trous de planning terrain en 48h. Des exports CSV suffisent. Diagnostic gratuit.",
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
