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

export function Header({ locale, dict }: HeaderProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <Link
            href={`/${locale}`}
            className="mr-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-ink no-underline transition-colors duration-150 hover:bg-neutral-50"
            aria-label="Praedixa"
          >
            <Image
              src="/logo-black.svg"
              alt="Praedixa"
              width={28}
              height={28}
            />
            <span className="hidden text-sm font-semibold text-ink sm:inline">
              Praedixa
            </span>
          </Link>
          {navAnchors.map((key) => (
            <Link
              key={key}
              href={`/${locale}#${anchorIds[key]}`}
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 no-underline transition-colors duration-150 hover:bg-neutral-50 hover:text-ink md:inline-flex"
            >
              {dict.nav[key]}
            </Link>
          ))}
        </nav>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href={`/${locale}/contact`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 no-underline transition-colors duration-150 hover:bg-neutral-50 hover:text-ink"
          >
            {dict.nav.contact}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} className="hidden sm:flex" />
          <Link
            href={pilotHref}
            className="btn-primary-gradient hidden rounded-lg px-4 py-2 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] md:inline-flex"
          >
            {dict.nav.ctaPrimary}
          </Link>
          <MobileNav locale={locale} dict={dict} pilotHref={pilotHref} />
        </div>
      </div>
    </header>
  );
}
