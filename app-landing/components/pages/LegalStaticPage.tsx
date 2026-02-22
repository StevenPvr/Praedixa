import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "../../lib/i18n/config";
import type { LegalPageKey } from "../../lib/content/legal";
import { getLegalContent } from "../../lib/content/legal";

interface LegalStaticPageProps {
  locale: Locale;
  pageKey: LegalPageKey;
}

export function LegalStaticPage({ locale, pageKey }: LegalStaticPageProps) {
  const content = getLegalContent(locale, pageKey);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[100dvh] py-24">
      <div className="section-shell max-w-4xl">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={14} weight="bold" />
          {content.backLabel}
        </Link>

        <article className="panel-glass mt-6 rounded-3xl p-6 md:p-10">
          <h1 className="text-4xl leading-none tracking-tighter text-[var(--ink)] md:text-6xl">
            {content.title}
          </h1>

          <div className="mt-10 space-y-10 text-[var(--ink-soft)]">
            {content.sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-4 text-2xl tracking-tight text-[var(--ink)]">
                  {section.title}
                </h2>
                <div className="space-y-3 leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul className="grid gap-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
