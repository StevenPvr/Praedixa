import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { SplashProvider } from "../context/SplashContext";
import { ClientSplashWrapper } from "../components/ClientSplashWrapper";
import { SmoothScrollProvider } from "../components/animations/SmoothScrollProvider";
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
    "Praedixa - Sécurisez la couverture terrain, réduisez le coût des trous de planning",
  description:
    "Logiciel B2B pour piloter la sous-couverture (capacité vs charge) des équipes terrain multi-sites. En 48h : où vous serez sous-couverts, combien ça coûte, quoi faire. Sans intégration.",
  keywords: [
    // Primaires - Couverture terrain
    "couverture terrain",
    "trous de planning",
    "sous-couverture effectifs",
    "plan de couverture",
    "capacité vs charge",
    "pilotage capacité charge",
    // Secondaires - Coûts et prévision
    "coût intérim urgence",
    "prévision sous-effectif",
    "diagnostic planning",
    "optimisation couverture",
    // Long-tail
    "éviter trous planning logistique",
    "coût absentéisme non planifié",
    "diagnostic couverture 48h",
    "PME multi-sites planning",
    // Marché FR
    "SaaS opérations France",
    "RGPD gestion planning",
    "pilotage ops PME ETI",
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
  manifest: "/site.webmanifest",
  openGraph: {
    title:
      "Praedixa - Sécurisez la couverture terrain, réduisez le coût des trous de planning",
    description:
      "Logiciel B2B pour piloter la sous-couverture (capacité vs charge) des équipes terrain multi-sites. En 48h : où vous serez sous-couverts, combien ça coûte, quoi faire. Sans intégration.",
    url: "https://www.praedixa.com",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa - Plan de couverture terrain chiffré pour PME/ETI multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Praedixa - Sécurisez la couverture terrain, réduisez le coût des trous de planning",
    description:
      "Sous-couverture (capacité vs charge) : diagnostic en 48h pour équipes terrain multi-sites. Coût, actions, sans intégration.",
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
        <SmoothScrollProvider>
          <SplashProvider>
            <ClientSplashWrapper>{children}</ClientSplashWrapper>
          </SplashProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
