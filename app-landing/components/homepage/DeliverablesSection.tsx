"use client";

import { motion } from "framer-motion";
import { CheckSquare } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface DeliverablesSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerChecklist = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const checkItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function DeliverablesSection({ dict }: DeliverablesSectionProps) {
  return (
    <SectionShell id="deliverables" className="section-dark">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-[1.4fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker className="text-neutral-100">{dict.deliverables.kicker}</Kicker>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-5xl" style={{ lineHeight: 1.05 }}>
              {dict.deliverables.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-200">
              {dict.deliverables.subheading}
            </p>
          </motion.div>

          {/* ROI frames — vertical, anti-card, border-t separators */}
          <div className="mt-12 divide-y divide-white/10">
            {dict.deliverables.roiFrames.map((frame, i) => (
              <motion.div
                key={frame.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{
                  ...SPRING,
                  delay: i * 0.1,
                }}
                className="py-6 first:pt-0"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/90">
                  {frame.label}
                </span>
                <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-white">
                  {frame.value}
                </p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-neutral-200">
                  {frame.note}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: checklist — sticky */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="border-t-2 border-brass-400/50 pt-6">
            <motion.ul
              variants={staggerChecklist}
              initial="hidden"
              whileInView="visible"
              viewport={VP}
              className="list-none space-y-3.5 p-0"
            >
              {dict.deliverables.checklist.map((item) => (
                <motion.li
                  key={item}
                  variants={checkItem}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-200"
                >
                  <CheckSquare
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-400"
                  />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
