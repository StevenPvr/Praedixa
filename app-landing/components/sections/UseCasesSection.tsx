"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import type { Dictionary } from "../../lib/i18n/types";

interface UseCasesSectionProps {
  dict: Dictionary;
}

export function UseCasesSection({ dict }: UseCasesSectionProps) {
  const { useCases } = dict;

  return (
    <section id="use-cases" className="section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{useCases.kicker}</p>
          <h2 className="section-title mt-4">{useCases.heading}</h2>
          <p className="section-lead">{useCases.subheading}</p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {useCases.cases.map((useCase) => (
            <motion.div
              key={useCase.id}
              className="craft-card flex flex-col p-6"
              variants={staggerItem}
            >
              <h3 className="font-serif text-xl text-charcoal">
                {useCase.title}
              </h3>

              {/* Context → Action → Result structure */}
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-neutral-400">
                    Contexte
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {useCase.context}
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-neutral-400">
                    Action
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {useCase.action}
                  </p>
                </div>
                <div className="border-t border-neutral-100 pt-3">
                  <p className="text-2xs font-semibold uppercase tracking-widest text-brass-600">
                    Résultat
                  </p>
                  <p className="mt-1 text-sm font-medium text-charcoal">
                    {useCase.result}
                  </p>
                </div>
              </div>

              {/* Callout if present */}
              {useCase.callout && (
                <div className="mt-4 rounded-lg border border-brass-100 bg-brass-50 px-4 py-2.5">
                  <p className="text-xs leading-relaxed text-brass-700">
                    {useCase.callout}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
