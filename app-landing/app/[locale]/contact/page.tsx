import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getLocalizedPath, localizedSlugs } from "../../../lib/i18n/config";
import { getValuePropContent } from "../../../lib/content/value-prop";
import { resolveLocale } from "../../../lib/seo/knowledge";
import { buildLocaleMetadata, localePathMap } from "../../../lib/seo/metadata";
import { ContactPageClient } from "../../../components/pages/ContactPageClient";
import { CorePageJsonLd } from "../../../components/seo/CorePageJsonLd";
import { BreadcrumbTrail } from "../../../components/shared/BreadcrumbTrail";
import { SectionShell } from "../../../components/shared/SectionShell";

const FR_PATH = `/fr/${localizedSlugs.contact.fr}`;
const EN_PATH = `/en/${localizedSlugs.contact.en}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const content = getValuePropContent(locale);

  return buildLocaleMetadata({
    locale,
    paths: localePathMap(FR_PATH, EN_PATH),
    title: locale === "fr" ? "Praedixa | Contact" : "Praedixa | Contact",
    description: content.contact.intro,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  const content = getValuePropContent(locale);

  if (localizedSlugs.contact[locale] !== "contact") {
    permanentRedirect(`/${locale}/${localizedSlugs.contact[locale]}`);
  }

  const pageTitle = locale === "fr" ? "Contact" : "Contact";

  return (
    <>
      <CorePageJsonLd
        locale={locale}
        name={pageTitle}
        description={content.contact.intro}
        path={getLocalizedPath(locale, "contact")}
        breadcrumbs={[
          {
            name: locale === "fr" ? "Accueil" : "Home",
            path: `/${locale}`,
          },
          {
            name: pageTitle,
            path: getLocalizedPath(locale, "contact"),
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
      <ContactPageClient locale={locale} />
    </>
  );
}
