"use client";

import { motion } from "framer-motion";
import { CheckSquare, TrendUp } from "@phosphor-icons/react";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface DeliverablesSectionProps {
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };

const staggerChecklist = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const checkItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export function DeliverablesSection({ dict }: DeliverablesSectionProps) {
  const deliverables = dict.deliverables;
  const roiFrames = Array.isArray(deliverables.roiFrames)
    ? deliverables.roiFrames
    : null;
  const checklist = Array.isArray(deliverables.checklist)
    ? deliverables.checklist
    : null;
  const isFrench = deliverables.kicker.toLowerCase().includes("preuve");

  if (!roiFrames || !checklist) {
    return (
      <SectionShell id="deliverables" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench ? "Chargement de la preuve ROI" : "Loading ROI proof"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {isFrench
              ? "Preparation du cadre BAU/0% vs 100% vs reel."
              : "Preparing BAU/0% vs 100% vs actual framework."}
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

  if (roiFrames.length === 0) {
    return (
      <SectionShell id="deliverables" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
          <h2
            className="mt-3 text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {isFrench ? "Aucun referentiel ROI" : "No ROI references yet"}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {isFrench
              ? "Ajoutez des scenarios pour activer la preuve mensuelle."
              : "Add scenarios to activate monthly proof."}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id="deliverables" className="section-dark">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.08fr_0.92fr] md:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={SPRING}
          >
            <Kicker className="text-neutral-100">{deliverables.kicker}</Kicker>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-white md:text-6xl">
              {deliverables.heading}
            </h2>
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-200">
              {deliverables.subheading}
            </p>
          </motion.div>

          <div className="mt-12 space-y-4">
            {roiFrames.map((frame, i) => (
              <motion.div
                key={frame.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{ ...SPRING, delay: i * 0.08 }}
                className={`rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6 ${
                  i % 2 === 1 ? "md:translate-x-5" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-100">
                  <PulseDot className="h-1.5 w-1.5 bg-brass-300" />
                  {frame.label}
                </span>
                <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {frame.value}
                </p>
                <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-neutral-200">
                  {frame.note}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <a
                    href={frame.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-[11px] font-semibold uppercase tracking-[0.09em] text-neutral-300 no-underline transition-colors duration-300 hover:text-white"
                  >
                    {frame.sourceLabel}
                  </a>
                  <TrendUp size={16} weight="bold" className="text-brass-300" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={{ ...SPRING, delay: 0.2 }}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm md:p-7">
            <h3 className="text-xl font-semibold tracking-tight text-white">
              {isFrench ? "Checklist de preuve" : "Proof checklist"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-200">
              {isFrench
                ? "Chaque point verrouille la defendabilite du ROI mensuel."
                : "Each item locks monthly ROI defensibility."}
            </p>
            <motion.ul
              variants={staggerChecklist}
              initial="hidden"
              whileInView="visible"
              viewport={VP}
              className="mt-5 list-none space-y-3.5 p-0"
            >
              {checklist.map((item) => (
                <motion.li
                  key={item}
                  variants={checkItem}
                  className="m-0 flex items-start gap-2.5 text-sm text-neutral-200"
                >
                  <CheckSquare
                    size={18}
                    weight="fill"
                    className="mt-0.5 shrink-0 text-brass-400"
                  />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
            <ShimmerTrack className="mt-6" />
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
