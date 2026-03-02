import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { ContactPageClient } from "../../../components/pages/ContactPageClient";

const FR_PATH = `/fr/${localizedSlugs.contact.fr}`;
const EN_PATH = `/en/${localizedSlugs.contact.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: locale === "fr" ? "Praedixa | Contact" : "Praedixa | Contact",
    description:
      locale === "fr"
        ? "Demandez l’audit historique (gratuit) ou échangez sur vos arbitrages de couverture multi-sites."
        : "Request the free historical audit or discuss your multi-site coverage trade-offs.",
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);

  if (localizedSlugs.contact[locale] !== "contact") {
    permanentRedirect(`/${locale}/${localizedSlugs.contact[locale]}`);
  }

  return <ContactPageClient locale={locale} />;
}
