"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { CoverageAlert } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { formatSeverity } from "@/lib/formatters";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-600 bg-red-50",
  high: "text-red-500 bg-red-50",
  medium: "text-amber-600 bg-amber-50",
  low: "text-gray-600 bg-gray-50",
};

const DRIVER_LABELS: Record<string, string> = {
  absence_rate: "Taux d'absence eleve",
  seasonal_peak: "Pic saisonnier",
  understaffing: "Sous-effectif",
  overtime_limit: "Limite d'heures sup atteinte",
  turnover: "Rotation du personnel",
  training: "Collaborateurs en formation",
  sick_leave: "Arrets maladie",
  vacation: "Conges en cours",
};

function formatDriver(driver: string): string {
  return DRIVER_LABELS[driver] ?? driver.replace(/_/g, " ");
}

interface NextActionCardProps {
  alerts: CoverageAlert[] | null;
  loading: boolean;
}

export function NextActionCard({ alerts, loading }: NextActionCardProps) {
  if (loading) {
    return <SkeletonCard />;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <DetailCard className="border-l-4 border-l-green-400 bg-green-50/30">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            Tous vos sites sont couverts pour les prochains jours
          </p>
        </div>
      </DetailCard>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const sevDiff =
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    return b.gapH - a.gapH;
  });

  const top = sorted[0];
  const severityColor = SEVERITY_COLORS[top.severity] ?? "";

  return (
    <DetailCard>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal">
              {top.siteId} —{" "}
              {new Date(top.alertDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              })}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Poste : {top.shift}</p>
          </div>
          <Badge className={severityColor}>
            {formatSeverity(top.severity)}
          </Badge>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-charcoal">{top.gapH}h</span>
          <span className="text-sm text-gray-500">manquantes</span>
        </div>

        {top.driversJson && top.driversJson.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {top.driversJson.map((driver) => (
              <span
                key={driver}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
              >
                {formatDriver(driver)}
              </span>
            ))}
          </div>
        )}

        <Link
          href="/actions"
          className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Voir les solutions
        </Link>
      </div>
    </DetailCard>
  );
}
