import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { JsonLd } from "../../components/seo/JsonLd";
import { GoogleAnalytics } from "../../components/analytics/GoogleAnalytics";
import { CookieService } from "../../components/analytics/CookieService";

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
    <div className="relative min-h-[100dvh] font-sans text-[var(--ink)] antialiased">
      <JsonLd locale={locale} />
      <GoogleAnalytics />
      <CookieService locale={locale} />
      {children}
    </div>
  );
}
