import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { SerpResourceEntry } from "../../lib/content/serp-resources-fr";
import { PRAEDIXA_BASE_URL } from "../../lib/seo/entity";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface SerpResourcePageProps {
  locale: Locale;
  entry: SerpResourceEntry;
}

export function SerpResourcePage({ locale, entry }: SerpResourcePageProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const trackedPilotHref = `${pilotHref}?${new URLSearchParams({
    source: "seo_resource",
    seo_slug: entry.slug,
  }).toString()}`;
  const assetHref = `/${locale}/ressources/${entry.slug}/asset`;
  const canonicalPath = `/${locale}/ressources/${entry.slug}`;
  const canonicalUrl = `${PRAEDIXA_BASE_URL}${canonicalPath}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Praedixa",
        item: `${PRAEDIXA_BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "fr" ? "Ressources" : "Resources",
        item: `${PRAEDIXA_BASE_URL}/${locale}/ressources`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: entry.title,
        item: canonicalUrl,
      },
    ],
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    description: entry.description,
    inLanguage: locale,
    mainEntityOfPage: canonicalUrl,
    author: {
      "@type": "Organization",
      name: "Praedixa",
      url: PRAEDIXA_BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Praedixa",
      logo: {
        "@type": "ImageObject",
        url: `${PRAEDIXA_BASE_URL}/logo-black.svg`,
      },
    },
  };

  return (
    <SectionShell className="py-16 md:py-24">
      <article className="mx-auto max-w-3xl">
        <script
          id={`praedixa-breadcrumb-json-ld-${entry.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          id={`praedixa-article-json-ld-${entry.slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />

        <nav className="mb-6 text-xs text-neutral-400" aria-label="Breadcrumb">
          <Link
            href={`/${locale}`}
            className="text-neutral-400 no-underline hover:text-ink"
          >
            Praedixa
          </Link>
          {" / "}
          <Link
            href={`/${locale}/ressources`}
            className="text-neutral-400 no-underline hover:text-ink"
          >
            {locale === "fr" ? "Ressources" : "Resources"}
          </Link>
          {" / "}
          <span className="text-neutral-600">{entry.title}</span>
        </nav>

        <Kicker>{entry.intent}</Kicker>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
          {entry.title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-neutral-500">
          {entry.openingSnippet}
        </p>

        <div className="mt-8 rounded-xl border border-brass-200 bg-brass-50/50 p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brass-600">
            {entry.asset.type}
          </span>
          <h2 className="mt-1 text-sm font-semibold text-ink">
            {entry.asset.title}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {entry.asset.description}
          </p>
          <Link
            href={assetHref}
            className="mt-4 inline-flex text-sm font-semibold text-brass no-underline hover:text-brass-600"
          >
            {locale === "fr" ? "Télécharger l'asset" : "Download asset"}
          </Link>
        </div>

        <div className="mt-12 space-y-10">
          {entry.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {section.title}
              </h2>
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="mt-3 max-w-[60ch] text-sm leading-relaxed text-neutral-600"
                >
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3 list-none space-y-2 p-0">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="m-0 flex items-start gap-2 text-sm text-neutral-600"
                    >
                      <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brass-300" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-border-subtle pt-8">
          <Link
            href={trackedPilotHref}
            className="btn-primary-gradient inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98]"
          >
            {locale === "fr"
              ? "Calculer le cout de l'inaction"
              : "Request a Workforce & ProofOps pilot"}
          </Link>
        </div>
      </article>
    </SectionShell>
  );
}
