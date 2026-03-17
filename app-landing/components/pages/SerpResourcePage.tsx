import Link from "next/link";
import { buildContactIntentHref, type Locale } from "../../lib/i18n/config";
import { getValuePropContent } from "../../lib/content/value-prop";
import {
  getRelatedSerpResources,
  getSerpResourcePrimaryCta,
  getSerpResourceSchemaType,
  type SerpResourceEntry,
} from "../../lib/content/serp-resources-fr";
import { PRAEDIXA_BASE_URL } from "../../lib/seo/entity";
import { serializeJsonForScriptTag } from "../../lib/security/json-script";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface SerpResourcePageProps {
  locale: Locale;
  entry: SerpResourceEntry;
}

function SerpStructuredData({
  articleJsonLd,
  breadcrumbJsonLd,
  slug,
}: {
  articleJsonLd: Record<string, unknown>;
  breadcrumbJsonLd: Record<string, unknown>;
  slug: string;
}) {
  return (
    <>
      <script
        id={`praedixa-breadcrumb-json-ld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonForScriptTag(breadcrumbJsonLd),
        }}
      />
      <script
        id={`praedixa-article-json-ld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonForScriptTag(articleJsonLd),
        }}
      />
    </>
  );
}

function SerpResourceSections({ entry }: { entry: SerpResourceEntry }) {
  return (
    <div className="mt-12 space-y-10">
      {entry.sections.map((section) => (
        <section key={section.title}>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p
              key={paragraphIndex}
              className="mt-3 max-w-[60ch] text-sm leading-relaxed text-neutral-600"
            >
              {paragraph}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="mt-3 list-none space-y-2 p-0">
              {section.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="m-0 flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function RelatedSerpResources({
  locale,
  relatedResources,
}: {
  locale: Locale;
  relatedResources: ReturnType<typeof getRelatedSerpResources>;
}) {
  if (!relatedResources.length) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-border-subtle pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {locale === "fr" ? "Ressources associées" : "Related resources"}
      </h2>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-neutral-500">
        {locale === "fr"
          ? "Poursuivre avec les contenus les plus proches pour cadrer le signal, comparer les options et documenter la décision."
          : "Continue with the closest resources to frame the signal, compare options, and document the decision."}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {relatedResources.map((resource) => (
          <Link
            key={resource.slug}
            href={`/fr/ressources/${resource.slug}`}
            className="rounded-xl border border-border bg-white p-4 text-sm no-underline transition-colors hover:border-amber-300 hover:bg-amber-50/30"
          >
            <p className="font-semibold text-ink">{resource.title}</p>
            <p className="mt-2 text-neutral-500">{resource.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SerpResourcePage({ locale, entry }: SerpResourcePageProps) {
  const valueProp = getValuePropContent(locale);
  const deploymentHref = buildContactIntentHref(locale, "deployment");
  const trackedDeploymentHref = `${deploymentHref}?${new URLSearchParams({
    source: "seo_resource",
    seo_slug: entry.slug,
  }).toString()}`;
  const assetHref = `/${locale}/ressources/${entry.slug}/asset`;
  const canonicalPath = `/${locale}/ressources/${entry.slug}`;
  const canonicalUrl = `${PRAEDIXA_BASE_URL}${canonicalPath}`;
  const relatedResources = getRelatedSerpResources(entry.slug, 3);
  const schemaType = getSerpResourceSchemaType(entry.slug);
  const primaryCtaLabel =
    locale === "fr"
      ? getSerpResourcePrimaryCta(entry.slug)
      : valueProp.ctaSecondary;

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
    "@type": schemaType,
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
        <SerpStructuredData
          articleJsonLd={articleJsonLd}
          breadcrumbJsonLd={breadcrumbJsonLd}
          slug={entry.slug}
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

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-600">
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
            className="mt-4 inline-flex text-sm font-semibold text-proof-500 no-underline hover:text-proof-500/80"
          >
            {locale === "fr" ? "Télécharger l'asset" : "Download asset"}
          </Link>
        </div>

        <SerpResourceSections entry={entry} />
        <RelatedSerpResources
          locale={locale}
          relatedResources={relatedResources}
        />

        <div className="mt-12 border-t border-border-subtle pt-8">
          <Link
            href={trackedDeploymentHref}
            className="btn-primary-gradient inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98]"
          >
            {primaryCtaLabel}
          </Link>
        </div>
      </article>
    </SectionShell>
  );
}
