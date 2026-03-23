import type { DecisionEngineConfigPayload } from "@praedixa/shared-types";

export interface CostParam {
  id: string;
  category: string;
  value: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  siteName?: string;
}

export interface ProofPack {
  id: string;
  name: string;
  status: string;
  generatedAt?: string;
  downloadUrl?: string;
}

export interface DecisionConfigRecomputeResponse {
  alertId: string;
  recommendedOptionId: string | null;
  recommendationPolicyVersion: string;
  recomputedAt: string;
}

export interface DecisionConfigDraftState {
  effectiveAtInput: string;
  setEffectiveAtInput: (value: string) => void;
  payloadDraft: string;
  setPayloadDraft: (value: string) => void;
  changeReason: string;
  setChangeReason: (value: string) => void;
  recomputeAlertId: string;
  setRecomputeAlertId: (value: string) => void;
  lastRecompute: DecisionConfigRecomputeResponse | null;
}

export interface ScheduleVersionRequestBody {
  siteId?: string | null;
  effectiveAt: string;
  payload: DecisionEngineConfigPayload;
  reason?: string;
}

export interface DecisionConfigActionBody {
  reason?: string;
}

export interface ConfigActionState {
  actionLoading: string | null;
  actionError: string | null;
  actionSuccess: string | null;
}

export interface ConfigActionHandlers extends ConfigActionState {
  setActionLoading: (value: string | null) => void;
  setActionError: (value: string | null) => void;
  setActionSuccess: (value: string | null) => void;
}

export interface IntegrationConnection {
  id: string;
  vendor: string;
  displayName: string;
  status: string;
  authorizationState?: string;
  authMode: string;
  sourceObjects?: string[];
  lastSuccessfulSyncAt?: string | null;
  nextScheduledSyncAt?: string | null;
  updatedAt: string;
}

export interface IntegrationCatalogItem {
  vendor: string;
  label: string;
  domain: string;
  authModes: string[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionTargets: Array<"bronze" | "silver" | "gold">;
  onboardingModes?: string[];
  requiredConfigFields?: string[];
}

export interface CreateIntegrationConnectionPayload {
  vendor: string;
  displayName: string;
  authMode: string;
  sourceObjects?: string[];
  runtimeEnvironment?: "production" | "sandbox";
  baseUrl?: string | null;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface IntegrationConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  checkedScopes: string[];
  warnings: string[];
}

export type IntegrationSyncTrigger = "manual" | "replay" | "backfill";

export interface IntegrationSyncRun {
  id: string;
  triggerType: string;
  status: string;
  forceFullSync?: boolean;
  sourceWindowStart?: string | null;
  sourceWindowEnd?: string | null;
  recordsFetched: number;
  recordsWritten: number;
  errorClass: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface IntegrationIngestCredential {
  id: string;
  label: string;
  keyId: string;
  authMode: "bearer" | "bearer_hmac";
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface IntegrationIssueIngestCredentialResult {
  credential: IntegrationIngestCredential;
  apiKey: string;
  signingSecret: string | null;
  ingestUrl: string;
  authScheme: "Bearer";
  signature: null | {
    algorithm: "hmac-sha256";
    keyIdHeader: string;
    timestampHeader: string;
    signatureHeader: string;
  };
}

export interface IntegrationRawEvent {
  id: string;
  credentialId: string;
  eventId: string;
  sourceObject: string;
  sourceRecordId: string;
  schemaVersion: string;
  processingStatus?: "pending" | "processing" | "processed" | "failed";
  objectStoreKey?: string;
  sizeBytes: number;
  receivedAt: string;
}
