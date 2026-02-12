"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import {
  CHECKLIST_ITEMS,
  TRUST_SIGNALS,
} from "../../lib/content/deliverables-content";
import { CheckCircleIcon } from "../icons";

interface DeliverablesSectionProps {
  className?: string;
}

const roiFrames = [
  {
    label: "Coût de non-action",
    value: "Élevé",
    note: "Pénalités, heures supplémentaires, qualité de service",
  },
  {
    label: "Options d'intervention",
    value: "Comparées",
    note: "Scénarios documentés avec hypothèses transparentes",
  },
  {
    label: "Impact démontré",
    value: "Traçable",
    note: "Mesure avant/après utilisable en revue de gouvernance",
  },
] as const;

export function DeliverablesSection({ className }: DeliverablesSectionProps) {
  return (
    <motion.section
      id="deliverables"
      className={cn("py-24 md:py-28", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="section-shell">
        <motion.div className="max-w-4xl" variants={staggerItem}>
          <p className="section-kicker">Framework ROI</p>
          <h2 className="section-title mt-4">
            Des livrables calibrés pour décider, pas pour présenter.
          </h2>
          <p className="section-lead">
            Le niveau premium ne vient pas d'un dashboard de plus, mais d'une
            capacité à produire des arbitrages structurés et défendables.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <motion.div className="premium-card p-7" variants={staggerItem}>
            <h3 className="font-serif text-3xl text-charcoal">
              Pack décisionnel
            </h3>
            <ul className="mt-5 space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-charcoal/85"
                >
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Positionnement
              </p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/85">
                Priorité à la clarté d'arbitrage et à la robustesse des
                hypothèses, plutôt qu'à l'accumulation de KPIs décoratifs.
              </p>
            </div>
          </motion.div>

          <motion.div className="grid gap-4" variants={staggerItem}>
            {roiFrames.map((frame) => (
              <article
                key={frame.label}
                className="premium-card border-neutral-300 bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {frame.label}
                </p>
                <h3 className="mt-2 font-serif text-3xl text-charcoal">
                  {frame.value}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {frame.note}
                </p>
              </article>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="mt-8 grid gap-4 md:grid-cols-2"
          variants={staggerItem}
        >
          {TRUST_SIGNALS.map((signal) => (
            <article key={signal.title} className="premium-card p-5">
              <h3 className="font-semibold text-charcoal">{signal.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {signal.text}
              </p>
            </article>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
