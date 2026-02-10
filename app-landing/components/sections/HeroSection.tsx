"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { sectionReveal } from "../../lib/animations/variants";
import { heroContent } from "../../lib/content/hero-content";
import { HeroIllustration } from "../hero/HeroIllustration";

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

/* Inline SVG icons for bullets — kept minimal (no external lib) */
const bulletIcons: Record<string, React.ReactNode> = {
  warning: (
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  euro: (
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.798 7.45c.512-.67 1.135-.95 1.702-.95.567 0 1.19.28 1.702.95a.75.75 0 001.192-.91C12.637 5.55 11.593 5 10.5 5c-1.093 0-2.137.55-2.894 1.54A5.205 5.205 0 006.83 8.5H6a.75.75 0 000 1.5h.54a6.728 6.728 0 00-.04 1H6a.75.75 0 000 1.5h.83a5.205 5.205 0 00.776 1.96C8.363 15.45 9.407 16 10.5 16c1.093 0 2.137-.55 2.894-1.54a.75.75 0 00-1.192-.91c-.512.67-1.135.95-1.702.95-.567 0-1.19-.28-1.702-.95a3.505 3.505 0 01-.343-.55H11a.75.75 0 000-1.5H8.15a5.232 5.232 0 01-.1-1H11a.75.75 0 000-1.5H8.15c.03-.34.085-.68.193-1H11a.75.75 0 000-1.5H8.455c.098-.195.213-.38.343-.55z"
        clipRule="evenodd"
      />
    </svg>
  ),
  check: (
    <svg
      className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
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
                href={heroContent.ctaSecondary.href}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/20 px-6 py-4 text-base font-medium text-charcoal/70 transition-all duration-200 hover:border-charcoal/40 hover:text-charcoal sm:w-auto"
              >
                {heroContent.ctaSecondary.text}
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
                  <svg
                    className="h-3.5 w-3.5 flex-shrink-0 text-amber-500"
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
