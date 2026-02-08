// Cost parameter types — site-level cost & configuration

import type { TenantEntity, ISODateString } from "../utils/common";
import type { ShiftType } from "./canonical";

/** Versioned cost parameter set */
export interface CostParameter extends TenantEntity {
  /** Restrict to a specific site (null = org default) */
  siteId?: string;
  /** Version number for audit trail */
  version: number;
  /** Internal hourly cost */
  cInt: number;
  /** Overtime multiplier */
  majHs: number;
  /** Interim hourly cost */
  cInterim: number;
  /** Urgency premium multiplier */
  premiumUrgence: number;
  /** Backlog cost per hour */
  cBacklog: number;
  /** Max overtime hours per shift */
  capHsShift: number;
  /** Max interim hours per site */
  capInterimSite: number;
  /** Lead time in days for interim sourcing */
  leadTimeJours: number;
  effectiveFrom: ISODateString;
  effectiveUntil?: ISODateString;
}

/** Shift configuration */
export interface ShiftConfig {
  shiftType: ShiftType;
  /** e.g. "06:00" */
  startTime: string;
  /** e.g. "14:00" */
  endTime: string;
  label: string;
}

/** Thresholds that drive alert severity bucketing */
export interface AlertThresholdConfig {
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  criticalThreshold: number;
  maxAlertsPerWeek: number;
}

/** Site-level configuration */
export interface SiteConfig {
  siteId: string;
  name: string;
  city: string;
  /** Base capacity in hours per shift */
  capaciteBaseH: number;
  shifts: ShiftConfig[];
}
