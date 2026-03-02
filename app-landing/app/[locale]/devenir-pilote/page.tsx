import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { PilotApplicationPageClient } from "../../../components/pages/PilotApplicationPageClient";
import { getDictionary } from "../../../lib/i18n/get-dictionary";

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
        ? "Praedixa | Candidature pilote (boucle fermée)"
        : "Praedixa | Pilot application (closed loop)",
    description:
      locale === "fr"
        ? "Cadrons un pilote pour fermer la boucle : prévision J+3/J+7/J+14, décision optimale chiffrée, 1re action assistée, Decision Log et preuve ROI mensuelle."
        : "Scope a pilot to close the loop: short-horizon forecasting, quantified optimal decision, assisted first action, Decision Log, and monthly ROI proof.",
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

  const dict = await getDictionary(locale);

  return <PilotApplicationPageClient locale={locale} dict={dict} />;
}
