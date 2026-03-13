import Link from "next/link";
import type { Locale } from "../../lib/i18n/config";
import { getLegalContent, type LegalPageKey } from "../../lib/content/legal";
import { SectionShell } from "../shared/SectionShell";

interface LegalStaticPageProps {
  locale: Locale;
  pageKey: LegalPageKey;
}

export function LegalStaticPage({ locale, pageKey }: LegalStaticPageProps) {
  const content = getLegalContent(locale, pageKey);

  return (
    <SectionShell className="py-16 md:py-24">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {content.title}
        </h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-neutral-500">
          {content.description}
        </p>

        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-ink">
                {section.title}
              </h2>
              {section.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="mt-2 max-w-[60ch] text-sm leading-relaxed text-neutral-600"
                >
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-2 list-none space-y-1.5 p-0">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="m-0 flex items-start gap-2 text-sm text-neutral-600"
                    >
                      <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-border-subtle pt-6">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-brass no-underline hover:text-brass-600"
          >
            {locale === "fr" ? "Retour à l'accueil" : "Back to home"}
          </Link>
        </div>
      </article>
    </SectionShell>
  );
}
