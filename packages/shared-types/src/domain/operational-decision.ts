// Operational decision types — manager decisions on coverage alerts

import type { TenantEntity, UUID, ISODateString } from "../utils/common.js";
import type { ShiftType } from "./canonical.js";
import type { AlertHorizon } from "./coverage-alert.js";

/** An operational decision made on a coverage alert */
export interface OperationalDecision extends TenantEntity {
  coverageAlertId: UUID;
  recommendedOptionId?: UUID;
  chosenOptionId?: UUID;
  siteId: string;
  decisionDate: ISODateString;
  shift: ShiftType;
  horizon: AlertHorizon;
  /** Gap in hours that the decision addresses */
  gapH: number;
  /** Whether the manager overrode the recommendation */
  isOverride: boolean;
  overrideReason?: string;
  /** Optional normalized reason category for analytics */
  overrideCategory?: string;
  /** Optional exogenous incident tag excluded from attribution */
  exogenousEventTag?: string;
  /** Recommendation policy version used at decision time */
  recommendationPolicyVersion?: string;
  /** Expected cost at decision time */
  coutAttenduEur?: number;
  /** Expected service level at decision time */
  serviceAttenduPct?: number;
  /** Observed cost after resolution */
  coutObserveEur?: number;
  /** Observed service level after resolution */
  serviceObservePct?: number;
  /** Manager who made the decision */
  decidedBy: UUID;
  comment?: string;
}

/** Aggregate override statistics */
export interface OverrideStatistics {
  totalDecisions: number;
  overrideCount: number;
  overridePct: number;
  topOverrideReasons: { reason: string; count: number }[];
  /** Average cost delta: avg(cout_observe - cout_attendu) for overrides */
  avgCostDelta: number;
}
