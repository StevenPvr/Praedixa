import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLocale } from "../../lib/i18n/config";
import { getDictionary } from "../../lib/i18n/get-dictionary";
import { buildLocaleMetadata, localePathMap } from "../../lib/seo/metadata";
import { HeroSection } from "../../components/homepage/HeroSection";
import { ProblemSection } from "../../components/homepage/ProblemSection";
import { SolutionSection } from "../../components/homepage/SolutionSection";
import { SectorPagesTeaserSection } from "../../components/homepage/SectorPagesTeaserSection";
import { ClosedLoopTeaserSection } from "../../components/homepage/ClosedLoopTeaserSection";
import { HomeFaqCtaSection } from "../../components/homepage/HomeFaqCtaSection";
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
      <SectorPagesTeaserSection locale={locale} />
      <ClosedLoopTeaserSection locale={locale} />
      <HomeFaqCtaSection locale={locale} />
      <JsonLd
        locale={locale}
        dict={dict}
        types={["softwareApplication", "service", "faq"]}
      />
    </>
  );
}
