import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { Footer } from "../../components/layout/Footer";
import { Navbar } from "../../components/layout/Navbar";
import { StickyMobileCTA } from "../../components/layout/StickyMobileCTA";
import { HeroSection } from "../../components/sections/HeroSection";
import { localizedSlugs } from "../../lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const dict = await getDictionary(locale);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap("/fr", "/en"),
    title: dict.meta.title,
    description: dict.meta.description,
    ogTitle: dict.meta.ogTitle,
    ogDescription: dict.meta.ogDescription,
  });
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  return (
    <>
      <Navbar dict={dict} locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <HeroSection dict={dict} locale={locale} />
        <div className="section-shell cv-auto pb-16 pt-6 md:pb-20">
          <div className="panel-glass rounded-3xl p-6 md:p-8">
            <p className="section-kicker">
              {locale === "fr" ? "Accès rapide" : "Quick access"}
            </p>
            <h2 className="section-title mt-3">
              {locale === "fr"
                ? "Ressources, sécurité et contact"
                : "Resources, security and contact"}
            </h2>
            <p className="section-lead mt-4 max-w-[62ch]">
              {locale === "fr"
                ? "Consultez nos guides opérationnels, découvrez notre cadre sécurité et lancez un pilote avec votre équipe."
                : "Explore our operational guides, review our security framework, and launch a pilot with your team."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/${localizedSlugs.resources[locale]}`}
                className="btn-secondary"
              >
                {locale === "fr" ? "Voir les ressources" : "View resources"}
              </Link>
              <Link
                href={`/${locale}/${localizedSlugs.security[locale]}`}
                className="btn-secondary"
              >
                {locale === "fr" ? "Sécurité" : "Security"}
              </Link>
              <Link
                href={`/${locale}/${localizedSlugs.contact[locale]}`}
                className="btn-primary"
              >
                {locale === "fr" ? "Contacter l’équipe" : "Contact the team"}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer dict={dict} locale={locale} />
      <StickyMobileCTA dict={dict} locale={locale} />
    </>
  );
}
