"use client";

import {
  StatusBadge,
  type StatusBadgeProps,
} from "@/components/ui/status-badge";

const SEVERITY_MAP: Record<
  string,
  { variant: StatusBadgeProps["variant"]; label: string }
> = {
  INFO: { variant: "neutral", label: "Info" },
  WARNING: { variant: "warning", label: "Attention" },
  CRITICAL: { variant: "danger", label: "Critique" },
};

export type Severity = keyof typeof SEVERITY_MAP;

interface SeverityBadgeProps {
  severity: Severity;
  size?: StatusBadgeProps["size"];
  className?: string;
}

export function SeverityBadge({
  severity,
  size = "sm",
  className,
}: SeverityBadgeProps) {
  const mapping = SEVERITY_MAP[severity] ?? {
    variant: "neutral" as const,
    label: severity,
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
