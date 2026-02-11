import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
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
  title: "Praedixa — War room operationnelle",
  description:
    "Plateforme executive de pilotage des risques de capacite et des decisions terrain.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
