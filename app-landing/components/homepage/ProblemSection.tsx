"use client";

import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import { motion } from "framer-motion";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { MagneticActionLink } from "../shared/motion/MagneticActionLink";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface ProblemSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerPains = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const painItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function ProblemSection({ locale, dict }: ProblemSectionProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");
  const problem = dict.problem;
  const pains = Array.isArray(problem.pains) ? problem.pains : null;
  const signals = Array.isArray(problem.diagnostic.signals)
    ? problem.diagnostic.signals
    : null;

  if (!pains || !signals) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {problem.states.loadingTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.loadingBody}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
            <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (pains.length === 0 && signals.length === 0) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {problem.states.emptyTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.emptyBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  if (pains.length === 0 || signals.length === 0) {
    return (
      <SectionShell id="problem" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {problem.states.errorTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {problem.states.errorBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="problem" className="section-dark">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr] md:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker className="text-neutral-100">{problem.kicker}</Kicker>
            <h2
              className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-white md:text-6xl"
            >
              {problem.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {problem.subheading}
            </p>
            <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-brass-100/90">
              {problem.ctaHint}
            </p>
          </motion.div>

          <motion.div
            variants={staggerPains}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="mt-12 divide-y divide-white/10 border-y border-white/10"
          >
            {pains.map((pain, i) => (
              <motion.article
                key={pain.title}
                variants={painItem}
                className="grid grid-cols-1 gap-4 py-5 md:grid-cols-[4.4rem_1fr] md:gap-6"
              >
                <div
                  className={`flex items-center gap-2 ${i % 2 === 1 ? "md:translate-x-2" : ""}`}
                >
                  <WarningCircle
                    size={18}
                    weight="fill"
                    className="shrink-0 text-brass-300"
                  />
                  <span className="font-mono text-xs text-neutral-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className={i % 2 === 1 ? "md:translate-x-2" : ""}>
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {pain.title}
                  </h3>
                  <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-neutral-200">
                    {pain.description}
                  </p>
                  <p className="mt-3 text-sm font-medium text-brass-100">
                    {pain.consequence}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-neutral-300">
                    {pain.cost}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm md:p-7">
            <span className="text-xs font-semibold uppercase tracking-[0.09em] text-brass-100">
              {locale === "fr" ? "Salle des signaux" : "Signal room"}
            </span>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {problem.diagnostic.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-200">
              {problem.subheading}
            </p>
            <ul className="mt-6 list-none space-y-3.5 p-0">
              {signals.map((signal) => (
                <li
                  key={signal}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-200"
                >
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-400"
                  />
                  <PulseDot className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-brass-300" />
                  {signal}
                </li>
              ))}
            </ul>
            <ShimmerTrack className="mt-6" />
            <div className="mt-6">
              <MagneticActionLink
                href={pilotHref}
                label={problem.cta}
                className="border-white/15 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/[0.1]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
