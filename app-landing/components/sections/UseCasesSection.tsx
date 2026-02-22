"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CompassTool,
  Gauge,
  Graph,
  HandCoins,
  Pulse,
  ShieldCheck,
  Target,
} from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "@/lib/i18n/types";
import {
  blurReveal,
  blurStaggerContainer,
  blurStaggerItem,
  viewportEarly,
  viewportOnce,
} from "@/lib/animations/variants";

interface UseCasesSectionProps {
  useCases: Dictionary["useCases"];
  deliverables: Dictionary["deliverables"];
}

const caseIcons = [Gauge, Pulse, CompassTool, Graph];
const roiIcons = [HandCoins, Target, ShieldCheck];
const roiSpans = ["md:col-span-7", "md:col-span-5", "md:col-span-12"];

export function UseCasesSection({
  useCases,
  deliverables,
}: UseCasesSectionProps) {
  return (
    <section id="cas-usage" className="overflow-hidden">
      <div className="section-spacing">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
          >
            <p className="section-kicker">{useCases.kicker}</p>
            <h2 className="section-title">{useCases.heading}</h2>
            <p className="section-lead">{useCases.subheading}</p>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {useCases.cases.map((useCase, index) => {
              const Icon = caseIcons[index] ?? Gauge;
              const span = index % 2 === 0 ? "md:col-span-7" : "md:col-span-5";

              return (
                <motion.article
                  key={useCase.id}
                  variants={blurStaggerItem}
                  className={`panel-glass rounded-3xl p-6 ${span}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                        Cas {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 text-2xl tracking-tight text-[var(--ink)]">
                        {useCase.title}
                      </h3>
                    </div>
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] p-2.5">
                      <Icon
                        size={19}
                        weight="duotone"
                        className="text-[var(--accent-600)]"
                      />
                    </div>
                  </div>

                  <ul className="mt-4 grid gap-2.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    <li>
                      <span className="font-medium text-[var(--ink)]">
                        Context:
                      </span>{" "}
                      {useCase.context}
                    </li>
                    <li>
                      <span className="font-medium text-[var(--ink)]">
                        Action:
                      </span>{" "}
                      {useCase.action}
                    </li>
                    <li>
                      <span className="font-medium text-[var(--ink)]">
                        Result:
                      </span>{" "}
                      {useCase.result}
                    </li>
                  </ul>

                  {useCase.callout ? (
                    <p className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {useCase.callout}
                    </p>
                  ) : null}
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="section-spacing border-y border-[var(--line)] bg-[var(--bg-strong)]">
        <div className="section-shell">
          <motion.div
            variants={blurReveal}
            initial="hidden"
            whileInView="visible"
            viewport={viewportEarly}
          >
            <p className="section-kicker">{deliverables.kicker}</p>
            <h3 className="section-title">{deliverables.heading}</h3>
            <p className="section-lead">{deliverables.subheading}</p>
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-12"
          >
            {deliverables.roiFrames.map((frame, index) => {
              const Icon = roiIcons[index] ?? HandCoins;
              return (
                <motion.article
                  key={frame.label}
                  variants={blurStaggerItem}
                  className={`panel-glass rounded-3xl p-6 ${roiSpans[index] ?? "md:col-span-6"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                      {frame.label}
                    </p>
                    <Icon
                      size={18}
                      weight="duotone"
                      className="text-[var(--accent-600)]"
                    />
                  </div>
                  <p className="mt-2 font-mono text-xl text-[var(--ink)]">
                    {frame.value}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {frame.note}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>

          <motion.div
            variants={blurStaggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-8 grid gap-2.5"
          >
            {deliverables.checklist.map((item) => (
              <motion.div
                key={item}
                variants={blurStaggerItem}
                className="inline-flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--ink-soft)]"
              >
                <ArrowUpRight
                  size={14}
                  weight="bold"
                  className="mt-0.5 shrink-0 text-[var(--accent-600)]"
                />
                <span>{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
