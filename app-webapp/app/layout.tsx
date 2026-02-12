import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
