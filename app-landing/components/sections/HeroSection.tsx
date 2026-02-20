"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon, ChevronDownIcon } from "../icons";
import { TextScramble } from "../cinema/TextScramble";
import { MagneticButton } from "../cinema/MagneticButton";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

const ease = [0.16, 1, 0.3, 1] as const;

const blurIn = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, delay, ease },
  }),
};

interface HeroSectionProps {
  dict: Dictionary;
  locale: Locale;
}

export const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(
  function HeroSection({ dict, locale }, contentRef) {
    const { hero } = dict;
    const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
    const protocolHref = `/${locale}/pilot-protocol`;

    return (
      <div className="relative overflow-hidden bg-transparent pb-24 pt-32 sm:pt-40 lg:pb-32 lg:pt-48">
        <div className="section-shell relative z-10">
          {/* Dark radial backdrop to ensure text readability over particles */}
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.08 0.02 247 / 0.7) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div
            ref={contentRef}
            className="relative z-10 flex flex-col items-center text-center"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Kicker with shimmer */}
            <motion.div
              variants={blurIn}
              custom={0}
              initial="hidden"
              animate="visible"
              className="mb-6 inline-flex items-center rounded-full border border-white/40 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brass-100 backdrop-blur-md"
            >
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-brass-500 animate-pulse" />
              <span className="kicker-shimmer bg-clip-text">{hero.kicker}</span>
            </motion.div>

            {/* Headline with TextScramble */}
            <div className="font-serif text-[clamp(3rem,6.5vw,5rem)] leading-[1.05] tracking-tight text-white sm:max-w-4xl">
              <TextScramble
                text={hero.headline}
                as="h1"
                className="font-serif text-[clamp(3rem,6.5vw,5rem)] leading-[1.05] tracking-tight text-white"
                style={{ textShadow: "0 2px 16px oklch(0.05 0.02 247 / 0.8)" }}
                delay={200}
              />{" "}
              <TextScramble
                text={hero.headlineHighlight}
                as="span"
                className="text-brass-300 block sm:inline italic"
                delay={800}
                flashOnComplete
              />
            </div>

            {/* Subtitle */}
            <motion.p
              className="mt-8 max-w-2xl text-lg leading-relaxed text-white sm:text-xl"
              style={{ textShadow: "0 1px 12px oklch(0.05 0.02 247 / 0.6)" }}
              variants={blurIn}
              custom={0.5}
              initial="hidden"
              animate="visible"
            >
              {hero.subtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
              variants={blurIn}
              custom={0.7}
              initial="hidden"
              animate="visible"
            >
              <MagneticButton
                as="a"
                href={pilotHref}
                className="btn-primary rounded-full px-8 py-4 text-base shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {hero.ctaPrimary}
                <ArrowRightIcon className="h-5 w-5" />
              </MagneticButton>
              <Link
                href={protocolHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 bg-white/10 px-8 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-white/20 hover:border-[oklch(0.7_0.15_247_/_0.6)]"
              >
                {hero.ctaSecondary}
                <ChevronDownIcon className="h-5 w-5 opacity-75" />
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              className="mt-12 flex flex-col items-center gap-4 text-sm font-medium text-white"
              variants={blurIn}
              custom={0.9}
              initial="hidden"
              animate="visible"
            >
              <p className="tracking-widest uppercase text-xs opacity-80">
                {locale === "fr"
                  ? "Engagements du programme"
                  : "Program commitments"}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
                {hero.trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/30 bg-white/12 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  },
);
