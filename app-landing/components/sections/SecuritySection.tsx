"use client";

import { motion } from "framer-motion";
import {
  LockKey,
  ShieldCheck,
  StackSimple,
} from "@phosphor-icons/react/dist/ssr";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportOnce,
} from "../../lib/animations/variants";
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
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="section-kicker">{security.kicker}</p>
          <h2 className="section-title">{security.heading}</h2>
          <p className="section-lead">{security.subheading}</p>
        </motion.div>

        <motion.div
          variants={blurStaggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="surface-lines mt-10 rounded-3xl border border-[var(--line)] bg-[var(--panel)]"
        >
          {security.tiles.map((tile) => (
            <motion.article
              key={tile.title}
              variants={blurStaggerItem}
              className="grid gap-2 rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-[var(--panel-muted)] md:grid-cols-[1fr_2.2fr] md:px-6"
            >
              <p className="inline-flex items-start gap-2 text-sm font-medium text-[var(--ink)]">
                <ShieldCheck
                  size={16}
                  weight="duotone"
                  className="mt-0.5 shrink-0 text-[var(--accent-600)]"
                />
                {tile.title}
              </p>
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                {tile.description}
              </p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          variants={blurReveal}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-8 grid gap-4 md:grid-cols-[1.5fr_1fr]"
        >
          <article className="panel-glass rounded-3xl p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              <StackSimple size={14} weight="duotone" />
              {security.compatibility.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {security.compatibility.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {security.compatibility.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-[var(--line)] bg-[var(--panel-muted)] px-3 py-1 text-xs text-[var(--ink-soft)]"
                >
                  {tool}
                </span>
              ))}
            </div>
          </article>

          <article className="panel-glass rounded-3xl border-[var(--accent-200)] bg-[var(--accent-50)] p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--accent-700)]">
              <LockKey size={14} weight="duotone" />
              Security note
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {security.honesty}
            </p>
          </article>
        </motion.div>
      </div>
    </section>
  );
}
