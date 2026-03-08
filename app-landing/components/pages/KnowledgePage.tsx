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
  const auditHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const auditFirstPages = new Set<KnowledgePageKey>([
    "about",
    "productMethod",
    "howItWorksPage",
    "decisionLogProof",
    "integrationData",
    "resources",
  ]);
  const stickySubnavPages = new Set<KnowledgePageKey>([
    "productMethod",
    "resources",
    "integrationData",
  ]);
  const useAuditPrimary = auditFirstPages.has(pageKey);
  const sectionAnchors = page.sections.map((section) => {
    const id = section.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return { id: id.length > 0 ? id : "section", title: section.title };
  });
  const showStickySubnav =
    stickySubnavPages.has(pageKey) && sectionAnchors.length >= 3;
  const articleClassName = showStickySubnav
    ? "mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] md:gap-14"
    : "mx-auto max-w-3xl";

  return (
    <SectionShell className="py-16 md:py-24">
      <article className={articleClassName}>
        {showStickySubnav ? (
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                {locale === "fr" ? "Navigation rapide" : "Quick navigation"}
              </p>
              <ul className="mt-3 list-none space-y-1.5 p-0">
                {sectionAnchors.map((item) => (
                  <li key={item.id} className="m-0">
                    <a
                      href={`#${item.id}`}
                      className="inline-flex w-full rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-700 no-underline transition-colors duration-200 hover:bg-neutral-100 hover:text-ink"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}

        <div>
          <Kicker>{page.kicker}</Kicker>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-neutral-500">
            {page.lead}
          </p>

          <div className="mt-12 space-y-10">
            {page.sections.map((section, index) => {
              const anchor = sectionAnchors[index];
              return (
                <section key={section.title} id={anchor?.id}>
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
                          <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
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

          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-8">
            <Link
              href={useAuditPrimary ? auditHref : pilotHref}
              className="btn-primary-gradient inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98]"
            >
              {page.ctaLabel}
            </Link>
            {useAuditPrimary ? (
              <Link
                href={pilotHref}
                className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-ink no-underline transition-colors duration-150 hover:bg-neutral-50"
              >
                {locale === "fr" ? "Demander un pilote ROI" : "Apply for the pilot"}
              </Link>
            ) : null}
          </div>
        </div>
      </article>
    </SectionShell>
  );
}
