import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "@praedixa/ui/brand-tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praedixa — Admin",
  description: "Back-office super admin Praedixa",
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
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
