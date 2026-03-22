"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  CoverageAlert,
  DecisionSummary,
  DecisionWorkspace,
  OperationalDecision,
  OperationalDecisionCreateRequest,
} from "@praedixa/shared-types";

import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useDecisionConfig } from "@/hooks/use-decision-config";
import {
  WEBAPP_RUNTIME_FEATURES,
  unavailableFeatureMessage,
} from "@/lib/runtime-features";
import { useSiteScope } from "@/lib/site-scope";

export const SEVERITY_FILTERS: Array<CoverageAlert["severity"] | "all"> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];

export function useActionsPageModel() {
  const searchParams = useSearchParams();
  const { selectedSiteId, appendSiteParam } = useSiteScope();
  const initialSeverity = searchParams.get("severity");

  const [activeTab, setActiveTab] = useState<"treatment" | "history">(
    "treatment",
  );
  const [severityFilter, setSeverityFilter] = useState<
    CoverageAlert["severity"] | "all"
  >(
    initialSeverity &&
      SEVERITY_FILTERS.includes(initialSeverity as CoverageAlert["severity"])
      ? (initialSeverity as CoverageAlert["severity"])
      : "all",
  );
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const { config: decisionConfig } = useDecisionConfig(selectedSiteId);
  const historyEnabled = WEBAPP_RUNTIME_FEATURES.operationalDecisionHistory;

  const horizonLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const horizon of decisionConfig?.payload?.horizons ?? []) {
      map.set(horizon.id, horizon.label);
    }
    return map;
  }, [decisionConfig]);

  const alertsUrl = useMemo(() => {
    const base = "/api/v1/live/coverage-alerts?status=open&page_size=200";
    if (severityFilter === "all") {
      return appendSiteParam(base);
    }
    return appendSiteParam(`${base}&severity=${severityFilter}`);
  }, [appendSiteParam, severityFilter]);

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl);

  const selectedAlert = useMemo(() => {
    if (!alerts || alerts.length === 0) {
      return null;
    }
    if (!selectedAlertId) {
      return alerts[0];
    }
    return alerts.find((item) => item.id === selectedAlertId) ?? alerts[0];
  }, [alerts, selectedAlertId]);

  const workspaceUrl = selectedAlert
    ? `/api/v1/live/decision-workspace/${selectedAlert.id}`
    : null;

  const {
    data: workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useApiGet<DecisionWorkspace>(workspaceUrl);

  useEffect(() => {
    if (!workspace) {
      return;
    }
    setSelectedOptionId(workspace.recommendedOptionId ?? null);
  }, [workspace?.alert?.id, workspace?.recommendedOptionId]);

  const requiresOverrideNotes =
    workspace?.recommendedOptionId != null &&
    selectedOptionId != null &&
    selectedOptionId !== workspace.recommendedOptionId;

  useEffect(() => {
    if (!requiresOverrideNotes) {
      setDecisionNotes("");
    }
  }, [requiresOverrideNotes]);

  const {
    mutate: submitDecision,
    loading: submitLoading,
    error: submitError,
  } = useApiPost<OperationalDecisionCreateRequest, OperationalDecision>(
    "/api/v1/operational-decisions",
  );

  const {
    data: historyRows,
    total: historyTotal,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApiGetPaginated<DecisionSummary>(
    historyEnabled
      ? "/api/v1/decisions?sort_by=created_at&sort_order=desc"
      : null,
    historyPage,
    20,
  );
  const historyUnavailableMessage = historyEnabled
    ? null
    : unavailableFeatureMessage("L'historique des decisions");

  async function handleValidateDecision(): Promise<void> {
    if (!selectedAlert || !selectedOptionId) {
      return;
    }

    const normalizedNotes = decisionNotes.trim();
    if (requiresOverrideNotes && normalizedNotes.length === 0) {
      return;
    }

    const payload: OperationalDecisionCreateRequest = {
      alertId: selectedAlert.id,
      optionId: selectedOptionId,
    };
    if (normalizedNotes.length > 0) {
      payload.notes = normalizedNotes;
    }

    const result = await submitDecision(payload);
    if (!result) {
      return;
    }

    setSelectedOptionId(null);
    setDecisionNotes("");
    refetchAlerts();
    refetchHistory();
  }

  function formatHorizonLabel(horizonId: string): string {
    return horizonLabels.get(horizonId) ?? horizonId.toUpperCase();
  }

  return {
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    selectedAlert,
    selectedOptionId,
    setSelectedOptionId,
    decisionNotes,
    setDecisionNotes,
    historyPage,
    setHistoryPage,
    alerts,
    alertsLoading,
    alertsError,
    workspace,
    workspaceLoading,
    workspaceError,
    historyRows,
    historyTotal,
    historyLoading,
    historyError: historyError ?? historyUnavailableMessage,
    historyEnabled,
    submitLoading,
    submitError,
    requiresOverrideNotes,
    options: workspace?.options ?? [],
    formatHorizonLabel,
    handleValidateDecision,
    resetAlertSelection() {
      setSelectedAlertId(null);
      setSelectedOptionId(null);
    },
    selectAlert(alertId: string) {
      setSelectedAlertId(alertId);
      setSelectedOptionId(null);
    },
  };
}
