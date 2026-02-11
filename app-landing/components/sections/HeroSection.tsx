"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { sectionReveal } from "../../lib/animations/variants";
import { heroContent } from "../../lib/content/hero-content";
import { HeroIllustration } from "../hero/HeroIllustration";
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

/** Illustration enters from the right on desktop */
const heroIllustrationReveal: Variants = {
  hidden: { opacity: 0, x: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const bulletIcons: Record<string, React.ReactNode> = {
  warning: (
    <WarningIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
  ),
  euro: <EuroIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />,
  check: (
    <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
  ),
};

/**
 * Hero section — split-screen 55/45 on desktop, stacked on mobile/tablet.
 * All visible text comes from heroContent (hero-content.ts).
 */
export function HeroSection({ className }: HeroSectionProps) {
  /* Split the headline around the highlighted part */
  const headlineBefore = heroContent.headline.split(
    heroContent.headlineHighlight,
  )[0];

  return (
    <section
      id="hero"
      data-testid="hero-section"
      className={`relative overflow-hidden bg-cream ${className || ""}`}
    >
      {/* Dual gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse at 50% 0%, oklch(0.769 0.205 70 / 0.10) 0%, transparent 60%)",
            "radial-gradient(ellipse at 80% 80%, oklch(0.769 0.205 70 / 0.04) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* Content container */}
      <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-28 lg:px-6 lg:pb-28 lg:pt-36">
        {/* Desktop: split-screen grid. Mobile/tablet: flex column */}
        <div className="lg:grid lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-12">
          {/* ─── Left column: text ─── */}
          <div className="text-left sm:text-center lg:text-left">
            {/* Kicker / eyebrow */}
            <motion.p
              className="text-sm font-semibold uppercase tracking-widest text-amber-600"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
            >
              {heroContent.kicker}
            </motion.p>

            {/* H1 */}
            <motion.h1
              className="mt-4 font-serif text-4xl font-bold leading-[1.1] tracking-tight text-charcoal sm:text-5xl lg:text-6xl lg:tracking-tighter"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              {headlineBefore}
              <span className="relative whitespace-nowrap">
                {heroContent.headlineHighlight}
                <span
                  className="absolute bottom-0 left-0 -z-10 h-2.5 w-full bg-amber-400/30"
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 sm:mx-auto sm:max-w-2xl md:text-xl lg:mx-0 lg:max-w-lg"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              {heroContent.subtitle}
            </motion.p>

            {/* Bullets */}
            <motion.ul
              className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2 lg:flex-col lg:items-start lg:gap-3"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              {heroContent.bullets.map((bullet) => (
                <li
                  key={bullet.icon}
                  className="flex items-start gap-2.5 text-base font-medium text-charcoal/80"
                >
                  {bulletIcons[bullet.icon]}
                  <span>{bullet.text}</span>
                </li>
              ))}
            </motion.ul>

            {/* CTA pair */}
            <motion.div
              className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 }}
            >
              <Link
                href={heroContent.ctaPrimary.href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-4 text-base font-bold text-charcoal shadow-lg transition-all duration-200 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 sm:w-auto"
              >
                {heroContent.ctaPrimary.text}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a
                href={heroContent.ctaSecondary.href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/20 px-6 py-4 text-base font-medium text-charcoal/70 transition-all duration-200 hover:border-charcoal/40 hover:text-charcoal sm:w-auto"
              >
                {heroContent.ctaSecondary.text}
                <ChevronDownIcon className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="mt-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center lg:justify-start"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.65 }}
            >
              {heroContent.trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/80 px-3 py-1.5 text-xs font-medium text-charcoal/80 lg:px-4 lg:py-2 lg:text-sm"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ─── Right column: illustration ─── */}
          <motion.div
            className="mt-14 lg:mt-0"
            variants={heroIllustrationReveal}
            initial="hidden"
            animate="visible"
          >
            <HeroIllustration />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
