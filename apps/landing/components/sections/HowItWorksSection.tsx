"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";

interface HowItWorksSectionProps {
  className?: string;
}

const STEPS = [
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: "Vous nous envoyez vos exports",
    description:
      "Planning + activité (volumes) + absences. Des exports CSV que vous avez déjà dans vos outils. Rien à installer.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    title: "On calcule en 48h",
    description:
      "Prévision de sous-couverture (capacité vs charge) par site et par semaine. Où et quand vous allez manquer de monde.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    title: "Vous recevez le plan",
    description:
      "Carte de sous-couverture + coût évitable + options chiffrées, et 3 actions prioritaires avec ROI. Un rapport actionnable.",
  },
  {
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "On passe au temps réel",
    description:
      "Après validation, dashboard avec alertes automatiques et suivi continu. Vous gardez le contrôle.",
  },
] as const;

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE_OUT_EXPO,
    },
  },
};

const lineVariants = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
      delay: 0.2,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
      delay: 0.15 + i * 0.12,
    },
  }),
};

const circleVariants = {
  hidden: { scale: 0 },
  visible: (i: number) => ({
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
      delay: 0.1 + i * 0.12,
    },
  }),
};

export function HowItWorksSection({ className }: HowItWorksSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className={cn("bg-cream py-24 md:py-32", className)}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headerVariants}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            Le process
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-secondary">
            Exports simples, 48h, et vous avez votre plan de couverture. Sans
            intégration, sans projet IT.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical Line (left side) */}
          <motion.div
            className="absolute left-6 top-0 hidden h-full w-0.5 origin-top bg-gradient-to-b from-amber-500 via-amber-500/50 to-transparent md:block"
            aria-hidden="true"
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={lineVariants}
          />

          <div className="space-y-8">
            {STEPS.map((step, index) => (
              <motion.div
                key={index}
                className="relative flex gap-6 md:ml-6 md:pl-12"
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                custom={index}
                variants={stepVariants}
              >
                {/* Step Number Circle (desktop) */}
                <motion.div
                  className="absolute -left-6 hidden h-12 w-12 items-center justify-center rounded-full border-2 border-amber-500 bg-cream md:flex"
                  aria-hidden="true"
                  custom={index}
                  variants={circleVariants}
                >
                  <span className="text-lg font-bold text-amber-600">
                    {index + 1}
                  </span>
                </motion.div>

                {/* Mobile Number */}
                <motion.div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 bg-cream md:hidden"
                  custom={index}
                  variants={circleVariants}
                >
                  <span className="text-sm font-bold text-amber-600">
                    {index + 1}
                  </span>
                </motion.div>

                {/* Content Card */}
                <motion.div
                  className="flex-1 rounded-xl border border-neutral-200 bg-white p-6 shadow-soft transition-all duration-300 hover:border-amber-200 hover:shadow-card"
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex rounded-lg bg-amber-100 p-2 text-amber-600">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold text-charcoal">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-secondary">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
