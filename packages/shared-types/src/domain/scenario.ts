// Scenario types — staffing arbitrage options and Pareto frontier

import type { TenantEntity, UUID } from "../utils/common.js";

/** Type of remediation option */
export type ScenarioOptionType =
  | "hs"
  | "interim"
  | "realloc_intra"
  | "realloc_inter"
  | "service_adjust"
  | "outsource";

/** A single scenario option attached to an alert */
export interface ScenarioOption extends TenantEntity {
  coverageAlertId: UUID;
  costParameterId: UUID;
  optionType: ScenarioOptionType;
  label: string;
  /** Total estimated cost in EUR */
  coutTotalEur: number;
  /** Expected service level after applying this option */
  serviceAttenduPct: number;
  /** Hours covered by this option */
  heuresCouvertes: number;
  /** Feasibility score under operational constraints (0-1) */
  feasibilityScore?: number;
  /** Residual risk score (0-1, lower is better) */
  riskScore?: number;
  /** Whether option satisfies active recommendation policy */
  policyCompliance?: boolean;
  /** Optional explanation for dominance/pruning in UI */
  dominanceReason?: string;
  /** Active recommendation policy version */
  recommendationPolicyVersion?: string;
  /** Is this point on the Pareto frontier? */
  isParetoOptimal: boolean;
  /** System recommendation flag */
  isRecommended: boolean;
  /** Constraint details */
  contraintesJson: Record<string, unknown>;
}

/** Full Pareto frontier response for a given alert */
export interface ParetoFrontierResponse {
  alertId: UUID;
  options: ScenarioOption[];
  paretoFrontier: ScenarioOption[];
  recommended: ScenarioOption | null;
}
