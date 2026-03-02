import Link from "next/link";
import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { navAnchors, anchorIds, resolveNavLabel } from "../../lib/nav-config";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

export function Header({ locale, dict }: HeaderProps) {
  const primaryCtaHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))] backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
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
            {navAnchors.map((key) => (
              <li key={key}>
                <Link
                  href={`/${locale}#${anchorIds[key]}`}
                  className="inline-flex rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-200 hover:bg-neutral-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none"
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
            className="rounded-full px-3.5 py-2 text-sm font-medium text-neutral-700 no-underline transition-colors duration-200 hover:bg-neutral-100 hover:text-ink focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:outline-none"
          >
            {dict.nav.contact}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher locale={locale} className="hidden sm:flex" />
          <Link
            href={primaryCtaHref}
            className="btn-primary-gradient hidden rounded-full px-4 py-2 text-sm font-semibold text-white no-underline transition-all duration-200 active:translate-y-[1px] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
          >
            {dict.nav.ctaPrimary}
          </Link>
          <MobileNav locale={locale} dict={dict} primaryCtaHref={primaryCtaHref} />
        </div>
      </div>
    </header>
  );
}
