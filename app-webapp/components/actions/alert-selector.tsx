"use client";

import type { CoverageAlert } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { Badge } from "@/components/ui/badge";
import { DetailCard } from "@/components/ui/detail-card";
import { formatSeverity } from "@/lib/formatters";

const SEVERITY_VARIANT: Record<
  string,
  "error" | "warning" | "info" | "default"
> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "info",
};

interface AlertSelectorProps {
  alerts: CoverageAlert[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function AlertSelector({
  alerts,
  selectedId,
  onSelect,
  loading,
}: AlertSelectorProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="w-56" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {alerts.map((alert) => (
        <DetailCard
          key={alert.id}
          padding="compact"
          className={`w-56 cursor-pointer transition-shadow hover:shadow-card ${
            selectedId === alert.id ? "ring-2 ring-amber-500" : ""
          }`}
          onClick={() => onSelect(alert.id)}
          data-testid={`alert-card-${alert.id}`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-charcoal">
                {alert.siteId}
              </span>
              <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "default"}>
                {formatSeverity(alert.severity)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              {alert.alertDate} — {alert.shift}
            </p>
            <p className="text-xs text-gray-600">
              Ecart : <span className="font-semibold">{alert.gapH}h</span>
            </p>
          </div>
        </DetailCard>
      ))}
    </div>
  );
}
