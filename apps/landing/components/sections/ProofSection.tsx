"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";

interface ProofSectionProps {
  className?: string;
}

const PROOF_POINTS = [
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
    title: "Rapport PDF actionnable",
    description:
      "Pas de dashboard à interpréter. Un rapport clair avec prévisions, coûts et actions recommandées.",
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
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Coût évitable chiffré",
    description:
      "Combien vous coûtent vos trous de planning ? La réponse en euros, par site, par semaine.",
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
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
    title: "3 actions prioritaires",
    description:
      "Pas 50 recommandations. 3 actions concrètes avec leur ROI estimé. Prêtes à appliquer.",
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
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Hypothèses transparentes",
    description:
      "Vous validez les coûts unitaires utilisés. Pas de boîte noire, pas de magie.",
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
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Livraison en 48h",
    description:
      "Pas de projet de 6 mois. Des exports simples, 48h, et vous avez votre diagnostic.",
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Sans intégration IT",
    description:
      "Pas de connecteur à installer. Pas de projet IT. Des exports CSV suffisent.",
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
    },
  },
};

const noteVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE_OUT_EXPO,
      delay: 0.8,
    },
  },
};

export function ProofSection({ className }: ProofSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="proof"
      className={cn("bg-neutral-100 py-24 md:py-32", className)}
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
            Ce que vous recevez
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
            Un plan, pas un dashboard
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-secondary">
            Pas besoin d&apos;interpréter des graphiques. Vous recevez un
            diagnostic actionnable avec des décisions prêtes à prendre.
          </p>
        </motion.div>

        {/* Proof Points Grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {PROOF_POINTS.map((point, index) => (
            <motion.div
              key={index}
              className="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:border-amber-200 hover:shadow-card"
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              {/* Icon */}
              <div className="mb-4 inline-flex rounded-lg bg-amber-100 p-2.5 text-amber-600 transition-colors duration-300 group-hover:bg-amber-500 group-hover:text-white">
                {point.icon}
              </div>

              {/* Title */}
              <h3 className="mb-2 text-lg font-bold text-charcoal">
                {point.title}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-gray-secondary">
                {point.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Note */}
        <motion.div
          className="mt-12 rounded-xl border border-amber-200 bg-amber-100/50 p-6"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={noteVariants}
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-full bg-amber-500 p-2 text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="mb-1 font-bold text-charcoal">
                Après le diagnostic : temps réel
              </h4>
              <p className="text-sm text-gray-secondary">
                Si le diagnostic vous convainc, on passe au temps réel :
                dashboard avec alertes automatiques, suivi continu, et
                recommandations à jour. Mais d&apos;abord, on vous prouve la
                valeur.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
