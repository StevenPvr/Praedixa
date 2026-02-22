import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
} from "@phosphor-icons/react/dist/ssr";
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
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] py-24">
      <div className="section-shell">
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
