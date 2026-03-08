export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateOrDash(value: string | null): string {
  if (!value) return "-";
  return formatDateFull(value);
}

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Elevee",
  medium: "Moderee",
  low: "Faible",
};

export const HORIZON_LABELS: Record<string, string> = {
  j3: "A 3 jours",
  j7: "A 7 jours",
  j14: "A 14 jours",
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  open: "En cours",
  acknowledged: "Prise en compte",
  resolved: "Resolue",
};

export function formatSeverity(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function formatHorizon(horizon: string): string {
  const trimmed = horizon.trim();
  if (trimmed.length === 0) return horizon;
  const fallback = HORIZON_LABELS[trimmed];
  if (fallback) return fallback;
  const dynamicMatch = /^j(\d+)$/i.exec(trimmed);
  if (dynamicMatch) {
    return `A ${Number(dynamicMatch[1])} jours`;
  }
  return horizon;
}

export function formatAlertStatus(status: string): string {
  return ALERT_STATUS_LABELS[status] ?? status;
}

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} EUR`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)}%`;
}

export function formatPercentFromDecimal(value: number | undefined): string {
  if (typeof value !== "number") return "--";
  return `${Math.round(value * 100)}%`;
}

type BadgeVariant = "destructive" | "default" | "secondary";

const SEVERITY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function getSeverityBadgeVariant(
  severity: string,
): BadgeVariant | "default" {
  return SEVERITY_BADGE_VARIANT[severity] ?? "default";
}
