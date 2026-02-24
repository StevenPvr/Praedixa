import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "@praedixa/ui/brand-tokens.css";
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
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
