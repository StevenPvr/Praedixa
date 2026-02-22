"use client";

import { motion } from "framer-motion";
import {
  ArrowBendRightDown,
  ChartLine,
  Check,
  CirclesThreePlus,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "@/lib/i18n/types";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportEarly,
  viewportOnce,
} from "@/lib/animations/variants";

interface MethodSectionProps {
  solution: Dictionary["solution"];
  howItWorks: Dictionary["howItWorks"];
}

const principleIcons = [ChartLine, CirclesThreePlus, ShieldCheck];
const protocolSpans = [
  "md:col-span-7",
  "md:col-span-5",
  "md:col-span-5",
  "md:col-span-7",
];

export function MethodSection({ solution, howItWorks }: MethodSectionProps) {
  return (
    <section id="methode" className="overflow-hidden">
      <div className="section-spacing">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
            className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]"
          >
            <div>
              <p className="section-kicker">{solution.kicker}</p>
              <h2 className="section-title">{solution.heading}</h2>
              <p className="section-lead">{solution.subheading}</p>
            </div>
            <div className="panel-glass rounded-3xl p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                Cadence de décision
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                Lecture, arbitrage, preuve. Un cycle court et explicable, porté
                par des hypothèses visibles dans chaque recommandation.
              </p>
            </div>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {solution.principles.map((principle, index) => {
              const Icon = principleIcons[index] ?? ChartLine;
              const span = index === 0 ? "md:col-span-12" : "md:col-span-6";

              return (
                <motion.article
                  key={principle.title}
                  variants={blurStaggerItem}
                  className={`panel-glass rounded-3xl p-6 ${span}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        {principle.subtitle}
                      </p>
                      <h3 className="mt-2 text-2xl tracking-tight text-[var(--ink)]">
                        {principle.title}
                      </h3>
                    </div>
                    <Icon
                      size={20}
                      weight="duotone"
                      className="text-[var(--accent-600)]"
                    />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {principle.description}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="section-dark section-spacing">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
          >
            <p className="section-kicker">{howItWorks.kicker}</p>
            <h2 className="section-title">{howItWorks.heading}</h2>
            <p className="section-lead">{howItWorks.subheading}</p>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {howItWorks.steps.map((step, index) => (
              <motion.article
                key={step.number}
                variants={blurStaggerItem}
                className={`rounded-3xl border border-white/14 bg-white/[0.03] p-6 ${
                  protocolSpans[index] ?? "md:col-span-6"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 font-mono text-xs text-white/85">
                    {step.number}
                  </span>
                  <ArrowBendRightDown
                    size={14}
                    weight="bold"
                    className="text-white/55"
                  />
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                    {step.subtitle}
                  </p>
                </div>
                <h3 className="mt-3 text-xl tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/72">
                  {step.description}
                </p>
              </motion.article>
            ))}
          </motion.div>

          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10"
          >
            <h3 className="text-2xl tracking-tight text-white">
              {solution.differentiators.title}
            </h3>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/70">
              {solution.differentiators.description}
            </p>

            <div className="surface-lines mt-5 rounded-2xl border border-white/14">
              {solution.differentiators.items.map((item) => (
                <div
                  key={item.is}
                  className="grid gap-2 px-4 py-4 md:grid-cols-2 md:px-5"
                >
                  <p className="inline-flex items-start gap-2 text-sm text-white/88">
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-0.5 shrink-0 text-[var(--accent-400)]"
                    />
                    {item.is}
                  </p>
                  <p className="text-sm text-white/52 line-through decoration-white/30">
                    {item.isNot}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
