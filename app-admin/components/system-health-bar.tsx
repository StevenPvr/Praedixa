import { Database, Server } from "lucide-react";
import { Card } from "@praedixa/ui";
import type { PlatformKPIs } from "@/lib/inbox-helpers";

type SystemHealthBarProps = Readonly<{
  kpis: PlatformKPIs;
}>;

export function SystemHealthBar({ kpis }: SystemHealthBarProps) {
  const ingestionSuccessRate = Number.isFinite(kpis.ingestionSuccessRate)
    ? kpis.ingestionSuccessRate
    : 0;
  const apiErrorRate = Number.isFinite(kpis.apiErrorRate)
    ? kpis.apiErrorRate
    : 0;

  const ingestionOk = ingestionSuccessRate >= 95;
  const apiOk = apiErrorRate <= 2;
  const ingestionTrackClassName = ingestionOk
    ? "bg-success-100"
    : "bg-danger-100";
  const ingestionFillClassName = ingestionOk
    ? "bg-success-500"
    : "bg-danger-500";
  const ingestionLabelClassName = ingestionOk
    ? "text-success-600"
    : "text-danger-600";
  const apiTrackClassName = apiOk ? "bg-success-100" : "bg-danger-100";
  const apiFillClassName = apiOk ? "bg-success-500" : "bg-danger-500";
  const apiLabelClassName = apiOk ? "text-success-600" : "text-danger-600";
  const ingestionProgress = `${Math.min(100, ingestionSuccessRate)}%`;
  const apiProgress = `${Math.min(100, apiErrorRate * 10)}%`;

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
        Sante plateforme
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-ink-placeholder" />
            <span className="text-sm text-ink-secondary">
              Taux d&apos;ingestion
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-6 w-24 overflow-hidden rounded-full ${ingestionTrackClassName}`}
            >
              <div
                className={`h-full rounded-full transition-all ${ingestionFillClassName}`}
                style={{ width: ingestionProgress }}
              />
            </div>
            <span className={`text-sm font-medium ${ingestionLabelClassName}`}>
              {ingestionSuccessRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-ink-placeholder" />
            <span className="text-sm text-ink-secondary">
              Taux d&apos;erreur API
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-6 w-24 overflow-hidden rounded-full ${apiTrackClassName}`}
            >
              <div
                className={`h-full rounded-full transition-all ${apiFillClassName}`}
                style={{ width: apiProgress }}
              />
            </div>
            <span className={`text-sm font-medium ${apiLabelClassName}`}>
              {apiErrorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
