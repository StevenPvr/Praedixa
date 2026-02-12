"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { SOLUTION_STEPS } from "../../lib/content/solution-content";
import { ChevronDownIcon } from "../icons";

interface SolutionSectionProps {
  className?: string;
}

export function SolutionSection({ className }: SolutionSectionProps) {
  return (
    <motion.section
      id="solution"
      className={cn("bg-charcoal py-24 text-white md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div className="max-w-4xl" variants={staggerItem}>
          <p className="section-kicker text-amber-300">Méthode auditable</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
            Une approche sobre, exigeante, orientée décision.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/75">
            Praedixa n'ajoute pas du bruit. La plateforme structure un cycle
            clair: lire, prioriser, arbitrer, prouver.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SOLUTION_STEPS.map((step, index) => (
            <motion.article
              key={step.number}
              className="rounded-3xl border border-white/12 bg-white/[0.04] p-7"
              variants={staggerItem}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 font-serif text-2xl text-amber-300">
                {step.number}
              </div>
              <h3 className="mt-5 font-serif text-3xl leading-tight text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-amber-200/80">
                {step.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {step.description}
              </p>
              {index < SOLUTION_STEPS.length - 1 && (
                <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/70">
                  Suite du cycle
                  <ChevronDownIcon className="h-4 w-4" />
                </div>
              )}
            </motion.article>
          ))}
        </div>

        <motion.div className="mt-10" variants={staggerItem}>
          <a
            href="#pipeline"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition hover:text-amber-200"
          >
            Voir les cas d'usage opérationnels
            <ChevronDownIcon className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </motion.section>
  );
}
