"use client";

import Image from "next/image";
import Link from "next/link";
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

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

const headlineReveal = {
  hidden: { opacity: 0, y: 32, filter: "blur(10px)" },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ...SPRING, delay },
  }),
};

const staggerBadges = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.9 },
  },
};

const badgeItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

const staggerBullets = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.45 },
  },
};

const bulletItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

export function HeroSection({ locale, dict }: HeroSectionProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const incubatorLabel =
    locale === "fr"
      ? "Incubé à Euratechnologies — verticale IA/Data"
      : "Incubated at Euratechnologies — AI/Data track";

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_50%,var(--brass-50)_0%,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 pb-20 pt-20 sm:px-6 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16 md:pb-28 md:pt-28 lg:px-8">
        <div className="max-w-2xl">
          <motion.div
            custom={0}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
          >
            <span className="inline-block rounded-full border border-brass-200 bg-brass-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-brass-700">
              {dict.hero.kicker}
            </span>
          </motion.div>

          <motion.h1
            custom={0.1}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
            className="mt-7 text-4xl font-bold tracking-tighter text-ink md:text-6xl"
            style={{ lineHeight: 1 }}
          >
            {dict.hero.headline}{" "}
            <span className="text-brass">{dict.hero.headlineHighlight}</span>
          </motion.h1>

          <motion.p
            custom={0.25}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
            className="mt-6 max-w-[58ch] text-base leading-relaxed text-neutral-500"
          >
            {dict.hero.subtitle}
          </motion.p>

          <motion.div
            variants={staggerBullets}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-wrap gap-8"
          >
            {dict.hero.bullets.map((bullet) => (
              <motion.div
                key={bullet.metric}
                variants={bulletItem}
                className="flex flex-col"
              >
                <span className="text-2xl font-bold tracking-tight text-brass">
                  {bullet.metric}
                </span>
                <span className="text-sm text-neutral-500">{bullet.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            custom={0.6}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              href={pilotHref}
              className="btn-primary-gradient inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] active:-translate-y-[1px]"
            >
              {dict.hero.ctaPrimary}
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              href={`/${locale}/pilot-protocol`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3.5 text-sm font-semibold text-ink no-underline transition-all duration-150 hover:border-border-hover hover:bg-neutral-50 active:scale-[0.98] active:-translate-y-[1px]"
            >
              {dict.hero.ctaSecondary}
            </Link>
          </motion.div>

          <motion.p
            custom={0.7}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
            className="mt-4 text-xs text-neutral-400"
          >
            {dict.hero.ctaMeta}
          </motion.p>

          <motion.div
            custom={0.75}
            variants={headlineReveal}
            initial="hidden"
            animate="visible"
            className="mt-5"
          >
            <div className="inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brass-200 bg-white/90 px-3.5 py-2.5 shadow-[0_10px_24px_-18px_rgba(17,24,39,0.7)]">
              <Image
                src="/partners/euratechnologies-logo-black.svg"
                alt="Logo Euratechnologies"
                width={150}
                height={28}
                className="h-5 w-auto md:h-6"
                priority
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-600 md:text-xs">
                {incubatorLabel}
              </span>
            </div>
          </motion.div>
        </div>

        <div className="relative hidden md:block">
          <HeroBentoPreview />
        </div>
      </div>

      <motion.div
        variants={staggerBadges}
        initial="hidden"
        animate="visible"
        className="relative border-t border-border-subtle bg-neutral-50/50 py-5"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 sm:px-6 lg:px-8">
          {dict.hero.trustBadges.map((badge) => (
            <motion.span
              key={badge}
              variants={badgeItem}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400"
            >
              <ShieldCheck size={14} weight="fill" className="text-brass-300" />
              {badge}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
