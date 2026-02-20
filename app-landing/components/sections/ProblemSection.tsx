"use client";

import { motion } from "framer-motion";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportOnce,
  viewportEarly,
} from "../../lib/animations/variants";
import { CheckDraw } from "../cinema/CheckDraw";
import { SpotlightCard } from "../cinema/SpotlightCard";
import { CountUp } from "../cinema/CountUp";
import type { Dictionary } from "../../lib/i18n/types";

interface ProblemSectionProps {
  dict: Dictionary;
}

const CARD_NUMBERS = ["01", "02", "03"];

export function ProblemSection({ dict }: ProblemSectionProps) {
  const { problem } = dict;

  return (
    <section
      id="problem"
      className="section-spacing relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, oklch(0.96 0.008 80 / 0.5) 0%, oklch(0.975 0.004 260) 65%)",
      }}
    >
      <div className="section-shell relative z-10">
        {/* Header */}
        <motion.div
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportEarly}
          className="max-w-2xl"
        >
          <p className="section-kicker">{problem.kicker}</p>
          <h2 className="section-title mt-4 leading-[1.15]">
            {problem.heading}
          </h2>
          <p className="section-lead mt-6 text-base leading-relaxed">
            {problem.subheading}
          </p>
        </motion.div>

        {/* Pain Cards — Institutional "Constats" */}
        <motion.div
          className="mt-16 grid gap-5 md:grid-cols-3"
          variants={blurStaggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {problem.pains.map((pain, i) => (
            <motion.div key={pain.title} variants={blurStaggerItem}>
              <SpotlightCard
                className="flex flex-col p-7 h-full"
                spotlightColor="oklch(0.63 0.165 246 / 0.08)"
                tilt
              >
                {/* Filigrane number */}
                <span className="font-serif text-4xl font-extralight tracking-tight text-charcoal/[0.07] select-none">
                  {CARD_NUMBERS[i]}
                </span>

                <h3 className="mt-3 font-serif text-xl leading-snug text-charcoal">
                  {pain.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-secondary">
                  {pain.description}
                </p>

                {/* Consequence + cost metric */}
                <div className="mt-5 border-t border-border-subtle pt-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
                    {pain.consequence}
                  </p>
                  <CountUp
                    value={pain.cost}
                    className="mt-2 inline-block font-serif text-lg tracking-tight text-brass-600"
                  />
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Separator */}
        <div className="mx-auto my-16 h-px max-w-xs bg-gradient-to-r from-transparent via-brass-400/30 to-transparent" />

        {/* Diagnostic — Elegant minimalist checklist */}
        <motion.div
          className="mx-auto max-w-3xl"
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="flex flex-col items-center text-center">
            <h3 className="font-serif text-xl italic text-charcoal/80">
              {problem.diagnostic.title}
            </h3>
            <ul className="mt-8 flex flex-col items-center gap-4 text-left sm:items-start sm:grid sm:grid-cols-2 sm:gap-x-12 sm:gap-y-5">
              {problem.diagnostic.signals.map((signal, i) => (
                <motion.li
                  key={signal}
                  className="flex items-start gap-3.5 text-[0.9rem] leading-relaxed text-ink-secondary"
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  viewport={{ once: true, margin: "-20px" }}
                >
                  <CheckDraw className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brass-400" />
                  {signal}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
