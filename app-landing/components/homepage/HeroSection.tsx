"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getLocalizedPath } from "../../lib/i18n/config";
import { HeroBentoPreview } from "./HeroBentoPreview";

interface HeroSectionProps {
  locale: Locale;
  dict: Dictionary;
}

/* ── Framer Motion orchestration ─────────────────────────── */

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/** Parent stagger — left-column children enter in cascade */
const staggerCopy = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

/** Child reveal — blur-lift with spring physics */
const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: SPRING,
  },
};

/* ── Component ───────────────────────────────────────────── */

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const incubatorLabel =
    locale === "fr"
      ? "INCUBÉ À EURATECHNOLOGIES — VERTICALE IA/DATA"
      : "INCUBATED AT EURATECHNOLOGIES — AI/DATA TRACK";

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navigationEntry?.type === "reload";

    if (isReload) {
      if (window.location.hash) {
        const cleanUrl = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, "", cleanUrl);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  return (
    <section className="relative overflow-hidden bg-white">
      {/* ── Subtle full-surface data background ───────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <svg
          viewBox="0 0 1440 820"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <pattern
              id="hero-data-grid-major"
              width="96"
              height="96"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M96 0H0V96"
                fill="none"
                stroke="var(--praedixa-hero-blue-aurora-2)"
                strokeWidth="0.9"
                opacity="0.55"
              />
            </pattern>
            <pattern
              id="hero-data-grid-minor"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M24 0H0V24"
                fill="none"
                stroke="var(--praedixa-hero-blue-aurora-3)"
                strokeWidth="0.45"
                opacity="0.5"
              />
            </pattern>
            <pattern
              id="hero-data-dots"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2.2" cy="2.2" r="1.28" fill="var(--praedixa-hero-blue-mid)" />
            </pattern>
            <linearGradient id="hero-card-fade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--praedixa-hero-blue-aurora-1)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--praedixa-hero-blue-aurora-3)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <rect width="1440" height="820" fill="url(#hero-data-grid-major)" opacity="0.08" />
          <rect width="1440" height="820" fill="url(#hero-data-grid-minor)" opacity="0.045" />
          <rect width="1440" height="820" fill="url(#hero-data-dots)" opacity="0.13" />

          <g opacity="0.62" transform="translate(0 -54)">
            <rect
              x="900"
              y="72"
              width="452"
              height="250"
              rx="26"
              fill="url(#hero-card-fade)"
              stroke="var(--praedixa-hero-blue-aurora-2)"
              strokeWidth="1.2"
            />
            <path
              d="M934 132H1320M934 176H1320M934 220H1320M934 264H1320"
              stroke="var(--praedixa-hero-blue-aurora-2)"
              strokeWidth="0.85"
              opacity="0.6"
            />
            <path
              d="M950 254L1028 226L1098 234L1162 198L1234 208L1316 170"
              fill="none"
              stroke="var(--praedixa-hero-blue-mid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g fill="var(--praedixa-hero-blue-mid)">
              <circle cx="950" cy="254" r="2.6" />
              <circle cx="1028" cy="226" r="2.6" />
              <circle cx="1098" cy="234" r="2.6" />
              <circle cx="1162" cy="198" r="2.6" />
              <circle cx="1234" cy="208" r="2.6" />
              <circle cx="1316" cy="170" r="2.6" />
            </g>
            <g fill="var(--praedixa-hero-blue-aurora-2)" opacity="0.8">
              <rect x="950" y="280" width="18" height="22" rx="4" />
              <rect x="976" y="270" width="18" height="32" rx="4" />
              <rect x="1002" y="260" width="18" height="42" rx="4" />
              <rect x="1028" y="266" width="18" height="36" rx="4" />
            </g>
          </g>

          <g opacity="0.56">
            <rect
              x="72"
              y="506"
              width="520"
              height="238"
              rx="26"
              fill="url(#hero-card-fade)"
              stroke="var(--praedixa-hero-blue-aurora-2)"
              strokeWidth="1.15"
            />
            <path
              d="M108 690L188 666L262 674L334 638L406 650L482 612L554 624"
              fill="none"
              stroke="var(--praedixa-hero-blue-mid)"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M108 716H556"
              stroke="var(--praedixa-hero-blue-aurora-2)"
              strokeWidth="0.8"
              opacity="0.75"
            />
            <g fill="var(--praedixa-hero-blue-aurora-2)" opacity="0.72">
              <rect x="110" y="650" width="16" height="42" rx="4" />
              <rect x="132" y="636" width="16" height="56" rx="4" />
              <rect x="154" y="646" width="16" height="46" rx="4" />
              <rect x="176" y="628" width="16" height="64" rx="4" />
            </g>
            <g fill="var(--praedixa-hero-blue-mid)">
              <circle cx="188" cy="666" r="2.3" />
              <circle cx="262" cy="674" r="2.3" />
              <circle cx="334" cy="638" r="2.3" />
              <circle cx="406" cy="650" r="2.3" />
              <circle cx="482" cy="612" r="2.3" />
            </g>
          </g>
        </svg>
      </div>

      {/* ── Full viewport fit under sticky header (74px) ─── */}
      <div className="relative mx-auto grid h-[calc(100dvh-4.625rem)] w-full max-w-7xl grid-rows-[1fr_auto] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8 lg:pb-6 lg:pt-6">
        {/* Main row */}
        <div className="grid min-h-0 items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
          {/* Left column */}
          <motion.div
            variants={staggerCopy}
            initial="hidden"
            animate="visible"
            className="min-w-0"
          >
            {/* Kicker */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brass-200/85 bg-brass-50/75 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {dict.hero.kicker}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="mt-4 text-[2.2rem] font-bold leading-[0.95] tracking-[-0.03em] text-ink sm:text-[2.9rem] md:text-[3.35rem] lg:text-[3.9rem]"
            >
              {dict.hero.headline}{" "}
              <span className="text-brass">{dict.hero.headlineHighlight}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="mt-3 max-w-[62ch] text-sm leading-relaxed text-neutral-600 sm:text-base"
            >
              {dict.hero.subtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3"
            >
              <Link
                href={pilotHref}
                className="btn-primary-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition-all duration-200 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaPrimary}
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href={`/${locale}/pilot-protocol`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300/90 bg-white/95 px-5 py-3 text-sm font-semibold text-ink no-underline transition-all duration-200 hover:border-neutral-400 hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </motion.div>

            {/* Metric chips */}
            <motion.div
              variants={fadeUp}
              className="mt-4 grid max-w-[62ch] grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2"
            >
              {dict.hero.bullets.map((bullet) => (
                <span
                  key={bullet.metric}
                  className="inline-flex min-w-0 items-baseline gap-1.5 rounded-full border border-neutral-200/75 bg-white/95 px-3 py-1.5 text-[11px] leading-none shadow-[0_10px_20px_-18px_rgba(15,23,42,0.9)]"
                >
                  <strong className="shrink-0 font-bold text-brass">{bullet.metric}</strong>
                  <span className="truncate text-neutral-500">{bullet.text}</span>
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.35 }}
            className="relative hidden min-h-0 lg:block"
          >
            <div className="mx-auto w-full max-w-[540px] rounded-[2rem] border border-neutral-200/70 bg-white/88 p-3 shadow-[0_28px_60px_-36px_rgba(2,6,23,0.9)] backdrop-blur-sm">
              <HeroBentoPreview />
            </div>
          </motion.div>
        </div>

        {/* Bottom trust rail */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.85 }}
          className="relative mt-4"
        >
          <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-neutral-200/75 bg-white/88 px-3 py-2.5 shadow-[0_18px_30px_-28px_rgba(2,6,23,0.9)] backdrop-blur-sm sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Euratechnologies badge */}
            <div className="inline-flex shrink-0 items-center gap-x-2 rounded-xl border border-brass-200/65 bg-brass-50/35 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Image
                src="/partners/euratechnologies-logo-black.svg"
                alt="Logo Euratechnologies"
                width={150}
                height={28}
                className="h-4 w-auto"
                priority
              />
              <span className="border-l border-brass-200/60 pl-2 text-[10px] font-semibold tracking-[0.03em] text-neutral-500">
                {incubatorLabel}
              </span>
            </div>

            {/* Trust badges */}
            <div className="hidden h-4 w-px bg-neutral-200/70 lg:block" />
            <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 xl:grid-cols-3">
              {dict.hero.trustBadges.map((badge, index) => (
                <li
                  key={badge}
                  className={`${index > 2 ? "hidden sm:flex" : "flex"} items-center gap-1.5 text-[10px] leading-snug text-neutral-500`}
                >
                  <ShieldCheck
                    size={11}
                    weight="fill"
                    className="shrink-0 text-brass-400"
                  />
                  <span>{badge}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
