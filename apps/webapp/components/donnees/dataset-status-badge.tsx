"use client";

import type { DatasetStatus } from "@praedixa/shared-types";
import { StatusBadge } from "@praedixa/ui";

const STATUS_MAP: Record<
  DatasetStatus,
  { variant: "success" | "warning" | "info" | "neutral"; label: string }
> = {
  active: { variant: "success", label: "Actif" },
  pending: { variant: "warning", label: "En attente" },
  migrating: { variant: "info", label: "Migration" },
  archived: { variant: "neutral", label: "Archive" },
};

interface DatasetStatusBadgeProps {
  status: DatasetStatus;
}

export function DatasetStatusBadge({ status }: DatasetStatusBadgeProps) {
  const config = STATUS_MAP[status];
  return <StatusBadge variant={config.variant} label={config.label} />;
}
