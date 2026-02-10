// Cost parameter types — site-level cost & configuration

import type { TenantEntity, ISODateString } from "../utils/common";

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
