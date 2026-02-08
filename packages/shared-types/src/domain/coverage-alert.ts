// Coverage alert types — horizon-based staffing risk alerts

import type {
  TenantEntity,
  UUID,
  ISODateString,
  ISODateTimeString,
} from "../utils/common";
import type { ShiftType } from "./canonical";

/** Forecast horizon window */
export type AlertHorizon = "j3" | "j7" | "j14";

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
  /** Estimated financial impact */
  impactEur?: number;
  severity: CoverageAlertSeverity;
  status: CoverageAlertStatus;
  /** Top 3 drivers for the alert */
  driversJson: string[];
  acknowledgedAt?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
}

/** Single cell in the coverage heatmap */
export interface HeatmapCell {
  siteId: string;
  shift: ShiftType;
  date: ISODateString;
  coveragePct: number;
  severity: CoverageAlertSeverity;
  alertId?: UUID;
}

/** Full heatmap data payload */
export interface CoverageHeatmapData {
  cells: HeatmapCell[];
  sites: string[];
  dates: ISODateString[];
}
