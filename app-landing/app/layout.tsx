import type { Metadata } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { JsonLd } from "../components/seo/JsonLd";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.praedixa.com"),
  title:
    "Praedixa | Intelligence de couverture premium pour opérations multi-sites",
  description:
    "Praedixa aide les directions opérations à anticiper la sous-couverture, prioriser les arbitrages économiques et produire une preuve auditable de l'impact.",
  keywords: [
    "intelligence de couverture",
    "sous-couverture multi-sites",
    "pilotage operations multi-sites",
    "arbitrage economique operations",
    "prevision charge capacite",
    "preuve auditable ROI operations",
    "coo operations saas",
    "plateforme decision operations",
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
      "Praedixa | SaaS premium de couverture opérationnelle pour COO multi-sites",
    description:
      "Anticipez vos tensions de couverture, cadrez vos arbitrages et rendez vos décisions auditables avec une méthodologie orientée impact.",
    url: "https://www.praedixa.com",
    siteName: "Praedixa",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praedixa — intelligence opérationnelle premium pour directions multi-sites",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Praedixa | Intelligence opérationnelle premium",
    description:
      "Pilotez la couverture multi-sites avec une approche auditable, orientée décision et performance économique.",
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
    <html lang="fr" className={`${manrope.variable} ${cormorant.variable}`}>
      <head>
        <JsonLd />
      </head>
      <body className="min-h-screen bg-cream font-sans text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
