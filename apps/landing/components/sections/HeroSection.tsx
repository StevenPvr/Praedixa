"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { sectionReveal } from "../../lib/animations/variants";
import { HeroIllustration } from "../hero/HeroIllustration";

interface HeroSectionProps {
  className?: string;
}

const TRUST_BADGES = [
  "Diagnostic 48h",
  "Sans intégration IT",
  "Hébergement France",
  "Données agrégées uniquement",
] as const;

/**
 * Text-forward hero section optimised for B2B conversion.
 * Premium design: ambient glow, pill badges, strong typography.
 */
export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      id="hero"
      data-testid="hero-section"
      className={`relative overflow-hidden bg-cream ${className || ""}`}
    >
      {/* Ambient glow — subtle radial gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Hero content */}
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-32 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          {/* H1 — keyword-optimised, premium sizing */}
          <motion.h1
            className="font-serif text-5xl font-bold leading-tight tracking-tighter text-charcoal sm:text-6xl lg:text-7xl"
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
          >
            Anticipez les trous{" "}
            <span className="relative whitespace-nowrap">
              de planning terrain.
              <span
                className="absolute bottom-1 left-0 -z-10 h-2 w-full bg-amber-400/40"
                aria-hidden="true"
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 md:text-xl"
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
          >
            En <span className="font-semibold text-amber-600">48h</span>, un
            premier diagnostic actionnable. Ensuite, une solution complète qui
            anticipe en continu&nbsp;: prédictions, notifications informatives,
            suivi des gains.
          </motion.p>

          {/* CTA pair */}
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center"
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/devenir-pilote"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-charcoal shadow-lg transition-all duration-200 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 sm:w-auto"
            >
              Obtenir mon diagnostic gratuit
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
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
            <a
              href="#pipeline"
              className="inline-flex w-full items-center justify-center border-b border-neutral-300 px-6 py-4 text-base font-medium text-neutral-600 transition-colors hover:border-charcoal hover:text-charcoal sm:w-auto"
            >
              Voir la méthode complète
              <svg
                className="ml-1 h-4 w-4"
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

          {/* Trust badges — pill style */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            variants={sectionReveal}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.45 }}
          >
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/80 px-3.5 py-1.5 text-xs font-medium text-charcoal/80"
              >
                <svg
                  className="h-3.5 w-3.5 text-amber-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                {badge}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Static SVG illustration — dashboard card */}
        <motion.div
          className="mt-14 lg:mt-20"
          variants={sectionReveal}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
