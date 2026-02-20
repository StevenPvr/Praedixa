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

interface DeliverablesSectionProps {
  dict: Dictionary;
}

export function DeliverablesSection({ dict }: DeliverablesSectionProps) {
  const { deliverables } = dict;

  return (
    <section id="deliverables" className="section-dark section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{deliverables.kicker}</p>
          <h2 className="section-title mt-4">{deliverables.heading}</h2>
          <p className="section-lead">{deliverables.subheading}</p>
        </motion.div>

        {/* ROI frames — 3 metric tiles */}
        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {deliverables.roiFrames.map((frame) => (
            <motion.div
              key={frame.label}
              className="craft-card-dark p-6"
              variants={staggerItem}
            >
              <p className="text-2xs font-semibold uppercase tracking-widest text-ink-tertiary">
                {frame.label}
              </p>
              <p className="mt-2 font-serif text-3xl text-brass-400">
                {frame.value}
              </p>
              <p className="mt-2 text-sm text-ink-placeholder">{frame.note}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Checklist */}
        <motion.div
          className="mt-8 rounded-lg border border-white/5 bg-card/[0.03] p-6"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {deliverables.checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-ink-placeholder"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-400" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
