"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Circle,
  Clock,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { MagneticButton } from "../cinema/MagneticButton";
import type { Dictionary } from "../../lib/i18n/types";
import type { Locale } from "../../lib/i18n/config";
import { localizedSlugs } from "../../lib/i18n/config";
import { EVENTS, trackEvent } from "../../lib/analytics/events";

interface PilotSectionProps {
  dict: Dictionary;
  locale: Locale;
}

function ListGroup({
  title,
  items,
  excluded = false,
}: {
  title: string;
  items: string[];
  excluded?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/16 bg-white/[0.04] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/58">
        {title}
      </p>
      <ul className="mt-3 grid gap-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-white/84"
          >
            {excluded ? (
              <Circle
                size={12}
                weight="regular"
                className="mt-1 shrink-0 text-white/52"
              />
            ) : (
              <Check
                size={14}
                weight="bold"
                className="mt-0.5 shrink-0 text-[var(--accent-400)]"
              />
            )}
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PilotSection({ dict, locale }: PilotSectionProps) {
  const { pilot } = dict;
  const pilotHref = `/${locale}/${localizedSlugs.pilot[locale]}`;

  function handlePilotClick() {
    trackEvent(EVENTS.CTA_CLICK_PILOT_SECTION, {
      source: "landing_pilot_section",
      locale,
    });
  }

  return (
    <section id="pilot" className="section-dark section-spacing">
      <div className="section-shell">
        <motion.div
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]"
        >
          <div>
            <p className="section-kicker">{pilot.kicker}</p>
            <h2 className="section-title">{pilot.heading}</h2>
            <p className="section-lead">{pilot.subheading}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {pilot.statusLabels.map((label, index) => (
                <span
                  key={label}
                  className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${
                    index === 0
                      ? "border-blue-300/50 bg-blue-300/14 text-blue-100"
                      : index === 1
                        ? "border-amber-300/50 bg-amber-300/14 text-amber-100"
                        : "border-sky-300/50 bg-sky-300/14 text-sky-100"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/16 bg-white/[0.04] p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/58">
              <Clock size={14} weight="duotone" />
              Timebox
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              {pilot.urgency}
            </p>
            <p className="mt-3 font-mono text-xs text-white/58">
              {pilot.ctaMeta}
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={blurStaggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12"
        >
          <motion.div variants={blurStaggerItem} className="md:col-span-6">
            <ListGroup
              title={pilot.included.title}
              items={pilot.included.items}
            />
          </motion.div>
          <motion.div variants={blurStaggerItem} className="md:col-span-6">
            <ListGroup
              title={pilot.excluded.title}
              items={pilot.excluded.items}
              excluded
            />
          </motion.div>
          <motion.div variants={blurStaggerItem} className="md:col-span-7">
            <ListGroup title={pilot.kpis.title} items={pilot.kpis.items} />
          </motion.div>
          <motion.div variants={blurStaggerItem} className="md:col-span-5">
            <ListGroup
              title={pilot.governance.title}
              items={pilot.governance.items}
            />
          </motion.div>
          <motion.div variants={blurStaggerItem} className="md:col-span-5">
            <ListGroup
              title={pilot.selection.title}
              items={pilot.selection.items}
            />
          </motion.div>
          <motion.article
            variants={blurStaggerItem}
            className="rounded-2xl border border-white/16 bg-white/[0.04] px-4 py-4 md:col-span-7"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-white/58">
              {pilot.upcoming.title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/84">
              {pilot.upcoming.description}
            </p>
          </motion.article>
        </motion.div>

        <motion.div
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <MagneticButton
            as="a"
            href={pilotHref}
            className="btn-primary"
            onClick={handlePilotClick}
          >
            <Sparkle size={15} weight="fill" />
            {pilot.ctaPrimary}
            <ArrowUpRight size={16} weight="bold" />
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
