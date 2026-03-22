import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { locales, isValidLocale, localizedSlugs } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { Header } from "../../components/shared/Header";
import { Footer } from "../../components/shared/Footer";
import { JsonLd } from "../../components/seo/JsonLd";

export async function generateStaticParams() {
  if (process.env["NODE_ENV"] === "development") {
    return [];
  }

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

  const dict = await getDictionary(locale);
  const requestHeaders = await headers();
  const requestPathname = requestHeaders.get("x-request-pathname");
  const servicesPath = `/${locale}/${localizedSlugs.services[locale]}`;
  const contactPath = `/${locale}/${localizedSlugs.contact[locale]}`;
  const shouldShowFooter =
    requestPathname !== servicesPath && requestPathname !== contactPath;

  return (
    <>
      <a href="#main-content" className="skip-link">
        {locale === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <Header locale={locale} dict={dict} />
      <main id="main-content">{children}</main>
      <JsonLd locale={locale} dict={dict} types={["organization", "website"]} />
      {shouldShowFooter ? <Footer locale={locale} dict={dict} /> : null}
    </>
  );
}
