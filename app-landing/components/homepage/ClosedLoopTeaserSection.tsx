import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface ClosedLoopTeaserSectionProps {
  locale: Locale;
}

const copy = {
  fr: {
    kicker: "Comment ça marche",
    heading: "Une boucle fermée en 4 étapes.",
    sub: "Même cadence sur chaque site. Coût, service, risque — toujours.",
    ctaLabel: "Voir les 4 étapes en détail",
    steps: [
      { label: "Anticiper", sub: "Dérives KPI · court horizon" },
      { label: "Décider", sub: "Coût / service / risque" },
      { label: "Déclencher", sub: "1re étape · manager valide" },
      { label: "Prouver", sub: "Preuve mensuelle · contrefactuel" },
    ],
  },
  en: {
    kicker: "How it works",
    heading: "A four-step closed loop.",
    sub: "The same cadence across all sites. Cost, service, risk — always.",
    ctaLabel: "View the four steps in detail",
    steps: [
      { label: "Anticipate", sub: "KPI drifts · short horizon" },
      { label: "Decide", sub: "Cost / service / risk" },
      { label: "Trigger", sub: "First step · manager validates" },
      { label: "Prove", sub: "Monthly proof · counterfactual" },
    ],
  },
} as const;

export function ClosedLoopTeaserSection({ locale }: ClosedLoopTeaserSectionProps) {
  const c = copy[locale];
  const howItWorksHref = getLocalizedPath(locale, "howItWorksPage");

  return (
    <SectionShell id="closed-loop" className="section-dark relative overflow-x-clip py-14 md:py-20">
      {/* Top separator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)]"
      />

      <Kicker className="text-neutral-100">{c.kicker}</Kicker>
      <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.04] tracking-tighter text-white md:text-5xl">
        {c.heading}
      </h2>
      <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-neutral-300">
        {c.sub}
      </p>

      {/* ── Step flow: horizontal on sm+, stacked on mobile ─── */}
      <div className="mt-9 flex flex-col items-start gap-y-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-0 sm:gap-y-0">
        {c.steps.map((step, i) => (
          <Fragment key={step.label}>
            {/* Step pill */}
            <div
              className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 transition-colors duration-200 hover:bg-white/[0.08]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="shrink-0 font-mono text-[10px] font-semibold text-amber-400/60">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight text-white">{step.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-neutral-500">{step.sub}</p>
              </div>
            </div>

            {/* Connector */}
            {i < c.steps.length - 1 ? (
              <div aria-hidden="true" className="hidden shrink-0 px-2 sm:flex sm:items-center">
                <ArrowRight size={12} className="text-white/20" />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="hidden shrink-0 items-center pl-2.5 text-xs text-amber-400/30 sm:flex"
              >
                ↩
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* CTA */}
      <Link
        href={howItWorksHref}
        className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors duration-200 hover:bg-white/[0.12] active:scale-[0.98] active:transition-none"
      >
        {c.ctaLabel}
        <ArrowRight size={14} weight="bold" />
      </Link>
    </SectionShell>
  );
}
