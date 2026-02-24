import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath, localizedSlugs } from "../../lib/i18n/config";
import {
  getKnowledgePage,
  type KnowledgePageKey,
} from "../../lib/content/knowledge-pages";
import { Kicker } from "../shared/Kicker";
import { SectionShell } from "../shared/SectionShell";

export function KnowledgePage({
  locale,
  pageKey,
}: {
  locale: Locale;
  pageKey: KnowledgePageKey;
}) {
  const page = getKnowledgePage(locale, pageKey);
  const pilotHref = getLocalizedPath(locale, "pilot");

  return (
    <SectionShell className="py-16 md:py-24">
      <article className="mx-auto max-w-3xl">
        <Kicker>{page.kicker}</Kicker>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-neutral-500">
          {page.lead}
        </p>

        <div className="mt-12 space-y-10">
          {page.sections.map((section) => (
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

        {page.links && page.links.length > 0 && (
          <div className="mt-12 rounded-xl border border-border-subtle bg-neutral-50/50 p-6">
            <h3 className="text-sm font-semibold text-ink">
              {locale === "fr" ? "Contenus associés" : "Related content"}
            </h3>
            <ul className="mt-3 list-none space-y-2 p-0">
              {page.links.map((link) => {
                const slugs = localizedSlugs[link.key];
                const href = slugs
                  ? `/${locale}/${slugs[locale]}`
                  : `/${locale}`;
                return (
                  <li key={link.label} className="m-0">
                    <Link
                      href={href}
                      className="text-sm font-medium text-brass no-underline hover:text-brass-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-12 border-t border-border-subtle pt-8">
          <Link
            href={pilotHref}
            className="btn-primary-gradient inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98]"
          >
            {page.ctaLabel}
          </Link>
        </div>
      </article>
    </SectionShell>
  );
}
