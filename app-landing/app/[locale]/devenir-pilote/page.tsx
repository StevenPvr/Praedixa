import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { PilotApplicationPageClient } from "../../../components/pages/PilotApplicationPageClient";

const FR_PATH = `/fr/${localizedSlugs.pilot.fr}`;
const EN_PATH = `/en/${localizedSlugs.pilot.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title:
      locale === "fr"
        ? "Praedixa | Devenir entreprise pilote"
        : "Praedixa | Apply for pilot program",
    description:
      locale === "fr"
        ? "Déposez votre candidature au programme pilote Praedixa pour cadrer vos décisions de couverture multi-sites."
        : "Apply to the Praedixa pilot program to frame multi-site coverage decisions.",
  });
}

export default async function DevenirPilotePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.pilot[locale];

  if (expected !== "devenir-pilote") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  return <PilotApplicationPageClient locale={locale} />;
}
