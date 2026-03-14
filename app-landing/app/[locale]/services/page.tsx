import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { ServicesPage } from "../../../components/pages/ServicesPage";
import { localizedSlugs } from "../../../lib/i18n/config";
import { getValuePropContent } from "../../../lib/content/value-prop";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";

const FR_PATH = `/fr/${localizedSlugs.services.fr}`;
const EN_PATH = `/en/${localizedSlugs.services.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const content = getValuePropContent(locale);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: content.servicesMeta.title,
    description: content.servicesMeta.description,
    ogTitle: content.servicesMeta.ogTitle,
    ogDescription: content.servicesMeta.ogDescription,
  });
}

export default async function ServicesRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  if (localizedSlugs.services[locale] !== "services") {
    permanentRedirect(`/${locale}/${localizedSlugs.services[locale]}`);
  }

  return <ServicesPage locale={locale} />;
}
