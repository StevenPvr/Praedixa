"use client";

import { cn } from "@praedixa/ui";

const PLAN_STYLES = {
  free: { bg: "bg-surface-sunken", text: "text-ink-secondary", label: "Free" },
  starter: { bg: "bg-info-light", text: "text-info-text", label: "Starter" },
  professional: {
    bg: "bg-primary-100",
    text: "text-primary-700",
    label: "Pro",
  },
  enterprise: {
    bg: "bg-primary-200",
    text: "text-primary-800",
    label: "Enterprise",
  },
} as const;

export type PlanTier = keyof typeof PLAN_STYLES;

interface PlanBadgeProps {
  plan: PlanTier;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const style = PLAN_STYLES[plan];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        style.bg,
        style.text,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
