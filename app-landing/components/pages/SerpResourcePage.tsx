import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { localizedSlugs, type Locale } from "../../lib/i18n/config";
import type { SerpResourceEntry } from "../../lib/content/serp-resources-fr";
import {
  getSerpResourceInternalLinks,
  getSerpResourcePrimaryCta,
  getSerpResourceSchemaType,
} from "../../lib/content/serp-resources-fr";
import { getSerpBriefBySlug } from "../../lib/content/serp-briefs-fr";
import { getSerpAssetDownloadHref } from "../../lib/content/serp-asset-downloads";
import { BreadcrumbJsonLd } from "../seo/BreadcrumbJsonLd";
import { ArticleJsonLd } from "../seo/ArticleJsonLd";
import { SerpResourceActions } from "./SerpResourceActions";

interface SerpResourcePageProps {
  locale: Locale;
  entry: SerpResourceEntry;
}

function intentLabel(intent: SerpResourceEntry["intent"]): string {
  switch (intent) {
    case "Info":
      return "Information";
    case "Info/Decision":
      return "Information + décision";
    case "Decision":
      return "Décision";
    case "Tool":
      return "Outil";
    case "Achat":
      return "Achat";
    case "Commercial/Decision":
      return "Commercial + décision";
    default:
      return intent;
  }
}

export function SerpResourcePage({ locale, entry }: SerpResourcePageProps) {
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const resourcesHref = `/${locale}/${localizedSlugs.resources[locale]}`;
  const assetHref = getSerpAssetDownloadHref(locale, entry.slug);
  const pilotParams = new URLSearchParams({
    source: "seo_resource",
    seo_slug: entry.slug,
    seo_query: entry.query,
  });
  const pilotHrefWithContext = `${pilotHref}?${pilotParams.toString()}`;
  const internalLinks = getSerpResourceInternalLinks(entry.slug, 4);
  const brief = getSerpBriefBySlug(entry.slug);
  const ctaLabel = getSerpResourcePrimaryCta(entry.slug);
  const schemaType = getSerpResourceSchemaType(entry.slug);

  const breadcrumbItems = [
    { name: "Accueil", path: `/${locale}` },
    { name: "Ressources", path: resourcesHref },
    { name: entry.title, path: `/${locale}/ressources/${entry.slug}` },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] py-24">
      <BreadcrumbJsonLd
        id={`praedixa-breadcrumb-json-ld-${entry.slug}`}
        items={breadcrumbItems}
      />
      <ArticleJsonLd
        id={`praedixa-article-json-ld-${entry.slug}`}
        schemaType={schemaType}
        headline={entry.title}
        description={entry.description}
        path={`/fr/ressources/${entry.slug}`}
        locale="fr-FR"
        query={entry.query}
      />
      <div className="section-shell">
        <nav aria-label="Fil d'ariane" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-soft)]">
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return (
                <li key={`${item.path}-${item.name}`} className="contents">
                  {isLast ? (
                    <span aria-current="page" className="text-[var(--ink)]">
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.path}
                      className="hover:text-[var(--ink)] hover:underline"
                    >
                      {item.name}
                    </Link>
                  )}
                  {!isLast ? (
                    <CaretRight size={11} weight="bold" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>

        <Link
          href={resourcesHref}
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={14} weight="bold" />
          Retour aux ressources
        </Link>

        <article className="panel-glass mt-6 rounded-3xl p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
              Requête cible: {entry.query}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-xs font-medium text-[var(--accent-700)]">
              Intent: {intentLabel(entry.intent)}
            </span>
          </div>

          <h1 className="mt-4 text-4xl leading-none tracking-tighter text-[var(--ink)] md:text-6xl">
            {entry.title}
          </h1>
          <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
            {entry.openingSnippet}
          </p>

          <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Asset différenciant
            </p>
            <h2 className="mt-2 text-xl tracking-tight text-[var(--ink)]">
              {entry.asset.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {entry.asset.description}
            </p>
            <SerpResourceActions
              locale={locale}
              slug={entry.slug}
              query={entry.query}
              intent={entry.intent}
              asset={entry.asset}
              assetHref={assetHref}
              pilotHref={pilotHrefWithContext}
              ctaLabel={ctaLabel}
            />
          </section>

          {brief ? (
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Outline H2
                </h2>
                <ul className="mt-3 grid gap-2">
                  {brief.outlineH2.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-2.5 py-2 text-xs text-[var(--ink-soft)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  PAA probables
                </h2>
                <ul className="mt-3 grid gap-2">
                  {brief.paa.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-2.5 py-2 text-xs text-[var(--ink-soft)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  Backlinks white-hat
                </h2>
                <ul className="mt-3 grid gap-2">
                  {brief.backlinks.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-[var(--line)] bg-[var(--panel-muted)] px-2.5 py-2 text-xs text-[var(--ink-soft)]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </section>
          ) : null}

          <div className="mt-10 space-y-8">
            {entry.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl tracking-tight text-[var(--ink)]">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-[var(--ink-soft)]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="mt-4 grid gap-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink-soft)]"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-10 border-t border-[var(--line)] pt-8">
            <h2 className="text-2xl tracking-tight text-[var(--ink)]">
              Maillage interne recommandé
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {internalLinks.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${locale}/ressources/${item.slug}`}
                  className="inline-flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-medium text-[var(--ink)] hover:border-[var(--line-strong)]"
                >
                  {item.query}
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    className="text-[var(--ink-soft)]"
                  />
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
