"use client";

import type { ResolvedDecisionEngineConfig } from "@praedixa/shared-types";
import { Card, CardContent } from "@praedixa/ui";

import type { DecisionConfigDraftState } from "./config-types";
import {
  DecisionConfigControls,
  DecisionConfigSummary,
} from "./decision-config-card-sections";

type DecisionConfigCardProps = {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
  draft: DecisionConfigDraftState;
  canManageConfig: boolean;
  actionLoading: string | null;
  onSchedule: () => void;
  onRecompute: () => void;
};

export function DecisionConfigCard(props: Readonly<DecisionConfigCardProps>) {
  const {
    resolvedConfig,
    activeHorizon,
    horizons,
    draft,
    canManageConfig,
    actionLoading,
    onSchedule,
    onRecompute,
  } = props;
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <DecisionConfigSummary
          resolvedConfig={resolvedConfig}
          activeHorizon={activeHorizon}
          horizons={horizons}
        />
        <DecisionConfigControls
          resolvedConfig={resolvedConfig}
          draft={draft}
          canManageConfig={canManageConfig}
          actionLoading={actionLoading}
          onSchedule={onSchedule}
          onRecompute={onRecompute}
        />
      </CardContent>
    </Card>
  );
}
