// Decision workspace types — prioritized alert queue + action context

import type {
  CoverageAlert,
  CoverageAlertSeverity,
  AlertHorizon,
} from "./coverage-alert";
import type { ScenarioOption } from "./scenario";
import type { ShiftType } from "./canonical";
import type { UUID } from "../utils/common";

/**
 * Lightweight queue item optimized for fast decision triage.
 * Backends may return partial fields; frontend should apply sane fallbacks.
 */
export interface DecisionQueueItem {
  id: UUID;
  siteId: string;
  alertDate: string;
  shift: ShiftType | string;
  severity: CoverageAlertSeverity;
  horizon?: AlertHorizon | null;
  gapH: number;
  pRupture?: number;
  driversJson?: string[];
  /** Sorting score where a higher value means higher operational priority. */
  priorityScore?: number;
  /** Estimated financial impact in EUR if left untreated. */
  estimatedImpactEur?: number | null;
  /** Hours remaining before crossing the service threshold. */
  timeToBreachHours?: number | null;
}

export interface DecisionDiagnostic {
  topDrivers: string[];
  confidencePct?: number;
  riskTrend?: "improving" | "stable" | "worsening";
  note?: string;
}

/**
 * Unified payload for the split-view decision workspace.
 */
export interface DecisionWorkspace {
  alert: CoverageAlert;
  options: ScenarioOption[];
  recommendedOptionId?: UUID | null;
  diagnostic?: DecisionDiagnostic;
}
