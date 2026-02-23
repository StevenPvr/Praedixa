"use client";

import { motion } from "framer-motion";
import {
  Check,
  ClockCounterClockwise,
  CurrencyDollar,
  WarningDiamond,
} from "@phosphor-icons/react/dist/ssr";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  cardHover,
  viewportEarly,
  viewportOnce,
} from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";

interface ProblemSectionProps {
  dict: Dictionary;
}

const icons = [ClockCounterClockwise, CurrencyDollar, WarningDiamond];

export function ProblemSection({ dict }: ProblemSectionProps) {
  const { problem } = dict;

  return (
    <section id="problem" className="section-spacing">
      <div className="section-shell">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-14">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
            className="md:col-span-5"
          >
            <p className="section-kicker">{problem.kicker}</p>
            <h2 className="section-title">{problem.heading}</h2>
            <p className="section-lead">{problem.subheading}</p>

            <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Diagnostic
              </p>
              <h3 className="mt-2 text-xl tracking-tight text-[var(--ink)]">
                {problem.diagnostic.title}
              </h3>
              <ul className="mt-4 grid gap-3">
                {problem.diagnostic.signals.map((signal) => (
                  <li
                    key={signal}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--ink-soft)]"
                  >
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-1 shrink-0 text-[var(--accent-600)]"
                    />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="md:col-span-7"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {problem.pains.map((pain, index) => {
                const Icon = icons[index] ?? WarningDiamond;
                const isLarge = index === 0;

                return (
                  <motion.article
                    key={pain.title}
                    variants={blurStaggerItem}
                    whileHover={cardHover}
                    className={`panel-glass rounded-3xl p-6 ${
                      isLarge ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                          Point critique {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-2 text-2xl tracking-tight text-[var(--ink)]">
                          {pain.title}
                        </h3>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-2.5">
                        <Icon
                          size={18}
                          weight="duotone"
                          className="text-[var(--accent-600)]"
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                      {pain.description}
                    </p>

                    <div className="mt-5 grid gap-2 border-t border-[var(--line)] pt-4 md:grid-cols-[1fr_auto] md:items-end">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        {pain.consequence}
                      </p>
                      <p className="font-mono text-sm text-[var(--accent-700)]">
                        {pain.cost}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
