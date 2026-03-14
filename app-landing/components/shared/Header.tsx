import Link from "next/link";
import Image from "next/image";
import {
  buildContactIntentHref,
  getLocalizedPath,
  type Locale,
} from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getValuePropContent } from "../../lib/content/value-prop";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { DesktopNav } from "./DesktopNav";

interface HeaderProps {
  locale: Locale;
  dict: Dictionary;
}

export function Header({ locale }: HeaderProps) {
  const valueProp = getValuePropContent(locale);
  const primaryCtaHref = getLocalizedPath(locale, "decisionLogProof");
  const primaryCtaLabel = valueProp.ctaPrimary;
  const primaryCtaLabelShort = locale === "fr" ? "Exemple" : "Example";
  const secondaryCtaHref = buildContactIntentHref(locale, "deployment");
  const secondaryCtaLabel = valueProp.ctaSecondary;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-3 py-2 text-ink no-underline shadow-[0_10px_24px_-22px_rgba(2,6,23,0.9)] transition-all duration-200 hover:border-neutral-300 hover:shadow-[0_14px_28px_-22px_rgba(2,6,23,0.8)]"
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

        <DesktopNav locale={locale} />

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher
            locale={locale}
            className="hidden sm:flex lg:inline-flex"
          />
          <Link
            href={primaryCtaHref}
            aria-label={primaryCtaLabel}
            className="hidden whitespace-nowrap rounded-full bg-navy-700 px-4 py-2 text-sm font-semibold text-white no-underline transition-all duration-200 hover:bg-navy-800 active:translate-y-[1px] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
          >
            <span aria-hidden="true" className="xl:hidden">
              {primaryCtaLabelShort}
            </span>
            <span aria-hidden="true" className="hidden xl:inline">
              {primaryCtaLabel}
            </span>
          </Link>
          <MobileNav
            locale={locale}
            primaryCtaHref={primaryCtaHref}
            primaryCtaLabel={primaryCtaLabel}
            secondaryCtaHref={secondaryCtaHref}
            secondaryCtaLabel={secondaryCtaLabel}
          />
        </div>
      </div>
    </header>
  );
}
