"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

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
  return (
    <SectionShell id="solution">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-[1.3fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker>{dict.solution.kicker}</Kicker>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-ink md:text-5xl" style={{ lineHeight: 1.05 }}>
              {dict.solution.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-500">
              {dict.solution.subheading}
            </p>
          </motion.div>

          <motion.div
            variants={staggerPrinciples}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 space-y-8"
          >
            {dict.solution.principles.map((principle, i) => (
              <motion.div
                key={principle.title}
                variants={principleItem}
                className={`border-l-2 border-brass-200 py-1 pl-6 ${
                  i % 2 !== 0 ? "md:ml-10" : ""
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brass">
                  {principle.subtitle}
                </span>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                  {principle.title}
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-500">
                  {principle.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: differentiators — anti-card, border-t, sticky */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="border-t-2 border-brass-300 pt-6">
            <h3 className="text-base font-semibold text-ink">
              {dict.solution.differentiators.title}
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-neutral-500">
              {dict.solution.differentiators.description}
            </p>
            <div className="mt-6 space-y-3">
              {dict.solution.differentiators.items.map((item) => (
                <div
                  key={item.is}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="font-medium text-brass">{item.is}</span>
                  <ArrowRight size={14} className="shrink-0 text-neutral-300" />
                  <span className="text-neutral-400 line-through">
                    {item.isNot}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
