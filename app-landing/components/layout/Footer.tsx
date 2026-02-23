import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  LockKey,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";
import { LocaleSwitcher } from "./LocaleSwitcher";

interface FooterProps {
  dict: Dictionary;
  locale: Locale;
}

export function Footer({ dict, locale }: FooterProps) {
  const { footer } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const year = new Date().getFullYear();

  const navLinks = [
    { href: "#methode", label: dict.nav.method },
    { href: "#security", label: dict.nav.security },
    { href: "#pilot", label: dict.pilot.kicker },
    { href: "#faq", label: dict.nav.faq },
    {
      href: `/${locale}/${localizedSlugs.resources[locale]}`,
      label: locale === "fr" ? "Ressources" : "Resources",
    },
    {
      href: `/${locale}/${localizedSlugs.contact[locale]}`,
      label: "Contact",
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
    {
      href: `/${locale}/${localizedSlugs.security[locale]}`,
      label: locale === "fr" ? "Sécurité" : "Security",
    },
  ];

  return (
    <footer className="section-dark border-t border-white/10">
      <div className="section-shell py-20">
        <div className="panel-dark rounded-3xl p-6 md:p-9">
          <p className="section-kicker">
            <Sparkle size={12} weight="fill" />
            {footer.ctaBanner.kicker}
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl tracking-tight text-white md:text-5xl">
            {footer.ctaBanner.heading}
          </h2>
          <Link href={pilotHref} className="btn-primary mt-6">
            {footer.ctaBanner.cta}
            <ArrowUpRight size={16} weight="bold" />
          </Link>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <PraedixaLogo
                variant="geometric"
                size={24}
                color="oklch(0.9 0.005 250)"
                strokeWidth={1}
              />
              <span className="text-base font-semibold tracking-tight text-white">
                Praedixa
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/72">
              {footer.tagline}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {footer.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/78"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              {footer.navigation}
            </p>
            <ul className="grid gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("#") ? (
                    <a
                      href={link.href}
                      className="text-sm text-white/78 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-white/78 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              {footer.legalContact}
            </p>
            <ul className="grid gap-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/78 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/66">
          <div className="inline-flex items-center gap-2">
            <Compass size={14} weight="duotone" />
            <span>&copy; {year} Praedixa</span>
          </div>
          <span>{footer.copyright}</span>
          <div className="inline-flex items-center gap-2">
            <LockKey size={14} weight="duotone" />
            <LocaleSwitcher locale={locale} />
          </div>
        </div>
      </div>
    </footer>
  );
}
