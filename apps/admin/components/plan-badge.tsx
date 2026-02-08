"use client";

import { cn } from "@praedixa/ui";

const PLAN_STYLES = {
  free: { bg: "bg-gray-100", text: "text-gray-600", label: "Free" },
  starter: { bg: "bg-blue-100", text: "text-blue-700", label: "Starter" },
  professional: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Pro",
  },
  enterprise: {
    bg: "bg-violet-100",
    text: "text-violet-700",
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
