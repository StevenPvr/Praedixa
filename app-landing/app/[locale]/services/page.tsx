import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { ServicesPage } from "../../../components/pages/ServicesPage";
import { getDictionary } from "../../../lib/i18n/get-dictionary";
import { localizedSlugs } from "../../../lib/i18n/config";
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
  const dict = await getDictionary(locale);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: dict.servicesPage.meta.title,
    description: dict.servicesPage.meta.description,
    ogTitle: dict.servicesPage.meta.ogTitle,
    ogDescription: dict.servicesPage.meta.ogDescription,
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

  const dict = await getDictionary(locale);
  return <ServicesPage locale={locale} dict={dict} />;
}
