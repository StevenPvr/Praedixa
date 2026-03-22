"use client";

import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/components/ui/status-badge";

const ONBOARDING_MAP: Record<
  string,
  { variant: StatusBadgeProps["variant"]; label: string }
> = {
  draft: { variant: "neutral", label: "Brouillon" },
  in_progress: { variant: "info", label: "En cours" },
  blocked: { variant: "danger", label: "Bloque" },
  ready_limited: { variant: "warning", label: "Pret pilote" },
  ready_full: { variant: "success", label: "Pret complet" },
  active_limited: { variant: "info", label: "Actif pilote" },
  active_full: { variant: "success", label: "Actif complet" },
  completed: { variant: "success", label: "Termine" },
  cancelled: { variant: "danger", label: "Annule" },
};

export type OnboardingStatus = keyof typeof ONBOARDING_MAP;

type OnboardingStatusBadgeProps = Readonly<{
  status: OnboardingStatus;
  size?: StatusBadgeProps["size"];
  className?: string;
}>;

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
