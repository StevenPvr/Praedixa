/**
 * Centralized label mappers for translating backend enum values
 * to user-facing French labels in the webapp.
 */

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
  return HORIZON_LABELS[horizon] ?? horizon;
}

export function formatAlertStatus(status: string): string {
  return ALERT_STATUS_LABELS[status] ?? status;
}
