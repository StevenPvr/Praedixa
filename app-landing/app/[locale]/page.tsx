import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { HeroPulsorSection } from "../../components/homepage/HeroPulsorSection";
import { CredibilityRibbonSection } from "../../components/homepage/CredibilityRibbonSection";
import { ProblemBlockSection } from "../../components/homepage/ProblemBlockSection";
import { MethodBlockSection } from "../../components/homepage/MethodBlockSection";
import { StackComparisonV2Section } from "../../components/homepage/StackComparisonV2Section";
import { ProofBlockSection } from "../../components/homepage/ProofBlockSection";
import { DeploymentTimelineSection } from "../../components/homepage/DeploymentTimelineSection";
import { SectorCardsSection } from "../../components/homepage/SectorCardsSection";
import { IntegrationSecuritySection } from "../../components/homepage/IntegrationSecuritySection";
import { FaqSectionV2 } from "../../components/homepage/FaqSectionV2";
import { FinalCtaSection } from "../../components/homepage/FinalCtaSection";
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
      <HeroPulsorSection locale={locale} />
      <CredibilityRibbonSection locale={locale} />
      <ProblemBlockSection locale={locale} />
      <MethodBlockSection locale={locale} />
      <StackComparisonV2Section locale={locale} />
      <ProofBlockSection locale={locale} />
      <DeploymentTimelineSection locale={locale} />
      <SectorCardsSection locale={locale} />
      <IntegrationSecuritySection locale={locale} />
      <FaqSectionV2 locale={locale} />
      <FinalCtaSection locale={locale} />
      <JsonLd
        locale={locale}
        dict={dict}
        types={["softwareApplication", "service", "faq"]}
      />
    </>
  );
}
