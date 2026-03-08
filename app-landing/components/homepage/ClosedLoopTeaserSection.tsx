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
    heading: "Une base commune, puis des décisions plus claires.",
    sub: "Praedixa relie d'abord les données utiles. Ensuite, les besoins, les écarts et les priorités deviennent plus faciles à lire site par site.",
    ctaLabel: "Voir comment Praedixa fonctionne",
    stepBadge: "Étape",
    finalBadge: "ROI",
    footer:
      "Vous partez d'une base commune, puis vous voyez où agir, quoi prioriser et comment suivre ce qui rapporte.",
    steps: [
      {
        number: "01",
        label: "Réunir",
        sub: "Toutes les données utiles",
      },
      {
        number: "02",
        label: "Anticiper",
        sub: "Besoins et écarts visibles plus tôt",
      },
      {
        number: "03",
        label: "Optimiser",
        sub: "Priorités et arbitrages plus clairs",
      },
      {
        number: "04",
        label: "Suivre",
        sub: "ROI et impact dans le temps",
      },
    ],
  },
  en: {
    kicker: "How it works",
    heading: "A four-step closed loop.",
    sub: "The same cadence across all sites. One clear path from signal to proof.",
    ctaLabel: "View the four steps in detail",
    stepBadge: "Step",
    finalBadge: "ROI",
    footer:
      "Each step sets up the next one: gather the data, read the drift, prioritize the action, then prove the impact.",
    steps: [
      { number: "01", label: "Anticipate", sub: "KPI drifts · short horizon" },
      { number: "02", label: "Decide", sub: "Cost / service / risk" },
      { number: "03", label: "Trigger", sub: "First step · manager validates" },
      { number: "04", label: "Prove", sub: "Monthly proof · counterfactual" },
    ],
  },
} as const;

export function ClosedLoopTeaserSection({
  locale,
}: ClosedLoopTeaserSectionProps) {
  const c = copy[locale];
  const howItWorksHref = getLocalizedPath(locale, "howItWorksPage");

  return (
    <SectionShell id="closed-loop" className="section-dark relative overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_420px_at_12%_4%,rgba(250,204,21,0.08),transparent_55%),radial-gradient(900px_420px_at_88%_10%,rgba(255,255,255,0.05),transparent_58%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]"
      />

      <div className="relative">
        <Kicker className="text-neutral-100">{c.kicker}</Kicker>
        <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tighter text-white md:text-5xl">
          {c.heading}
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-neutral-300">
          {c.sub}
        </p>

        <div className="relative mt-10">
          <div
            aria-hidden="true"
            className="absolute left-[2rem] right-[2rem] top-9 hidden h-px bg-[linear-gradient(90deg,rgba(245,158,11,0.34),rgba(255,255,255,0.12),rgba(245,158,11,0.34))] lg:block"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {c.steps.map((step, index) => (
              <article
                key={step.number}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] px-5 py-5 shadow-[0_24px_60px_-44px_rgba(2,6,23,0.88)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.05)_100%)] sm:px-6 sm:py-6"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,rgba(245,158,11,0.16),rgba(245,158,11,0.7),rgba(245,158,11,0.16))]"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/18 bg-amber-400/10 font-mono text-sm font-semibold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {step.number}
                  </div>
                  <span className="pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/34">
                    {index < c.steps.length - 1 ? c.stepBadge : c.finalBadge}
                  </span>
                </div>

                <h3 className="mt-12 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  {step.label}
                </h3>
                <p className="mt-3 max-w-[22ch] text-sm leading-relaxed text-neutral-300">
                  {step.sub}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-[60ch] text-sm leading-relaxed text-neutral-300">
            {c.footer}
          </p>

          <Link
            href={howItWorksHref}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/18 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors duration-200 hover:bg-white/[0.12] active:scale-[0.98] active:transition-none"
          >
            {c.ctaLabel}
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
