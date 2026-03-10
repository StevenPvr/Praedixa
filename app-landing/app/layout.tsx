import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { headers } from "next/headers";
import "./globals.css";
import { defaultLocale, isValidLocale } from "../lib/i18n/config";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

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
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
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
      className={GeistSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {children}
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
