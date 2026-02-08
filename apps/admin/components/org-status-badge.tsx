"use client";

import { StatusBadge, type StatusBadgeProps } from "@praedixa/ui";

const STATUS_MAP: Record<
  string,
  { variant: StatusBadgeProps["variant"]; label: string }
> = {
  active: { variant: "success", label: "Actif" },
  suspended: { variant: "warning", label: "Suspendu" },
  trial: { variant: "info", label: "Essai" },
  churned: { variant: "danger", label: "Churne" },
};

export type OrgStatus = keyof typeof STATUS_MAP;

interface OrgStatusBadgeProps {
  status: OrgStatus;
  size?: StatusBadgeProps["size"];
  className?: string;
}

export function OrgStatusBadge({
  status,
  size,
  className,
}: OrgStatusBadgeProps) {
  const mapping = STATUS_MAP[status] ?? { variant: "neutral" as const, label: status };

  return (
    <StatusBadge
      variant={mapping.variant}
      label={mapping.label}
      size={size}
      className={className}
    />
  );
}
