"use client";

import { motion } from "framer-motion";
import { sectionReveal, viewportOnce } from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";
import { BentoGrid, BentoGridItem } from "../ui/BentoGrid";
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

        {/* 3 principles — using BentoGrid */}
        <div className="mt-16">
          <BentoGrid className="md:auto-rows-[20rem]">
            {solution.principles.map((principle, i) => (
              <BentoGridItem
                key={principle.title}
                title={
                  <span className="text-brass-100 group-hover/bento:text-brass-300 transition-colors">
                    {principle.title}
                  </span>
                }
                description={
                  <span className="text-neutral-400 group-hover/bento:text-neutral-300 transition-colors">
                    {principle.description}
                  </span>
                }
                header={
                  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/5 opacity-80 group-hover/bento:opacity-100 transition-opacity" />
                }
                icon={
                  <div className="text-brass-400 group-hover/bento:text-brass-300 transition-colors">
                    {icons[i] || <BoltIcon className="h-6 w-6" />}
                  </div>
                }
                className={
                  i === 1
                    ? "md:col-span-1 bg-white/[0.03] border-white/10"
                    : "bg-white/[0.03] border-white/10"
                }
              />
            ))}
          </BentoGrid>
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
              <p className="text-neutral-400 leading-relaxed max-w-md">
                Our approach specifically targets high-value, complex B2B
                scenarios where generic tools fail. We prioritize precision over
                volume.
              </p>
            </div>
            <div className="grid gap-3">
              {solution.differentiators.items.map((item) => (
                <div
                  key={item.is}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-6 py-4 transition-colors hover:bg-white/[0.04]"
                >
                  <span className="text-sm font-medium text-brass-300">
                    {item.is}
                  </span>
                  <span className="text-xs text-neutral-600">≠</span>
                  <span className="text-sm text-neutral-500 text-right">
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
