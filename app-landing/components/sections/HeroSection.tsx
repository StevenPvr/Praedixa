"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRightIcon, ChevronDownIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

/* ═══════════════════════════════════════════════════
   REMOTION PLAYER — Lazy loaded, no SSR
   ═══════════════════════════════════════════════════ */

const CalibrePlayer = dynamic(() => import("../hero/CalibrePlayer"), {
  ssr: false,
  loading: () => <CalibrePoster locale="fr" />,
});

/** Static SVG poster shown while Remotion loads + on mobile */
function CalibrePoster({ locale = "fr" }: { locale?: Locale }) {
  const BRASS = "#b08d57";
  const STAGE_TEXT =
    locale === "fr"
      ? ["Signal", "Arbitrage", "Décision", "Preuve"]
      : ["Signal", "Trade-off", "Decision", "Proof"];
  const HORIZONS =
    locale === "fr"
      ? ["J+14", "J+7", "J+3", "J+0"]
      : ["D+14", "D+7", "D+3", "D+0"];
  const point = (radius: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: 240 + radius * Math.cos(rad),
      y: 240 + radius * Math.sin(rad),
    };
  };
  const arcPath = (radius: number, startAngle: number, endAngle: number) => {
    const start = point(radius, endAngle);
    const end = point(radius, startAngle);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${end.x} ${end.y}`;
  };

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-full opacity-70">
      <svg viewBox="0 0 480 480" className="h-full w-full">
        <rect width="480" height="480" fill="oklch(0.08 0.005 55)" />
        <circle
          cx="240"
          cy="240"
          r="205"
          fill="none"
          stroke="oklch(0.35 0.01 65 / 0.15)"
          strokeWidth="24"
        />
        <circle
          cx="240"
          cy="240"
          r="182"
          fill="oklch(0.17 0.015 62)"
          opacity="0.65"
        />
        <circle
          cx="240"
          cy="240"
          r="204"
          fill="none"
          stroke={BRASS}
          strokeWidth="0.8"
          opacity="0.35"
        />

        {STAGE_TEXT.map((label, i) => {
          const start = -90 + i * 90 + 7;
          const end = -90 + (i + 1) * 90 - 7;
          const textPos = point(228, start + 38);
          return (
            <g key={label}>
              <path
                d={arcPath(204, start, end)}
                fill="none"
                stroke={BRASS}
                strokeWidth="4"
                strokeLinecap="round"
                opacity={0.35}
              />
              <text
                x={textPos.x}
                y={textPos.y}
                fill={BRASS}
                fontFamily="Cormorant Garamond, serif"
                fontSize="11.5"
                textAnchor="middle"
                opacity="0.82"
              >
                {label}
              </text>
            </g>
          );
        })}

        {HORIZONS.map((label, i) => {
          const pos = point(220, -90 + i * 90);
          return (
            <text
              key={label}
              x={pos.x}
              y={pos.y}
              fill={BRASS}
              fontFamily="Manrope, sans-serif"
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.08em"
              textAnchor="middle"
              opacity="0.8"
            >
              {label}
            </text>
          );
        })}

        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const outerR = 206;
          const innerR = isMajor ? 191 : 198;
          const r = (v: number) => Math.round(v * 100) / 100;
          return (
            <line
              key={i}
              x1={r(240 + outerR * Math.cos(angle))}
              y1={r(240 + outerR * Math.sin(angle))}
              x2={r(240 + innerR * Math.cos(angle))}
              y2={r(240 + innerR * Math.sin(angle))}
              stroke={BRASS}
              strokeWidth={isMajor ? 1.5 : 0.4}
              opacity={isMajor ? 0.5 : 0.2}
              strokeLinecap="round"
            />
          );
        })}
        <circle
          cx="240"
          cy="240"
          r="52"
          fill="none"
          stroke={BRASS}
          strokeWidth="0.6"
          opacity="0.22"
        />
        <text
          x="240"
          y="236"
          textAnchor="middle"
          fill="oklch(0.78 0.1 76)"
          fontFamily="Cormorant Garamond, serif"
          fontSize="15"
          letterSpacing="0.02em"
        >
          {locale === "fr" ? "Calibre Praedixa" : "Praedixa Calibre"}
        </text>
        <text
          x="240"
          y="252"
          textAnchor="middle"
          fill="oklch(0.62 0.01 68)"
          fontFamily="Manrope, sans-serif"
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="0.18em"
          opacity="0.85"
        >
          {locale === "fr" ? "TEMPS DE DÉCISION" : "TIME TO DECISION"}
        </text>
      </svg>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, transparent 42%, oklch(0.13 0.008 55) 74%)",
        }}
      />
    </div>
  );
}

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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
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

  return (
    <section
      id="hero"
      data-testid="hero-section"
      className="relative overflow-hidden bg-ink pb-8 pt-20 sm:pt-24 lg:pb-0 lg:pt-26"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 60% 45%, oklch(0.20 0.04 72 / 0.4), transparent)," +
            "radial-gradient(ellipse 40% 60% at 20% 20%, oklch(0.18 0.02 55 / 0.3), transparent)",
        }}
      />

      <div className="section-shell relative">
        <div className="py-2 lg:py-5">
          <div className="w-full text-center">
            <motion.p
              className="inline-flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.2em] text-brass-400"
              variants={fadeUp}
              custom={0}
              initial="hidden"
              animate="visible"
            >
              <span
                className="inline-block h-px w-5 bg-brass-500"
                aria-hidden="true"
              />
              {hero.kicker}
            </motion.p>

            <motion.h1
              className="mt-6 font-serif text-[clamp(2.5rem,5.5vw,4.25rem)] leading-[1.08] tracking-[-0.02em] text-white"
              variants={fadeUp}
              custom={0.08}
              initial="hidden"
              animate="visible"
            >
              {hero.headline}{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-brass-300">
                  {hero.headlineHighlight}
                </span>
                <motion.span
                  className="absolute bottom-1 left-0 z-0 h-[0.12em] rounded-full bg-brass-600/30"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, delay: 0.7, ease }}
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            <motion.p
              className="mt-5 text-base leading-[1.75] text-neutral-400"
              variants={fadeUp}
              custom={0.16}
              initial="hidden"
              animate="visible"
            >
              {hero.subtitle}
            </motion.p>
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-stretch lg:gap-12">
            <div className="flex w-full flex-col lg:min-h-[560px] lg:justify-between">
              <motion.ul
                className="grid items-start gap-3 sm:grid-cols-3 lg:mt-5 lg:grid-cols-1 lg:gap-7 lg:translate-y-3"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {hero.bullets.map((bullet, index) => (
                  <motion.li
                    key={bullet.text}
                    className={`rounded-lg border border-brass-900/35 bg-black/20 px-4 py-3 ${index > 0 ? "lg:mt-4" : ""}`}
                    variants={staggerChild}
                  >
                    <span className="block font-serif text-lg tracking-tight text-brass-300">
                      {bullet.metric}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-400">
                      {bullet.text}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-8 lg:mt-0 lg:translate-y-0">
                <motion.div
                  className="flex flex-wrap items-center gap-4"
                  variants={fadeUp}
                  custom={0.5}
                  initial="hidden"
                  animate="visible"
                >
                  <Link href={pilotHref} className="btn-primary">
                    {hero.ctaPrimary}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <a
                    href="#pilot"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-5 py-3.5 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:text-white"
                  >
                    {hero.ctaSecondary}
                    <ChevronDownIcon className="h-4 w-4" />
                  </a>
                </motion.div>

                <motion.p
                  className="mt-4 text-2xs tracking-wide text-neutral-600"
                  variants={fadeUp}
                  custom={0.6}
                  initial="hidden"
                  animate="visible"
                >
                  {hero.ctaMeta}
                </motion.p>
              </div>
            </div>

            <div className="relative">
              <motion.div
                className="relative hidden lg:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
              >
                <div
                  className="relative ml-auto aspect-square max-w-[560px] overflow-hidden rounded-full"
                  style={{
                    maskImage:
                      "radial-gradient(circle at center, black 62%, transparent 74%)",
                    WebkitMaskImage:
                      "radial-gradient(circle at center, black 62%, transparent 74%)",
                  }}
                >
                  <Suspense fallback={<CalibrePoster locale={locale} />}>
                    <CalibrePlayer locale={locale} />
                  </Suspense>
                </div>
              </motion.div>

              <motion.div
                className="mx-auto mt-1 max-w-[320px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ duration: 1, delay: 0.45 }}
              >
                <CalibrePoster locale={locale} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust strip — case-back engravings ── */}
      <motion.div
        className="mt-7 border-t border-white/[0.06] bg-white/[0.015]"
        variants={fadeUp}
        custom={0.7}
        initial="hidden"
        animate="visible"
      >
        <div className="section-shell flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {hero.trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500"
              >
                <span
                  className="h-1 w-1 rounded-full bg-brass-600"
                  aria-hidden="true"
                />
                {badge}
              </span>
            ))}
          </div>
          <span className="text-2xs font-semibold tracking-[0.15em] text-brass-700">
            {locale === "fr"
              ? "COHORTE LIMITÉE · 8 ENTREPRISES"
              : "LIMITED COHORT · 8 COMPANIES"}
          </span>
        </div>
      </motion.div>
    </section>
  );
}
