"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "../../lib/utils";
import type { MethodStep } from "../../lib/content/value-prop/shared";

interface MethodBlockClientProps {
  steps: MethodStep[];
}

const VISUAL_IDS = ["voir", "comparer", "decider", "prouver"] as const;

function MethodVisualSee() {
  const sites = [
    { name: "Site Lyon", load: 92, status: "risk" as const },
    { name: "Site Lille", load: 78, status: "ok" as const },
    { name: "Site Nantes", load: 41, status: "ok" as const },
    { name: "Site Bordeaux", load: 88, status: "warning" as const },
  ];
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
        Tension multi-sites
      </div>
    </div>
  );
}

function MethodVisualCompare() {
  return (
    <div className="space-y-1.5">
      {["A", "B", "C", "D"].map((option, index) => (
        <div
          key={option}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
            index === 2
              ? "border-proof-500 bg-proof-100 font-medium"
              : "border-v2-border-100 bg-surface-50",
          )}
        >
          <span className="text-ink-950">Option {option}</span>
          <div className="flex gap-3 font-mono text-ink-600">
            <span>{[92, 118, 85, 105][index]}</span>
            <span>{["Low", "Med", "Low", "High"][index]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MethodVisualDecide() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border-l-4 border-proof-500 bg-proof-100 px-4 py-3">
        <p className="text-xs font-semibold text-ink-950">Retained decision</p>
        <p className="mt-1 text-xs text-ink-700">
          Option C — Cross-site reallocation
        </p>
      </div>
      <div className="space-y-1 px-1 text-xs text-ink-600">
        <p>H1: Coordination effective</p>
        <p>H2: Capacity available J+2</p>
        <p>H3: Service risk acceptable</p>
      </div>
    </div>
  );
}

function MethodVisualProve() {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {[
        { label: "Baseline", value: "100", color: "text-ink-600" },
        { label: "Recommended", value: "85", color: "text-proof-500" },
        { label: "Actual", value: "88", color: "text-signal-500" },
      ].map((column) => (
        <div key={column.label} className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-600">
            {column.label}
          </p>
          <p className={cn("font-mono text-2xl font-semibold", column.color)}>
            {column.value}
          </p>
          <div
            className={cn(
              "mx-auto h-12 w-3 rounded-full",
              column.label === "Baseline"
                ? "bg-ink-800"
                : column.label === "Recommended"
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

function MethodVisual({ id }: { id: string }) {
  switch (id) {
    case "voir":
      return <MethodVisualSee />;
    case "comparer":
      return <MethodVisualCompare />;
    case "decider":
      return <MethodVisualDecide />;
    case "prouver":
      return <MethodVisualProve />;
    default:
      return null;
  }
}

function DesktopMethodLayout({
  activeIndex,
  activeVisualId,
  steps,
}: {
  activeIndex: number;
  activeVisualId: string;
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
                <MethodVisual id={activeVisualId} />
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

function MobileMethodLayout({ steps }: { steps: MethodStep[] }) {
  return (
    <div className="space-y-6 lg:hidden">
      {steps.map((step) => (
        <div
          key={step.id}
          className="rounded-card border border-v2-border-200 bg-surface-0 p-5"
        >
          <div className="mb-4 rounded-lg bg-surface-50 p-4">
            <MethodVisual id={step.id} />
          </div>
          <MethodStepContent step={step} />
        </div>
      ))}
    </div>
  );
}

export function MethodBlockClient({ steps }: MethodBlockClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(Math.floor(v * steps.length), steps.length - 1);
    setActiveIndex(Math.max(0, idx));
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
        steps={steps}
      />
      <MobileMethodLayout steps={steps} />
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
        {active && (
          <span
            className="h-2 w-2 rounded-full bg-signal-500"
            aria-hidden="true"
          />
        )}
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
        {step.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-ink-600">
            <span
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-600"
              aria-hidden="true"
            />
            {b}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-xs text-signal-500">
        {step.microproof}
      </p>
    </>
  );
}
