"use client";

import { motion } from "framer-motion";
import { cn } from "../ui";
import {
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";

interface SolutionSectionProps {
  className?: string;
}

const SOLUTION_STEPS = [
  {
    number: "1",
    title: "Envoyez vos exports existants",
    subtitle: "10 min, aucune intégration",
    description:
      "Capacité, charge, absences : des fichiers que vous avez déjà. CSV ou Excel, aucun connecteur à installer.",
  },
  {
    number: "2",
    title: "On détecte et on explique",
    subtitle: "Prédiction + facteurs explicatifs",
    description:
      "On prédit les trous à venir par site, équipe et compétence. Pour chaque risque, Praedixa identifie les facteurs explicatifs : vous comprenez pourquoi, pas juste où.",
  },
  {
    number: "3",
    title: "Vous recevez votre carte des risques",
    subtitle: "Risques + causes + playbook d'actions",
    description:
      "Une carte de sous-couverture par site, les causes identifiées, le coût évitable estimé et un playbook d'actions prioritaires avec hypothèses transparentes.",
  },
] as const;

export function SolutionSection({ className }: SolutionSectionProps) {
  return (
    <motion.section
      id="solution"
      className={cn("bg-charcoal py-24 md:py-32", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div className="mb-16 text-center" variants={staggerItem}>
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-amber-400">
            Votre point de départ
          </span>
          <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl md:text-[2.75rem]">
            Comprendre vos risques de couverture en quelques jours
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            Avant de construire un système complet, on vous montre la valeur
            concrètement. À partir d&apos;exports que vous avez déjà, on
            identifie les risques, on explique pourquoi ils existent, et on
            chiffre les options.
          </p>
        </motion.div>

        {/* Solution Steps */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {SOLUTION_STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              className="flex flex-col items-center text-center"
              variants={staggerItem}
            >
              {/* Circle with connecting line */}
              <div className="relative mb-6 flex w-full items-center justify-center">
                {/* Line to previous (left side) */}
                {index > 0 && (
                  <div
                    className="absolute right-1/2 top-1/2 hidden h-0.5 w-1/2 -translate-y-1/2 bg-gradient-to-l from-amber-500 to-amber-500/30 md:block"
                    aria-hidden="true"
                  />
                )}

                {/* Line to next (right side) */}
                {index < SOLUTION_STEPS.length - 1 && (
                  <div
                    className="absolute left-1/2 top-1/2 hidden h-0.5 w-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500 to-amber-500/30 md:block"
                    aria-hidden="true"
                  />
                )}

                {/* Circle */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500 bg-charcoal">
                  <span className="font-serif text-2xl text-amber-400">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div>
                <h3 className="mb-1 text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="mb-3 text-sm font-medium text-amber-400/80">
                  {step.subtitle}
                </p>
                <p className="leading-relaxed text-white/70">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bridge to pipeline */}
        <motion.div className="mt-16 text-center" variants={staggerItem}>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/70">
            Ce diagnostic est votre point d&apos;entrée. Pour les entreprises
            pilotes, il débouche sur un partenariat de co-construction&nbsp;:
            pilotage continu, early-warning, arbitrage chiffré, compréhension
            des causes racines et preuve d&apos;impact.
          </p>
          <a
            href="#pipeline"
            className="mt-4 inline-flex items-center gap-2 text-base font-semibold text-amber-400 transition-colors hover:text-amber-300"
          >
            Découvrir le partenariat pilote
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    </motion.section>
  );
}
