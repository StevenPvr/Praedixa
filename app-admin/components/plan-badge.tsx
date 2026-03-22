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

type PlanBadgeProps = Readonly<{
  plan: string | null | undefined;
  className?: string;
}>;

const UNKNOWN_PLAN_STYLE = {
  bg: "bg-surface-sunken",
  text: "text-ink-secondary",
  label: "Inconnu",
} as const;

const PLAN_ALIASES: Record<string, { tier: PlanTier; label?: string }> = {
  pro: { tier: "professional", label: "Pro" },
  pilot: { tier: "starter", label: "Pilot" },
  core: { tier: "free", label: "Core" },
};

function resolvePlanStyle(plan: PlanBadgeProps["plan"]) {
  if (typeof plan === "string") {
    const normalized = plan.trim().toLowerCase();
    if (normalized in PLAN_STYLES) {
      return PLAN_STYLES[normalized as PlanTier];
    }

    const alias = PLAN_ALIASES[normalized];
    if (alias) {
      const base = PLAN_STYLES[alias.tier];
      return {
        ...base,
        label: alias.label ?? base.label,
      };
    }

    const fallbackLabel = plan.trim();
    return {
      ...UNKNOWN_PLAN_STYLE,
      label:
        fallbackLabel.length > 0 ? fallbackLabel : UNKNOWN_PLAN_STYLE.label,
    };
  }

  return UNKNOWN_PLAN_STYLE;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const style = resolvePlanStyle(plan);

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
