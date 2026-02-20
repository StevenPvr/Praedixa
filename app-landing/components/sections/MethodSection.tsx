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
import { BoltIcon, EuroIcon, ShieldCheckIcon } from "@/components/icons";

const principleIcons = [BoltIcon, EuroIcon, ShieldCheckIcon];

// Step icons as SVG inline for the timeline
const stepIcons = [
  // 01 — Cadrage: target/scope
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>,
  // 02 — Initialisation: upload/data
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>,
  // 03 — Construction: build/wrench
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>,
  // 04 — Consolidation: shield/verify
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>,
];

interface MethodSectionProps {
  solution: Dictionary["solution"];
  howItWorks: Dictionary["howItWorks"];
}

// Timeline connector animation
const lineVariant = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stepCardVariant = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      delay: i * 0.15,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export function MethodSection({ solution, howItWorks }: MethodSectionProps) {
  return (
    <section id="methode" className="overflow-hidden">
      {/* ── Part 1: Principles (light bg) ── */}
      <div className="section-spacing">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
            className="mb-16"
          >
            <span className="section-kicker">{solution.kicker}</span>
            <h2 className="section-title mt-4">{solution.heading}</h2>
            <p className="section-lead">{solution.subheading}</p>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-5 md:grid-cols-3"
          >
            {solution.principles.map((principle, i) => {
              const Icon = principleIcons[i]!;
              return (
                <motion.div key={principle.title} variants={blurStaggerItem}>
                  <SpotlightCard
                    className="p-6 h-full"
                    spotlightColor="oklch(0.63 0.165 246 / 0.12)"
                  >
                    <div className="method-card-icon mb-4 animate-icon-breathe">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-xl text-charcoal">
                      {principle.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-brass-600">
                      {principle.subtitle}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                      {principle.description}
                    </p>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── Part 2: Protocol (dark bg) ── */}
      <div className="section-dark">
        <div className="section-spacing">
          <div className="section-shell">
            {/* Protocol Header */}
            <motion.div
              variants={blurReveal}
              initial="hidden"
              whileInView="visible"
              viewport={viewportEarly}
              className="mb-16 text-center"
            >
              <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300">
                {howItWorks.kicker}
              </span>
              <h2 className="mt-6 font-serif text-3xl font-light tracking-tight text-white/95 md:text-4xl lg:text-5xl">
                {howItWorks.heading}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
                {howItWorks.subheading}
              </p>
            </motion.div>

            {/* ── Horizontal Timeline ── */}
            <div className="relative">
              {/* Connector line (behind cards) */}
              <div className="absolute top-[52px] left-0 right-0 hidden md:block">
                <motion.div
                  variants={lineVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                  className="mx-auto h-[2px] max-w-4xl origin-left"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.55 0.15 246 / 0.3), oklch(0.65 0.15 246 / 0.6), oklch(0.55 0.15 246 / 0.3))",
                  }}
                />
              </div>

              {/* Step Cards */}
              <div className="grid gap-6 md:grid-cols-4 md:gap-4 lg:gap-8">
                {howItWorks.steps.map((step, i) => (
                  <motion.div
                    key={step.number}
                    custom={i}
                    variants={stepCardVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    className="group relative flex flex-col items-center text-center"
                  >
                    {/* Node dot */}
                    <div className="relative z-10 mb-6 flex h-[104px] w-[104px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[oklch(0.16_0.025_247)] transition-all duration-500 group-hover:border-blue-400/30 group-hover:bg-[oklch(0.19_0.03_247)] group-hover:shadow-[0_0_30px_oklch(0.63_0.165_246_/_0.15)]">
                      {/* Step number */}
                      <span className="text-xs font-bold tracking-widest text-blue-400/60">
                        {step.number}
                      </span>
                      {/* Icon */}
                      <div className="mt-1 text-blue-300/80 transition-colors duration-500 group-hover:text-blue-200">
                        {stepIcons[i]}
                      </div>
                    </div>

                    {/* Title + subtitle */}
                    <h3 className="font-serif text-lg font-medium text-white/90 md:text-xl">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-brass-400">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Differentiators ── */}
            <div className="mx-auto mt-20 max-w-3xl">
              <motion.div
                variants={blurReveal}
                initial="hidden"
                whileInView="visible"
                viewport={viewportEarly}
                className="mb-8 text-center"
              >
                <h3 className="font-serif text-2xl font-light text-white/90">
                  {solution.differentiators.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {solution.differentiators.description}
                </p>
              </motion.div>

              <motion.div
                variants={blurStaggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                className="grid gap-4 md:grid-cols-3"
              >
                {solution.differentiators.items.map((item) => (
                  <motion.div
                    key={item.is}
                    variants={blurStaggerItem}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm font-medium text-white/90">
                        {item.is}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-start gap-2.5">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span className="text-sm text-slate-500 line-through decoration-slate-600">
                        {item.isNot}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
