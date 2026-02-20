import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { JsonLd } from "../../components/seo/JsonLd";
import { GoogleAnalytics } from "../../components/analytics/GoogleAnalytics";
import { CookieService } from "../../components/analytics/CookieService";
import { LenisProvider } from "../../components/cinema/LenisProvider";
import { GpuTierProvider } from "../../components/cinema/GpuTier";
import { GlobalCanvas } from "../../components/cinema/GlobalCanvas";
import { Preloader } from "../../components/cinema/Preloader";

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
    <LenisProvider>
      <GpuTierProvider>
        <div
          id="global-bg"
          className="fixed inset-0 -z-10 transition-colors"
          style={{ backgroundColor: "oklch(0.14 0.025 247)" }}
        />
        <Preloader />
        <GlobalCanvas />
        <div className="relative z-10 min-h-screen font-sans text-charcoal antialiased">
          <JsonLd locale={locale} />
          <GoogleAnalytics />
          <CookieService locale={locale} />
          {children}
        </div>
      </GpuTierProvider>
    </LenisProvider>
  );
}
