"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { CheckIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";

interface ProblemSectionProps {
  dict: Dictionary;
}

export function ProblemSection({ dict }: ProblemSectionProps) {
  const { problem } = dict;

  return (
    <section id="problem" className="section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{problem.kicker}</p>
          <h2 className="section-title mt-4">{problem.heading}</h2>
          <p className="section-lead">{problem.subheading}</p>
        </motion.div>

        {/* Pain cards with cost */}
        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {problem.pains.map((pain) => (
            <motion.div
              key={pain.title}
              className="craft-card flex flex-col p-6"
              variants={staggerItem}
            >
              <h3 className="font-serif text-xl text-charcoal">{pain.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">
                {pain.description}
              </p>
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {pain.consequence}
                </p>
                <p className="mt-1 font-serif text-base text-brass-600">
                  {pain.cost}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Diagnostic checklist */}
        <motion.div
          className="mt-12 craft-card p-6 md:p-8"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h3 className="font-serif text-xl text-charcoal">
            {problem.diagnostic.title}
          </h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {problem.diagnostic.signals.map((signal) => (
              <li
                key={signal}
                className="flex items-start gap-2.5 text-sm text-neutral-600"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
                {signal}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
