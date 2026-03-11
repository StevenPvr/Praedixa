"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "../../lib/i18n/config";
import type { Dictionary } from "../../lib/i18n/types";
import { SectionShell } from "../shared/SectionShell";
import { Kicker } from "../shared/Kicker";
import {
  DecisionGraphIcon,
  SignalWindowIcon,
} from "../shared/icons/MarketingIcons";
import { SPRING, VP } from "../../lib/animations/variants";
import { PulseDot } from "../shared/motion/PulseDot";
import { ShimmerTrack } from "../shared/motion/ShimmerTrack";

interface UseCasesSectionProps {
  locale: Locale;
  dict: Dictionary;
}

type UseCase = Dictionary["useCases"]["cases"][number];

const railReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const railItem = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

function toOrderedCases(cases: UseCase[], activeId: string | null): UseCase[] {
  if (cases.length === 0) return [];

  const activeCase = cases.find((entry) => entry.id === activeId);
  if (!activeCase) return cases;

  return [activeCase, ...cases.filter((entry) => entry.id !== activeId)];
}

export function UseCasesSection({ locale, dict }: UseCasesSectionProps) {
  const useCases = dict.useCases;
  const cases = Array.isArray(useCases.cases) ? useCases.cases : null;
  const [activeId, setActiveId] = useState<string | null>(
    cases?.[0]?.id ?? null,
  );

  const copy =
    locale === "fr"
      ? {
          loadingTitle: "Chargement des décisions couvertes",
          loadingBody: "Le rail de priorités métier est en cours d’assemblage.",
          emptyTitle: "Aucun cas métier disponible",
          emptyBody:
            "Ajoutez des décisions opérationnelles pour alimenter cette section.",
          errorTitle: "Sélection de cas invalide",
          errorBody: "Rechargez la page pour réinitialiser la priorisation.",
          railLabel: "Décisions couvertes",
          liveLabel: "Exemple",
          panelLabel: "Détail du cas",
        }
      : {
          loadingTitle: "Loading covered decisions",
          loadingBody: "The business-priority rail is being assembled.",
          emptyTitle: "No business cases available",
          emptyBody: "Add operational decisions to populate this section.",
          errorTitle: "Invalid case selection",
          errorBody: "Refresh the page to reset prioritization.",
          railLabel: "Decisions covered",
          liveLabel: "Example",
          panelLabel: "Details",
        };

  useEffect(() => {
    if (!cases || cases.length === 0) {
      setActiveId(null);
      return;
    }

    const hasActive = cases.some((entry) => entry.id === activeId);
    if (!hasActive) {
      setActiveId(cases[0]?.id ?? null);
    }
  }, [activeId, cases]);

  if (!cases) {
    return (
      <SectionShell
        id="use-cases"
        className="bg-[linear-gradient(180deg,#fbfbfa_0%,#f4f2ee_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{useCases.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {copy.loadingTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {copy.loadingBody}
          </p>
          <div className="mt-8 space-y-4">
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
            <div className="h-16 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
          </div>
        </div>
      </SectionShell>
    );
  }

  if (cases.length === 0) {
    return (
      <SectionShell
        id="use-cases"
        className="bg-[linear-gradient(180deg,#fbfbfa_0%,#f4f2ee_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{useCases.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {copy.emptyTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {copy.emptyBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  const orderedCases = useMemo(
    () => toOrderedCases(cases, activeId),
    [cases, activeId],
  );
  const activeCase = orderedCases[0] ?? null;

  if (!activeCase) {
    return (
      <SectionShell
        id="use-cases"
        className="bg-[linear-gradient(180deg,#fbfbfa_0%,#f4f2ee_100%)]"
      >
        <div className="max-w-3xl">
          <Kicker>{useCases.kicker}</Kicker>
          <h2 className="mt-3 text-4xl font-bold leading-[1.04] tracking-tighter text-ink md:text-6xl">
            {copy.errorTitle}
          </h2>
          <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neutral-600">
            {copy.errorBody}
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="use-cases"
      className="bg-[linear-gradient(180deg,#fbfbfa_0%,#f4f2ee_100%)]"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={SPRING}
      >
        <Kicker>{useCases.kicker}</Kicker>
        <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none tracking-tighter text-ink md:text-6xl">
          {useCases.heading}
        </h2>
        <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-neutral-600">
          {useCases.subheading}
        </p>
      </motion.div>

      <motion.div
        className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-[0.72fr_1.28fr] md:gap-11"
        variants={railReveal}
        initial="hidden"
        whileInView="visible"
        viewport={VP}
      >
        <motion.aside variants={railItem} className="space-y-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
            <DecisionGraphIcon size={14} />
            {copy.railLabel}
          </p>

          <div className="space-y-2">
            {orderedCases.map((entry) => {
              const isActive = entry.id === activeCase.id;
              const sourceIndex = cases.findIndex(
                (item) => item.id === entry.id,
              );
              return (
                <motion.button
                  key={entry.id}
                  layout
                  type="button"
                  variants={railItem}
                  onClick={() => setActiveId(entry.id)}
                  className={`relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:-translate-y-[1px] active:scale-[0.99] ${
                    isActive
                      ? "border-amber-300/80 bg-amber-50/75"
                      : "border-neutral-200/80 bg-white/90 hover:border-neutral-300"
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="covered-decision-active"
                      className="absolute inset-0 rounded-2xl border border-amber-300/80"
                    />
                  ) : null}
                  <span className="relative inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass-700">
                    <PulseDot className="h-1.5 w-1.5 bg-amber-500" />
                    {String(sourceIndex + 1).padStart(2, "0")}
                  </span>
                  <p className="relative mt-2 text-base font-semibold tracking-tight text-ink">
                    {entry.title}
                  </p>
                  <p className="relative mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600">
                    {entry.context}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.aside>

        <AnimatePresence mode="wait">
          <motion.article
            key={activeCase.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="rounded-3xl border border-neutral-200/80 bg-white/92 p-6 shadow-[0_28px_48px_-38px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.8)] md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  {copy.panelLabel}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                  {activeCase.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-amber-700">
                <SignalWindowIcon size={14} />
                {copy.liveLabel}
              </span>
            </div>

            <div className="mt-6 divide-y divide-neutral-200/80 border-y border-neutral-200/80">
              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  {useCases.labels.context}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {activeCase.context}
                </p>
              </div>

              <div className="py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  {useCases.labels.action}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {activeCase.action}
                </p>
              </div>

              <div className="py-4">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                  {useCases.labels.impact}
                  <ArrowRight size={12} weight="bold" />
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {activeCase.result}
                </p>
                {activeCase.callout ? (
                  <p className="mt-4 border-l-2 border-amber-300/70 pl-3 text-xs leading-relaxed text-amber-700">
                    {activeCase.callout}
                  </p>
                ) : null}
              </div>
            </div>

            <ShimmerTrack
              className="mt-6 bg-neutral-100"
              indicatorClassName="via-amber-300/55"
            />
          </motion.article>
        </AnimatePresence>
      </motion.div>
    </SectionShell>
  );
}
