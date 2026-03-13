"use client";

import type { ResolvedDecisionEngineConfig } from "@praedixa/shared-types";
import { useApiGet } from "@/hooks/use-api";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

export interface LiveDecisionConfigResponse extends ResolvedDecisionEngineConfig {
  selectedHorizon?: {
    id: string;
    label: string;
    days: number;
  } | null;
}

interface UseDecisionConfigResult {
  config: LiveDecisionConfigResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDecisionConfig(
  siteId: string | null = null,
): UseDecisionConfigResult {
  const params = new URLSearchParams();
  if (siteId) {
    params.set("site_id", siteId);
  }
  const query = params.toString();
  const url =
    query.length > 0
      ? `/api/v1/live/decision-config?${query}`
      : "/api/v1/live/decision-config";

  const { data, loading, error, refetch } =
    useApiGet<LiveDecisionConfigResponse>(url, {
      pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
    });

  return {
    config: data,
    loading,
    error,
    refetch,
  };
}
