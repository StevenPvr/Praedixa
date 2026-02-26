"use client";

import { motion } from "framer-motion";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface HowItWorksSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

export function HowItWorksSection({ dict }: HowItWorksSectionProps) {
  return (
    <SectionShell id="how-it-works" className="section-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker className="text-neutral-100">{dict.howItWorks.kicker}</Kicker>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-5xl" style={{ lineHeight: 1.05 }}>
          {dict.howItWorks.heading}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-300">
          {dict.howItWorks.subheading}
        </p>
      </motion.div>

      <div className="relative mt-16">
        <div className="absolute bottom-0 left-7 top-0 hidden w-px bg-white/10 md:block" />

        <div className="space-y-12 md:space-y-16">
          {dict.howItWorks.steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VP}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 18,
                delay: i * 0.1,
              }}
              className="relative grid grid-cols-1 gap-4 md:grid-cols-[3.5rem_1fr] md:gap-10"
            >
              <div className="flex items-start justify-center">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-brass-400/40 bg-brass-800 text-base font-bold text-white">
                  {step.number}
                </span>
              </div>
              <div className="pb-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-100">
                  {step.subtitle}
                </span>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-300">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
