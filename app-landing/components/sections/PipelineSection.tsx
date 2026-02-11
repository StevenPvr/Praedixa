"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { staggerItem } from "../../lib/animations/variants";
import { pipelinePhases } from "../../lib/content/pipeline-phases";
import { SectionWrapper } from "../shared/SectionWrapper";
import { SectionHeader } from "../shared/SectionHeader";
import { ArrowRightIcon, CheckIcon } from "../icons";

/* ------------------------------------------------------------------ */
/*  Inline SVG illustrations for each phase (64x64)                   */
/* ------------------------------------------------------------------ */

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-16 w-16", className)}
      aria-hidden="true"
    >
      {/* Scattered data points at top */}
      <circle
        cx="12"
        cy="10"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      <circle
        cx="28"
        cy="8"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      <circle
        cx="44"
        cy="12"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      <circle
        cx="52"
        cy="6"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      <circle
        cx="20"
        cy="14"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      <circle
        cx="36"
        cy="6"
        r="2.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      {/* Funnel shape */}
      <path
        d="M8 22 L56 22 L38 44 L38 56 L26 56 L26 44 Z"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.1"
        strokeLinejoin="round"
      />
      {/* Organised columns at bottom */}
      <rect
        x="24"
        y="58"
        width="4"
        height="4"
        rx="1"
        fill="oklch(0.769 0.205 70)"
      />
      <rect
        x="30"
        y="58"
        width="4"
        height="4"
        rx="1"
        fill="oklch(0.769 0.205 70)"
      />
      <rect
        x="36"
        y="58"
        width="4"
        height="4"
        rx="1"
        fill="oklch(0.769 0.205 70)"
      />
    </svg>
  );
}

function PredictionChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-16 w-16", className)}
      aria-hidden="true"
    >
      {/* Axes */}
      <path
        d="M8 56 L8 8 M8 56 L60 56"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
      />
      {/* Historical line */}
      <polyline
        points="12,48 20,42 28,44 36,36"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="none"
      />
      {/* Confidence band */}
      <path
        d="M36 36 L44 30 L52 26 L56 24 L56 36 L52 34 L44 38 L36 36 Z"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
      />
      {/* Prediction line (dashed) */}
      <polyline
        points="36,36 44,30 52,26 56,24"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        strokeDasharray="4 3"
        fill="none"
      />
      {/* Dot at junction */}
      <circle cx="36" cy="36" r="3" fill="oklch(0.769 0.205 70)" />
    </svg>
  );
}

function NotificationCardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-16 w-16", className)}
      aria-hidden="true"
    >
      {/* Card background */}
      <rect
        x="6"
        y="8"
        width="52"
        height="48"
        rx="4"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.05"
      />
      {/* Header */}
      <rect
        x="12"
        y="14"
        width="24"
        height="3"
        rx="1.5"
        fill="oklch(0.769 0.205 70)"
        opacity="0.5"
      />
      {/* Option row 1 */}
      <rect
        x="12"
        y="24"
        width="36"
        height="6"
        rx="2"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.15"
      />
      <text
        x="48"
        y="29"
        fontSize="5"
        fill="oklch(0.769 0.205 70)"
        fontWeight="bold"
        textAnchor="end"
      >
        12k
      </text>
      {/* Option row 2 */}
      <rect
        x="12"
        y="34"
        width="36"
        height="6"
        rx="2"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.1"
      />
      <text
        x="48"
        y="39"
        fontSize="5"
        fill="oklch(0.769 0.205 70)"
        fontWeight="bold"
        textAnchor="end"
      >
        8k
      </text>
      {/* Option row 3 */}
      <rect
        x="12"
        y="44"
        width="36"
        height="6"
        rx="2"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.08"
      />
      <text
        x="48"
        y="49"
        fontSize="5"
        fill="oklch(0.769 0.205 70)"
        fontWeight="bold"
        textAnchor="end"
      >
        5k
      </text>
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-16 w-16", className)}
      aria-hidden="true"
    >
      {/* Trend line chart area */}
      <polyline
        points="8,44 16,40 24,42 32,32 40,28 48,24 56,20"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8,44 L16,40 L24,42 L32,32 L40,28 L48,24 L56,20 L56,52 L8,52 Z"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.1"
      />
      {/* Gauge */}
      <path
        d="M16 16 A8 8 0 0 1 32 16"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="24"
        y1="16"
        x2="28"
        y2="12"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
      />
      {/* Checkmark */}
      <circle
        cx="48"
        cy="12"
        r="6"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="1.5"
        fill="oklch(0.769 0.205 70)"
        fillOpacity="0.1"
      />
      <polyline
        points="44,12 47,15 52,9"
        stroke="oklch(0.769 0.205 70)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PHASE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  standardisation: FunnelIcon,
  predictions: PredictionChartIcon,
  notifications: NotificationCardIcon,
  kpis: DashboardIcon,
};

/* ------------------------------------------------------------------ */
/*  Flow Diagram                                                       */
/* ------------------------------------------------------------------ */

const FLOW_STEPS = ["Données", "Prédictions", "Arbitrage", "Preuve"] as const;

function FlowDiagram() {
  return (
    <motion.div
      className="mt-16 flex flex-col items-center gap-6"
      variants={staggerItem}
    >
      {/* Horizontal flow */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {FLOW_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <span className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm font-semibold text-charcoal">
              {step}
            </span>
            {i < FLOW_STEPS.length - 1 && (
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-amber-500" />
            )}
          </div>
        ))}
      </div>

      {/* Curved arrow back */}
      <svg
        className="h-8 w-64 text-amber-500"
        viewBox="0 0 256 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M240 4 C240 24, 128 28, 16 24"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          fill="none"
        />
        <polygon points="16,24 22,20 20,26" fill="currentColor" />
      </svg>

      <p className="max-w-2xl text-center text-base leading-relaxed text-neutral-600">
        Une boucle vertueuse : chaque cycle améliore les données, affine les
        prédictions de sous-couverture, et prouve l&apos;impact économique.
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Callout                                                            */
/* ------------------------------------------------------------------ */

function PhaseCallout({
  text,
  variant,
}: {
  text: string;
  variant: "info" | "critical";
}) {
  const isInfo = variant === "info";
  return (
    <div
      className={cn(
        "mt-4 rounded-lg px-4 py-3 text-sm leading-relaxed",
        isInfo
          ? "bg-amber-50 text-amber-800"
          : "bg-charcoal text-white font-semibold",
      )}
    >
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PipelineSection                                                    */
/* ------------------------------------------------------------------ */

export function PipelineSection({ className }: { className?: string }) {
  return (
    <SectionWrapper id="pipeline" className={className}>
      <SectionHeader
        kicker="La vision complète"
        heading="Du diagnostic ponctuel au pilotage continu de la couverture"
        subheading="Quatre phases interconnectées forment une boucle continue : vos données alimentent les prédictions de sous-couverture, qui déclenchent des arbitrages chiffrés, dont l'impact est mesuré pour affiner le cycle suivant."
      />

      {/* Vertical timeline */}
      <div className="relative ml-4 border-l-2 border-amber-500/30 pl-8 md:ml-8 md:pl-12">
        {pipelinePhases.map((phase, index) => {
          const Icon = PHASE_ICONS[phase.id];
          return (
            <motion.div
              key={phase.id}
              className="relative pb-12 last:pb-0"
              variants={staggerItem}
            >
              {/* Timeline dot */}
              <div className="absolute -left-[calc(2rem+5px)] flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-500 bg-cream md:-left-[calc(3rem+5px)]">
                <span className="font-serif text-lg font-bold text-amber-600">
                  {index + 1}
                </span>
              </div>

              {/* Phase card */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  {Icon && <Icon className="hidden shrink-0 sm:block" />}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-charcoal md:text-xl">
                      {phase.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-600 md:text-base">
                      {phase.description}
                    </p>

                    {/* Capabilities */}
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {phase.capabilities.map((cap) => (
                        <li
                          key={cap}
                          className="flex items-start gap-2 text-sm text-neutral-700"
                        >
                          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          {cap}
                        </li>
                      ))}
                    </ul>

                    {/* Callout */}
                    {phase.callout && phase.calloutVariant && (
                      <PhaseCallout
                        text={phase.callout}
                        variant={phase.calloutVariant}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Flow Diagram */}
      <FlowDiagram />
    </SectionWrapper>
  );
}
