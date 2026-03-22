"use client";

import { useMemo, useState } from "react";

import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import { useClientContext } from "../client-context";

export interface ProofPack {
  id: string;
  name: string;
  status: string;
  generatedAt?: string;
  downloadUrl?: string;
}

export interface QualityData {
  totalRecords?: number;
  validRecords?: number;
  qualityScore?: number;
  completenessRate?: number;
}

export interface AlertItem {
  id: string;
  severity: string;
  status: string;
}

export interface ShareLinkResponse {
  url: string;
  expiresAt: string;
}

function buildAlertsUrl(orgId: string, selectedSiteId: string | null) {
  return selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgAlerts(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgAlerts(orgId);
}

export function useRapportsPageModel() {
  const { orgId, selectedSiteId } = useClientContext();
  const alertsUrl = buildAlertsUrl(orgId, selectedSiteId);

  const {
    data: proofPacks,
    loading: proofLoading,
    error: proofError,
    refetch: proofRefetch,
  } = useApiGet<ProofPack[]>(ADMIN_ENDPOINTS.orgProofPacks(orgId));

  const {
    data: quality,
    loading: qualityLoading,
    error: qualityError,
    refetch: qualityRefetch,
  } = useApiGet<QualityData>(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId));

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useApiGet<AlertItem[]>(alertsUrl);

  const proofList = proofPacks ?? [];
  const generatedProofCount = useMemo(
    () => proofList.filter((item) => item.status === "generated").length,
    [proofList],
  );
  const activeAlerts = useMemo(
    () => (alerts ?? []).filter((item) => item.status !== "resolved").length,
    [alerts],
  );
  const criticalAlerts = useMemo(
    () => (alerts ?? []).filter((item) => item.severity === "CRITICAL").length,
    [alerts],
  );

  const [selectedProofId, setSelectedProofId] = useState("");
  const effectiveProofId = selectedProofId || proofList[0]?.id || "";

  const {
    mutate: createShareLink,
    loading: shareLoading,
    error: shareError,
    data: shareData,
  } = useApiPost<Record<string, never>, ShareLinkResponse>(
    effectiveProofId
      ? ADMIN_ENDPOINTS.orgProofPackShareLink(orgId, effectiveProofId)
      : `${ADMIN_ENDPOINTS.orgProofPacks(orgId)}/missing/share-link`,
  );

  return {
    orgId,
    proofList,
    proofLoading,
    proofError,
    proofRefetch,
    quality,
    qualityLoading,
    qualityError,
    qualityRefetch,
    alertsLoading,
    alertsError,
    alertsRefetch,
    generatedProofCount,
    activeAlerts,
    criticalAlerts,
    selectedProofId,
    setSelectedProofId,
    effectiveProofId,
    createShareLink,
    shareLoading,
    shareError,
    shareData,
  };
}
