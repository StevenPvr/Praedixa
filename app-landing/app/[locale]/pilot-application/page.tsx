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
        ? "Praedixa | Demande de pilote prévision effectifs"
        : "Praedixa | Workforce forecasting pilot request",
    description:
      locale === "fr"
        ? "Demandez un pilote prévision effectifs pour anticiper les tensions multi-sites et structurer vos arbitrages ops/finance."
        : "Request a workforce forecasting pilot to anticipate multi-site staffing tensions and structure ops/finance trade-offs.",
  });
}

export default async function PilotApplicationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.pilot[locale];

  if (expected !== "pilot-application") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  const dict = await getDictionary(locale);

  return <PilotApplicationPageClient locale={locale} dict={dict} />;
}
