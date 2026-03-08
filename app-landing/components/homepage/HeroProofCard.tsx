"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { cn } from "../../lib/utils";
import { PulseDot } from "../shared/motion/PulseDot";
import {
  blurStaggerContainer,
  blurStaggerItem,
  viewportOnce,
} from "../../lib/animations/variants";

interface HeroProofCardProps {
  locale: Locale;
  className?: string;
}

type StatusType = "success" | "pending" | "planned";

interface DecisionRow {
  decision: string;
  impact: string;
  status: string;
  statusType: StatusType;
}

const statusDotColor: Record<StatusType, string> = {
  success: "bg-emerald-500",
  pending: "bg-brass-500",
  planned: "bg-neutral-400",
};

const statusTextColor: Record<StatusType, string> = {
  success: "text-emerald-700",
  pending: "text-brass-700",
  planned: "text-neutral-500",
};

function getCopy(isFr: boolean) {
  return {
    title: isFr ? "Vue ROI" : "ROI view",
    site: isFr ? "Reseau Sud" : "Southern network",
    horizon: isFr ? "Ce mois" : "This month",
    columns: {
      decision: isFr ? "Priorite" : "Priority",
      impact: isFr ? "Gain" : "Gain",
      status: isFr ? "Etat" : "Status",
    },
    rows: [
      {
        decision: isFr ? "Heures sup site B" : "Overtime site B",
        impact: isFr ? "18 kEUR" : "EUR 18k",
        status: isFr ? "Priorite" : "Priority",
        statusType: "pending" as StatusType,
      },
      {
        decision: isFr ? "Absentéisme atelier A" : "Absenteeism plant A",
        impact: isFr ? "9 kEUR" : "EUR 9k",
        status: isFr ? "En cours" : "In progress",
        statusType: "planned" as StatusType,
      },
      {
        decision: isFr ? "Écart marge site C" : "Margin gap site C",
        impact: isFr ? "+3 pts" : "+3 pts",
        status: isFr ? "Aligne" : "Aligned",
        statusType: "success" as StatusType,
      },
    ] satisfies DecisionRow[],
    summary: isFr
      ? "3 sites · 12 priorites · objectif ROI x3"
      : "3 sites · 12 priorities · target 3x ROI",
  };
}

export function HeroProofCard({ locale, className }: HeroProofCardProps) {
  const isFr = locale === "fr";
  const reducedMotion = useReducedMotion();
  const copy = getCopy(isFr);

  const motionProps = reducedMotion
    ? {}
    : {
        variants: blurStaggerContainer,
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: viewportOnce,
      };

  const itemProps = reducedMotion ? {} : { variants: blurStaggerItem };

  return (
    <motion.div
      className={cn(
        "w-full max-w-[28rem] overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/80 shadow-[0_34px_90px_-70px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur",
        className,
      )}
      {...motionProps}
    >
      {/* Atmospheric tint */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.08),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between gap-3"
          {...itemProps}
        >
          <div className="flex items-center gap-2.5">
            <PulseDot className="bg-emerald-500" duration={2.4} />
            <span className="text-sm font-semibold text-ink">
              {copy.title}
            </span>
            <span className="text-[13px] text-neutral-500">
              — {copy.site}
            </span>
          </div>
          <span className="rounded-full border border-neutral-200 bg-white/70 px-2.5 py-1 font-mono text-[10px] font-semibold text-neutral-600">
            {copy.horizon}
          </span>
        </motion.div>

        {/* Decision table */}
        <motion.div
          className="mt-4 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/60"
          {...itemProps}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-neutral-200/70 px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {copy.columns.decision}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {copy.columns.impact}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {copy.columns.status}
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-neutral-200/60">
            {copy.rows.map((row) => (
              <motion.div
                key={row.decision}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3"
                {...itemProps}
              >
                <span className="text-[13px] font-medium text-neutral-700">
                  {row.decision}
                </span>
                <span className="font-mono text-[12px] text-neutral-600">
                  {row.impact}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[12px] font-semibold",
                    statusTextColor[row.statusType],
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      statusDotColor[row.statusType],
                    )}
                    aria-hidden="true"
                  />
                  {row.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom metric strip */}
        <motion.div
          className="mt-3 rounded-2xl border border-neutral-200/80 bg-white/50 px-4 py-3"
          {...itemProps}
        >
          <p className="font-mono text-[11px] font-semibold tracking-wide text-neutral-600">
            {copy.summary}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
