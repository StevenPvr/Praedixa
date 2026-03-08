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
  const productHref = getLocalizedPath(locale, "productMethod");
  const methodHref = getLocalizedPath(locale, "howItWorksPage");
  const proofHref = getLocalizedPath(locale, "decisionLogProof");
  const integrationHref = getLocalizedPath(locale, "integrationData");
  const solutionsHref = getLocalizedPath(locale, "resources");
  const blogHref = `/${locale}/blog`;
  const contactHref = getLocalizedPath(locale, "contact");
  const legalHref = getLocalizedPath(locale, "legal");
  const privacyHref = getLocalizedPath(locale, "privacy");
  const termsHref = getLocalizedPath(locale, "terms");
  const aboutHref = getLocalizedPath(locale, "about");

  const navLinks = [
    {
      label: locale === "fr" ? "Produit & méthode" : "Product and method",
      href: productHref,
    },
    {
      label: locale === "fr" ? "Comment ça marche" : "How it works",
      href: methodHref,
    },
    {
      label: locale === "fr" ? "Dossier ROI" : "Decision Log and ROI proof",
      href: proofHref,
    },
    {
      label: locale === "fr" ? "Intégration & données" : "Integration and data",
      href: integrationHref,
    },
    { label: dict.nav.services, href: servicesHref },
    { label: locale === "fr" ? "Solutions" : "Solutions", href: solutionsHref },
    { label: "Blog", href: blogHref },
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
    <footer className="border-t border-white/[0.08] bg-navy-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.62fr_1fr] md:items-end md:gap-12">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/80">
                {dict.footer.ctaBanner.kicker}
              </p>
              <p className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white md:text-5xl md:leading-[1.03]">
                {dict.footer.ctaBanner.heading}
              </p>
              <p className="max-w-[62ch] text-sm leading-relaxed text-neutral-300 md:text-base">
                {dict.footer.tagline}
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
                      <PulseDot className="h-1.5 w-1.5 bg-amber-400" />
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-400">
                    <PulseDot className="h-1.5 w-1.5 bg-amber-400" />
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
              className="border-white/15 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/[0.1]"
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
              <Image src="/logo-white.svg" alt="Praedixa" width={24} height={24} />
              <span className="text-sm font-semibold uppercase tracking-[0.09em]">
                Praedixa
              </span>
            </Link>
            <p className="max-w-[46ch] text-sm leading-relaxed text-neutral-400">
              {locale === "fr"
                ? "Praedixa réunit les données RH, finance, opérations et supply chain dans une même base pour clarifier les arbitrages et suivre le ROI."
                : "Forecast. Decide (cost/service/risk). Trigger the first assisted action. Prove impact."}
            </p>
            <ShimmerTrack
              className="max-w-[16rem] bg-white/10"
              indicatorClassName="via-amber-400/45"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              {dict.footer.navigation}
            </h3>
            <ul className="list-none divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.04] p-0">
              {hasNavLinks ? (
                navLinks.map((link) => (
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
                <li className="m-0 px-4 py-3 text-sm text-white/30">
                  {locale === "fr"
                    ? "Navigation disponible prochainement."
                    : "Navigation coming soon."}
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              {dict.footer.legalContact}
            </h3>
            <ul className="list-none divide-y divide-white/[0.08] rounded-2xl border border-white/10 bg-white/[0.04] p-0">
              {hasLegalLinks ? (
                legalLinks.map((link) => (
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
                <li className="m-0 px-4 py-3 text-sm text-white/30">
                  {locale === "fr"
                    ? "Informations légales indisponibles."
                    : "Legal information unavailable."}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 py-6 text-xs text-white/30 md:flex-row md:items-center md:justify-between">
          <p>
            {dict.footer.copyright} &middot; Praedixa {year}
          </p>
          <p className="text-white/20">
            {locale === "fr"
              ? "Disponible en français et en anglais."
              : "Available in French and English."}
          </p>
        </div>
      </div>
    </footer>
  );
}
