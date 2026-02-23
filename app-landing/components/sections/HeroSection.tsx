"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { MagneticButton } from "../cinema/MagneticButton";
import { HeroSignalBoard } from "./HeroSignalBoard";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface HeroSectionProps {
  dict: Dictionary;
  locale: Locale;
}

const reveal = {
  hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      delay,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export function HeroSection({ dict, locale }: HeroSectionProps) {
  const { hero } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;
  const protocolHref = `/${locale}/pilot-protocol`;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-hidden pt-28 md:pt-32"
    >
      <div className="section-shell section-spacing">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.35fr_1fr] md:gap-14">
          <div>
            <motion.p
              variants={reveal}
              custom={0}
              initial="hidden"
              animate="visible"
              className="section-kicker"
            >
              <Sparkle size={12} weight="fill" />
              {hero.kicker}
            </motion.p>

            <motion.h1
              variants={reveal}
              custom={0.1}
              initial="hidden"
              animate="visible"
              className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-[var(--ink)] md:text-[3.75rem]"
            >
              {hero.headline}
              <span className="block text-[var(--accent-600)]">
                {hero.headlineHighlight}
              </span>
            </motion.h1>

            <motion.p
              variants={reveal}
              custom={0.2}
              initial="hidden"
              animate="visible"
              className="text-body mt-6"
            >
              {hero.subtitle}
            </motion.p>

            <motion.div
              variants={reveal}
              custom={0.3}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <MagneticButton as="a" href={pilotHref} className="btn-primary">
                <Sparkle size={15} weight="fill" />
                {hero.ctaPrimary}
                <ArrowUpRight size={16} weight="bold" />
              </MagneticButton>

              <Link href={protocolHref} className="btn-secondary">
                {hero.ctaSecondary}
                <ArrowDown size={14} weight="bold" />
              </Link>
            </motion.div>

            <motion.ul
              variants={reveal}
              custom={0.4}
              initial="hidden"
              animate="visible"
              className="mt-10 grid gap-2 text-sm text-[var(--ink-soft)] md:grid-cols-2"
            >
              {hero.trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="inline-flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
                >
                  <ShieldCheck
                    size={15}
                    weight="duotone"
                    className="mt-0.5 shrink-0 text-[var(--accent-600)]"
                  />
                  <span>{badge}</span>
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            variants={reveal}
            custom={0.22}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            <HeroSignalBoard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
