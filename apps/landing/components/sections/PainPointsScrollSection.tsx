"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "../ui";
import { easingCurves } from "../../lib/animations/config";

interface PainPointsScrollSectionProps {
  className?: string;
}

// =============================================================================
// ILLUSTRATIONS SVG
// =============================================================================

function IllustrationUrgence({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shapes */}
      <circle cx="200" cy="150" r="120" fill="#FEF3C7" opacity="0.5" />
      <circle cx="280" cy="80" r="40" fill="#FDE68A" opacity="0.4" />

      {/* Alarm clock */}
      <g transform="translate(80, 60)">
        <circle
          cx="80"
          cy="100"
          r="60"
          fill="#F5F5F4"
          stroke="#404040"
          strokeWidth="4"
        />
        <circle
          cx="80"
          cy="100"
          r="50"
          fill="white"
          stroke="#D4D4D4"
          strokeWidth="2"
        />
        <line
          x1="80"
          y1="100"
          x2="80"
          y2="65"
          stroke="#404040"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="80"
          y1="100"
          x2="105"
          y2="100"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="80" cy="100" r="5" fill="#404040" />
        <circle cx="45" cy="50" r="15" fill="#F59E0B" />
        <circle cx="115" cy="50" r="15" fill="#F59E0B" />
        <rect x="75" y="30" width="10" height="15" fill="#404040" rx="2" />
        <rect
          x="50"
          y="155"
          width="8"
          height="20"
          fill="#404040"
          rx="2"
          transform="rotate(-15 50 155)"
        />
        <rect
          x="102"
          y="155"
          width="8"
          height="20"
          fill="#404040"
          rx="2"
          transform="rotate(15 102 155)"
        />
        <path
          d="M150 70 L170 60"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M155 90 L175 85"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M155 110 L175 115"
          stroke="#F59E0B"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Phone */}
      <g transform="translate(240, 100)">
        <rect x="0" y="0" width="70" height="120" rx="12" fill="#404040" />
        <rect x="5" y="15" width="60" height="90" rx="4" fill="#F59E0B" />
        <circle cx="35" cy="8" r="3" fill="#525252" />
        <rect x="25" y="108" width="20" height="4" rx="2" fill="#525252" />
        <path
          d="M25 50 Q25 40 35 40 Q45 40 45 50 L45 70 Q45 80 35 80 Q25 80 25 70 Z"
          fill="white"
          opacity="0.9"
        />
        <circle cx="35" cy="55" r="8" fill="#404040" />
      </g>

      {/* Stress person silhouette */}
      <g transform="translate(140, 180)">
        <circle cx="60" cy="20" r="18" fill="#D4D4D4" />
        <path d="M40 45 Q60 35 80 45 L85 90 Q60 95 35 90 Z" fill="#D4D4D4" />
        <path
          d="M45 5 L40 -5"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M60 0 L60 -10"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M75 5 L80 -5"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function IllustrationFinance({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shapes */}
      <circle cx="200" cy="150" r="120" fill="#FEF3C7" opacity="0.5" />
      <circle cx="320" cy="200" r="50" fill="#FDE68A" opacity="0.4" />

      {/* Chart/Board */}
      <g transform="translate(100, 40)">
        <rect
          x="0"
          y="0"
          width="200"
          height="140"
          rx="8"
          fill="white"
          stroke="#D4D4D4"
          strokeWidth="2"
        />
        <rect x="30" y="90" width="25" height="30" fill="#D4D4D4" rx="2" />
        <rect x="65" y="60" width="25" height="60" fill="#F59E0B" rx="2" />
        <rect x="100" y="75" width="25" height="45" fill="#D4D4D4" rx="2" />
        <rect x="135" y="40" width="25" height="80" fill="#F59E0B" rx="2" />
        <path
          d="M30 85 L55 55 L90 70 L125 35 L160 20"
          stroke="#404040"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="160" cy="20" r="5" fill="#404040" />
      </g>

      {/* Person 1 (DAF) */}
      <g transform="translate(70, 180)">
        <circle cx="30" cy="20" r="20" fill="#404040" />
        <path d="M5 50 Q30 40 55 50 L60 100 Q30 105 0 100 Z" fill="#404040" />
        <path d="M25 50 L30 75 L35 50" fill="#F59E0B" />
      </g>

      {/* Person 2 (DRH) */}
      <g transform="translate(180, 190)">
        <circle cx="30" cy="15" r="18" fill="#737373" />
        <path d="M8 40 Q30 30 52 40 L55 90 Q30 95 5 90 Z" fill="#737373" />
        <text x="25" y="-10" fontSize="28" fill="#F59E0B" fontWeight="bold">
          ?
        </text>
      </g>

      {/* Person 3 */}
      <g transform="translate(270, 185)">
        <circle cx="25" cy="18" r="16" fill="#A3A3A3" />
        <path d="M5 42 Q25 32 45 42 L48 88 Q25 93 2 88 Z" fill="#A3A3A3" />
        <text x="18" y="-5" fontSize="24" fill="#F59E0B" fontWeight="bold">
          ?
        </text>
      </g>

      {/* Euro symbols floating */}
      <text x="60" y="80" fontSize="24" fill="#F59E0B" opacity="0.6">
        €
      </text>
      <text x="320" y="100" fontSize="20" fill="#F59E0B" opacity="0.4">
        €
      </text>
      <text x="340" y="140" fontSize="28" fill="#F59E0B" opacity="0.5">
        €
      </text>
    </svg>
  );
}

function IllustrationCodir({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shapes */}
      <circle cx="200" cy="150" r="120" fill="#FEF3C7" opacity="0.5" />
      <circle cx="80" cy="220" r="60" fill="#FDE68A" opacity="0.4" />

      {/* Presentation screen */}
      <g transform="translate(80, 30)">
        <rect x="0" y="0" width="240" height="150" rx="8" fill="#404040" />
        <rect x="8" y="8" width="224" height="134" rx="4" fill="white" />
        <rect x="20" y="25" width="80" height="10" rx="2" fill="#D4D4D4" />
        <rect x="20" y="45" width="120" height="8" rx="2" fill="#E5E5E5" />
        <rect x="20" y="60" width="100" height="8" rx="2" fill="#E5E5E5" />
        <circle
          cx="170"
          cy="60"
          r="30"
          fill="#F5F5F4"
          stroke="#D4D4D4"
          strokeWidth="2"
        />
        <path
          d="M170 60 L170 30 A30 30 0 0 1 195 75 Z"
          fill="#F59E0B"
          opacity="0.5"
        />
        <text x="162" y="68" fontSize="24" fill="#404040" fontWeight="bold">
          ?
        </text>
        <rect x="20" y="90" width="15" height="40" rx="2" fill="#D4D4D4" />
        <rect x="45" y="100" width="15" height="30" rx="2" fill="#D4D4D4" />
        <rect
          x="70"
          y="85"
          width="15"
          height="45"
          rx="2"
          fill="#F59E0B"
          opacity="0.6"
        />
        <rect x="95" y="95" width="15" height="35" rx="2" fill="#D4D4D4" />
        <text x="130" y="120" fontSize="16" fill="#EF4444">
          ✗
        </text>
        <text x="150" y="105" fontSize="16" fill="#EF4444">
          ✗
        </text>
        <rect x="110" y="150" width="20" height="30" fill="#404040" />
        <rect x="80" y="175" width="80" height="8" rx="2" fill="#404040" />
      </g>

      {/* Audience silhouettes */}
      <g transform="translate(50, 210)">
        <circle cx="30" cy="15" r="14" fill="#525252" />
        <path d="M12 35 Q30 27 48 35 L50 70 Q30 73 10 70 Z" fill="#525252" />
      </g>
      <g transform="translate(120, 205)">
        <circle cx="30" cy="18" r="16" fill="#404040" />
        <path d="M10 40 Q30 30 50 40 L53 80 Q30 85 7 80 Z" fill="#404040" />
      </g>
      <g transform="translate(200, 210)">
        <circle cx="28" cy="15" r="14" fill="#525252" />
        <path d="M10 35 Q28 27 46 35 L48 70 Q28 73 8 70 Z" fill="#525252" />
      </g>
      <g transform="translate(270, 208)">
        <circle cx="30" cy="16" r="15" fill="#404040" />
        <path d="M11 38 Q30 28 49 38 L52 75 Q30 80 8 75 Z" fill="#404040" />
      </g>

      {/* Floating question marks */}
      <text x="330" y="80" fontSize="32" fill="#F59E0B" opacity="0.6">
        ?
      </text>
      <text x="50" y="120" fontSize="24" fill="#F59E0B" opacity="0.5">
        ?
      </text>
    </svg>
  );
}

// =============================================================================
// DATA
// =============================================================================

const PAIN_POINTS = [
  {
    Illustration: IllustrationUrgence,
    title: "Vous découvrez le trou le matin même",
    description:
      "Absence de dernière minute, et c'est la course à l'intérim. Quand il est disponible, il arrive trop tard — et coûte plus cher.",
    stat: "J+0",
    statLabel: "trop tard pour optimiser",
  },
  {
    Illustration: IllustrationFinance,
    title: "Personne ne sait combien ça coûte",
    description:
      "Intérim urgence, HS subies, SLA ratés : combien au total ? Finance et Ops n'ont pas le même chiffre.",
    stat: "€?",
    statLabel: "pas de vision globale",
  },
  {
    Illustration: IllustrationCodir,
    title: "Impossible de prouver le coût évitable",
    description:
      "Vous savez que les trous de planning pèsent sur les marges. Le démontrer avec des données auditables, c'est une autre histoire.",
    stat: "0",
    statLabel: "preuve chiffrée",
  },
];

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easingCurves.dramatic,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easingCurves.dramatic,
      delay: i * 0.15,
    },
  }),
};

// =============================================================================
// COMPONENT
// =============================================================================

export function PainPointsScrollSection({
  className,
}: PainPointsScrollSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="pain-points"
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
            Le constat
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl md:text-5xl">
            Des problèmes qui coûtent cher
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-secondary">
            Les responsables opérationnels connaissent ces situations par cœur.
          </p>
        </motion.div>

        {/* Pain Points Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((point, index) => (
            <motion.article
              key={index}
              className="group relative h-[440px] overflow-hidden rounded-3xl bg-neutral-100 shadow-lg transition-shadow duration-500 hover:shadow-2xl"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={index}
              variants={cardVariants}
              whileHover={{
                y: -6,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
            >
              {/* Illustration */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 pb-36">
                <point.Illustration className="h-full w-full p-4 transition-transform duration-500 group-hover:scale-105" />
              </div>

              {/* Content overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal via-charcoal/95 to-charcoal/0 px-6 pb-6 pt-24">
                {/* Stat badge */}
                <div className="mb-3 inline-flex items-baseline gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 backdrop-blur-sm">
                  <span className="text-lg font-bold text-amber-400">
                    {point.stat}
                  </span>
                  <span className="text-xs font-medium text-amber-300/80">
                    {point.statLabel}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-semibold leading-tight text-white">
                  {point.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-white/70">
                  {point.description}
                </p>
              </div>

              {/* Subtle amber accent on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-transparent transition-all duration-300 group-hover:ring-amber-400/30" />
            </motion.article>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="mb-4 text-lg text-gray-secondary">
            Ces situations vous parlent ?
          </p>
          <a
            href="#solution"
            className="inline-flex items-center gap-2 font-semibold text-amber-600 transition-colors hover:text-amber-700"
          >
            <span>Découvrir comment Praedixa résout ces problèmes</span>
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
