import Link from "next/link";
import Image from "next/image";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { MagneticActionLink } from "./motion/MagneticActionLink";
import { PulseDot } from "./motion/PulseDot";
import { ShimmerTrack } from "./motion/ShimmerTrack";

interface FooterProps {
  locale: Locale;
  dict: Dictionary;
}

export function Footer({ locale, dict }: FooterProps) {
  const primaryCtaHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const servicesHref = getLocalizedPath(locale, "services");
  const blogHref = `/${locale}/blog`;
  const contactHref = getLocalizedPath(locale, "contact");
  const legalHref = getLocalizedPath(locale, "legal");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const aboutHref = getLocalizedPath(locale, "about");

  const navLinks = [
    { label: dict.nav.problem, href: `/${locale}#problem` },
    { label: dict.nav.method, href: `/${locale}#solution` },
    { label: dict.nav.services, href: servicesHref },
    { label: "Blog", href: blogHref },
    { label: dict.nav.howItWorks, href: `/${locale}#how-it-works` },
    { label: dict.nav.security, href: `/${locale}#security` },
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

  const badges = Array.isArray(dict.footer.badges) ? dict.footer.badges : null;
  const hasNavLinks = navLinks.length > 0;
  const hasLegalLinks = legalLinks.length > 0;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/70 bg-[linear-gradient(180deg,var(--warm-bg-white)_0%,var(--warm-bg-muted)_52%,var(--warm-bg-panel)_100%)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.62fr_1fr] md:items-end md:gap-12">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-700">
                {dict.footer.ctaBanner.kicker}
              </p>
              <p className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-ink md:text-5xl md:leading-[1.03]">
                {dict.footer.ctaBanner.heading}
              </p>
              <p className="max-w-[62ch] text-sm leading-relaxed text-neutral-600 md:text-base">
                {dict.footer.tagline}
              </p>
              <div className="flex flex-wrap gap-2">
                {badges && badges.length > 0 ? (
                  badges.map((badge, index) => (
                    <span
                      key={badge}
                      className={`inline-flex items-center gap-2 rounded-full border border-neutral-300/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-600 ${
                        index % 2 === 1 ? "translate-y-[1px]" : ""
                      }`}
                    >
                      <PulseDot className="h-1.5 w-1.5 bg-amber-500" />
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-neutral-300/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-500">
                    <PulseDot className="h-1.5 w-1.5 bg-amber-500" />
                    {locale === "fr"
                      ? "Signal opératoire continu"
                      : "Continuous operational signal"}
                  </span>
                )}
              </div>
            </div>

          <MagneticActionLink
              href={primaryCtaHref}
              label={dict.footer.ctaBanner.cta}
              wrapperClassName="w-full md:max-w-sm md:justify-self-end"
              className="border-neutral-300/80 bg-white/90 text-ink hover:border-neutral-400 hover:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 border-y border-neutral-200/70 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10">
          <div className="space-y-5">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2.5 rounded-full border border-neutral-300/70 bg-white/75 px-3.5 py-2 text-ink no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-neutral-400/80 active:-translate-y-[1px] active:scale-[0.99]"
              aria-label="Praedixa"
            >
              <Image src="/logo-black.svg" alt="Praedixa" width={24} height={24} />
              <span className="text-sm font-semibold uppercase tracking-[0.09em]">
                Praedixa
              </span>
            </Link>
            <p className="max-w-[46ch] text-sm leading-relaxed text-neutral-600">
              {locale === "fr"
                ? "Decision intelligence orientée opérations multi-sites, preuve économique mensuelle et gouvernance COO/CFO partagée."
                : "Decision intelligence for multi-site operations, monthly economic proof, and shared COO/CFO governance."}
            </p>
            <ShimmerTrack
              className="max-w-[16rem] bg-neutral-200/70"
              indicatorClassName="via-amber-300/55"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {dict.footer.navigation}
            </h3>
            <ul className="list-none divide-y divide-neutral-200/80 rounded-2xl border border-neutral-200/80 bg-white/75 p-0">
              {hasNavLinks ? (
                navLinks.map((link) => (
                  <li key={link.href} className="m-0">
                    <Link
                      href={link.href}
                      className="inline-flex w-full items-center justify-between px-4 py-3 text-sm font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white hover:text-ink active:-translate-y-[1px] active:scale-[0.99]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="m-0 px-4 py-3 text-sm text-neutral-500">
                  {locale === "fr"
                    ? "Navigation disponible prochainement."
                    : "Navigation coming soon."}
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {dict.footer.legalContact}
            </h3>
            <ul className="list-none divide-y divide-neutral-200/80 rounded-2xl border border-neutral-200/80 bg-white/75 p-0">
              {hasLegalLinks ? (
                legalLinks.map((link) => (
                  <li key={link.href} className="m-0">
                    <Link
                      href={link.href}
                      className="inline-flex w-full items-center justify-between px-4 py-3 text-sm font-medium tracking-[-0.01em] text-neutral-700 no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white hover:text-ink active:-translate-y-[1px] active:scale-[0.99]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="m-0 px-4 py-3 text-sm text-neutral-500">
                  {locale === "fr"
                    ? "Informations legales indisponibles."
                    : "Legal information unavailable."}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 py-6 text-xs text-neutral-500 md:flex-row md:items-center md:justify-between">
          <p>
            {dict.footer.copyright} &middot; Praedixa {year}
          </p>
          <p className="text-neutral-400">
            {locale === "fr"
              ? "Disponible en francais et en anglais."
              : "Available in French and English."}
          </p>
        </div>
      </div>
    </footer>
  );
}
