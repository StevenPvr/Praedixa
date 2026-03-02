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
        ? "Praedixa | Demande de pilote Workforce & ProofOps"
        : "Praedixa | Workforce & ProofOps pilot request",
    description:
      locale === "fr"
        ? "Cadrons un pilote Workforce & ProofOps pour rendre vos décisions de couverture défendables et traçables (Decision Log + proof pack ROI)."
        : "Scope a Workforce & ProofOps pilot to make coverage decisions defensible and traceable across multi-site operations (Decision Log + ROI proof pack).",
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
