import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { DeploymentRequestPageClient } from "../../../components/pages/DeploymentRequestPageClient";
import { getDictionary } from "../../../lib/i18n/get-dictionary";

const FR_PATH = `/fr/${localizedSlugs.deployment.fr}`;
const EN_PATH = `/en/${localizedSlugs.deployment.en}`;

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
        ? "Praedixa | Demande de déploiement"
        : "Praedixa | Deployment request",
    description:
      locale === "fr"
        ? "Cadrons la mise en place Praedixa apres la preuve sur historique, avec onboarding fixe et priorites claires."
        : "Frame Praedixa deployment after historical proof, with fixed onboarding and clear priorities.",
  });
}

export default async function DeploymentRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const expected = localizedSlugs.deployment[locale];

  if (expected !== "deploiement") {
    permanentRedirect(`/${locale}/${expected}`);
  }

  const dict = await getDictionary(locale);

  return <DeploymentRequestPageClient locale={locale} dict={dict} />;
}
