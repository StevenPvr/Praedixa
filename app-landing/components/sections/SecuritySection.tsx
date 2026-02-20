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
    <section id="security" className="section-spacing relative overflow-hidden">
      <div className="section-shell relative">
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
              className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 transition-shadow duration-300 hover:shadow-md"
              variants={staggerItem}
            >
              {/* Conic-gradient spinning border on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "conic-gradient(from var(--conic-angle, 0deg), oklch(0.63 0.165 246 / 0.15), transparent 30%, transparent 70%, oklch(0.63 0.165 246 / 0.15))",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "exclude",
                  WebkitMaskComposite: "xor",
                  padding: "1px",
                  borderRadius: "0.75rem",
                  animation: "conic-spin 6s linear infinite",
                }}
              />
              <div className="relative z-10 flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brass-500" />
                <div>
                  <h3 className="text-sm font-semibold text-charcoal">
                    {tile.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                    {tile.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

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
              <p className="mt-1.5 text-sm text-ink-secondary">
                {security.compatibility.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {security.compatibility.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded border border-border-subtle bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-secondary"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

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
