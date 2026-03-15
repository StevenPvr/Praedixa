import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { HeroSection } from "../../components/homepage/HeroSection";
import { QualificationSection } from "../../components/homepage/QualificationSection";
import { ProblemSection } from "../../components/homepage/ProblemSection";
import { StackComparisonSection } from "../../components/homepage/StackComparisonSection";
import { DeliverablesSection } from "../../components/homepage/DeliverablesSection";
import { SecuritySection } from "../../components/homepage/SecuritySection";
import { PilotSection } from "../../components/homepage/PilotSection";
import { SectorPagesTeaserSection } from "../../components/homepage/SectorPagesTeaserSection";
import { ContactCtaSection } from "../../components/homepage/ContactCtaSection";
import { JsonLd } from "../../components/seo/JsonLd";

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
      <HeroSection locale={locale} dict={dict} />
      <QualificationSection locale={locale} />
      <ProblemSection locale={locale} dict={dict} />
      <StackComparisonSection locale={locale} />
      <DeliverablesSection dict={dict} />
      <PilotSection locale={locale} dict={dict} />
      <SectorPagesTeaserSection locale={locale} />
      <SecuritySection dict={dict} />
      <ContactCtaSection locale={locale} dict={dict} />
      <JsonLd
        locale={locale}
        dict={dict}
        types={["softwareApplication", "service", "faq"]}
      />
    </>
  );
}
