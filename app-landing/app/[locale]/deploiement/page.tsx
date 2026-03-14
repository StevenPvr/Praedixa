import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getLocalizedPath, localizedSlugs } from "../../../lib/i18n/config";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { DeploymentRequestPageClient } from "../../../components/pages/DeploymentRequestPageClient";
import { getDictionary } from "../../../lib/i18n/get-dictionary";
import { CorePageJsonLd } from "../../../components/seo/CorePageJsonLd";
import { BreadcrumbTrail } from "../../../components/shared/BreadcrumbTrail";
import { SectionShell } from "../../../components/shared/SectionShell";

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
  const pageTitle =
    locale === "fr" ? "Demande de déploiement" : "Deployment request";

  return (
    <>
      <CorePageJsonLd
        locale={locale}
        name={pageTitle}
        description={
          locale === "fr"
            ? "Cadrez la mise en place Praedixa apres la preuve sur historique, avec onboarding fixe et priorites claires."
            : "Frame Praedixa deployment after the historical proof, with fixed onboarding and clear priorities."
        }
        path={getLocalizedPath(locale, "deployment")}
        breadcrumbs={[
          {
            name: locale === "fr" ? "Accueil" : "Home",
            path: `/${locale}`,
          },
          {
            name: pageTitle,
            path: getLocalizedPath(locale, "deployment"),
          },
        ]}
      />
      <SectionShell className="pb-0 pt-10 md:pt-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <BreadcrumbTrail
            items={[
              {
                label: locale === "fr" ? "Accueil" : "Home",
                href: `/${locale}`,
              },
              { label: pageTitle },
            ]}
          />
        </div>
      </SectionShell>
      <DeploymentRequestPageClient locale={locale} dict={dict} />
    </>
  );
}
