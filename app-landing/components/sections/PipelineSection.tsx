"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { staggerItem } from "../../lib/animations/variants";
import { pipelinePhases } from "../../lib/content/pipeline-phases";
import { SectionWrapper } from "../shared/SectionWrapper";
import { SectionHeader } from "../shared/SectionHeader";
import { ArrowRightIcon, CheckIcon } from "../icons";

const FLOW_STEPS = ["Signal", "Arbitrage", "Action", "Mesure"] as const;

function FlowDiagram() {
  return (
    <motion.div className="mt-12" variants={staggerItem}>
      <div className="flex flex-wrap items-center gap-3">
        {FLOW_STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <span className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              {step}
            </span>
            {index < FLOW_STEPS.length - 1 && (
              <ArrowRightIcon className="h-4 w-4 text-amber-600" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-600">
        Le système est pensé comme une boucle de management: chaque cycle affine
        la qualité des arbitrages et réduit la dépendance aux décisions de crise.
      </p>
    </motion.div>
  );
}

function PhaseCallout({
  text,
  variant,
}: {
  text: string;
  variant: "info" | "critical";
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-2xl px-4 py-3 text-sm leading-relaxed",
        variant === "info"
          ? "border border-amber-200 bg-amber-50 text-amber-800"
          : "border border-charcoal/20 bg-charcoal text-white",
      )}
    >
      {text}
    </div>
  );
}

export function PipelineSection({ className }: { className?: string }) {
  return (
    <SectionWrapper id="pipeline" className={className}>
      <SectionHeader
        kicker="Cas d'usage prioritaires"
        heading="Des scénarios réels traités avec un cadre de décision premium"
        subheading="Chaque cas d'usage suit la même logique: visibilité anticipée, options comparables, décision défendable, impact mesurable."
      />

      <div className="grid gap-6">
        {pipelinePhases.map((phase, index) => (
          <motion.article
            key={phase.id}
            className="premium-card p-6"
            variants={staggerItem}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {`Cas ${index + 1}`}
                </p>
                <h3 className="mt-2 font-serif text-3xl leading-tight text-charcoal">
                  {phase.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {phase.description}
                </p>
              </div>
            </div>

            <ul className="mt-5 grid gap-2 md:grid-cols-2">
              {phase.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-2 text-sm leading-relaxed text-charcoal/85"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {capability}
                </li>
              ))}
            </ul>

            {phase.callout && phase.calloutVariant && (
              <PhaseCallout text={phase.callout} variant={phase.calloutVariant} />
            )}
          </motion.article>
        ))}
      </div>

      <FlowDiagram />
    </SectionWrapper>
  );
}
