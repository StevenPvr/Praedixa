"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";

interface HowItWorksSectionProps {
  dict: Dictionary;
}

export function HowItWorksSection({ dict }: HowItWorksSectionProps) {
  const { howItWorks } = dict;

  return (
    <section id="how-it-works" className="section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{howItWorks.kicker}</p>
          <h2 className="section-title mt-4">{howItWorks.heading}</h2>
          <p className="section-lead">{howItWorks.subheading}</p>
        </motion.div>

        {/* Timeline: horizontal on desktop, vertical on mobile */}
        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {howItWorks.steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="craft-card relative flex flex-col p-5"
              variants={staggerItem}
            >
              {/* Step number */}
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-brass-200 bg-brass-50 font-sans text-sm font-bold text-brass-700">
                  {step.number}
                </span>
                {i < howItWorks.steps.length - 1 && (
                  <div className="hidden h-px flex-1 bg-neutral-200 md:block" />
                )}
              </div>
              <h3 className="mt-4 font-serif text-lg text-charcoal">
                {step.title}
              </h3>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-widest text-brass-600">
                {step.subtitle}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
