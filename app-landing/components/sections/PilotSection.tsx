"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { ArrowRightIcon, CheckIcon } from "../icons";
import { TextReveal } from "../cinema/TextReveal";
import { SpotlightCard } from "../cinema/SpotlightCard";
import { MagneticButton } from "../cinema/MagneticButton";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";

interface PilotSectionProps {
  dict: Dictionary;
  locale: Locale;
}

function PilotList({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: string[];
  variant?: "default" | "excluded" | "accent";
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm">
            {variant === "excluded" ? (
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-border" />
            ) : (
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brass-500" />
            )}
            <span className="text-white">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PilotSection({ dict, locale }: PilotSectionProps) {
  const { pilot } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  return (
    <section id="pilot" className="section-dark section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker text-white">{pilot.kicker}</p>
          <TextReveal
            text={pilot.heading}
            as="h2"
            className="section-title mt-4 text-white"
          />
          <p className="section-lead text-white">{pilot.subheading}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {pilot.statusLabels.map((label, index) => (
              <span
                key={label}
                className={`rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide ${
                  index === 0
                    ? "border-emerald-300/60 bg-emerald-400/14 text-emerald-100"
                    : index === 1
                      ? "border-amber-300/60 bg-amber-400/14 text-amber-100"
                      : "border-sky-300/60 bg-sky-400/14 text-sky-100"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <PilotList
                title={pilot.included.title}
                items={pilot.included.items}
                variant="accent"
              />
            </SpotlightCard>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <PilotList
                title={pilot.excluded.title}
                items={pilot.excluded.items}
                variant="excluded"
              />
            </SpotlightCard>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <PilotList title={pilot.kpis.title} items={pilot.kpis.items} />
            </SpotlightCard>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <PilotList
                title={pilot.governance.title}
                items={pilot.governance.items}
              />
            </SpotlightCard>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-4 grid gap-4 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <PilotList
                title={pilot.selection.title}
                items={pilot.selection.items}
              />
            </SpotlightCard>
          </motion.div>
          <motion.div variants={staggerItem}>
            <SpotlightCard
              variant="dark"
              className="p-6 h-full"
              spotlightColor="oklch(0.63 0.165 246 / 0.08)"
            >
              <h3 className="text-sm font-semibold text-white">
                {pilot.upcoming.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white">
                {pilot.upcoming.description}
              </p>
            </SpotlightCard>
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-10 flex flex-col items-center text-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="text-sm text-white">{pilot.urgency}</p>
          <MagneticButton
            as="a"
            href={pilotHref}
            className="btn-primary mt-6 px-10 py-4 text-base animate-glow-pulse"
          >
            {pilot.ctaPrimary}
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </MagneticButton>
          <p className="mt-3 text-2xs text-white">{pilot.ctaMeta}</p>
        </motion.div>
      </div>
    </section>
  );
}
