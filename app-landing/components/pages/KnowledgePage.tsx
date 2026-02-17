import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";
import {
  getKnowledgePage,
  getKnowledgePath,
  type KnowledgePageKey,
} from "../../lib/content/knowledge-pages";

interface KnowledgePageProps {
  locale: Locale;
  pageKey: KnowledgePageKey;
}

export function KnowledgePage({ locale, pageKey }: KnowledgePageProps) {
  const page = getKnowledgePage(locale, pageKey);
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const resourcesHref = `/${locale}/${localizedSlugs.resources[locale]}`;

  return (
    <main className="min-h-screen bg-cream py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-gray-secondary transition-colors hover:text-charcoal"
        >
          <span aria-hidden>←</span>
          {locale === "fr" ? "Retour à l'accueil" : "Back to homepage"}
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-[var(--shadow-soft)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            {page.kicker}
          </p>
          <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            {page.lead}
          </p>

          <div className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-serif text-2xl text-charcoal">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-neutral-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-neutral-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {page.links && page.links.length > 0 ? (
            <section className="mt-10 border-t border-neutral-200 pt-8">
              <h2 className="font-serif text-2xl text-charcoal">
                {locale === "fr" ? "Ressources associées" : "Related resources"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {page.links.map((link) => (
                  <Link
                    key={link.label}
                    href={getKnowledgePath(locale, link.key)}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-neutral-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-neutral-200 pt-8">
            <Link href={resourcesHref} className="ghost-cta">
              {locale === "fr" ? "Voir les ressources" : "Browse resources"}
            </Link>
            <Link href={pilotHref} className="btn-primary">
              {page.ctaLabel}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
