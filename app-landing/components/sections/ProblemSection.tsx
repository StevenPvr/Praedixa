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

/* Inline SVG icons for each pain point — kept in component (JSX) */
const PAIN_POINT_ICONS: React.ReactNode[] = [
  /* 0: Bar chart with gap — capacity shortfall */
  <svg
    key="shortfall"
    className="h-10 w-10"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="24"
      width="6"
      height="12"
      rx="1"
      className="fill-amber-500"
    />
    <rect
      x="13"
      y="18"
      width="6"
      height="18"
      rx="1"
      className="fill-amber-500"
    />
    <rect
      x="22"
      y="28"
      width="6"
      height="8"
      rx="1"
      className="fill-amber-500/40"
    />
    <rect
      x="31"
      y="10"
      width="6"
      height="26"
      rx="1"
      className="fill-amber-500"
    />
    <path
      d="M7 20 L16 14 L25 22 L34 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="4 3"
      className="text-charcoal/40"
    />
  </svg>,
  /* 1: Euro sign with question mark */
  <svg
    key="cost"
    className="h-10 w-10"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="20"
      cy="20"
      r="16"
      className="stroke-charcoal/20"
      strokeWidth="1.5"
    />
    <text
      x="13"
      y="27"
      className="fill-amber-500 text-lg font-bold"
      style={{ fontSize: "18px", fontFamily: "var(--font-serif)" }}
    >
      ?
    </text>
  </svg>,
  /* 2: Document with X — no audit trail */
  <svg
    key="audit"
    className="h-10 w-10"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="8"
      y="4"
      width="24"
      height="32"
      rx="2"
      className="stroke-charcoal/20"
      strokeWidth="1.5"
    />
    <line
      x1="14"
      y1="14"
      x2="26"
      y2="14"
      className="stroke-charcoal/15"
      strokeWidth="1.5"
    />
    <line
      x1="14"
      y1="20"
      x2="26"
      y2="20"
      className="stroke-charcoal/15"
      strokeWidth="1.5"
    />
    <line
      x1="14"
      y1="26"
      x2="22"
      y2="26"
      className="stroke-charcoal/15"
      strokeWidth="1.5"
    />
    <line
      x1="24"
      y1="24"
      x2="30"
      y2="30"
      className="stroke-amber-500"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="30"
      y1="24"
      x2="24"
      y2="30"
      className="stroke-amber-500"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>,
];

export function ProblemSection({ className }: ProblemSectionProps) {
  return (
    <motion.section
      id="problem"
      className={cn("bg-neutral-50 py-24 md:py-32", className)}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <motion.div className="mb-14 max-w-3xl" variants={staggerItem}>
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-amber-600">
            Le problème
          </span>
          <h2 className="font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl lg:text-[2.75rem]">
            Le vrai coût de la sous-couverture
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 md:text-lg">
            Quand la capacité terrain ne suit pas la charge, les entreprises
            multi-sites paient en urgence. Le coût est réel, mais rarement
            mesuré.
          </p>
        </motion.div>

        {/* Pain Point Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {PAIN_POINTS.map((point, index) => (
            <motion.div
              key={point.title}
              className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-soft transition-all hover:border-amber-200 hover:shadow-card"
              variants={staggerItem}
            >
              <div className="mb-5">{PAIN_POINT_ICONS[index]}</div>
              <h3 className="mb-2 text-lg font-bold text-charcoal">
                {point.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-neutral-600">
                {point.description}
              </p>
              <p className="text-sm font-semibold text-amber-600">
                {point.consequence}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Transition to solution */}
        <motion.p
          className="mx-auto mt-12 max-w-3xl text-center text-base leading-relaxed text-neutral-600 md:text-lg"
          variants={staggerItem}
        >
          Ces trois problèmes ont une cause commune&nbsp;: l&apos;absence
          d&apos;early-warning sur le risque de sous-couverture.{" "}
          <span className="font-semibold text-charcoal">
            Praedixa est cette couche d&apos;intelligence.
          </span>
        </motion.p>
      </div>
    </motion.section>
  );
}
