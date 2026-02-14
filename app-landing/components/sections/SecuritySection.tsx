"use client";

import { motion } from "framer-motion";
import {
  sectionReveal,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
import { ShieldCheckIcon, LockIcon } from "../icons";
import type { Dictionary } from "../../lib/i18n/types";

interface SecuritySectionProps {
  dict: Dictionary;
}

export function SecuritySection({ dict }: SecuritySectionProps) {
  const { security } = dict;

  return (
    <section id="security" className="section-spacing">
      <div className="section-shell">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{security.kicker}</p>
          <h2 className="section-title mt-4">{security.heading}</h2>
          <p className="section-lead">{security.subheading}</p>
        </motion.div>

        {/* Trust tiles — 2x3 grid */}
        <motion.div
          className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {security.tiles.map((tile) => (
            <motion.div
              key={tile.title}
              className="craft-card p-5"
              variants={staggerItem}
            >
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brass-500" />
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">
                    {tile.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                    {tile.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stack compatibility */}
        <motion.div
          className="mt-8 craft-card p-6"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="flex items-start gap-3">
            <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-brass-500" />
            <div>
              <h3 className="text-sm font-semibold text-charcoal">
                {security.compatibility.title}
              </h3>
              <p className="mt-1.5 text-sm text-neutral-600">
                {security.compatibility.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {security.compatibility.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Honesty note — transparency callout */}
        <motion.div
          className="mt-6 rounded-lg border border-brass-100 bg-brass-50 px-5 py-4"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="text-sm leading-relaxed text-brass-800">
            {security.honesty}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
