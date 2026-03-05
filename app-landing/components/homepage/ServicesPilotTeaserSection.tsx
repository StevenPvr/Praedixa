import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface ServicesPilotTeaserSectionProps {
  locale: Locale;
}

export function ServicesPilotTeaserSection({ locale }: ServicesPilotTeaserSectionProps) {
  const isFr = locale === "fr";
  const pilotSteps = isFr
    ? ["Audit historique (M1)", "Jalon preuve (S8)", "Consolidation (M3)"]
    : ["Historical audit (M1)", "Proof milestone (W8)", "Consolidation (M3)"];

  return (
    <SectionShell id="services-pilot" className="section-dark py-16 md:py-20">
      <Kicker className="text-neutral-100">
        {isFr ? "Services & pilote" : "Services and pilot"}
      </Kicker>
      <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
        {isFr
          ? "Deux niveaux de service, un protocole clair"
          : "Two service levels, one clear protocol"}
      </h2>
      <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-neutral-200 md:text-base">
        {isFr
          ? "Service Signature (décisions + journal + preuve) ou mode Prévisions KPI. Même garde-fous: lecture seule, agrégé, manager décisionnaire."
          : "Signature Service (decisions + log + proof) or KPI Forecast mode. Same guardrails: read-only, aggregated data, manager decision authority."}
      </p>

      <div className="mt-7 rounded-2xl border border-white/15 bg-white/[0.05] p-4 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.09em] text-amber-100">
          {isFr ? "Cadence pilote 3 mois" : "Three-month pilot cadence"}
        </p>
        <ul className="mt-3 grid list-none gap-2 p-0 md:grid-cols-3">
          {pilotSteps.map((step) => (
            <li key={step} className="m-0 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-sm text-neutral-100">
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={getLocalizedPath(locale, "services")}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors duration-200 hover:bg-white/[0.12]"
        >
          {isFr ? "Comparer les services" : "Compare services"}
          <ArrowRight size={14} weight="bold" />
        </Link>
        <Link
          href={getLocalizedPath(locale, "pilot")}
          className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white no-underline transition-all duration-200"
        >
          {isFr ? "Candidater au pilote" : "Apply for the pilot"}
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </SectionShell>
  );
}
