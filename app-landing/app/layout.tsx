import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { headers } from "next/headers";
import "@praedixa/ui/brand-tokens.css";
import "./globals.css";
import { defaultLocale, isValidLocale } from "../lib/i18n/config";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "optional",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.praedixa.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

async function resolveHtmlLang(): Promise<string> {
  const requestHeaders = await headers();
  const candidate = requestHeaders.get("x-request-locale");
  if (candidate && isValidLocale(candidate)) {
    return candidate;
  }
  return defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const htmlLang = await resolveHtmlLang();

  return (
    <html
      lang={htmlLang}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={outfit.variable}>
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
