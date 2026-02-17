import Link from "next/link";
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
    <main className="min-h-screen bg-cream py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href={`/${locale}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-secondary transition-colors hover:text-charcoal"
        >
          <span aria-hidden>←</span>
          {content.backLabel}
        </Link>

        <h1 className="mb-12 font-serif text-4xl text-charcoal">
          {content.title}
        </h1>

        <div className="space-y-10 text-gray-secondary">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-xl font-bold text-charcoal">
                {section.title}
              </h2>
              <div className="space-y-3 leading-relaxed">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="list-disc space-y-2 pl-6">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
