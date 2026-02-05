"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";

interface SolutionSectionProps {
  className?: string;
}

const SOLUTION_STEPS = [
  {
    number: "1",
    title: "Sous-couverture",
    description:
      "À partir de vos exports (planning, activité, absences), on anticipe où et quand la capacité ne suivra pas la charge. Par site, par semaine.",
  },
  {
    number: "2",
    title: "Coût chiffré",
    description:
      "Combien coûte le trou ? Combien coûte l'action ? On chiffre vos options (HS, intérim, réallocation) et le coût de l'inaction.",
  },
  {
    number: "3",
    title: "Plan d'action",
    description:
      "3 actions concrètes, justifiées, avec ROI estimé et hypothèses transparentes. Pas des graphiques : des décisions prêtes à appliquer.",
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

const circleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: EASE_OUT_EXPO,
      delay: 0.2 + i * 0.15,
    },
  }),
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
      delay: 0.4 + i * 0.15,
    },
  }),
};

const noteVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      delay: 1,
    },
  },
};

export function SolutionSection({ className }: SolutionSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="solution"
      className={cn("bg-charcoal py-24 md:py-32", className)}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={headerVariants}
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
            La solution
          </p>
          <h2 className="font-serif text-3xl text-white sm:text-4xl md:text-5xl">
            Diagnostic → Chiffrage → Action
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            En 48h, vous savez où vous allez être sous-couverts (capacité vs
            charge), combien ça coûte, et quoi faire. Plan de couverture
            chiffré.
          </p>
        </motion.div>

        {/* Solution Steps - Using grid for perfect alignment */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {SOLUTION_STEPS.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={index}
            >
              {/* Circle with connecting line */}
              <div className="relative mb-6 flex w-full items-center justify-center">
                {/* Line to previous (left side) */}
                {index > 0 && (
                  <motion.div
                    className="absolute right-1/2 top-1/2 hidden h-0.5 w-1/2 origin-right -translate-y-1/2 bg-gradient-to-l from-amber-500 to-amber-500/30 md:block"
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: EASE_OUT_EXPO,
                      delay: 0.3 + index * 0.15,
                    }}
                  />
                )}

                {/* Line to next (right side) */}
                {index < SOLUTION_STEPS.length - 1 && (
                  <motion.div
                    className="absolute left-1/2 top-1/2 hidden h-0.5 w-1/2 origin-left -translate-y-1/2 bg-gradient-to-r from-amber-500 to-amber-500/30 md:block"
                    aria-hidden="true"
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: EASE_OUT_EXPO,
                      delay: 0.4 + index * 0.15,
                    }}
                  />
                )}

                {/* Circle */}
                <motion.div
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500 bg-charcoal"
                  variants={circleVariants}
                >
                  <span className="font-serif text-2xl text-amber-400">
                    {step.number}
                  </span>
                </motion.div>
              </div>

              {/* Content */}
              <motion.div variants={contentVariants} custom={index}>
                <h3 className="mb-3 text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-white/70">
                  {step.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Note about process */}
        <motion.p
          className="mt-12 text-center text-sm text-white/50"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={noteVariants}
        >
          Tout ça en 48h, à partir d&apos;exports que vous avez déjà.
        </motion.p>
      </div>
    </section>
  );
}
