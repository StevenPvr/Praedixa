import Link from "next/link";
import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";

interface FooterProps {
  locale: Locale;
  dict: Dictionary;
}

export function Footer({ locale, dict }: FooterProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const contactHref = getLocalizedPath(locale, "contact");
  const legalHref = getLocalizedPath(locale, "legal");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const securityHref = getLocalizedPath(locale, "security");
  const aboutHref = getLocalizedPath(locale, "about");

  const navLinks = [
    { label: dict.nav.problem, href: `/${locale}#problem` },
    { label: dict.nav.method, href: `/${locale}#solution` },
    { label: dict.nav.howItWorks, href: `/${locale}#how-it-works` },
    { label: dict.nav.security, href: securityHref },
    { label: dict.nav.faq, href: `/${locale}#faq` },
  ];

  const legalLinks = [
    { label: dict.nav.contact, href: contactHref },
    {
      label: locale === "fr" ? "Mentions légales" : "Legal notice",
      href: legalHref,
    },
    {
      label: locale === "fr" ? "Confidentialité" : "Privacy",
      href: privacyHref,
    },
    { label: locale === "fr" ? "CGU" : "Terms", href: termsHref },
    { label: locale === "fr" ? "À propos" : "About", href: aboutHref },
  ];

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border-subtle py-12 md:py-16">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brass">
                {dict.footer.ctaBanner.kicker}
              </p>
              <p className="mt-1 max-w-lg text-lg font-semibold tracking-tight text-ink">
                {dict.footer.ctaBanner.heading}
              </p>
            </div>
            <Link
              href={pilotHref}
              className="btn-primary-gradient inline-flex shrink-0 items-center rounded-lg px-6 py-3.5 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] active:-translate-y-[1px]"
            >
              {dict.footer.ctaBanner.cta}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-3 md:gap-16">
          <div>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-ink no-underline"
              aria-label="Praedixa"
            >
              <Image src="/logo-black.svg" alt="Praedixa" width={24} height={24} />
              <span className="text-base font-semibold tracking-tight">
                Praedixa
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
              {dict.footer.tagline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {dict.footer.badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex rounded-full border border-border-subtle px-3 py-1 text-xs font-medium text-neutral-500"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
              {dict.footer.navigation}
            </h3>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {navLinks.map((link) => (
                <li key={link.href} className="m-0">
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-600 no-underline transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-400">
              {dict.footer.legalContact}
            </h3>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {legalLinks.map((link) => (
                <li key={link.href} className="m-0">
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-600 no-underline transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border-subtle py-6">
          <p className="text-center text-xs text-neutral-400">
            {dict.footer.copyright} &middot; Praedixa{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
