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
        ? "Contactez l'équipe Praedixa pour cadrer un échange autour de vos enjeux de couverture multi-sites."
        : "Contact the Praedixa team to frame an exchange about your multi-site coverage challenges.",
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
