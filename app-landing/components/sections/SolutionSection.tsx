"use client";

import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";
import { BoltIcon, ShieldCheckIcon, LockIcon } from "../icons";

interface SolutionSectionProps {
  dict: Dictionary;
}

export function SolutionSection({ dict }: SolutionSectionProps) {
  const { solution } = dict;

  const icons = [
    <BoltIcon key="1" className="h-6 w-6" />,
    <ShieldCheckIcon key="2" className="h-6 w-6" />,
    <LockIcon key="3" className="h-6 w-6" />,
  ];

  return (
    <section
      id="solution"
      className="section-dark section-spacing relative overflow-hidden"
    >
      {/* Background gradients for depth */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] bg-brass-500/10 rounded-full blur-3xl opacity-30 mix-blend-screen" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[500px] h-[500px] bg-brass-300/10 rounded-full blur-3xl opacity-20 mix-blend-screen" />
      </div>

      <div className="section-shell relative z-10">
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

        {/* 3 principles — premium glass blue cards */}
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {solution.principles.map((principle, i) => (
            <motion.article
              key={principle.title}
              className="method-card-glass-blue group relative overflow-hidden rounded-2xl p-6"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-6 flex items-center justify-between">
                  <div className="method-card-icon">
                    {icons[i] || <BoltIcon className="h-6 w-6" />}
                  </div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brass-300">
                    {principle.subtitle}
                  </p>
                </div>
                <h3 className="font-serif text-2xl leading-tight text-white">
                  {principle.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                  {principle.description}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.76_0.16_255_/_0.35),transparent_52%)] opacity-80"
              />
            </motion.article>
          ))}
        </div>

        {/* What we're NOT — differentiator table */}
        <motion.div
          className="mt-20 border-t border-white/10 pt-10"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-serif text-2xl text-white mb-6">
                {solution.differentiators.title}
              </h3>
              <p className="text-ink-placeholder leading-relaxed max-w-md">
                {solution.differentiators.description}
              </p>
            </div>
            <div className="grid gap-3">
              {solution.differentiators.items.map((item) => (
                <div
                  key={item.is}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-white/5 bg-card/[0.02] px-6 py-4 transition-colors hover:bg-card/[0.04]"
                >
                  <span className="text-sm font-medium text-brass-300">
                    {item.is}
                  </span>
                  <span className="text-xs text-ink-secondary">≠</span>
                  <span className="text-sm text-ink-tertiary text-right">
                    {item.isNot}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
