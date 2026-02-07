import { StatusBadge } from "@praedixa/ui";
import type { DecisionStatus } from "@praedixa/shared-types";

/* ────────────────────────────────────────────── */
/*  Status → StatusBadge variant mapping           */
/* ────────────────────────────────────────────── */

const statusVariant: Record<
  DecisionStatus,
  "info" | "warning" | "success" | "danger" | "neutral"
> = {
  suggested: "info",
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  implemented: "success",
  expired: "neutral",
};

const statusLabel: Record<DecisionStatus, string> = {
  suggested: "Suggeree",
  pending_review: "En attente",
  approved: "Approuvee",
  rejected: "Rejetee",
  implemented: "Implementee",
  expired: "Expiree",
};

/* ────────────────────────────────────────────── */
/*  Component                                      */
/* ────────────────────────────────────────────── */

interface DecisionStatusBadgeProps {
  status: DecisionStatus;
  size?: "sm" | "md";
}

export function DecisionStatusBadge({
  status,
  size = "sm",
}: DecisionStatusBadgeProps) {
  return (
    <StatusBadge
      variant={statusVariant[status]}
      label={statusLabel[status]}
      size={size}
    />
  );
}

/** Expose mappings for direct use in DataTable columns */
export { statusVariant, statusLabel };
