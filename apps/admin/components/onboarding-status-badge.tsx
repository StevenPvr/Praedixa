"use client";

import { StatusBadge, type StatusBadgeProps } from "@praedixa/ui";

const ONBOARDING_MAP: Record<
  string,
  { variant: StatusBadgeProps["variant"]; label: string }
> = {
  in_progress: { variant: "info", label: "En cours" },
  completed: { variant: "success", label: "Termine" },
  abandoned: { variant: "danger", label: "Abandonne" },
};

export type OnboardingStatus = keyof typeof ONBOARDING_MAP;

interface OnboardingStatusBadgeProps {
  status: OnboardingStatus;
  size?: StatusBadgeProps["size"];
  className?: string;
}

export function OnboardingStatusBadge({
  status,
  size,
  className,
}: OnboardingStatusBadgeProps) {
  const mapping = ONBOARDING_MAP[status] ?? {
    variant: "neutral" as const,
    label: status,
  };

  return (
    <StatusBadge
      variant={mapping.variant}
      label={mapping.label}
      size={size}
      className={className}
    />
  );
}
