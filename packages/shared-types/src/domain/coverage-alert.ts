// Coverage alert types — horizon-based staffing risk alerts

import type {
  TenantEntity,
  ISODateString,
  ISODateTimeString,
} from "../utils/common.js";
import type { ShiftType } from "./canonical.js";

/**
 * Forecast horizon identifier.
 * Legacy values like "j3"/"j7"/"j14" remain supported, but admin-configured
 * horizon ids are now dynamic.
 */
export type AlertHorizon = string;

/** Alert severity level */
export type CoverageAlertSeverity = "low" | "medium" | "high" | "critical";

/** Alert lifecycle status */
export type CoverageAlertStatus =
  | "open"
  | "acknowledged"
  | "resolved"
  | "expired";

/** Coverage alert entity */
export interface CoverageAlert extends TenantEntity {
  siteId: string;
  alertDate: ISODateString;
  shift: ShiftType;
  horizon: AlertHorizon;
  /** Probability of staffing rupture (0-1) */
  pRupture: number;
  /** Gap in hours to fill */
  gapH: number;
  /** Lower bound of expected gap interval */
  predictionIntervalLow?: number;
  /** Upper bound of expected gap interval */
  predictionIntervalHigh?: number;
  /** Forecast model version */
  modelVersion?: string;
  /** Calibration bucket label */
  calibrationBucket?: string;
  /** Estimated financial impact */
  impactEur?: number;
  severity: CoverageAlertSeverity;
  status: CoverageAlertStatus;
  /** Top 3 drivers for the alert */
  driversJson: string[];
  acknowledgedAt?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
}
