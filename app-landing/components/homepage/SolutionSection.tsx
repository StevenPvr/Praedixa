import { ArrowRight, Sparkle } from "@phosphor-icons/react/ssr";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";
import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "../shared/motion/MotionReveal";

interface SolutionSectionProps {
  dict: Dictionary;
}

export function SolutionSection({ dict }: SolutionSectionProps) {
  const solution = dict.solution;
  const principles = Array.isArray(solution.principles)
    ? solution.principles
    : null;
  const differentiators = Array.isArray(solution.differentiators.items)
    ? solution.differentiators.items
    : null;
  const isFrench = dict.nav.problem === "Problème";

  if (!principles || !differentiators) {
    return (
      <SectionShell
        id="solution"
        className="bg-[linear-gradient(180deg,var(--warm-bg-muted)_0%,var(--warm-bg-panel)_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{solution.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {isFrench ? "Chargement de la méthode" : "Loading method"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Assemblage du cadre de décision en cours."
              : "Building the decision method framework."}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (principles.length === 0) {
    return (
      <SectionShell
        id="solution"
        className="bg-[linear-gradient(180deg,var(--warm-bg-muted)_0%,var(--warm-bg-panel)_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{solution.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {isFrench ? "Méthode en préparation" : "Method in preparation"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Ajoutez des principes de décision pour afficher cette section."
              : "Add decision principles to render this section."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="solution"
      className="bg-[linear-gradient(180deg,var(--warm-bg-muted)_0%,var(--warm-bg-panel)_100%)]"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
        <div className="min-w-0">
          <MotionReveal>
            <Kicker>{solution.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {solution.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
              {solution.subheading}
            </p>
          </MotionReveal>

          <MotionStagger className="mt-12 space-y-4" staggerDelay={0.15}>
            {principles.map((principle) => (
              <MotionStaggerItem
                key={principle.title}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200/70 bg-white/85 p-5 shadow-[0_16px_34px_-26px_rgba(24,24,27,0.45)] md:grid-cols-[10.5rem_1fr] md:p-6"
              >
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
                    <PulseDot className="h-1.5 w-1.5 bg-amber-500" />
                    {principle.subtitle}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold tracking-tight text-ink">
                    {principle.title}
                  </h3>
                  <p className="max-w-[65ch] text-sm leading-relaxed text-neutral-600">
                    {principle.description}
                  </p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>

        <MotionReveal
          direction="right"
          delay={0.2}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-2xl border border-neutral-200/80 bg-white/85 p-6 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.75)] md:p-7">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
              <Sparkle size={14} weight="fill" />
              {isFrench ? "Différenciation" : "Differentiation"}
            </span>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {solution.differentiators.title}
            </h3>
            <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-neutral-600">
              {solution.differentiators.description}
            </p>
            <div className="mt-6 divide-y divide-neutral-200/80 border-y border-neutral-200/80">
              {differentiators.map((item) => (
                <div
                  key={item.is}
                  className="grid grid-cols-1 gap-1.5 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3"
                >
                  <span className="font-medium text-brass-700">{item.is}</span>
                  <ArrowRight size={14} className="hidden shrink-0 text-neutral-300 md:block" />
                  <span className="text-neutral-500 line-through">
                    {item.isNot}
                  </span>
                </div>
              ))}
            </div>
            <ShimmerTrack
              className="mt-5 bg-neutral-100"
              indicatorClassName="via-amber-300/60"
            />
          </div>
        </MotionReveal>
      </div>
    </SectionShell>
  );
}
