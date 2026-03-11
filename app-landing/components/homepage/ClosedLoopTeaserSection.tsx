import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  ChartLineUp,
  Circuitry,
  CursorClick,
  TrendUp,
} from "@phosphor-icons/react/ssr";
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
    heading: "DecisionOps: transformer l'arbitrage en action gouvernée.",
    sub: "Praedixa fédère les données utiles sur l'existant, anticipe les besoins, compare les options coût / service / risque, fait valider l'action utile et referme la boucle avec une preuve mensuelle du ROI.",
    ctaLabel: "Voir comment Praedixa fonctionne",
    footer:
      "Le but n'est pas d'avoir un signal de plus. Le but est d'industrialiser la qualité de décision avec une exécution contrôlée et une preuve lisible.",
    sideEyebrow: "Boucle DecisionOps",
    sideTitle: "Une boucle courte, lisible et exploitable par les opérations.",
    sideBody:
      "Chaque étape prépare la suivante. Praedixa ne s'arrête pas à la visibilité: la plateforme va jusqu'à l'action validée, puis jusqu'à la preuve.",
    steps: [
      {
        number: "01",
        label: "Fédérer",
        sub: "Les systemes critiques sur l'existant",
        accent: "RH · finance · operations",
        icon: Circuitry,
      },
      {
        number: "02",
        label: "Prédire",
        sub: "Les besoins et ecarts a court horizon",
        accent: "J+3 · J+7 · J+14",
        icon: Binoculars,
      },
      {
        number: "03",
        label: "Calculer",
        sub: "Les arbitrages cout / service / risque",
        accent: "Scenarios compares",
        icon: ChartLineUp,
      },
      {
        number: "04",
        label: "Déclencher",
        sub: "La premiere action validee",
        accent: "Dans vos outils",
        icon: CursorClick,
      },
      {
        number: "05",
        label: "Prouver",
        sub: "Le ROI decision par decision",
        accent: "Finance-grade",
        icon: TrendUp,
      },
    ],
  },
  en: {
    kicker: "How it works",
    heading: "DecisionOps: turn trade-offs into governed action.",
    sub: "Praedixa federates the useful data on top of your existing stack, anticipates needs, compares cost / service / risk options, gets the right action validated, and closes the loop with monthly ROI proof.",
    ctaLabel: "View the five steps in detail",
    footer:
      "The point is not just seeing the issue. The point is industrializing decision quality with controlled execution and proof.",
    sideEyebrow: "DecisionOps loop",
    sideTitle: "A short loop that operations teams can actually run.",
    sideBody:
      "Each step prepares the next one. Praedixa does not stop at visibility: it goes all the way to validated action and then to proof.",
    steps: [
      {
        number: "01",
        label: "Federate",
        sub: "Critical systems on the stack",
        accent: "HR · finance · operations",
        icon: Circuitry,
      },
      {
        number: "02",
        label: "Predict",
        sub: "Needs and short-horizon gaps",
        accent: "D+3 · D+7 · D+14",
        icon: Binoculars,
      },
      {
        number: "03",
        label: "Calculate",
        sub: "Cost / service / risk options",
        accent: "Compared scenarios",
        icon: ChartLineUp,
      },
      {
        number: "04",
        label: "Trigger",
        sub: "Validated first action",
        accent: "Inside your tools",
        icon: CursorClick,
      },
      {
        number: "05",
        label: "Prove",
        sub: "ROI decision by decision",
        accent: "Finance-grade",
        icon: TrendUp,
      },
    ],
  },
} as const;

export function ClosedLoopTeaserSection({
  locale,
}: ClosedLoopTeaserSectionProps) {
  const c = copy[locale];
  const howItWorksHref = getLocalizedPath(locale, "howItWorksPage");

  return (
    <SectionShell
      id="closed-loop"
      className="section-dark relative overflow-x-clip"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_420px_at_12%_4%,rgba(250,204,21,0.08),transparent_55%),radial-gradient(900px_420px_at_88%_10%,rgba(255,255,255,0.05),transparent_58%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]"
      />

      <div className="relative">
        <div>
          <Kicker className="text-neutral-100">{c.kicker}</Kicker>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tighter text-white md:text-5xl">
            {c.heading}
          </h2>
          <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-neutral-300">
            {c.sub}
          </p>
        </div>

        <div className="relative mt-10 xl:mt-12">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-6 shadow-[0_24px_60px_-50px_rgba(2,6,23,0.88),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm xl:sticky xl:top-28 xl:self-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(244,231,198,0.72)]">
                {c.sideEyebrow}
              </p>
              <h3 className="mt-3 max-w-[16ch] text-[2rem] font-semibold leading-[0.98] tracking-[-0.05em] text-[rgba(255,255,255,0.96)]">
                {c.sideTitle}
              </h3>
              <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-[rgba(255,255,255,0.76)]">
                {c.sideBody}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(244,231,198,0.58)]">
                    Signal
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[rgba(255,255,255,0.92)]">
                    Données fédérées
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(244,231,198,0.58)]">
                    Décision
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[rgba(255,255,255,0.92)]">
                    Arbitrage gouverné
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(244,231,198,0.58)]">
                    Impact
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[rgba(255,255,255,0.92)]">
                    ROI prouvé
                  </p>
                </div>
              </div>
            </div>

            <div className="relative pl-0 xl:pl-8">
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-5 top-0 hidden w-px bg-[linear-gradient(180deg,rgba(244,231,198,0.08),rgba(244,231,198,0.32),rgba(244,231,198,0.08))] xl:block"
              />
              <div className="space-y-4 md:space-y-5">
                {c.steps.map((step) => (
                  <article
                    key={step.number}
                    className="group relative min-h-[11.5rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] px-5 py-5 shadow-[0_24px_60px_-44px_rgba(2,6,23,0.88),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.05)_100%)] sm:px-6 sm:py-6"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(245,158,11,0.08),rgba(245,158,11,0.7),rgba(245,158,11,0.08))]"
                    />
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/18 bg-amber-400/10 text-[rgba(255,248,220,0.95)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <step.icon size={20} weight="regular" />
                        </div>
                        <div className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 font-mono text-[11px] font-semibold text-[rgba(255,255,255,0.72)]">
                          {step.number}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(244,231,198,0.62)] md:pt-2">
                        {step.accent}
                      </span>
                    </div>

                    <div className="mt-6 md:grid md:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] md:gap-6">
                      <h3 className="text-[1.65rem] font-semibold leading-[0.98] tracking-[-0.045em] text-[rgba(255,255,255,0.96)] md:text-[1.85rem]">
                        {step.label}
                      </h3>
                      <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[rgba(255,255,255,0.76)] md:mt-0">
                        {step.sub}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] px-5 py-5 shadow-[0_24px_60px_-50px_rgba(2,6,23,0.88),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
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
