"use client";

import { useMemo } from "react";
import type { ProofPack } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { WaterfallChart } from "@/components/ui/waterfall-chart";
import { AnimatedSection } from "@/components/animated-section";
import { buildWaterfallFromProofs } from "@/lib/rapports-helpers";

interface CoutsTabProps {
  proofs: ProofPack[] | null;
  loading: boolean;
}

export function CoutsTab({ proofs, loading }: CoutsTabProps) {
  const stats = useMemo(() => {
    const rows = proofs ?? [];
    const totalBau = rows.reduce((sum, row) => sum + row.coutBauEur, 0);
    const totalReel = rows.reduce((sum, row) => sum + row.coutReelEur, 0);
    const totalGain = rows.reduce((sum, row) => sum + row.gainNetEur, 0);

    return { totalBau, totalReel, totalGain };
  }, [proofs]);

  return (
    <AnimatedSection>
      <section aria-label="Analyse des couts" className="space-y-4">
        {loading ? (
          <StatusBanner
            variant="info"
            title="Consolidation financiere en cours"
          >
            Preparation des indicateurs de couts et des economies nettes.
          </StatusBanner>
        ) : stats.totalGain > 0 ? (
          <StatusBanner
            variant="success"
            title="Performance economique positive"
          >
            Les actions appliquees generent un gain net cumule.
          </StatusBanner>
        ) : (
          <StatusBanner
            variant="warning"
            title="Performance economique a optimiser"
          >
            Le gain net est insuffisant ou negatif sur la periode consolidee.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Cout sans intervention"
              value={
                loading
                  ? "..."
                  : `${Math.round(stats.totalBau).toLocaleString("fr-FR")} EUR`
              }
              status="neutral"
            />
            <MetricCard
              label="Cout observe"
              value={
                loading
                  ? "..."
                  : `${Math.round(stats.totalReel).toLocaleString("fr-FR")} EUR`
              }
              status="warning"
            />
            <MetricCard
              label="Gain net"
              value={
                loading
                  ? "..."
                  : `${Math.round(stats.totalGain).toLocaleString("fr-FR")} EUR`
              }
              status={stats.totalGain > 0 ? "good" : "danger"}
            />
          </div>
        </DetailCard>

        {loading ? (
          <SkeletonCard />
        ) : (
          <DetailCard padding="compact">
            {(proofs ?? []).length > 0 ? (
              <WaterfallChart
                items={buildWaterfallFromProofs(proofs ?? [])}
                formatValue={(v) =>
                  `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k EUR`
                }
              />
            ) : (
              <p className="py-8 text-center text-sm text-ink-secondary">
                Pas encore de donnees de couts. L'analyse apparaitra apres la
                cloture de votre premier mois.
              </p>
            )}
          </DetailCard>
        )}
      </section>
    </AnimatedSection>
  );
}
