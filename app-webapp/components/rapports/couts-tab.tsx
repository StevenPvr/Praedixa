"use client";

import type { ProofPack } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { WaterfallChart } from "@/components/ui/waterfall-chart";
import { AnimatedSection } from "@/components/animated-section";
import { buildWaterfallFromProofs } from "@/lib/rapports-helpers";

interface CoutsTabProps {
  proofs: ProofPack[] | null;
  loading: boolean;
}

export function CoutsTab({ proofs, loading }: CoutsTabProps) {
  return (
    <AnimatedSection>
      <section aria-label="Analyse des couts">
        <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
          Decomposition des couts
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Lecture recommandee: comparez le cout sans intervention, le gain
          genere par les actions, puis le cout final observe.
        </p>
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
              <p className="py-8 text-center text-sm text-gray-400">
                Pas encore de donnees de couts. L&apos;analyse apparaitra apres
                la cloture de votre premier mois.
              </p>
            )}
          </DetailCard>
        )}
      </section>
    </AnimatedSection>
  );
}
