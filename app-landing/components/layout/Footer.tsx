import Link from "next/link";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "../logo/PraedixaLogo";
import { siteConfig } from "../../lib/config/site";
import { ArrowRightIcon, ShieldCheckIcon, LockIcon, MailIcon } from "../icons";

interface FooterProps {
  className?: string;
}

const NAVIGATION_LINKS = [
  { href: "#problem", label: "Enjeux" },
  { href: "#solution", label: "Méthode" },
  { href: "#pipeline", label: "Cas d'usage" },
  { href: "#deliverables", label: "Framework ROI" },
  { href: "#pilot", label: "Cohorte pilote" },
  { href: "#faq", label: "FAQ" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
] as const;

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("bg-charcoal text-white", className)}>
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      <div className="section-shell py-10 md:py-14">
        <div className="premium-card border-white/10 bg-white/5 px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="premium-pill border-amber-400/30 bg-amber-500/10 text-amber-300">
                Cohorte fondatrice
              </p>
              <p className="mt-3 font-serif text-3xl text-white md:text-4xl">
                Prenez l'avantage avant la standardisation du marché
              </p>
            </div>
            <Link
              href="/devenir-pilote"
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-semibold text-charcoal transition hover:bg-amber-400"
            >
              Candidater à la cohorte
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <PraedixaLogo
                variant="geometric"
                size={28}
                color="oklch(1 0 0)"
                strokeWidth={1.1}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-2xl text-white">Praedixa</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              La plateforme de couverture opérationnelle conçue pour les
              organisations multi-sites qui pilotent en niveau exécutif.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/55">
                <ShieldCheckIcon className="h-4 w-4 text-amber-300" />
                Gouvernance orientée COO / DAF
              </div>
              <div className="flex items-center gap-2 text-xs text-white/55">
                <LockIcon className="h-4 w-4 text-amber-300" />
                Données agrégées, architecture privacy-by-design
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Navigation
            </h3>
            <nav className="mt-4 flex flex-col gap-2.5">
              {NAVIGATION_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/70 transition hover:text-amber-300"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/devenir-pilote"
                className="pt-1 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
              >
                Rejoindre la cohorte pilote
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Légal & contact
            </h3>
            <nav className="mt-4 flex flex-col gap-2.5">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/70 transition hover:text-amber-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <a
              href={`mailto:${siteConfig.contact.email}?subject=Programme%20pilote%20Praedixa`}
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-amber-300"
            >
              <MailIcon className="h-4 w-4" />
              {siteConfig.contact.email}
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/45 md:flex-row md:items-center">
          <p>&copy; {currentYear} Praedixa. Tous droits réservés.</p>
          <p>Conçu en France</p>
        </div>
      </div>
    </footer>
  );
}
