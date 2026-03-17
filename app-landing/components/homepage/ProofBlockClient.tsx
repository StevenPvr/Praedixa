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

export function ProofBlockClient({ tabs, metrics }: ProofBlockClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  return (
    <div className="rounded-panel bg-surface-0 p-6 shadow-2 md:p-8">
      <TabsPill
        tabs={tabs.map((t) => t.label)}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      {/* Tab content */}
      <div className="mt-6 min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={prefersReduced ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.22 }}
          >
            <p className="text-sm leading-relaxed text-ink-700">
              {tabs[activeIndex]?.content}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metrics row */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-v2-border-100 pt-5">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <p className="font-mono text-xl font-semibold text-ink-950">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-ink-600">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
