"use client";

import { motion } from "framer-motion";
import { Warning, CheckCircle } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface ProblemSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerPains = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const painItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function ProblemSection({ dict }: ProblemSectionProps) {
  return (
    <SectionShell id="problem" className="section-dark">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-[1.2fr_1fr]">
        {/* Left: heading + pains */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker className="text-neutral-100">{dict.problem.kicker}</Kicker>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-5xl" style={{ lineHeight: 1.05 }}>
              {dict.problem.heading}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-300">
              {dict.problem.subheading}
            </p>
          </motion.div>

          <motion.div
            variants={staggerPains}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 space-y-6"
          >
            {dict.problem.pains.map((pain, i) => (
              <motion.div
                key={pain.title}
                variants={painItem}
                className={`border-l-2 border-brass-400/40 py-1 pl-6 ${
                  i % 2 !== 0 ? "md:ml-12" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Warning size={18} weight="fill" className="text-brass-300" />
                  <h3 className="text-base font-semibold text-white">
                    {pain.title}
                  </h3>
                </div>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-300">
                  {pain.description}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-sm text-neutral-300">
                    <span className="font-medium text-white">Impact:</span>{" "}
                    {pain.consequence}
                  </span>
                  <span className="text-sm text-neutral-200/90">{pain.cost}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: diagnostic panel (sticky, no card — border-t style) */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="border-t-2 border-brass-400/50 pt-6">
            <h3 className="text-base font-semibold text-white">
              {dict.problem.diagnostic.title}
            </h3>
            <ul className="mt-5 list-none space-y-3.5 p-0">
              {dict.problem.diagnostic.signals.map((signal) => (
                <li
                  key={signal}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-300"
                >
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-400"
                  />
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
