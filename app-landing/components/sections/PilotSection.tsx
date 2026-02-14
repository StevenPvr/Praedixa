"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { ArrowRightIcon, CheckIcon } from "../icons";
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
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-neutral-300" />
            ) : (
              <CheckIcon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  variant === "accent" ? "text-brass-500" : "text-brass-500"
                }`}
              />
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
          <h2 className="section-title mt-4">{pilot.heading}</h2>
          <p className="section-lead text-white">{pilot.subheading}</p>
        </motion.div>

        {/* 2x2 grid: included, excluded, KPIs, governance */}
        <motion.div
          className="mt-12 grid gap-4 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div className="craft-card-dark p-6" variants={staggerItem}>
            <PilotList
              title={pilot.included.title}
              items={pilot.included.items}
              variant="accent"
            />
          </motion.div>
          <motion.div className="craft-card-dark p-6" variants={staggerItem}>
            <PilotList
              title={pilot.excluded.title}
              items={pilot.excluded.items}
              variant="excluded"
            />
          </motion.div>
          <motion.div className="craft-card-dark p-6" variants={staggerItem}>
            <PilotList title={pilot.kpis.title} items={pilot.kpis.items} />
          </motion.div>
          <motion.div className="craft-card-dark p-6" variants={staggerItem}>
            <PilotList
              title={pilot.governance.title}
              items={pilot.governance.items}
            />
          </motion.div>
        </motion.div>

        {/* Urgency + CTA */}
        <motion.div
          className="mt-10 flex flex-col items-center text-center"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="text-sm text-white">{pilot.urgency}</p>
          <Link href={pilotHref} className="btn-primary mt-6">
            {pilot.ctaPrimary}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-2xs text-white">{pilot.ctaMeta}</p>
        </motion.div>
      </div>
    </section>
  );
}
