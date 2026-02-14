"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";

interface SolutionSectionProps {
  dict: Dictionary;
}

export function SolutionSection({ dict }: SolutionSectionProps) {
  const { solution } = dict;

  return (
    <section id="solution" className="section-dark section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{solution.kicker}</p>
          <h2 className="section-title mt-4">{solution.heading}</h2>
          <p className="section-lead">{solution.subheading}</p>
        </motion.div>

        {/* 3 principles — horizontal cards */}
        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {solution.principles.map((principle) => (
            <motion.div
              key={principle.title}
              className="craft-card-dark p-6"
              variants={staggerItem}
            >
              <p className="text-2xs font-semibold uppercase tracking-widest text-brass-400">
                {principle.subtitle}
              </p>
              <h3 className="mt-2 font-serif text-xl text-white">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                {principle.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* What we're NOT — differentiator table */}
        <motion.div
          className="mt-12"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h3 className="font-serif text-xl text-white">
            {solution.differentiators.title}
          </h3>
          <div className="mt-6 grid gap-2">
            {solution.differentiators.items.map((item) => (
              <div
                key={item.is}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-5 py-3"
              >
                <span className="text-sm font-medium text-brass-300">
                  {item.is}
                </span>
                <span className="text-xs text-neutral-500">≠</span>
                <span className="text-sm text-neutral-500">{item.isNot}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
