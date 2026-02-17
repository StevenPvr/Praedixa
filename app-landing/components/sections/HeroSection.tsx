"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRightIcon, ChevronDownIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";
import { useRef } from "react";

/* ═══════════════════════════════════════════════════
   ANIMATION PRIMITIVES
   ═══════════════════════════════════════════════════ */

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease },
  }),
};

/* ═══════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════ */

interface HeroSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export function HeroSection({ dict, locale }: HeroSectionProps) {
  const { hero } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section
      ref={containerRef}
      id="hero"
      data-testid="hero-section"
      className="relative overflow-hidden bg-cream pb-24 pt-32 sm:pt-40 lg:pb-32 lg:pt-48"
    >
      {/* ── Background Effects ── */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Subtle animated gradient mesh */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] opacity-40 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, oklch(0.94 0.04 78), transparent 70%), radial-gradient(circle at 80% 20%, oklch(0.92 0.02 85), transparent 50%)",
          }}
        />
        {/* Grain texture handled by global body style */}
      </div>

      <div className="section-shell relative z-10">
        <div className="flex flex-col items-center text-center relative">
          {/* ── Decorative: forecast curve + data nodes (left) ── */}
          <motion.div
            className="absolute -left-4 xl:left-0 top-4 hidden lg:block pointer-events-none select-none"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease }}
          >
            <svg width="200" height="320" viewBox="0 0 200 320" fill="none">
              {/* Forecast trend line — ascending curve */}
              <motion.path
                d="M 10 260 C 40 240, 60 200, 80 180 S 120 100, 160 60"
                stroke="oklch(0.68 0.13 72 / 0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.8, ease }}
              />
              {/* Confidence band */}
              <path
                d="M 10 260 C 40 240, 60 200, 80 180 S 120 100, 160 60 L 160 80 C 120 120, 100 180, 80 200 S 40 250, 10 270 Z"
                fill="oklch(0.68 0.13 72 / 0.06)"
              />
              {/* Data points on curve */}
              {[
                [10, 260],
                [50, 220],
                [80, 180],
                [120, 110],
                [160, 60],
              ].map(([cx, cy], i) => (
                <motion.circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="3"
                  fill="oklch(0.68 0.13 72 / 0.35)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 1 + i * 0.15, ease }}
                />
              ))}
              {/* Horizontal threshold line */}
              <line
                x1="0"
                y1="180"
                x2="180"
                y2="180"
                stroke="oklch(0.60 0.20 25 / 0.12)"
                strokeWidth="1"
                strokeDasharray="6 4"
              />
              <text
                x="4"
                y="175"
                fill="oklch(0.60 0.20 25 / 0.20)"
                fontSize="8"
                fontFamily="sans-serif"
              >
                seuil critique
              </text>
            </svg>
          </motion.div>

          {/* ── Decorative: connected nodes network (right) ── */}
          <motion.div
            className="absolute -right-4 xl:right-0 top-12 hidden lg:block pointer-events-none select-none"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.7, ease }}
          >
            <svg width="180" height="280" viewBox="0 0 180 280" fill="none">
              {/* Connection lines between nodes */}
              {(
                [
                  ["140,40", "100,100"],
                  ["100,100", "160,160"],
                  ["100,100", "40,140"],
                  ["160,160", "120,230"],
                  ["40,140", "80,210"],
                  ["80,210", "120,230"],
                ] as const
              ).map(([from, to], i) => (
                <motion.line
                  key={i}
                  x1={from.split(",")[0]}
                  y1={from.split(",")[1]}
                  x2={to.split(",")[0]}
                  y2={to.split(",")[1]}
                  stroke="oklch(0.68 0.13 72 / 0.15)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.9 + i * 0.1, ease }}
                />
              ))}
              {/* Network nodes — sites/teams */}
              {[
                { cx: 140, cy: 40, r: 5, opacity: 0.3 },
                { cx: 100, cy: 100, r: 7, opacity: 0.4 },
                { cx: 160, cy: 160, r: 4, opacity: 0.25 },
                { cx: 40, cy: 140, r: 5, opacity: 0.3 },
                { cx: 80, cy: 210, r: 4, opacity: 0.25 },
                { cx: 120, cy: 230, r: 6, opacity: 0.35 },
              ].map((node, i) => (
                <motion.circle
                  key={i}
                  cx={node.cx}
                  cy={node.cy}
                  r={node.r}
                  fill={`oklch(0.68 0.13 72 / ${node.opacity})`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 + i * 0.1, ease }}
                />
              ))}
              {/* Pulse ring on central node */}
              <motion.circle
                cx="100"
                cy="100"
                r="7"
                fill="none"
                stroke="oklch(0.68 0.13 72 / 0.15)"
                strokeWidth="1"
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            </svg>
          </motion.div>

          {/* ── Kicker ── */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="mb-6 inline-flex items-center rounded-full border border-brass-200/60 bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brass-700 backdrop-blur-md"
          >
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brass-500 animate-pulse" />
            {hero.kicker}
          </motion.div>

          {/* ── Headline ── */}
          <motion.h1
            className="font-serif text-[clamp(3rem,6.5vw,5rem)] leading-[1.05] tracking-tight text-charcoal sm:max-w-4xl"
            variants={fadeUp}
            custom={0.1}
            initial="hidden"
            animate="visible"
          >
            {hero.headline}{" "}
            <span className="text-brass-600 block sm:inline italic">
              {hero.headlineHighlight}
            </span>
          </motion.h1>

          {/* ── Subtitle ── */}
          <motion.p
            className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
            variants={fadeUp}
            custom={0.2}
            initial="hidden"
            animate="visible"
          >
            {hero.subtitle}
          </motion.p>

          {/* ── CTA Buttons ── */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            variants={fadeUp}
            custom={0.3}
            initial="hidden"
            animate="visible"
          >
            <Link
              href={pilotHref}
              className="btn-primary rounded-full px-8 py-4 text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {hero.ctaPrimary}
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a
              href="#pilot"
              className="btn-ghost rounded-full px-8 py-4 text-base hover:bg-brass-50/50 transition-colors duration-300"
            >
              {hero.ctaSecondary}
              <ChevronDownIcon className="h-5 w-5 opacity-60" />
            </a>
          </motion.div>

          {/* ── Trust Indicators ── */}
          <motion.div
            className="mt-12 flex flex-col items-center gap-4 text-sm font-medium text-neutral-400"
            variants={fadeUp}
            custom={0.4}
            initial="hidden"
            animate="visible"
          >
            <p className="tracking-widest uppercase text-xs opacity-70">
              {locale === "fr" ? "Confiance accordée par" : "Trusted by"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0">
              {/* Replace with actual SVGs in production */}
              {hero.trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="text-lg font-serif italic text-charcoal"
                >
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Sunken Dashboard Preview ── */}
        <motion.div
          style={{ y }}
          className="mt-20 md:mt-24 pointer-events-none select-none"
        >
          <div className="sunken-container max-w-6xl mx-auto transform-gpu [transform:perspective(2000px)] lg:[transform:perspective(2000px)_rotateX(0.75deg)]">
            <div className="sunken-inner-bezel bg-white aspect-[16/10] relative overflow-hidden">
              {/* Dashboard preview video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/dashboard-poster.jpg"
                className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
              >
                <source src="/dashboard-preview.webm" type="video/webm" />
                <source src="/dashboard-preview.mp4" type="video/mp4" />
              </video>

              {/* Static poster fallback for prefers-reduced-motion */}
              <img
                src="/dashboard-poster.jpg"
                alt="Praedixa dashboard preview"
                className="absolute inset-0 w-full h-full object-cover hidden motion-reduce:block"
              />

              {/* Subtle shine reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
