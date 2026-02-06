import Link from "next/link";
import { cn } from "../ui";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { siteConfig } from "../../lib/config/site";

interface FooterProps {
  className?: string;
}

const NAVIGATION_LINKS = [
  { href: "#problem", label: "Le problème" },
  { href: "#solution", label: "La solution" },
  { href: "#pipeline", label: "La vision" },
  { href: "#deliverables", label: "Les livrables" },
  { href: "#pilot", label: "Programme pilote" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
  { href: "/devenir-pilote", label: "Devenir entreprise pilote" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
] as const;

/**
 * Simplified footer — no Framer Motion, clean 3-column layout.
 * Plan directive: "No Framer Motion in Footer."
 */
export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("bg-charcoal", className)}>
      {/* Decorative gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Mini CTA Banner */}
      <div className="border-b border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-center font-serif text-xl text-white md:text-left md:text-2xl">
            Prêt à anticiper vos risques de sous-couverture ?
          </p>
          <Link
            href="/devenir-pilote"
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-charcoal"
          >
            Devenir entreprise pilote
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Main Footer Content — 3 columns */}
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <PraedixaLogo
                variant="industrial"
                size={28}
                color="oklch(1 0 0)"
                strokeWidth={1}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-xl font-bold text-white">
                Praedixa
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
              Prévoir les trous. Chiffrer les options. Prouver le ROI.
            </p>

            {/* Trust indicators */}
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-xs text-white/50">
                  Hébergement Cloudflare (edge)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-xs text-white/50">
                  Données agrégées, RGPD by design
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3">
              {NAVIGATION_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/70 transition-colors hover:text-amber-400"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal + Contact Column */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Légal
            </h3>
            <nav className="flex flex-col gap-3">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/70 transition-colors hover:text-amber-400"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-amber-400">
              Contact
            </h3>
            <a
              href={`mailto:${siteConfig.contact.email}?subject=Programme%20pilote%20Praedixa`}
              className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-amber-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {siteConfig.contact.email}
            </a>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-white/40">
            &copy; {currentYear} Praedixa. Tous droits réservés.
          </p>
          <p className="text-xs text-white/40">Conçu en France</p>
        </div>
      </div>
    </footer>
  );
}
