"use client";

import { StatusBadge, Skeleton } from "@praedixa/ui";
import type { ArbitrageResult } from "@praedixa/shared-types";

const severityVariant: Record<
  ArbitrageResult["alertSeverity"],
  "neutral" | "warning" | "danger"
> = {
  info: "neutral",
  warning: "warning",
  error: "danger",
  critical: "danger",
};

const severityLabel: Record<ArbitrageResult["alertSeverity"], string> = {
  info: "Info",
  warning: "Attention",
  error: "Erreur",
  critical: "Critique",
};

interface ArbitrageContextProps {
  result: ArbitrageResult | null;
  loading: boolean;
}

export function ArbitrageContext({ result, loading }: ArbitrageContextProps) {
  if (loading || !result) {
    return (
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <Skeleton className="h-5 w-48" />
        <div className="mt-3 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge
          variant={severityVariant[result.alertSeverity]}
          label={severityLabel[result.alertSeverity]}
          size="sm"
        />
        <h2 className="text-lg font-semibold text-charcoal">
          {result.alertTitle}
        </h2>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
        <span>
          Site :{" "}
          <span className="font-medium text-charcoal">{result.siteName}</span>
        </span>
        <span>
          Departement :{" "}
          <span className="font-medium text-charcoal">
            {result.departmentName}
          </span>
        </span>
        <span>
          Deficit :{" "}
          <span className="font-medium text-charcoal">
            {result.deficitPct}%
          </span>
        </span>
        <span>
          Horizon :{" "}
          <span className="font-medium text-charcoal">
            {result.horizonDays} jours
          </span>
        </span>
      </div>
    </div>
  );
}
