import { CheckSquare, TrendUp } from "@phosphor-icons/react/ssr";
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

interface DeliverablesSectionProps {
  dict: Dictionary;
}

export function DeliverablesSection({ dict }: DeliverablesSectionProps) {
  const deliverables = dict.deliverables;
  const roiFrames = Array.isArray(deliverables.roiFrames)
    ? deliverables.roiFrames
    : null;
  const checklist = Array.isArray(deliverables.checklist)
    ? deliverables.checklist
    : null;
  const isFrench = deliverables.kicker.toLowerCase().includes("preuve");

  if (!roiFrames || !checklist) {
    return (
      <SectionShell id="deliverables" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl">
            {isFrench ? "Chargement de la preuve ROI" : "Loading ROI proof"}
          </h2>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {isFrench
              ? "Préparation du cadre BAU/0% vs 100% vs réel."
              : "Preparing BAU/0% vs 100% vs actual framework."}
            </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (roiFrames.length === 0) {
    return (
      <SectionShell id="deliverables" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl">
            {isFrench ? "Aucun référentiel ROI" : "No ROI references yet"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {isFrench
              ? "Ajoutez des scénarios pour activer la preuve mensuelle."
              : "Add scenarios to activate monthly proof."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="deliverables" className="section-dark">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.08fr_0.92fr] md:gap-14">
        <div className="min-w-0">
          <MotionReveal>
            <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-white md:text-6xl">
              {deliverables.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {deliverables.subheading}
            </p>
          </MotionReveal>

          <div className="mt-12 space-y-4">
            {roiFrames.map((frame, i) => (
              <MotionReveal key={frame.label} delay={i * 0.08}>
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6"
                >
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-100">
                    <PulseDot className="h-1.5 w-1.5 bg-amber-300" />
                    {frame.label}
                  </span>
                  <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {frame.value}
                  </p>
                  <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-neutral-200">
                    {frame.note}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <a
                      href={frame.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-[11px] font-semibold uppercase tracking-[0.09em] text-neutral-300 no-underline transition-colors duration-300 hover:text-white"
                    >
                      {frame.sourceLabel}
                      <span className="sr-only">
                        {isFrench ? " (nouvel onglet)" : " (opens in a new tab)"}
                      </span>
                    </a>
                    <TrendUp size={16} weight="bold" className="text-amber-300" />
                  </div>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>

        <MotionReveal
          direction="right"
          delay={0.2}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm md:p-7">
            <h3 className="text-xl font-semibold tracking-tight text-white">
              {isFrench ? "Checklist de preuve" : "Proof checklist"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-200">
              {isFrench
                ? "Chaque point verrouille la defendabilite du ROI mensuel."
                : "Each item locks monthly ROI defensibility."}
            </p>
            <MotionStagger className="mt-5 list-none space-y-3.5 p-0" staggerDelay={0.08}>
              {checklist.map((item) => (
                <MotionStaggerItem
                  key={item}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-200"
                >
                  <CheckSquare
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  {item}
                </MotionStaggerItem>
              ))}
            </MotionStagger>
            <ShimmerTrack className="mt-6" />
          </div>
        </MotionReveal>
      </div>
    </SectionShell>
  );
}
