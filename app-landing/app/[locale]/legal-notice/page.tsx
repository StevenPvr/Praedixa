import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { getLegalContent } from "../../../lib/content/legal";
import { LegalStaticPage } from "../../../components/pages/LegalStaticPage";

const FR_PATH = `/fr/${localizedSlugs.legal.fr}`;
const EN_PATH = `/en/${localizedSlugs.legal.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const content = getLegalContent(locale, "legal");
  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: `Praedixa | ${content.title}`,
    description: content.description,
  });
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.legal[locale];

  if (expected !== "legal-notice") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  return <LegalStaticPage locale={locale} pageKey="legal" />;
}
