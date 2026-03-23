"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DecisionEngineConfigVersion,
  ResolvedDecisionEngineConfig,
} from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import { AsyncDataTableBlock } from "./async-data-table-block";
import { DecisionConfigCard } from "./decision-config-card";
import { buildVersionColumns } from "./config-columns";
import {
  compactVersionId,
  createDecisionConfigOperations,
  formatDateTime,
  toLocalDateTimeInputValue,
} from "./config-operations";
import type {
  ConfigActionHandlers,
  DecisionConfigDraftState,
  DecisionConfigRecomputeResponse,
} from "./config-types";

interface DecisionConfigSectionProps extends ConfigActionHandlers {
  orgId: string;
  selectedSiteId: string | null;
  canManageConfig: boolean;
}

function useDecisionConfigQueries(
  orgId: string,
  selectedSiteId: string | null,
) {
  const resolvedUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgDecisionConfigResolved(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgDecisionConfigResolved(orgId);
  const versionsUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgDecisionConfigVersions(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgDecisionConfigVersions(orgId);

  return {
    resolved: useApiGet<ResolvedDecisionEngineConfig>(resolvedUrl),
    versions: useApiGet<DecisionEngineConfigVersion[]>(versionsUrl),
  };
}

function useDecisionConfigDraft(
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined,
): DecisionConfigDraftState & {
  setLastRecompute: (value: DecisionConfigRecomputeResponse | null) => void;
} {
  const [effectiveAtInput, setEffectiveAtInput] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [payloadDraft, setPayloadDraft] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [recomputeAlertId, setRecomputeAlertId] = useState("alt-001");
  const [lastRecompute, setLastRecompute] =
    useState<DecisionConfigRecomputeResponse | null>(null);

  useEffect(() => {
    if (!resolvedConfig?.payload) return;
    setPayloadDraft(JSON.stringify(resolvedConfig.payload, null, 2));
  }, [resolvedConfig?.versionId]);

  return {
    effectiveAtInput,
    setEffectiveAtInput,
    payloadDraft,
    setPayloadDraft,
    changeReason,
    setChangeReason,
    recomputeAlertId,
    setRecomputeAlertId,
    lastRecompute,
    setLastRecompute,
  };
}

function useDecisionConfigMeta(
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined,
) {
  const horizons = useMemo(
    () =>
      [...(resolvedConfig?.payload?.horizons ?? [])].sort(
        (left, right) => left.rank - right.rank,
      ),
    [resolvedConfig],
  );

  return {
    horizons,
    activeHorizon:
      horizons.find((horizon) => horizon.active && horizon.isDefault) ??
      horizons.find((horizon) => horizon.active) ??
      null,
  };
}

function useDecisionConfigSectionModel({
  orgId,
  selectedSiteId,
  canManageConfig,
  ...actions
}: DecisionConfigSectionProps) {
  const queries = useDecisionConfigQueries(orgId, selectedSiteId);
  const draft = useDecisionConfigDraft(queries.resolved.data);
  const meta = useDecisionConfigMeta(queries.resolved.data);
  const operations = createDecisionConfigOperations({
    orgId,
    selectedSiteId,
    resolvedConfig: queries.resolved.data,
    effectiveAtInput: draft.effectiveAtInput,
    payloadDraft: draft.payloadDraft,
    changeReason: draft.changeReason,
    recomputeAlertId: draft.recomputeAlertId,
    canManageConfig,
    setLastRecompute: draft.setLastRecompute,
    refetchResolvedConfig: queries.resolved.refetch,
    refetchDecisionConfigVersions: queries.versions.refetch,
    ...actions,
  });
  const versionColumns = buildVersionColumns({
    compactVersionId,
    formatDateTime,
    canManageConfig,
    actionLoading: actions.actionLoading,
    onRollback: (version) => {
      operations.rollbackVersion(version).catch(() => undefined);
    },
    onCancel: (version) => {
      operations.cancelScheduledVersion(version).catch(() => undefined);
    },
  });

  return {
    queries,
    draft,
    meta,
    operations,
    versionColumns,
    canManageConfig,
    actionLoading: actions.actionLoading,
  };
}

type DecisionConfigPrimaryContentProps = {
  model: ReturnType<typeof useDecisionConfigSectionModel>;
};

function DecisionConfigPrimaryContent(
  props: Readonly<DecisionConfigPrimaryContentProps>,
) {
  const { model } = props;
  if (model.queries.resolved.loading) return <SkeletonCard />;
  if (model.queries.resolved.error) {
    return (
      <ErrorFallback
        message={model.queries.resolved.error}
        onRetry={model.queries.resolved.refetch}
      />
    );
  }

  return (
    <DecisionConfigCard
      resolvedConfig={model.queries.resolved.data}
      activeHorizon={model.meta.activeHorizon}
      horizons={model.meta.horizons}
      draft={model.draft}
      canManageConfig={model.canManageConfig}
      actionLoading={model.actionLoading}
      onSchedule={() => {
        model.operations
          .scheduleVersionFromCurrentConfig()
          .catch(() => undefined);
      }}
      onRecompute={() => {
        model.operations.recomputeScenario().catch(() => undefined);
      }}
    />
  );
}

export function DecisionConfigSection(
  props: Readonly<DecisionConfigSectionProps>,
) {
  const {
    orgId,
    selectedSiteId,
    canManageConfig,
    actionLoading,
    actionError,
    actionSuccess,
    setActionLoading,
    setActionError,
    setActionSuccess,
  } = props;
  const model = useDecisionConfigSectionModel({
    orgId,
    selectedSiteId,
    canManageConfig,
    actionLoading,
    actionError,
    actionSuccess,
    setActionLoading,
    setActionError,
    setActionSuccess,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink-secondary">
          Moteur de recommandation
        </h3>
        <DecisionConfigPrimaryContent model={model} />
      </div>
      <AsyncDataTableBlock
        title="Versions decision-config"
        loading={model.queries.versions.loading}
        error={model.queries.versions.error}
        onRetry={model.queries.versions.refetch}
        columns={model.versionColumns}
        data={model.queries.versions.data ?? []}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}
