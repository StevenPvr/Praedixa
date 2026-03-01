"use client";

import { motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { MagneticPilotLink } from "./how-it-works/MagneticPilotLink";
import { ProtocolPulsePill } from "./how-it-works/ProtocolPulsePill";

interface HowItWorksSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const VP = { once: true, margin: "-60px" as const };
const LINEAR = { once: true, margin: "-30px" as const };

const staggerSteps = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const stepItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

const sectionCopy = {
  fr: {
    chipMilestone: "Jalon de preuve: S8",
    chipConsolidation: "Consolidation: mois 3",
    railLabel: "Cadence pilote",
    railTitle: "Execution defendable, semaine par semaine.",
    railSummary:
      "Chaque jalon verrouille un niveau de decision avant passage a l'etape suivante.",
    rhythmLabel: "Revues hebdomadaires COO/Ops + CFO/DAF",
    phaseLabel: "Jalon",
    ctaMeta: "Demarrage en lecture seule, sans projet SI lourd",
    loadingTitle: "Chargement du protocole pilote",
    loadingBody:
      "Assemblage des jalons d'execution et de preuve en cours.",
    emptyTitle: "Aucun protocole disponible",
    emptyBody:
      "Ajoutez les etapes du pilote pour afficher la timeline d'execution.",
    errorTitle: "Protocole temporairement indisponible",
    errorBody:
      "La section ne peut pas etre rendue pour le moment. Rechargez la page.",
    statuses: [
      "Audit historique actif",
      "Initialisation data",
      "Decision Log en cours",
      "Proof pack ROI",
    ],
  },
  en: {
    chipMilestone: "Proof milestone: W8",
    chipConsolidation: "Consolidation: month 3",
    railLabel: "Pilot cadence",
    railTitle: "Defensible execution, week by week.",
    railSummary:
      "Each milestone locks one decision layer before moving to the next stage.",
    rhythmLabel: "Weekly COO/Ops + CFO reviews",
    phaseLabel: "Milestone",
    ctaMeta: "Read-only start, no heavy IT project",
    loadingTitle: "Loading pilot protocol",
    loadingBody:
      "Building the execution and proof timeline.",
    emptyTitle: "No protocol available",
    emptyBody:
      "Add pilot steps to display the execution timeline.",
    errorTitle: "Protocol temporarily unavailable",
    errorBody:
      "This section cannot be rendered right now. Please refresh the page.",
    statuses: [
      "Historical audit active",
      "Data initialization",
      "Decision Log running",
      "ROI proof pack",
    ],
  },
} as const;

export function HowItWorksSection({ locale, dict }: HowItWorksSectionProps) {
  const copy = sectionCopy[locale];
  const protocol = dict?.howItWorks;
  const pilotHref = getLocalizedPath(locale, "pilot");

  const rawSteps = protocol?.steps as Dictionary["howItWorks"]["steps"] | undefined;
  const isLoading = Boolean(protocol) && !rawSteps;
  const hasInvalidShape = rawSteps !== undefined && !Array.isArray(rawSteps);

  if (isLoading) {
    return (
      <SectionShell id="how-it-works" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">
            {protocol?.kicker ?? copy.loadingTitle}
          </Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {copy.loadingTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {copy.loadingBody}
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="h-[320px] animate-pulse rounded-[1.75rem] border border-white/10 bg-white/5" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
            <div className="h-28 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
            <div className="h-28 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (!protocol || hasInvalidShape) {
    return (
      <SectionShell id="how-it-works" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">
            {protocol?.kicker ?? copy.errorTitle}
          </Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {copy.errorTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {copy.errorBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  const steps = (rawSteps ?? []).filter(
    (step) => step.number && step.title && step.subtitle && step.description,
  );

  if (steps.length === 0) {
    return (
      <SectionShell id="how-it-works" className="section-dark">
        <div className="max-w-3xl">
          <Kicker className="text-neutral-100">{protocol.kicker}</Kicker>
          <h2
            className="mt-3 max-w-2xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
            style={{ lineHeight: 1.04 }}
          >
            {copy.emptyTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {copy.emptyBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  const phaseChip = locale === "fr"
    ? `${steps.length} jalons operationnels`
    : `${steps.length} operational milestones`;

  return (
    <SectionShell id="how-it-works" className="section-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker className="text-neutral-100">{protocol.kicker}</Kicker>
        <h2
          className="mt-3 max-w-3xl text-4xl font-bold tracking-tighter text-white md:text-6xl"
          style={{ lineHeight: 1.04 }}
        >
          {protocol.heading}
        </h2>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
          {protocol.subheading}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[phaseChip, copy.chipMilestone, copy.chipConsolidation].map((chip) => (
            <span
              key={chip}
              className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-100"
            >
              {chip}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VP}
          transition={SPRING}
          className="md:sticky md:top-28 md:self-start"
        >
          <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm md:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brass-400/12 to-transparent" />
            <span className="relative text-xs font-semibold uppercase tracking-[0.08em] text-brass-200">
              {copy.railLabel}
            </span>
            <h3 className="relative mt-2 text-2xl font-semibold tracking-tight text-white">
              {copy.railTitle}
            </h3>
            <p className="relative mt-3 max-w-[34ch] text-sm leading-relaxed text-neutral-200">
              {copy.railSummary}
            </p>

            <motion.div
              variants={staggerSteps}
              initial="hidden"
              whileInView="visible"
              viewport={LINEAR}
              className="relative mt-7 space-y-3 border-t border-white/10 pt-5"
            >
              {steps.map((step) => (
                <motion.div
                  key={`rail-${step.number}`}
                  variants={stepItem}
                  layout
                  className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-brass-300/45 bg-brass-600/20 px-2 text-xs font-semibold text-brass-100">
                    {step.number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {step.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-300">
                      {step.subtitle}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <ProtocolPulsePill label={copy.rhythmLabel} />
            </div>
          </div>

          <div className="mt-5">
            <MagneticPilotLink
              href={pilotHref}
              label={dict.pilot.ctaPrimary}
              meta={copy.ctaMeta}
            />
          </div>
        </motion.aside>

        <motion.div
          variants={staggerSteps}
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          className="space-y-4 md:space-y-5"
        >
          {steps.map((step, i) => {
            const statusLabel =
              copy.statuses[i] ?? copy.statuses[copy.statuses.length - 1] ?? "";

            return (
              <motion.article
                key={`step-${step.number}`}
                layout
                layoutId={`pilot-step-${step.number}`}
                variants={stepItem}
                className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm md:p-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brass-400/8 to-transparent" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-brass-300/45 bg-brass-600/20 px-2 text-sm font-semibold text-brass-100">
                        {step.number}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-100">
                        {step.subtitle}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-xl font-semibold tracking-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-neutral-200">
                      {step.description}
                    </p>
                  </div>

                  <ProtocolPulsePill label={statusLabel} />
                </div>

                <div className="relative mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brass-300 via-brass-400 to-brass-500"
                      initial={{ scaleX: 0, originX: 0 }}
                      whileInView={{ scaleX: (i + 1) / steps.length }}
                      viewport={VP}
                      transition={{ ...SPRING, delay: 0.1 + i * 0.04 }}
                    />
                  </div>
                  <span className="text-xs text-neutral-300">
                    {copy.phaseLabel} {i + 1}/{steps.length}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </SectionShell>
  );
}
