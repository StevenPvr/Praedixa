"use client";

import { motion } from "framer-motion";
import type { Locale } from "../../lib/i18n/config";
import { getLocalizedPath } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { SPRING, VP } from "../../lib/animations/variants";
import { MagneticPilotLink } from "./how-it-works/MagneticPilotLink";
import { ProtocolPulsePill } from "./how-it-works/ProtocolPulsePill";

interface HowItWorksSectionProps {
  locale: Locale;
  dict: Dictionary;
}

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
    chipMilestone: "J+3 / J+7 / J+14",
    chipConsolidation: "Decision Log + preuve ROI",
    railLabel: "La boucle fermée",
    railTitle: "4 étapes. Une exécution. Une preuve.",
    railSummary:
      "Prévoir → décider → déclencher → prouver. Toujours : coût, service, risque. Toujours : manager décisionnaire.",
    rhythmLabel: "Preuve mensuelle",
    phaseLabel: "Étape",
    ctaMeta: "Lecture seule au démarrage (exports/API)",
    loadingTitle: "Chargement de la boucle fermée",
    loadingBody:
      "Assemblage des étapes (prévision, décision, action, preuve) en cours.",
    emptyTitle: "Aucune étape disponible",
    emptyBody:
      "Ajoutez des étapes pour afficher la boucle.",
    errorTitle: "Boucle temporairement indisponible",
    errorBody:
      "La section ne peut pas être rendue pour le moment. Rechargez la page.",
    statuses: [
      "Prévision",
      "Décision",
      "Action",
      "Preuve",
    ],
  },
  en: {
    chipMilestone: "Proof milestone: week 8",
    chipConsolidation: "Consolidation: month 3",
    railLabel: "Pilot cadence",
    railTitle: "Defensible execution, week by week.",
    railSummary:
      "Each milestone locks a layer (signals → options → decisions → proof) before moving on.",
    rhythmLabel: "Rhythm: weekly check-in + monthly review",
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
      "Historical audit",
      "Data ready",
      "Decision journal",
      "Monthly proof",
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
            className="mt-3 max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl"
          >
            {copy.loadingTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-200">
            {copy.loadingBody}
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="h-[320px] animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
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
            className="mt-3 max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl"
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
            className="mt-3 max-w-2xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl"
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

  const phaseChip =
    locale === "fr"
      ? `${steps.length} étapes`
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
          className="mt-3 max-w-3xl text-4xl font-bold leading-[1.04] tracking-tighter text-white md:text-6xl"
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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm md:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-400/12 to-transparent" />
            <span className="relative text-xs font-semibold uppercase tracking-[0.08em] text-amber-200">
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
                  className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                >
                  <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-amber-300/45 bg-amber-600/20 px-2 text-xs font-semibold text-amber-100">
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
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm md:p-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-400/8 to-transparent" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-amber-300/45 bg-amber-600/20 px-2 text-sm font-semibold text-amber-100">
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
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500"
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
