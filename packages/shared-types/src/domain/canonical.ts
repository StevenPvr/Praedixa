// Canonical operational data types — site x date x shift

import type { TenantEntity, ISODateString } from "../utils/common";

/** Shift within a working day */
export type ShiftType = "am" | "pm";

/** A single canonical record (one site/date/shift row) */
export interface CanonicalRecord extends TenantEntity {
  siteId: string;
  date: ISODateString;
  shift: ShiftType;
  competence?: string;
  /** Demand in abstract charge units */
  chargeUnits?: number;
  /** Planned capacity in hours */
  capacitePlanH: number;
  /** Actual hours worked */
  realiseH?: number;
  /** Absence hours */
  absH: number;
  /** Overtime hours */
  hsH: number;
  /** Interim (temp worker) hours */
  interimH: number;
  /** Backlog hours not covered */
  backlogH?: number;
  /** Number of safety incidents */
  safetyIncidents?: number;
  /** Number of quality blocking incidents */
  qualityBlocking?: number;
  /** Estimated internal cost */
  coutInterneEst?: number;
}

/** Quality dashboard view of canonical data */
export interface CanonicalQualityDashboard {
  totalRecords: number;
  coveragePct: number;
  /** Number of distinct sites */
  sites: number;
  /** [min_date, max_date] ISO strings */
  dateRange: string[];
  missingShiftsPct: number;
  avgAbsPct: number;
}
