import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { getLegalContent } from "../../../lib/content/legal";
import { LegalStaticPage } from "../../../components/pages/LegalStaticPage";

const FR_PATH = `/fr/${localizedSlugs.privacy.fr}`;
const EN_PATH = `/en/${localizedSlugs.privacy.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const content = getLegalContent(locale, "privacy");
  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: `Praedixa | ${content.title}`,
    description: content.description,
  });
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.privacy[locale];

  if (expected !== "privacy-policy") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  return <LegalStaticPage locale={locale} pageKey="privacy" />;
}
