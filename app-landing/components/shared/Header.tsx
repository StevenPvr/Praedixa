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
import { ScrollReactiveHeader } from "./ScrollReactiveHeader";

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
    <ScrollReactiveHeader>
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Link
            href={`/${locale}`}
            className="hdr-logo group inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-3 py-2 text-ink no-underline shadow-[0_10px_24px_-22px_rgba(2,6,23,0.9)] transition-all duration-300 hover:border-neutral-300 hover:shadow-[0_14px_28px_-22px_rgba(2,6,23,0.8)]"
            aria-label="Praedixa"
          >
            <Image
              src="/logo-black.svg"
              alt="Praedixa"
              width={28}
              height={28}
            />
            <span className="hdr-logo-text hidden text-sm font-semibold tracking-[-0.01em] text-ink transition-colors duration-300 sm:inline">
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
            className="hdr-cta hidden whitespace-nowrap rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white no-underline transition-all duration-300 hover:bg-ink-950 active:translate-y-[1px] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-proof-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-flex"
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
    </ScrollReactiveHeader>
  );
}
