import Link from "next/link";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { ArrowRightIcon } from "../icons";
import { siteConfig } from "../../lib/config/site";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface FooterProps {
  dict: Dictionary;
  locale: Locale;
}

export function Footer({ dict, locale }: FooterProps) {
  const { footer } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const year = new Date().getFullYear();

  const navLinks = [
    { href: "#solution", label: dict.nav.method },
    { href: "#security", label: dict.nav.security },
    { href: "#pilot", label: dict.pilot.kicker },
    { href: "#faq", label: dict.nav.faq },
    {
      href: `/${locale}/${localizedSlugs.resources[locale]}`,
      label: locale === "fr" ? "Ressources" : "Resources",
    },
  ];

  const legalLinks = [
    {
      href: `/${locale}/${localizedSlugs.legal[locale]}`,
      label: locale === "fr" ? "Mentions légales" : "Legal notice",
    },
    {
      href: `/${locale}/${localizedSlugs.privacy[locale]}`,
      label: locale === "fr" ? "Confidentialité" : "Privacy policy",
    },
    {
      href: `/${locale}/${localizedSlugs.terms[locale]}`,
      label: locale === "fr" ? "CGU" : "Terms",
    },
    {
      href: `/${locale}/${localizedSlugs.about[locale]}`,
      label: locale === "fr" ? "À propos" : "About",
    },
  ];

  return (
    <footer className="section-dark">
      <div className="section-shell pb-12 pt-16">
        <div className="flex flex-col items-center rounded-lg border border-white/5 bg-white/[0.03] px-8 py-10 text-center">
          <p className="craft-pill">{footer.ctaBanner.kicker}</p>
          <h2 className="mt-4 max-w-lg font-serif text-2xl text-white sm:text-3xl">
            {footer.ctaBanner.heading}
          </h2>
          <Link href={pilotHref} className="btn-primary mt-6">
            {footer.ctaBanner.cta}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="section-shell border-t border-white/5 pb-8 pt-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <PraedixaLogo
                variant="geometric"
                size={24}
                color="oklch(0.92 0.005 70)"
                strokeWidth={1}
              />
              <span className="font-serif text-lg text-white">Praedixa</span>
            </div>
            <p className="mt-3 text-sm text-white">{footer.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {footer.badges.map((badge) => (
                <span key={badge} className="text-xs text-white">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              {footer.navigation}
            </p>
            <ul className="mt-3 grid gap-1.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("#") ? (
                    <a
                      href={link.href}
                      className="text-sm text-white transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-white transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href={pilotHref}
                  className="text-sm font-medium text-brass-400 transition hover:text-brass-300"
                >
                  {dict.nav.ctaPrimary}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              {footer.legalContact}
            </p>
            <ul className="mt-3 grid gap-1.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-sm text-white transition hover:text-white"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-6">
          <p className="text-xs text-white">&copy; {year} Praedixa</p>
          <p className="text-xs text-white">{footer.copyright}</p>
          <div className="flex gap-2">
            <Link
              href="/fr"
              className={`text-xs transition ${locale === "fr" ? "font-semibold text-white" : "text-white hover:text-white"}`}
            >
              FR
            </Link>
            <span className="text-xs text-white">|</span>
            <Link
              href="/en"
              className={`text-xs transition ${locale === "en" ? "font-semibold text-white" : "text-white hover:text-white"}`}
            >
              EN
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
