"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { cn } from "../../lib/utils";
import type { MethodStep } from "../../lib/content/value-prop/shared";
import type { Locale } from "../../lib/i18n/config";

interface MethodBlockClientProps {
  locale: Locale;
  steps: MethodStep[];
}

const VISUAL_IDS = ["voir", "comparer", "decider", "prouver"] as const;

const methodVisualCopy = {
  fr: {
    riskLabel: "Rush réseau sous tension",
    retainedDecision: "Décision retenue",
    assumptions: [
      "H1: renfort disponible à J+1",
      "H2: polyvalence cuisine / comptoir validée",
      "H3: menu delivery réductible 90 min",
    ],
    columns: [
      { label: "Base", value: "100", color: "text-ink-600" },
      { label: "Recommandé", value: "92", color: "text-proof-500" },
      { label: "Réel", value: "94", color: "text-signal-500" },
    ],
    compareLabels: ["faible", "moyen", "faible", "élevé"],
  },
  en: {
    riskLabel: "Network rush under pressure",
    retainedDecision: "Retained decision",
    assumptions: [
      "H1: reinforcement available on D+1",
      "H2: kitchen / counter versatility confirmed",
      "H3: delivery menu reducible for 90 min",
    ],
    columns: [
      { label: "Baseline", value: "100", color: "text-ink-600" },
      { label: "Recommended", value: "92", color: "text-proof-500" },
      { label: "Actual", value: "94", color: "text-signal-500" },
    ],
    compareLabels: ["low", "medium", "low", "high"],
  },
} as const;

function MethodVisualSee({ locale }: { locale: Locale }) {
  const sites =
    locale === "fr"
      ? [
          { name: "Paris Voltaire", load: 91, status: "risk" as const },
          { name: "Lille République", load: 84, status: "warning" as const },
          { name: "Lyon Part-Dieu", load: 73, status: "ok" as const },
          { name: "Nantes Centre", load: 88, status: "warning" as const },
        ]
      : [
          { name: "Paris Voltaire", load: 91, status: "risk" as const },
          { name: "Lille Republique", load: 84, status: "warning" as const },
          { name: "Lyon Part-Dieu", load: 73, status: "ok" as const },
          { name: "Nantes Centre", load: 88, status: "warning" as const },
        ];

  const riskLabel = methodVisualCopy[locale].riskLabel;

  return (
    <div className="space-y-2">
      {sites.map((site) => (
        <div
          key={site.name}
          className="flex items-center gap-2.5 rounded-lg border border-v2-border-100 px-3 py-2"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              site.status === "risk"
                ? "bg-danger-500"
                : site.status === "warning"
                  ? "bg-risk-500"
                  : "bg-success-500",
            )}
          />
          <span className="flex-1 text-xs font-medium text-ink-950">
            {site.name}
          </span>
          <span className="font-mono text-xs text-ink-600">{site.load}%</span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-100">
            <div
              className={cn(
                "h-full rounded-full",
                site.status === "risk"
                  ? "bg-danger-500"
                  : site.status === "warning"
                    ? "bg-risk-500"
                    : "bg-proof-500",
              )}
              style={{ width: `${site.load}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-lg bg-risk-100 px-3 py-2 text-xs font-medium text-risk-500">
        <span className="h-2 w-2 rounded-full bg-risk-500" />
        {riskLabel}
      </div>
    </div>
  );
}

function MethodVisualCompare({ locale }: { locale: Locale }) {
  const labels = methodVisualCopy[locale].compareLabels;
  const options =
    locale === "fr"
      ? ["Renfort local", "Réallocation", "Menu delivery", "Heures sup"]
      : ["Local reinforcement", "Reallocation", "Delivery menu", "Overtime"];

  return (
    <div className="space-y-1.5">
      {options.map((option, index) => (
        <div
          key={option}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
            index === 2
              ? "border-proof-500 bg-proof-100 font-medium"
              : "border-v2-border-100 bg-surface-50",
          )}
        >
          <span className="text-ink-950">{option}</span>
          <div className="flex gap-3 font-mono text-ink-600">
            <span>{[96, 91, 84, 108][index]}</span>
            <span>{labels[index]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MethodVisualDecide({ locale }: { locale: Locale }) {
  const copy = methodVisualCopy[locale];
  const decisionLabel =
    locale === "fr"
      ? "Réallocation + menu delivery réduit"
      : "Reallocation + reduced delivery menu";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border-l-4 border-proof-500 bg-proof-100 px-4 py-3">
        <p className="text-xs font-semibold text-ink-950">
          {copy.retainedDecision}
        </p>
        <p className="mt-1 text-xs text-ink-700">{decisionLabel}</p>
      </div>
      <div className="space-y-1 px-1 text-xs text-ink-600">
        {copy.assumptions.map((assumption) => (
          <p key={assumption}>{assumption}</p>
        ))}
      </div>
    </div>
  );
}

function MethodVisualProve({ locale }: { locale: Locale }) {
  const columns = methodVisualCopy[locale].columns;

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {columns.map((column) => (
        <div key={column.label} className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-600">
            {column.label}
          </p>
          <p className={cn("font-mono text-2xl font-semibold", column.color)}>
            {column.value}
          </p>
          <div
            className={cn(
              "mx-auto w-3 rounded-full",
              column.label === columns[0]?.label
                ? "bg-ink-800"
                : column.label === columns[1]?.label
                  ? "bg-proof-500"
                  : "bg-signal-500",
            )}
            style={{ height: `${parseInt(column.value, 10) * 0.6}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function MethodVisual({ id, locale }: { id: string; locale: Locale }) {
  switch (id) {
    case "voir":
      return <MethodVisualSee locale={locale} />;
    case "comparer":
      return <MethodVisualCompare locale={locale} />;
    case "decider":
      return <MethodVisualDecide locale={locale} />;
    case "prouver":
      return <MethodVisualProve locale={locale} />;
    default:
      return null;
  }
}

function DesktopMethodLayout({
  activeIndex,
  activeVisualId,
  locale,
  steps,
}: {
  activeIndex: number;
  activeVisualId: string;
  locale: Locale;
  steps: MethodStep[];
}) {
  return (
    <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10">
      <div className="col-span-5">
        <div className="sticky top-[calc(var(--header-h)+2rem)]">
          <div className="rounded-panel border border-v2-border-200 bg-surface-0 p-6 shadow-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeVisualId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <MethodVisual id={activeVisualId} locale={locale} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="col-span-7 space-y-6">
        {steps.map((step, index) => (
          <MethodStepCard
            key={step.id}
            step={step}
            active={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}

function MobileMethodLayout({
  locale,
  steps,
}: {
  locale: Locale;
  steps: MethodStep[];
}) {
  return (
    <div className="space-y-6 lg:hidden">
      {steps.map((step) => (
        <div
          key={step.id}
          className="rounded-card border border-v2-border-200 bg-surface-0 p-5"
        >
          <div className="mb-4 rounded-lg bg-surface-50 p-4">
            <MethodVisual id={step.id} locale={locale} />
          </div>
          <MethodStepContent step={step} />
        </div>
      ))}
    </div>
  );
}

export function MethodBlockClient({
  locale,
  steps,
}: MethodBlockClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const nextIndex = Math.min(
      Math.floor(value * steps.length),
      steps.length - 1,
    );
    setActiveIndex(Math.max(0, nextIndex));
  });

  const activeVisualId = VISUAL_IDS[activeIndex] ?? "voir";

  if (prefersReduced) {
    return (
      <div className="mt-12 space-y-6">
        {steps.map((step) => (
          <MethodStepCard key={step.id} step={step} active />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mt-14">
      <DesktopMethodLayout
        activeIndex={activeIndex}
        activeVisualId={activeVisualId}
        locale={locale}
        steps={steps}
      />
      <MobileMethodLayout locale={locale} steps={steps} />
    </div>
  );
}

function MethodStepCard({
  step,
  active,
}: {
  step: MethodStep;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-6 transition-all duration-300",
        active
          ? "border-l-4 border-l-proof-500 border-t-v2-border-200 border-r-v2-border-200 border-b-v2-border-200 bg-surface-0 shadow-1"
          : "border-v2-border-100 bg-transparent",
      )}
    >
      <MethodStepContent step={step} active={active} />
    </div>
  );
}

function MethodStepContent({
  step,
  active = true,
}: {
  step: MethodStep;
  active?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        {active ? (
          <span
            className="h-2 w-2 rounded-full bg-signal-500"
            aria-hidden="true"
          />
        ) : null}
        <span className="font-mono text-sm text-proof-500">{step.number}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-600">
          {step.verb}
        </span>
      </div>
      <h3
        className={cn(
          "mt-3 text-lg font-semibold tracking-tight",
          active ? "text-ink-950" : "text-ink-700",
        )}
      >
        {step.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{step.body}</p>
      <ul className="mt-3 space-y-1">
        {step.bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-sm text-ink-600"
          >
            <span
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-600"
              aria-hidden="true"
            />
            {bullet}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-xs text-signal-500">
        {step.microproof}
      </p>
    </>
  );
}
