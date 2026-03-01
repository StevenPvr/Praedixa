"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface SolutionSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerPrinciples = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const principleItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function SolutionSection({ dict }: SolutionSectionProps) {
  const solution = dict.solution;
  const principles = Array.isArray(solution.principles)
    ? solution.principles
    : null;
  const differentiators = Array.isArray(solution.differentiators.items)
    ? solution.differentiators.items
    : null;
  const isFrench = solution.kicker.toLowerCase().includes("methode");

  if (!principles || !differentiators) {
    return (
      <SectionShell
        id="solution"
        className="bg-[linear-gradient(180deg,#fcfcfb_0%,#f7f6f2_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{solution.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-ink md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench ? "Chargement de la methode" : "Loading method"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Assemblage du cadre de decision en cours."
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
        className="bg-[linear-gradient(180deg,#fcfcfb_0%,#f7f6f2_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{solution.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-ink md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench ? "Methode en preparation" : "Method in preparation"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {isFrench
              ? "Ajoutez des principes de decision pour afficher cette section."
              : "Add decision principles to render this section."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="solution"
      className="bg-[linear-gradient(180deg,#fcfcfb_0%,#f7f6f2_100%)]"
    >
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker>{solution.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
              {solution.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
              {solution.subheading}
            </p>
          </motion.div>

          <motion.div
            variants={staggerPrinciples}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 space-y-4"
          >
            {principles.map((principle, i) => (
              <motion.div
                key={principle.title}
                variants={principleItem}
                className={`grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200/70 bg-white/85 p-5 shadow-[0_16px_34px_-26px_rgba(24,24,27,0.45)] md:grid-cols-[10.5rem_1fr] md:p-6 ${
                  i % 2 === 1 ? "md:translate-x-5" : ""
                }`}
              >
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
                    <PulseDot className="h-1.5 w-1.5 bg-brass-500" />
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
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-[1.9rem] border border-neutral-200/80 bg-white/85 p-6 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.75)] md:p-7">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
              <Sparkle size={14} weight="fill" />
              {isFrench ? "Differenciation" : "Differentiation"}
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
              indicatorClassName="via-brass-300/60"
            />
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
