import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { HeroProofPanel } from "./HeroProofPanel";

interface HeroSectionProps {
  locale: Locale;
  dict: Dictionary;
}

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const copy =
    locale === "fr"
      ? {
          kicker: "Copilote IA · Réseaux multi-sites",
          heading: "Copilote IA pour réseaux multi-sites.",
          subtitle:
            "Protégez la marge et le niveau de service malgré la variabilité. Praedixa anticipe les dérives KPI, standardise les options, déclenche la 1re étape, puis prouve l’impact chaque mois.",
          bullets: [
            "Arbitrages coût / service / risque, sous vos règles",
            "1re étape automatisée, validation manager obligatoire",
            "ROI prouvé: baseline / recommandé / réel + contrefactuel",
          ],
          guardrails:
            "Démarrage en lecture seule sur vos outils (exports). Aucun remplacement. Données agrégées (site/équipe). IA Act & RGPD by design. Hébergé en France (Scaleway).",
          ctaPrimary: dict.nav.ctaPrimary,
          ctaSecondary: "Candidater au pilote",
          ctaTertiary: "Voir Produit & méthode",
        }
      : {
          kicker: "AI Decision Copilot · Multi-site networks",
          heading: "AI decision copilot for multi-site networks.",
          subtitle:
            "Protect margin and service levels despite activity variability. Praedixa anticipates KPI drifts, standardizes options, triggers the first step, then proves impact every month.",
          bullets: [
            "Cost / service / risk trade-offs, under your rules",
            "First step automated, manager approval required",
            "Proven ROI: baseline / recommended / actual + counterfactual",
          ],
          guardrails:
            "Read-only start on your existing tools (exports). No replacement. Aggregated site/team data. EU AI Act & GDPR by design. Hosted in France (Scaleway).",
          ctaPrimary: dict.nav.ctaPrimary,
          ctaSecondary: "Apply for the pilot",
          ctaTertiary: "View product and method",
        };

  const auditHref = `${getLocalizedPath(locale, "contact")}?intent=audit`;
  const pilotHref = getLocalizedPath(locale, "pilot");
  const methodHref = getLocalizedPath(locale, "productMethod");

  return (
    <section className="relative overflow-x-hidden bg-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
      >
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_15%_18%,rgba(15,23,42,0.12),transparent_62%),radial-gradient(820px_540px_at_88%_22%,rgba(15,23,42,0.10),transparent_60%)]" />
        <div className="absolute -top-32 right-[-22rem] h-[46rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_center,var(--navy-100),transparent_62%)] blur-3xl" />
        <div className="absolute -bottom-48 left-[-20rem] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.12),transparent_64%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.10),transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100dvh-var(--header-h))] items-center gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-18">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-white/55 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800 shadow-[0_18px_34px_-28px_rgba(2,6,23,0.55)] backdrop-blur-md">
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(15,23,42,0.06)]"
                aria-hidden="true"
              />
              {copy.kicker}
            </span>

            <h1 className="mt-6 max-w-[18ch] text-4xl font-semibold leading-[0.97] tracking-tighter text-ink md:text-6xl">
              {copy.heading}
            </h1>

            <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-neutral-600 md:text-lg">
              {copy.subtitle}
            </p>

            <ul className="mt-7 grid list-none gap-2.5 p-0 md:gap-3">
              {copy.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="m-0 flex items-start gap-3 text-sm text-neutral-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  <span className="min-w-0">{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={auditHref}
                className="group btn-primary-gradient inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold text-white no-underline shadow-[0_22px_44px_-34px_rgba(2,6,23,0.82)] transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:shadow-[0_26px_54px_-38px_rgba(2,6,23,0.85)] active:translate-y-[1px] active:scale-[0.98]"
              >
                {copy.ctaPrimary}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 [transition-timing-function:var(--ease-snappy)] group-hover:translate-x-0.5"
                >
                  <ArrowRight size={16} weight="bold" />
                </span>
              </Link>
              <Link
                href={pilotHref}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-neutral-300/90 bg-white/70 px-5 py-3 text-sm font-semibold text-ink no-underline shadow-[0_18px_34px_-30px_rgba(2,6,23,0.4)] transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:border-neutral-400 hover:bg-white active:translate-y-[1px] active:scale-[0.98] backdrop-blur-md"
              >
                {copy.ctaSecondary}
              </Link>
              <Link
                href={methodHref}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 no-underline transition-all duration-300 [transition-timing-function:var(--ease-snappy)] hover:bg-white/65 hover:text-ink active:scale-[0.99]"
              >
                {copy.ctaTertiary}
              </Link>
            </div>

            <div className="mt-9 max-w-[76ch] rounded-2xl border border-neutral-200/80 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md">
              <p className="text-xs leading-relaxed text-neutral-600">
                {copy.guardrails}
              </p>
            </div>
          </div>

          <div className="relative lg:justify-self-end">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-10 hidden lg:block"
            >
              <div className="absolute left-[-7rem] top-10 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.16),transparent_66%)] blur-3xl" />
              <div className="absolute -bottom-12 right-[-7rem] h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle_at_center,var(--navy-100),transparent_64%)] blur-3xl" />
              <div className="absolute inset-x-10 bottom-10 h-px bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.14),transparent)]" />
            </div>

            <HeroProofPanel locale={locale} className="relative mx-auto lg:ml-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
