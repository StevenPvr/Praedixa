"use client";

import { motion } from "framer-motion";
import { buildContactIntentHref, type Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { getValuePropContent } from "../../lib/content/value-prop";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import { SPRING, VP } from "../../lib/animations/variants";
import { MagneticPilotLink } from "./how-it-works/MagneticPilotLink";
import { ProtocolPulsePill } from "./how-it-works/ProtocolPulsePill";

interface HowItWorksSectionProps {
  locale: Locale;
  dict: Dictionary;
}

const VP_STEPPED = { once: true, margin: "-30px" as const };

const stepListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const stepItemVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

const sectionCopy = {
  fr: {
    loopLabel: "Cycle de décision",
    rhythmLabel: "Lecture commune · arbitrage explicite",
    ctaMeta: "Démarrage sobre sur exports ou API",
    loadingTitle: "Chargement de la méthode",
    loadingBody: "Assemblage des étapes en cours.",
    emptyTitle: "Aucune étape disponible",
    emptyBody: "Ajoutez des étapes pour afficher la boucle.",
    errorTitle: "Boucle temporairement indisponible",
    errorBody: "Rechargez la page.",
    statuses: ["Signal", "Arbitrage", "Décision", "Preuve"],
  },
  en: {
    loopLabel: "Simple method",
    rhythmLabel: "Shared view · clear priorities",
    ctaMeta: "Read-only start, no heavy IT project",
    loadingTitle: "Loading the method",
    loadingBody: "Building the decision sequence.",
    emptyTitle: "No method available",
    emptyBody: "Add method steps to display the timeline.",
    errorTitle: "Method temporarily unavailable",
    errorBody: "Please refresh the page.",
    statuses: ["Data", "View", "Priorities", "ROI"],
  },
} as const;

function HowItWorksBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_8%,rgba(244,231,198,0.14),transparent_60%),radial-gradient(860px_520px_at_88%_18%,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)]" />
    </div>
  );
}

function HowItWorksStateSection({
  body,
  heading,
  kicker,
}: {
  body: string;
  heading?: string;
  kicker: string;
}) {
  return (
    <SectionShell id="how-it-works" className="section-dark relative">
      <HowItWorksBackdrop />
      <div className="relative max-w-2xl">
        <Kicker className="text-[rgba(255,255,255,0.84)]">{kicker}</Kicker>
        {heading ? (
          <h2 className="mt-3 text-4xl font-semibold tracking-tighter text-white">
            {heading}
          </h2>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-[rgba(255,255,255,0.64)]">
          {body}
        </p>
      </div>
    </SectionShell>
  );
}

export function HowItWorksSection({ locale, dict }: HowItWorksSectionProps) {
  const valueProp = getValuePropContent(locale);
  const copy = sectionCopy[locale];
  const protocol = dict?.howItWorks;
  const pilotHref = buildContactIntentHref(locale, "deployment");

  const rawSteps = protocol?.steps as
    | Dictionary["howItWorks"]["steps"]
    | undefined;
  const isLoading = Boolean(protocol) && !rawSteps;
  const hasInvalidShape = rawSteps !== undefined && !Array.isArray(rawSteps);

  if (isLoading) {
    return (
      <SectionShell id="how-it-works" className="section-dark relative">
        <HowItWorksBackdrop />
        <div className="relative">
          <div className="max-w-2xl space-y-3">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.07]" />
          </div>
          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="h-[260px] animate-pulse rounded-[2rem] bg-white/[0.04]" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-24 animate-pulse rounded-[2rem] bg-white/[0.04]"
                />
              ))}
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  if (!protocol || hasInvalidShape) {
    return (
      <HowItWorksStateSection body={copy.errorBody} kicker={copy.errorTitle} />
    );
  }

  const steps = (rawSteps ?? []).filter(
    (s) => s.number && s.title && s.subtitle && s.description,
  );

  if (steps.length === 0) {
    return (
      <HowItWorksStateSection
        body={copy.emptyBody}
        heading={copy.emptyTitle}
        kicker={protocol.kicker}
      />
    );
  }

  return (
    <SectionShell id="how-it-works" className="section-dark relative">
      <HowItWorksBackdrop />

      <div className="relative">
        {/* ── Header — full-width, left-aligned ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={SPRING}
        >
          <Kicker className="text-[rgba(255,255,255,0.84)]">
            {protocol.kicker}
          </Kicker>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tighter text-white md:text-5xl">
            {protocol.heading}
          </h2>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-[rgba(255,255,255,0.72)]">
            {protocol.subheading}
          </p>
        </motion.div>

        {/* ── Two-column body ───────────────────────────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          {/* Left — compact loop chain + CTA (sticky) */}
          <motion.aside
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VP}
            transition={SPRING}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            {/* Loop label */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8 shrink-0 bg-white/15" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(244,231,198,0.78)]">
                {copy.loopLabel}
              </span>
            </div>

            {/* Phase chain — compact, no glass box */}
            <div className="relative mt-5 pl-5">
              <div
                aria-hidden="true"
                className="absolute left-[0.625rem] top-2.5 bottom-8 w-px bg-gradient-to-b from-white/18 via-white/8 to-transparent"
              />
              <div className="space-y-5">
                {steps.map((step, i) => (
                  <div
                    key={`loop-${step.number}`}
                    className="flex items-center gap-3"
                  >
                    <span className="relative z-10 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-300/35 bg-amber-500/12 text-[9px] font-bold leading-none text-amber-200/75">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.72)]">
                        {step.subtitle}
                      </span>
                      <span className="block truncate text-xs font-medium text-[rgba(255,255,255,0.84)]">
                        {copy.statuses[i] ?? ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loop-back indicator */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-[rgba(255,255,255,0.72)]">↩</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.72)]">
                  {copy.rhythmLabel}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10">
              <MagneticPilotLink
                href={pilotHref}
                label={valueProp.ctaSecondary}
                meta={copy.ctaMeta}
              />
            </div>
          </motion.aside>

          {/* Right — single container, steps separated by divide-y */}
          <motion.div
            variants={stepListVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VP_STEPPED}
            className="relative overflow-hidden rounded-[2.5rem] border border-white/8"
          >
            <div className="divide-y divide-white/8">
              {steps.map((step, i) => {
                const statusLabel =
                  copy.statuses[i] ??
                  copy.statuses[copy.statuses.length - 1] ??
                  "";

                return (
                  <motion.article
                    key={`step-${step.number}`}
                    variants={stepItemVariant}
                    className="group relative px-6 py-7 transition-colors duration-300 hover:bg-white/[0.025] md:px-8 md:py-8"
                  >
                    {/* Ghost step number — editorial background element (DESIGN_VARIANCE: 8) */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-5 top-3 select-none text-[5.5rem] font-black leading-none tracking-tighter text-white/[0.05] md:right-7"
                    >
                      {step.number}
                    </span>

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(244,231,198,0.74)]">
                            {step.subtitle}
                          </span>
                          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-white md:text-xl">
                            {step.title}
                          </h3>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          <ProtocolPulsePill label={statusLabel} />
                        </div>
                      </div>

                      <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-[rgba(255,255,255,0.72)]">
                        {step.description}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}
