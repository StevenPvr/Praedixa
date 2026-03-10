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
        ? "Praedixa | Demande de pilote ROI"
        : "Praedixa | ROI pilot application",
    description:
      locale === "fr"
        ? "Cadrons un pilote ROI pour federer les systemes qui comptent, prioriser les bons arbitrages et suivre les gains."
        : "Scope an ROI pilot to federate the systems that matter, prioritize the right trade-offs, and track gains.",
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
