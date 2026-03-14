"use client";

import { motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import {
  CheckBadgeIcon,
  ClockPulseIcon,
  CloseBadgeIcon,
  TargetRingIcon,
  TeamGridIcon,
} from "../shared/icons/MarketingIcons";
import { SPRING, VP } from "../../lib/animations/variants";
import { MagneticActionLink } from "../shared/motion/MagneticActionLink";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface PilotSectionProps {
  locale: Locale;
  dict: Dictionary;
}

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
  const pilotHref = getLocalizedPath(locale, "deployment");
  const pilot = dict.pilot;
  const statusLabels = Array.isArray(pilot.statusLabels)
    ? pilot.statusLabels
    : null;
  const includedItems = Array.isArray(pilot.included.items)
    ? pilot.included.items
    : null;
  const excludedItems = Array.isArray(pilot.excluded.items)
    ? pilot.excluded.items
    : null;
  const kpiItems = Array.isArray(pilot.kpis.items) ? pilot.kpis.items : null;
  const governanceItems = Array.isArray(pilot.governance.items)
    ? pilot.governance.items
    : null;
  const selectionItems = Array.isArray(pilot.selection.items)
    ? pilot.selection.items
    : null;

  if (
    !statusLabels ||
    !includedItems ||
    !excludedItems ||
    !kpiItems ||
    !governanceItems ||
    !selectionItems
  ) {
    return (
      <SectionShell id="pilot" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{pilot.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl">
            {locale === "fr" ? "Chargement de l'offre" : "Loading the offer"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {locale === "fr"
              ? "Assemblage des étapes de qualification en cours."
              : "Preparing qualification milestones."}
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

  if (includedItems.length === 0 && excludedItems.length === 0) {
    return (
      <SectionShell id="pilot" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{pilot.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl">
            {locale === "fr" ? "Offre vide" : "Empty offer"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {locale === "fr"
              ? "Ajoutez les livrables de l'offre pour activer cette section."
              : "Add the offer deliverables to activate this section."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="pilot" className="section-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker className="text-neutral-100">{pilot.kicker}</Kicker>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-white md:text-6xl">
          {pilot.heading}
        </h2>
        <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-200">
          {pilot.subheading}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {statusLabels.map((label, i) => (
            <span
              key={label}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                i === 0
                  ? "border border-amber-300/60 bg-amber-800/70 text-white"
                  : "border border-white/12 bg-white/5 text-neutral-200"
              }`}
            >
              <PulseDot className="h-1.5 w-1.5 bg-amber-300" />
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-[1.24fr_0.76fr] md:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={SPRING}
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm md:p-7">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
              <CheckBadgeIcon size={18} className="text-amber-300" />
              {pilot.included.title}
            </h3>
            <motion.ul
              variants={staggerList}
              initial="hidden"
              whileInView="visible"
              viewport={VP}
              className="mt-5 list-none space-y-3 p-0"
            >
              {includedItems.map((item) => (
                <motion.li
                  key={item}
                  variants={listItem}
                  className="m-0 flex items-start gap-2 text-sm text-neutral-200"
                >
                  <CheckBadgeIcon
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
            <ShimmerTrack className="mt-6" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-7">
            <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
              <CloseBadgeIcon size={18} className="text-neutral-200" />
              {pilot.excluded.title}
            </h3>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {excludedItems.map((item) => (
                <li
                  key={item}
                  className="m-0 flex items-start gap-2 text-sm text-neutral-200"
                >
                  <CloseBadgeIcon
                    size={16}
                    className="mt-0.5 shrink-0 text-neutral-200"
                  />
                  <span className="line-through">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mt-10 divide-y divide-white/10 border-y border-white/10"
      >
        {[
          { icon: TargetRingIcon, data: pilot.kpis },
          { icon: TeamGridIcon, data: pilot.governance },
          { icon: ClockPulseIcon, data: pilot.selection },
        ].map(({ icon: Icon, data }) => (
          <div
            key={data.title}
            className="grid grid-cols-1 gap-4 py-6 md:grid-cols-[0.9fr_1.1fr]"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Icon size={18} className="text-amber-300" />
              {data.title}
            </h3>
            <ul className="list-none space-y-1.5 p-0">
              {data.items.map((item) => (
                <li key={item} className="m-0 text-sm text-neutral-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.1 }}
        className="mt-8 border-l-2 border-amber-400/50 py-4 pl-6"
      >
        <h3 className="text-sm font-semibold text-neutral-100">
          {pilot.upcoming.title}
        </h3>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-neutral-200">
          {pilot.upcoming.description}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.15 }}
        className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end"
      >
        <MagneticActionLink
          href={pilotHref}
          label={pilot.ctaPrimary}
          wrapperClassName="sm:max-w-sm"
          className="border-white/15 bg-white/[0.07] text-white hover:border-white/25 hover:bg-white/[0.12]"
        />
        <p className="max-w-[46ch] text-xs leading-relaxed text-white/90">
          {pilot.ctaMeta}
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VP}
        transition={{ ...SPRING, delay: 0.2 }}
        className="mt-4 text-xs text-white/90"
      >
        {pilot.urgency}
      </motion.p>
    </SectionShell>
  );
}
