import Link from "next/link";
import Image from "next/image";
import {
  buildContactIntentHref,
  getLocalizedPath,
  type Locale,
} from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getValuePropContent } from "../../lib/content/value-prop";
import { MagneticActionLink } from "./motion/MagneticActionLink";
import { PulseDot } from "./motion/PulseDot";
import { ShimmerTrack } from "./motion/ShimmerTrack";

interface FooterProps {
  locale: Locale;
  dict: Dictionary;
}

function getFooterLinks(locale: Locale, dict: Dictionary) {
  return {
    navLinks: [
      {
        label: locale === "fr" ? "Produit & méthode" : "Product and method",
        href: getLocalizedPath(locale, "productMethod"),
      },
      {
        label: locale === "fr" ? "Comment ça marche" : "How it works",
        href: getLocalizedPath(locale, "howItWorksPage"),
      },
      {
        label: locale === "fr" ? "Preuve sur historique" : "Historical proof",
        href: getLocalizedPath(locale, "decisionLogProof"),
      },
      {
        label:
          locale === "fr" ? "Intégration & données" : "Integration and data",
        href: getLocalizedPath(locale, "integrationData"),
      },
      { label: dict.nav.services, href: getLocalizedPath(locale, "services") },
      {
        label: locale === "fr" ? "Ressources" : "Resources",
        href: getLocalizedPath(locale, "resources"),
      },
      { label: "Blog", href: `/${locale}/blog` },
    ],
    legalLinks: [
      { label: dict.nav.contact, href: getLocalizedPath(locale, "contact") },
      {
        label: locale === "fr" ? "Mentions légales" : "Legal notice",
        href: getLocalizedPath(locale, "legal"),
      },
      {
        label: locale === "fr" ? "Confidentialité" : "Privacy",
        href: getLocalizedPath(locale, "privacy"),
      },
      {
        label: locale === "fr" ? "CGU" : "Terms",
        href: getLocalizedPath(locale, "terms"),
      },
      {
        label: locale === "fr" ? "À propos" : "About",
        href: getLocalizedPath(locale, "about"),
      },
    ],
  };
}

function FooterLinkColumn({
  emptyLabel,
  links,
  title,
}: {
  emptyLabel: string;
  links: { href: string; label: string }[];
  title: string;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.40)]">
        {title}
      </h3>
      <ul className="list-none divide-y divide-white/[0.07] rounded-2xl border border-white/[0.12] bg-white/[0.04] p-0">
        {links.length ? (
          links.map((link) => (
            <li key={link.href} className="m-0">
              <Link
                href={link.href}
                className="inline-flex w-full items-center justify-between px-4 py-3 text-sm font-medium tracking-[-0.01em] text-neutral-300 no-underline transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.06] hover:text-white active:-translate-y-[1px] active:scale-[0.99]"
              >
                {link.label}
              </Link>
            </li>
          ))
        ) : (
          <li className="m-0 px-4 py-3 text-sm text-[rgba(255,255,255,0.30)]">
            {emptyLabel}
          </li>
        )}
      </ul>
    </div>
  );
}

export function Footer({ locale, dict }: FooterProps) {
  const valueProp = getValuePropContent(locale);
  const primaryCtaHref = buildContactIntentHref(locale, "deployment");
  const { navLinks, legalLinks } = getFooterLinks(locale, dict);

  const badges = valueProp.reassurance.slice(0, 3);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.62fr_1fr] md:items-end md:gap-12">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-signal-500">
                {dict.footer.ctaBanner.kicker}
              </p>
              <p className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl md:leading-[1.03]">
                {dict.footer.ctaBanner.heading}
              </p>
              <p className="max-w-[62ch] text-sm leading-relaxed text-neutral-300 md:text-base">
                {valueProp.footerTagline}
              </p>
              <div className="flex flex-wrap gap-2">
                {badges && badges.length > 0 ? (
                  badges.map((badge, index) => (
                    <span
                      key={badge}
                      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-300 ${
                        index % 2 === 1 ? "translate-y-[1px]" : ""
                      }`}
                    >
                      <PulseDot className="h-1.5 w-1.5 bg-signal-500" />
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-400">
                    <PulseDot className="h-1.5 w-1.5 bg-signal-500" />
                    {locale === "fr"
                      ? "Signal opératoire continu"
                      : "Continuous operational signal"}
                  </span>
                )}
              </div>
            </div>

            <MagneticActionLink
              href={primaryCtaHref}
              label={valueProp.ctaSecondary}
              wrapperClassName="w-full md:max-w-sm md:justify-self-end"
              className="btn-primary-gradient border-ink-800 text-white shadow-[0_20px_48px_-24px_rgba(2,6,23,0.6)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 border-y border-white/10 py-12 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10">
          <div className="space-y-5">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-white no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:border-white/25 hover:bg-white/[0.1] active:-translate-y-[1px] active:scale-[0.99]"
              aria-label="Praedixa"
            >
              <Image
                src="/logo-white.svg"
                alt="Praedixa"
                width={24}
                height={24}
              />
              <span className="text-sm font-semibold uppercase tracking-[0.09em]">
                Praedixa
              </span>
            </Link>
            <p className="max-w-[46ch] text-sm leading-relaxed text-neutral-400">
              {valueProp.footerTagline}
            </p>
            <ShimmerTrack
              className="max-w-[16rem] bg-white/10"
              indicatorClassName="via-signal-500/45"
            />
          </div>

          <FooterLinkColumn
            emptyLabel={
              locale === "fr"
                ? "Navigation disponible prochainement."
                : "Navigation coming soon."
            }
            links={navLinks}
            title={dict.footer.navigation}
          />
          <FooterLinkColumn
            emptyLabel={
              locale === "fr"
                ? "Informations légales indisponibles."
                : "Legal information unavailable."
            }
            links={legalLinks}
            title={dict.footer.legalContact}
          />
        </div>

        <div className="flex flex-col gap-2.5 py-6 text-xs text-[rgba(255,255,255,0.30)] md:flex-row md:items-center md:justify-between">
          <p>
            {dict.footer.copyright} &middot; Praedixa {year}
          </p>
          <p className="text-[rgba(255,255,255,0.20)]">
            {locale === "fr"
              ? "Conçu et hébergé en France"
              : "Designed and hosted in France"}
          </p>
        </div>
      </div>
    </footer>
  );
}
