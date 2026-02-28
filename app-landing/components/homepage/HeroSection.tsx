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
    <section className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-white">
      {/* ── Subtle radial gradient accents ────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-[5%] top-[10%] h-[70%] w-[55%] rounded-full bg-brass-50 blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[5%] h-[50%] w-[40%] rounded-full bg-neutral-100 blur-[120px]" />
      </div>

      {/* ── Main hero content ────────────────────────────── */}
      <div className="relative flex flex-1 items-center min-h-0">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-[1.15fr_1fr] md:gap-14 lg:gap-20 lg:px-8">
          {/* Left column — copy */}
          <motion.div
            variants={staggerCopy}
            initial="hidden"
            animate="visible"
          >
            {/* Kicker badge with live dot */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brass-200 bg-brass-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-brass-700">
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
              className="mt-6 text-4xl font-bold leading-none tracking-tighter text-ink sm:text-5xl md:text-[3.25rem] lg:text-6xl"
            >
              {dict.hero.headline}{" "}
              <span className="text-brass">
                {dict.hero.headlineHighlight}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-[52ch] text-base leading-relaxed text-neutral-500"
            >
              {dict.hero.subtitle}
            </motion.p>

            {/* CTAs — tactile :active feedback */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                href={pilotHref}
                className="btn-primary-gradient inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-brass-glow transition-all duration-150 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaPrimary}
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href={`/${locale}/pilot-protocol`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3.5 text-sm font-semibold text-ink no-underline transition-all duration-150 hover:border-border-hover hover:bg-neutral-50 active:-translate-y-[1px] active:scale-[0.98]"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </motion.div>

            {/* Metric pills */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap gap-2"
            >
              {dict.hero.bullets.map((bullet) => (
                <span
                  key={bullet.metric}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-brass-100/80 bg-white/80 px-3 py-1.5 text-[11px] leading-none backdrop-blur-sm"
                >
                  <strong className="font-bold text-brass">
                    {bullet.metric}
                  </strong>
                  <span className="text-neutral-400">{bullet.text}</span>
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column — bento preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.35 }}
            className="relative hidden md:block"
          >
            <HeroBentoPreview />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom: Trust rail ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.85 }}
        className="relative shrink-0 pb-4 pt-2"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-2 rounded-2xl border border-border-subtle/80 bg-white/75 px-3 py-2.5 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:px-4 md:grid-cols-[auto_1fr] md:items-center md:gap-4">
            {/* Euratechnologies badge */}
            <div className="inline-flex shrink-0 items-center gap-x-2.5 rounded-xl border border-brass-200/80 bg-brass-50/40 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Image
                src="/partners/euratechnologies-logo-black.svg"
                alt="Logo Euratechnologies"
                width={150}
                height={28}
                className="h-4 w-auto md:h-5"
                priority
              />
              <span className="border-l border-brass-200/70 pl-2.5 text-[10px] font-semibold tracking-[0.03em] [word-spacing:0.12em] text-neutral-600 md:pl-3 md:text-[11px]">
                {incubatorLabel}
              </span>
            </div>

            {/* Trust badges — one point per line */}
            <ul className="grid w-full min-w-0 grid-cols-1 gap-y-0.5 md:border-l md:border-border-subtle/70 md:pl-4">
              {dict.hero.trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="flex items-start gap-1.5 text-[10px] leading-[1.2] text-neutral-500 md:whitespace-nowrap"
                >
                  <ShieldCheck
                    size={11}
                    weight="fill"
                    className="mt-[1px] shrink-0 text-brass-400"
                  />
                  <span>{badge}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
