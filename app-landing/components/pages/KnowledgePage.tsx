import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CaretRight,
  BookOpenText,
} from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";
import {
  getKnowledgePage,
  getKnowledgePath,
  type KnowledgePageKey,
} from "../../lib/content/knowledge-pages";
import { serpResourceTargetsFr } from "../../lib/content/serp-resources-fr";
import { BreadcrumbJsonLd } from "../seo/BreadcrumbJsonLd";

interface KnowledgePageProps {
  locale: Locale;
  pageKey: KnowledgePageKey;
}

export function KnowledgePage({ locale, pageKey }: KnowledgePageProps) {
  const page = getKnowledgePage(locale, pageKey);
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const resourcesHref = `/${locale}/${localizedSlugs.resources[locale]}`;
  const homeLabel = locale === "fr" ? "Accueil" : "Home";
  const resourcesLabel = locale === "fr" ? "Ressources" : "Resources";

  const breadcrumbItems = [
    { name: homeLabel, path: `/${locale}` },
    ...(pageKey === "resources"
      ? []
      : [{ name: resourcesLabel, path: resourcesHref }]),
    { name: page.title, path: getKnowledgePath(locale, pageKey) },
  ];
  const serpTargets =
    pageKey === "resources" && locale === "fr" ? serpResourceTargetsFr : [];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] py-24">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <div className="section-shell">
        <nav
          aria-label={locale === "fr" ? "Fil d'ariane" : "Breadcrumb"}
          className="mb-4"
        >
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
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={14} weight="bold" />
          {locale === "fr" ? "Retour à l'accueil" : "Back to homepage"}
        </Link>

        <article className="panel-glass mt-6 rounded-3xl p-6 md:p-10">
          <p className="section-kicker">
            <BookOpenText size={12} weight="duotone" />
            {page.kicker}
          </p>
          <h1 className="mt-3 text-4xl leading-none tracking-tighter text-[var(--ink)] md:text-6xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
            {page.lead}
          </p>

          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
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

          {page.links && page.links.length > 0 ? (
            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <h2 className="text-2xl tracking-tight text-[var(--ink)]">
                {locale === "fr" ? "Ressources associées" : "Related resources"}
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {page.links.map((link) => (
                  <Link
                    key={link.label}
                    href={getKnowledgePath(locale, link.key)}
                    className="inline-flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-medium text-[var(--ink)] hover:border-[var(--line-strong)]"
                  >
                    {link.label}
                    <ArrowUpRight
                      size={14}
                      weight="bold"
                      className="text-[var(--ink-soft)]"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {serpTargets.length > 0 ? (
            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <h2 className="text-2xl tracking-tight text-[var(--ink)]">
                Requêtes SEO Ops/DAF multi-sites
              </h2>
              <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[var(--ink-soft)]">
                30 pages ciblées, chacune alignée sur une requête business
                critique avec un asset différenciant (calculateur, template,
                playbook ou comparatif).
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {serpTargets.map((target) => (
                  <Link
                    key={target.slug}
                    href={`/fr/ressources/${target.slug}`}
                    className="inline-flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm font-medium text-[var(--ink)] hover:border-[var(--line-strong)]"
                  >
                    <span>
                      <span className="block text-[var(--ink)]">
                        {target.query}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-[var(--ink-soft)]">
                        Asset: {target.asset.title}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={14}
                      weight="bold"
                      className="text-[var(--ink-soft)]"
                    />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--line)] pt-8">
            <Link href={resourcesHref} className="btn-secondary">
              {locale === "fr" ? "Voir les ressources" : "Browse resources"}
            </Link>
            <Link href={pilotHref} className="btn-primary">
              {page.ctaLabel}
              <ArrowUpRight size={15} weight="bold" />
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
