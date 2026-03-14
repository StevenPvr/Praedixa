import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { HeroSection } from "../../components/homepage/HeroSection";
import { ProblemSection } from "../../components/homepage/ProblemSection";
import { SolutionSection } from "../../components/homepage/SolutionSection";
import { HowItWorksSection } from "../../components/homepage/HowItWorksSection";
import { UseCasesSection } from "../../components/homepage/UseCasesSection";
import { RoiProofTeaserSection } from "../../components/homepage/RoiProofTeaserSection";
import { SecuritySection } from "../../components/homepage/SecuritySection";
import { FaqSection } from "../../components/homepage/FaqSection";
import { PillarLinksSection } from "../../components/homepage/PillarLinksSection";
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
      <ProblemSection locale={locale} dict={dict} />
      <SolutionSection dict={dict} />
      <HowItWorksSection locale={locale} dict={dict} />
      <UseCasesSection locale={locale} dict={dict} />
      <RoiProofTeaserSection locale={locale} />
      <SecuritySection dict={dict} />
      <FaqSection dict={dict} />
      <PillarLinksSection locale={locale} dict={dict} />
      <ContactCtaSection locale={locale} dict={dict} />
      <JsonLd
        locale={locale}
        dict={dict}
        types={["softwareApplication", "service", "faq"]}
      />
    </>
  );
}
