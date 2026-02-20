"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { DecisionQueueItem } from "@praedixa/shared-types";
import { ChartInsight } from "./chart-insight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScenarioComparisonChartProps {
  queue: DecisionQueueItem[];
}

type BarVariant = "primary" | "secondary";

interface ScenarioPoint {
  label: string;
  value: number;
  helper: string;
  variant?: BarVariant;
  color: string;
}

function buildScenarioPoints(queue: DecisionQueueItem[]): ScenarioPoint[] {
  const estimatedImpact = queue.reduce(
    (sum, item) => sum + (item.estimatedImpactEur ?? 0),
    0,
  );
  const unresolvedGap = queue.reduce((sum, item) => sum + item.gapH, 0);
  const urgentQueue = queue.filter(
    (item) => (item.timeToBreachHours ?? 9999) <= 24,
  ).length;

  return [
    {
      label: "Impact financier",
      value: Math.max(estimatedImpact, 3000),
      helper: `${Math.round(estimatedImpact).toLocaleString("fr-FR")} EUR en jeu`,
      color: "var(--warning)",
    },
    {
      label: "Heures a couvrir",
      value: Math.max(unresolvedGap * 180, 2000),
      helper: `${unresolvedGap.toFixed(1)} h a arbitrer`,
      color: "var(--chart-1)",
    },
    {
      label: "Urgence < 24h",
      value: Math.max(urgentQueue * 950, 1200),
      helper: `${urgentQueue} alertes avant rupture`,
      color: "var(--chart-2)",
    },
  ];
}

export function ScenarioComparisonChart({
  queue,
}: ScenarioComparisonChartProps) {
  const points = useMemo(() => buildScenarioPoints(queue), [queue]);
  const maxValue = Math.max(...points.map((point) => point.value));

  const insight =
    queue.length === 0
      ? "Pas de file d'urgence active. La capacite reste maitrisable sur l'horizon courant."
      : `${queue.length} sujet(s) en file de traitement. Priorite: limiter l'impact financier des alertes avec rupture < 24h.`;

  return (
    <Card className="h-full" variant="elevated" noPadding>
      <CardHeader>
        <CardTitle>Indice d'exposition immediate</CardTitle>
        <p className="mt-1 text-sm text-ink-secondary">
          Lecture synthese pour arbitrer l'ordre de traitement.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <ChartInsight
          insight={insight}
          trend={queue.length > 0 ? "negative" : "positive"}
        />

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          {points.map((point, idx) => {
            const width = `${(point.value / (maxValue || 1)) * 100}%`;
            return (
              <div key={point.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span className="font-semibold text-ink">{point.label}</span>
                  <span>{point.helper}</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-alt">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width,
                      backgroundColor: point.color,
                      transformOrigin: "left",
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      delay: idx * 0.15,
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-ink-secondary">
          Cet indice combine le cout potentiel, le volume d'heures manquantes et
          le temps avant rupture pour structurer la priorisation.
        </p>
      </CardContent>
    </Card>
  );
}
