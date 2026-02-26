"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, XCircle, Target, Users, ClockCountdown } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";

interface PilotSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerList = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function PilotSection({ locale, dict }: PilotSectionProps) {
  const pilotHref = getLocalizedPath(locale, "pilot");

  return (
    <SectionShell id="pilot" className="section-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker className="text-neutral-100">{dict.pilot.kicker}</Kicker>
        <h2 className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-5xl" style={{ lineHeight: 1.05 }}>
          {dict.pilot.heading}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-300">
          {dict.pilot.subheading}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {dict.pilot.statusLabels.map((label, i) => (
            <span
              key={label}
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                i === 0
                  ? "border border-brass-400/40 bg-brass-800 text-white"
                  : "border border-white/10 bg-white/5 text-neutral-400"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Included / Excluded — split layout with border-t, no cards */}
      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={SPRING}
        >
          <div className="border-t-2 border-brass-400/50 pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle size={18} weight="fill" className="text-brass-300" />
              {dict.pilot.included.title}
            </h3>
            <motion.ul
              variants={staggerList}
              initial="hidden"
              whileInView="visible"
              viewport={VP}
              className="mt-4 list-none space-y-2.5 p-0"
            >
              {dict.pilot.included.items.map((item) => (
                <motion.li
                  key={item}
                  variants={listItem}
                  className="m-0 flex items-start gap-2 text-sm text-neutral-300"
                >
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-400"
                  />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          <div className="border-t border-white/10 pt-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
              <XCircle size={18} weight="fill" className="text-neutral-500" />
              {dict.pilot.excluded.title}
            </h3>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {dict.pilot.excluded.items.map((item) => (
                <li
                  key={item}
                  className="m-0 flex items-start gap-2 text-sm text-neutral-500"
                >
                  <XCircle
                    size={16}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-neutral-600"
                  />
                  <span className="line-through">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      {/* KPIs / Governance / Selection — vertical divide-y, no 3-col cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mt-12 divide-y divide-white/10"
      >
        {[
          { icon: Target, data: dict.pilot.kpis },
          { icon: Users, data: dict.pilot.governance },
          { icon: ClockCountdown, data: dict.pilot.selection },
        ].map(({ icon: Icon, data }) => (
          <div key={data.title} className="grid grid-cols-1 gap-4 py-6 first:pt-0 md:grid-cols-[1fr_2fr]">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Icon size={18} weight="fill" className="text-brass-300" />
              {data.title}
            </h3>
            <ul className="list-none space-y-1.5 p-0">
              {data.items.map((item) => (
                <li key={item} className="m-0 text-sm text-neutral-300">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>

      {/* Upcoming — border-l accent instead of card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mt-8 border-l-2 border-brass-400/50 pl-6 py-4"
      >
        <h3 className="text-sm font-semibold text-neutral-100">
          {dict.pilot.upcoming.title}
        </h3>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-neutral-300">
          {dict.pilot.upcoming.description}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.15 }}
        className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
      >
        <Link
          href={pilotHref}
          className="btn-primary-gradient inline-flex items-center gap-2 rounded-lg px-6 py-3.5 text-sm font-semibold text-white no-underline transition-all duration-150 active:scale-[0.98] active:-translate-y-[1px]"
        >
          {dict.pilot.ctaPrimary}
          <ArrowRight size={16} weight="bold" />
        </Link>
        <p className="text-xs text-neutral-400/70">{dict.pilot.ctaMeta}</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.2 }}
        className="mt-4 text-xs text-neutral-400/70"
      >
        {dict.pilot.urgency}
      </motion.p>
    </SectionShell>
  );
}
