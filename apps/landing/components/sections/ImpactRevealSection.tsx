"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const IMPACT_ITEMS = [
  {
    kicker: "Capacité",
    headline: "Absences & turnover",
    detail:
      "Absences imprévues, départs, remplacements tardifs : la capacité réelle décroche vite sur le terrain.",
  },
  {
    kicker: "Charge",
    headline: "Pics d'activité",
    detail:
      "Saisonnalité, urgences, variations client : la charge monte plus vite que le staffing.",
  },
  {
    kicker: "Décision",
    headline: "Arbitrages en urgence",
    detail:
      "Sans visibilité, vous compensez au dernier moment (HS, intérim, réallocation) et le service en paie le prix.",
  },
] as const;

interface ImpactRevealSectionProps {
  className?: string;
}

/**
 * ImpactRevealSection - Light mode version with scroll-driven reveal of key stats
 */
export function ImpactRevealSection({ className }: ImpactRevealSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Parallax values
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0.8],
  );

  return (
    <section
      ref={containerRef}
      id="impact"
      className={`relative overflow-hidden bg-cream ${className || ""}`}
    >
      {/* Subtle background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Amber glow top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center top, rgba(251, 191, 36, 0.15) 0%, transparent 60%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#1a1a1a 1px, transparent 1px),
              linear-gradient(90deg, #1a1a1a 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 py-24 md:py-32 lg:py-40"
        style={{ opacity: prefersReducedMotion ? 1 : opacity }}
      >
        <div className="max-w-6xl mx-auto px-6">
          {/* Section intro */}
          <motion.div
            className="text-center mb-16 md:mb-24"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="inline-block text-amber-600 text-xs font-semibold tracking-[0.3em] uppercase mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Le vrai problème
            </motion.span>

            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal leading-[1.1] mb-6">
              <motion.span
                className="block"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                Capacité vs charge :
              </motion.span>
              <motion.span
                className="block text-charcoal/40"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                l'écart qui crée les trous.
              </motion.span>
            </h2>

            <motion.p
              className="text-lg md:text-xl text-gray-secondary max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Les absences ne sont qu'un symptôme. Quand la capacité disponible
              ne suit pas la charge à tenir, vous subissez l'urgence
              opérationnelle — et vous payez le prix.
            </motion.p>
          </motion.div>

          {/* Content grid */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {IMPACT_ITEMS.map((item, index) => (
              <motion.div
                key={item.headline}
                className="group relative"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.8,
                  delay: prefersReducedMotion ? 0 : 0.1 + index * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Card */}
                <article className="relative h-full p-8 md:p-10 rounded-2xl bg-white border border-neutral-200 shadow-soft transition-all duration-300 hover:shadow-card hover:border-amber-200 overflow-hidden">
                  {/* Accent line top */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.8,
                      delay: 0.4 + index * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ transformOrigin: "left" }}
                  />

                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600 mb-4">
                    {item.kicker}
                  </p>

                  <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-charcoal mb-4">
                    {item.headline}
                  </h3>

                  <p className="text-gray-secondary text-sm leading-relaxed">
                    {item.detail}
                  </p>
                </article>
              </motion.div>
            ))}
          </div>

          {/* Bottom transition hint */}
          <motion.div
            className="mt-16 md:mt-24 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <p className="text-gray-secondary text-lg mb-6">
              Et si vous saviez à l&apos;avance où vous allez être sous-couverts
              (J+3 à J+14) ?
            </p>
            {/* Scroll indicator */}
            <motion.div
              className="inline-flex flex-col items-center gap-2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
