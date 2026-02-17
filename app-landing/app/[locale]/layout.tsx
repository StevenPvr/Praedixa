import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import "@praedixa/ui/brand-tokens.css";
import "../globals.css";
import { locales, isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { JsonLd } from "../../components/seo/JsonLd";
import { GoogleAnalytics } from "../../components/analytics/GoogleAnalytics";
import { CookieService } from "../../components/analytics/CookieService";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${manrope.variable} ${cormorant.variable}`}>
      <head>
        <JsonLd locale={locale} />
      </head>
      <body className="min-h-screen bg-cream font-sans text-charcoal antialiased">
        <GoogleAnalytics />
        <CookieService locale={locale} />
        {children}
      </body>
    </html>
  );
}
