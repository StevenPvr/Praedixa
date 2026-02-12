"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { PAIN_POINTS } from "../../lib/content/problem-content";

interface ProblemSectionProps {
  className?: string;
}

const cardAccents = ["8%", "12%", "6%"] as const;

export function ProblemSection({ className }: ProblemSectionProps) {
  return (
    <motion.section
      id="problem"
      className={cn("py-24 md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div className="max-w-4xl" variants={staggerItem}>
          <p className="section-kicker">Pourquoi maintenant</p>
          <h2 className="section-title mt-4">
            Le coût de la sous-couverture n'est plus un sujet secondaire.
          </h2>
          <p className="section-lead">
            Les opérations multi-sites évoluent dans un contexte de variabilité
            forte. Sans cadre d'anticipation, les arbitrages deviennent plus
            chers, plus défensifs et moins démontrables.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point, index) => (
            <motion.article
              key={point.title}
              className="premium-card relative overflow-hidden p-7"
              variants={staggerItem}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-300"
                style={{ opacity: cardAccents[index] }}
                aria-hidden="true"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {`Point critique ${index + 1}`}
              </p>
              <h3 className="mt-3 font-serif text-2xl leading-tight text-charcoal">
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {point.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-amber-700">
                {point.consequence}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
