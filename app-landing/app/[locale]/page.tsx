import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { HeroTransitionWrapper } from "../../components/sections/HeroTransitionWrapper";
import { MethodSection } from "../../components/sections/MethodSection";
import { UseCasesSection } from "../../components/sections/UseCasesSection";
import { SecuritySection } from "../../components/sections/SecuritySection";
import { PilotSection } from "../../components/sections/PilotSection";
import { FaqSection } from "../../components/sections/FaqSection";
import { StickyMobileCTA } from "../../components/layout/StickyMobileCTA";

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
        <HeroTransitionWrapper dict={dict} locale={locale} />
        <MethodSection solution={dict.solution} howItWorks={dict.howItWorks} />
        <UseCasesSection
          useCases={dict.useCases}
          deliverables={dict.deliverables}
        />
        <SecuritySection dict={dict} />
        <PilotSection dict={dict} locale={locale} />
        <FaqSection dict={dict} locale={locale} />
      </main>
      <Footer dict={dict} locale={locale} />
      <StickyMobileCTA dict={dict} locale={locale} />
    </>
  );
}
