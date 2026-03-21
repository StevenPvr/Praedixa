"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TabsPill } from "../shared/v2/TabsPill";
import type {
  ProofPreviewTab,
  ProofPreviewMetric,
} from "../../lib/content/value-prop/shared";

interface ProofBlockClientProps {
  tabs: ProofPreviewTab[];
  metrics: ProofPreviewMetric[];
}

const STEP_COLORS = [
  { dot: "bg-risk-500", ring: "ring-risk-500/20" },
  { dot: "bg-proof-500", ring: "ring-proof-500/20" },
  { dot: "bg-success-500", ring: "ring-success-500/20" },
] as const;

export function ProofBlockClient({ tabs, metrics }: ProofBlockClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  const stepColor = STEP_COLORS[activeIndex] ?? STEP_COLORS[0]!;

  return (
    <div className="rounded-2xl bg-surface-0 p-6 shadow-2 md:p-8">
      <TabsPill
        tabs={tabs.map((t) => t.label)}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      {/* Step flow indicator */}
      <div className="mt-6 flex items-center gap-2">
        {tabs.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                i === activeIndex
                  ? `${stepColor.dot} text-white ring-4 ${stepColor.ring}`
                  : i < activeIndex
                    ? "bg-success-500/80 text-white"
                    : "bg-surface-100 text-ink-600"
              }`}
            >
              {i + 1}
            </span>
            {i < tabs.length - 1 && <div className="h-px w-8 bg-border-200" />}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5 min-h-[80px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeIndex}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-[15px] leading-relaxed text-ink-700"
          >
            {tabs[activeIndex]?.content}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Metrics row */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border-100 pt-5">
        {metrics.map((m, i) => {
          const color =
            i === 0
              ? "text-proof-500"
              : i === 1
                ? "text-success-500"
                : "text-risk-500";
          return (
            <div key={m.label} className="text-center">
              <p className={`font-mono text-2xl font-bold ${color}`}>
                {m.value}
              </p>
              <p className="mt-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-600">
                {m.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
