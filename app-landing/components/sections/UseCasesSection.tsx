"use client";

import { motion } from "framer-motion";
import type { Dictionary } from "@/lib/i18n/types";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportOnce,
  viewportEarly,
} from "@/lib/animations/variants";
import { SpotlightCard } from "@/components/cinema/SpotlightCard";
import { CheckDraw } from "@/components/cinema/CheckDraw";

interface UseCasesSectionProps {
  useCases: Dictionary["useCases"];
  deliverables: Dictionary["deliverables"];
}

// Icons per use case
const caseIcons = [
  // 1. Volatilité — Layered line chart with glowing active point
  <svg
    key="vol"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M4 18V13" className="opacity-30" />
    <path d="M9 18V8" className="opacity-30" />
    <path d="M14 18V11" className="opacity-30" />
    <path d="M19 18V5" className="opacity-30" />
    <path
      d="M2 15.5L7 11.5L12 13.5L17 7L21 4"
      strokeWidth="2"
      className="text-blue-500"
    />
    <circle
      cx="21"
      cy="4"
      r="2.5"
      fill="currentColor"
      stroke="none"
      className="text-blue-500/30"
    />
    <circle
      cx="21"
      cy="4"
      r="1.5"
      fill="currentColor"
      stroke="none"
      className="text-blue-600"
    />
  </svg>,
  // 2. Absentéisme — Network tree with missing dashed node and amber alert
  <svg
    key="abs"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <rect x="3" y="12" width="6" height="6" rx="1.5" />
    <rect x="9" y="4" width="6" height="6" rx="1.5" />
    {/* Missing node */}
    <rect
      x="15"
      y="12"
      width="6"
      height="6"
      rx="1.5"
      strokeDasharray="2 2"
      className="opacity-40"
    />
    {/* Connections */}
    <path d="M12 10V18" />
    <path d="M6 12V18" />
    <path d="M18 12V18" strokeDasharray="2 2" className="opacity-40" />
    {/* Alert indicator */}
    <circle
      cx="18"
      cy="9"
      r="2.5"
      fill="currentColor"
      stroke="none"
      className="text-amber-500"
    />
    <path d="M18 8V9.5 M18 10.5V11" stroke="#fff" strokeWidth="1" />
  </svg>,
  // 3. Inter-site — Hubs exchanging data (arrows over circles)
  <svg
    key="inter"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="18" r="3" />
    <circle cx="18" cy="6" r="3" className="opacity-30" />
    <circle cx="6" cy="18" r="3" className="opacity-30" />
    {/* Balancing arrows */}
    <path d="M8 8L11 11 M11 11L9 11 M11 11L11 9" className="text-blue-500" />
    <path
      d="M16 16L13 13 M13 13L15 13 M13 13L13 15"
      className="text-blue-500"
    />
  </svg>,
  // 4. ROI — Application window with ascending solid bars
  <svg
    key="roi"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M4 9H20" className="opacity-30" />
    {/* Top left UI dots */}
    <circle
      cx="6.5"
      cy="7"
      r="0.5"
      fill="currentColor"
      stroke="none"
      className="opacity-50"
    />
    <circle
      cx="8.5"
      cy="7"
      r="0.5"
      fill="currentColor"
      stroke="none"
      className="opacity-50"
    />
    {/* Ascending bars */}
    <path d="M8 16V13" strokeWidth="2" className="text-emerald-500" />
    <path d="M12 16V11" strokeWidth="2" className="opacity-40" />
    <path d="M16 16V8" strokeWidth="2" className="text-emerald-500" />
    {/* Glow dot above primary positive bar */}
    <circle
      cx="16"
      cy="8"
      r="1.5"
      fill="none"
      strokeWidth="1"
      className="text-emerald-500/50"
    />
  </svg>,
];

const flowLabels = [
  {
    label: "Contexte",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    label: "Action",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    label: "Résultat",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
];

// Icons for ROI frames
const roiIcons = [
  // 1. Coût de non-action (Hexagon alert)
  <svg
    key="alert"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      className="opacity-30"
    />
    <path
      d="M12 2L2 7v10l10 5 10-5V7L12 2z"
      strokeWidth="1.5"
      className="text-amber-500"
    />
    <path d="M12 8v4" strokeWidth="2" className="text-amber-500" />
    <circle
      cx="12"
      cy="16"
      r="1"
      fill="currentColor"
      stroke="none"
      className="text-amber-500"
    />
  </svg>,
  // 2. Options d'intervention (Branch/Compare)
  <svg
    key="options"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M6 3v12" className="opacity-40" />
    <circle cx="6" cy="18" r="3" className="opacity-40" />
    <path d="M18 9a9 9 0 01-9 9" className="text-blue-500" />
    <circle cx="18" cy="6" r="3" className="text-blue-500" />
    <path d="M18 9v2" className="text-blue-500" />
  </svg>,
  // 3. Impact démontré (Target / Proof)
  <svg
    key="impact"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <circle cx="12" cy="12" r="10" className="opacity-30" />
    <circle cx="12" cy="12" r="6" className="text-emerald-500" />
    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="text-emerald-500"
    />
    <path
      d="M12 2v4 M12 18v4 M2 12h4 M18 12h4"
      className="text-emerald-500/50"
    />
  </svg>,
];

export function UseCasesSection({
  useCases,
  deliverables,
}: UseCasesSectionProps) {
  return (
    <section id="cas-usage" className="overflow-hidden">
      {/* ── Use Cases (light bg) ── */}
      <div className="section-spacing">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
          >
            <span className="section-kicker">{useCases.kicker}</span>
            <h2 className="section-title mt-4">{useCases.heading}</h2>
            <p className="section-lead">{useCases.subheading}</p>
          </motion.div>

          {/* Cards grid — 2×2 on desktop */}
          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-5 md:grid-cols-2"
          >
            {useCases.cases.map((useCase, i) => {
              const texts = [useCase.context, useCase.action, useCase.result];
              return (
                <motion.div key={useCase.id} variants={blurStaggerItem}>
                  <SpotlightCard
                    className="h-full p-6"
                    spotlightColor="oklch(0.63 0.165 246 / 0.06)"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-sunken/60 text-blue-500 transition-colors duration-500 group-hover:text-blue-600">
                        {caseIcons[i]}
                      </div>
                      <h3 className="font-serif text-xl font-medium text-charcoal pt-1.5">
                        {useCase.title}
                      </h3>
                    </div>

                    {/* Flow: Context → Action → Result */}
                    <div className="mt-5 space-y-3">
                      {flowLabels.map((flow, fi) => (
                        <div
                          key={flow.label}
                          className="flex items-start gap-3"
                        >
                          <span
                            className={`mt-0.5 inline-flex h-5 w-[4.5rem] flex-shrink-0 items-center justify-center rounded-md border text-[10px] font-bold uppercase tracking-wider ${flow.bg} ${flow.border} ${flow.color}`}
                          >
                            {flow.label}
                          </span>
                          <p className="text-sm leading-relaxed text-ink-secondary">
                            {texts[fi]}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Callout */}
                    {useCase.callout && (
                      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5">
                        <p className="text-xs leading-relaxed text-blue-700/80">
                          {useCase.callout}
                        </p>
                      </div>
                    )}
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── Deliverables / ROI (light bg, distinct visual treatment) ── */}
      <div className="section-spacing relative border-t border-slate-200/60 bg-slate-50/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent" />

        <div className="section-shell relative z-10">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
          >
            <span className="section-kicker">{deliverables.kicker}</span>
            <h3 className="section-title mt-4">{deliverables.heading}</h3>
            <p className="section-lead">{deliverables.subheading}</p>
          </motion.div>

          {/* ROI KPI cards */}
          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 lg:grid-cols-3"
          >
            {deliverables.roiFrames.map((frame, i) => (
              <motion.div key={frame.label} variants={blurStaggerItem}>
                <div className="group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 transition-colors duration-500 group-hover:bg-blue-50">
                    {roiIcons[i]}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    {frame.label}
                  </p>

                  <h4 className="mt-3 bg-gradient-to-br from-charcoal to-slate-500 bg-clip-text font-serif text-3xl font-medium text-transparent">
                    {frame.value}
                  </h4>

                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {frame.note}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Checklist */}
          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mx-auto mt-16 max-w-xl"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
              <ul className="flex flex-col gap-4">
                {deliverables.checklist.map((item) => (
                  <motion.li
                    key={item}
                    variants={blurStaggerItem}
                    className="flex items-center gap-4"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                      <CheckDraw className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[15px] font-medium text-slate-700">
                      {item}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
