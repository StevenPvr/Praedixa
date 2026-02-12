"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { sectionReveal } from "../../lib/animations/variants";
import { heroContent } from "../../lib/content/hero-content";
import {
  WarningIcon,
  EuroIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "../icons";

interface HeroSectionProps {
  className?: string;
}

const heroAsideReveal: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

const bulletIcons: Record<string, React.ReactNode> = {
  warning: (
    <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
  ),
  euro: <EuroIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />,
  check: (
    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
  ),
};

const executiveSignals = [
  { label: "Sites surveillés", value: "24" },
  { label: "Fenêtre d'anticipation", value: "3-14 j" },
  { label: "Cycle de revue", value: "Hebdo" },
] as const;

export function HeroSection({ className }: HeroSectionProps) {
  const [headlineStart, headlineEnd] = heroContent.headline.split(
    heroContent.headlineHighlight,
  );

  return (
    <section
      id="hero"
      data-testid="hero-section"
      className={`relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-24 ${className || ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, oklch(0.9 0.07 88 / 0.45), transparent 45%), radial-gradient(circle at 85% 10%, oklch(0.94 0.03 80 / 0.35), transparent 45%)",
        }}
      />

      <div className="section-shell relative">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <motion.p
              className="section-kicker"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
            >
              {heroContent.kicker}
            </motion.p>

            <motion.h1
              className="mt-6 max-w-4xl font-serif text-5xl leading-[1.02] text-charcoal sm:text-6xl lg:text-7xl"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.05 }}
            >
              {headlineStart}
              <span className="relative inline-block text-amber-700">
                {heroContent.headlineHighlight}
                <span
                  className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-full bg-amber-200/70"
                  aria-hidden="true"
                />
              </span>
              {headlineEnd}
            </motion.h1>

            <motion.p
              className="section-lead"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.12 }}
            >
              {heroContent.subtitle}
            </motion.p>

            <motion.ul
              className="mt-8 grid gap-3"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.18 }}
            >
              {heroContent.bullets.map((bullet) => (
                <li key={bullet.text} className="flex items-start gap-2.5 text-sm text-charcoal/85 sm:text-base">
                  {bulletIcons[bullet.icon]}
                  <span>{bullet.text}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.24 }}
            >
              <Link href={heroContent.ctaPrimary.href} className="gold-cta">
                {heroContent.ctaPrimary.text}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
              <a href={heroContent.ctaSecondary.href} className="ghost-cta">
                {heroContent.ctaSecondary.text}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </a>
            </motion.div>

            <motion.p
              className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500 sm:text-sm"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.27 }}
            >
              {heroContent.ctaMeta}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap gap-2.5"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              {heroContent.trustBadges.map((badge) => (
                <span key={badge} className="premium-pill">
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.aside
            variants={heroAsideReveal}
            initial="hidden"
            animate="visible"
            className="premium-card relative overflow-hidden border-neutral-300 bg-[oklch(0.992_0.002_95)] p-6 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-200/35"
              style={{ animation: "haloPulse 6s ease-in-out infinite" }}
            />

            <p className="premium-pill relative z-10">Executive Control Layer</p>
            <h2 className="relative z-10 mt-4 font-serif text-3xl leading-tight text-charcoal">
              Direction cockpit: couverture, arbitrage, preuve
            </h2>
            <p className="relative z-10 mt-4 text-sm leading-relaxed text-neutral-600">
              Une interface pensée pour prendre des décisions robustes rapidement,
              sans sacrifier la lisibilité des hypothèses.
            </p>

            <dl className="relative z-10 mt-7 grid gap-3 sm:grid-cols-3">
              {executiveSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-neutral-200 bg-white/90 p-4"
                >
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">
                    {signal.label}
                  </dt>
                  <dd className="mt-2 font-serif text-2xl text-charcoal">
                    {signal.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="relative z-10 mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Proposition de valeur
              </p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/85">
                Réduire le nombre de décisions prises sous contrainte en rendant
                les tensions visibles et discutables en amont.
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
