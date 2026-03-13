// Decision config types — admin-managed forecast horizons + recommendation policy

import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { ScenarioOptionType } from "./scenario.js";

export interface DecisionHorizonConfig {
  id: string;
  label: string;
  days: number;
  rank: number;
  active: boolean;
  isDefault: boolean;
}

export interface RecommendationOptionCatalogRule {
  optionType: ScenarioOptionType;
  enabled: boolean;
  label?: string;
  maxCoveredHours?: number;
}

export interface RecommendationWeights {
  cost: number;
  service: number;
  risk: number;
  feasibility: number;
}

export interface RecommendationConstraints {
  minServicePct?: number;
  maxRiskScore?: number;
  minFeasibilityScore?: number;
  requirePolicyCompliance?: boolean;
}

export interface RecommendationPolicyByHorizon {
  horizonId: string;
  weights: RecommendationWeights;
  constraints?: RecommendationConstraints;
  tieBreakers?: string[];
}

export interface DecisionEngineConfigPayload {
  horizons: DecisionHorizonConfig[];
  optionCatalog: RecommendationOptionCatalogRule[];
  policiesByHorizon: RecommendationPolicyByHorizon[];
}

export type DecisionConfigVersionStatus = "scheduled" | "active" | "cancelled";

export interface DecisionEngineConfigVersion {
  id: UUID;
  organizationId: UUID;
  siteId?: string | null;
  status: DecisionConfigVersionStatus;
  effectiveAt: ISODateTimeString;
  activatedAt?: ISODateTimeString | null;
  payload: DecisionEngineConfigPayload;
  rollbackFromVersionId?: UUID | null;
  createdBy?: UUID | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ResolvedDecisionEngineConfig {
  organizationId: UUID;
  siteId?: string | null;
  versionId: UUID;
  effectiveAt: ISODateTimeString;
  resolvedAt: ISODateTimeString;
  payload: DecisionEngineConfigPayload;
  nextVersion?: {
    id: UUID;
    effectiveAt: ISODateTimeString;
  } | null;
}

export interface ScheduleDecisionConfigVersionRequest {
  siteId?: string | null;
  effectiveAt: ISODateTimeString;
  payload: DecisionEngineConfigPayload;
  reason?: string;
}

export interface RollbackDecisionConfigRequest {
  siteId?: string | null;
  reason?: string;
}

export interface DecisionConfigAuditEntry {
  id: UUID;
  organizationId: UUID;
  siteId?: string | null;
  action: string;
  actorUserId?: UUID | null;
  requestId?: string | null;
  targetVersionId?: UUID | null;
  beforePayload?: DecisionEngineConfigPayload | null;
  afterPayload?: DecisionEngineConfigPayload | null;
  metadata?: Record<string, unknown>;
  createdAt: ISODateTimeString;
}
