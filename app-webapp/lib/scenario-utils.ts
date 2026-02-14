import type { CoverageAlert } from "@praedixa/shared-types";

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  mid: number;
}

export function simulateCostCI(cost: number): ConfidenceInterval {
  return { lower: cost * 0.8, upper: cost * 1.2, mid: cost };
}

export function simulateServiceCI(service: number): ConfidenceInterval {
  return {
    lower: Math.max(0, service - 5),
    upper: Math.min(100, service + 3),
    mid: service,
  };
}

export function formatCostRange(ci: ConfidenceInterval): string {
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
  return `${fmt(ci.mid)} EUR (${fmt(ci.lower)} — ${fmt(ci.upper)} EUR)`;
}

export const OPTION_TYPE_LABELS: Record<string, string> = {
  hs: "Heures supplementaires",
  interim: "Interim",
  realloc_intra: "Reallocation intra-site",
  realloc_inter: "Reallocation inter-sites",
  service_adjust: "Ajustement du service",
  outsource: "Sous-traitance",
};

export function getOptionLabel(optionType: string): string {
  return OPTION_TYPE_LABELS[optionType] ?? optionType;
}

export function sortAlertsBySeverity(alerts: CoverageAlert[]): CoverageAlert[] {
  return [...alerts].toSorted((a, b) => {
    const diff =
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
    return diff !== 0 ? diff : b.gapH - a.gapH;
  });
}
