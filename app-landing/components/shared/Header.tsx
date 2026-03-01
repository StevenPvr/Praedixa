import Link from "next/link";
import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

const navAnchors = [
  "problem",
  "method",
  "howItWorks",
  "useCases",
  "security",
  "faq",
] as const;

const anchorIds: Record<(typeof navAnchors)[number], string> = {
  problem: "problem",
  method: "solution",
  howItWorks: "how-it-works",
  useCases: "use-cases",
  security: "security",
  faq: "faq",
};

function resolveNavLabel(
  locale: Locale,
  key: (typeof navAnchors)[number],
  label: string,
): string {
  if (key !== "howItWorks" && key !== "useCases") {
    return label;
  }

  const cleaned = label
    .replace(/\bUI\s*\/\s*front-?end\b/gi, "")
    .replace(/\bfront-?end\b/gi, "")
    .replace(/\bback-?end\b/gi, "")
    .replace(/\s+[|/·]\s+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length > 0) {
    return cleaned;
  }

  if (key === "howItWorks") {
    return locale === "fr" ? "Comment ca marche" : "How it works";
  }
  return locale === "fr" ? "Decisions couvertes" : "Decisions covered";
}

export function Header({ locale, dict }: HeaderProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const servicesHref = getLocalizedPath(locale, "services");
  const blogHref = `/${locale}/blog`;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-2.5 rounded-full border border-neutral-200/80 bg-white px-3 py-2 text-ink no-underline shadow-[0_10px_24px_-22px_rgba(2,6,23,0.9)] transition-all duration-200 hover:border-neutral-300 hover:shadow-[0_14px_28px_-22px_rgba(2,6,23,0.8)]"
            aria-label="Praedixa"
          >
            <Image
              src="/logo-black.svg"
              alt="Praedixa"
              width={28}
              height={28}
            />
            <span className="hidden text-sm font-semibold tracking-[-0.01em] text-ink sm:inline">
              Praedixa
            </span>
          </Link>
        </nav>

        <nav className="hidden flex-1 justify-center lg:flex" aria-label="Primary links">
          <ul className="flex items-center gap-1 rounded-full border border-neutral-200/75 bg-white/90 p-1 shadow-[0_12px_24px_-22px_rgba(2,6,23,0.9)]">
            <li>
              <Link
                href={servicesHref}
                className="inline-flex rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-200 hover:bg-neutral-100 hover:text-ink"
              >
                {dict.nav.services}
              </Link>
            </li>
            <li>
              <Link
                href={blogHref}
                className="inline-flex rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-200 hover:bg-neutral-100 hover:text-ink"
              >
                Blog
              </Link>
            </li>
            {navAnchors.map((key) => (
              <li key={key}>
                <Link
                  href={`/${locale}#${anchorIds[key]}`}
                  className="inline-flex rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-200 hover:bg-neutral-100 hover:text-ink"
                >
                  {resolveNavLabel(locale, key, dict.nav[key])}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href={`/${locale}/contact`}
            className="rounded-full px-3.5 py-2 text-sm font-medium text-neutral-700 no-underline transition-colors duration-200 hover:bg-neutral-100 hover:text-ink"
          >
            {dict.nav.contact}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher locale={locale} className="hidden sm:flex" />
          <Link
            href={pilotHref}
            className="btn-primary-gradient hidden rounded-full px-4 py-2 text-sm font-semibold text-white no-underline transition-all duration-200 active:translate-y-[1px] active:scale-[0.98] sm:inline-flex"
          >
            {dict.nav.ctaPrimary}
          </Link>
          <MobileNav locale={locale} dict={dict} pilotHref={pilotHref} />
        </div>
      </div>
    </header>
  );
}
