// Scenario types — staffing arbitrage options and Pareto frontier

import type { TenantEntity, UUID } from "../utils/common";

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
  /** Is this point on the Pareto frontier? */
  isParetoOptimal: boolean;
  /** System recommendation flag */
  isRecommended: boolean;
  /** Constraint details */
  contraintesJson: Record<string, unknown>;
}

/** Lightweight point for Pareto chart rendering */
export interface ParetoPoint {
  optionId: UUID;
  optionType: ScenarioOptionType;
  label: string;
  cost: number;
  servicePct: number;
  isParetoOptimal: boolean;
  isRecommended: boolean;
}

/** Full Pareto frontier response for a given alert */
export interface ParetoFrontierResponse {
  alertId: UUID;
  options: ScenarioOption[];
  paretoFrontier: ScenarioOption[];
  recommended: ScenarioOption | null;
}
