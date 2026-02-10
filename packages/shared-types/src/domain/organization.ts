// Organization domain types (multi-tenant)

import type { BaseEntity, UUID, ISODateString } from "../utils/common";
import type { WorkingDaysConfig } from "../utils/dates";

/** Organization status */
export type OrganizationStatus = "active" | "suspended" | "trial" | "churned";

/** Subscription plan */
export type SubscriptionPlan =
  | "free"
  | "starter"
  | "professional"
  | "enterprise";

/** Organization size category */
export type OrganizationSize = "small" | "medium" | "large" | "enterprise";

/** Industry sector */
export type IndustrySector =
  | "healthcare"
  | "retail"
  | "manufacturing"
  | "services"
  | "technology"
  | "finance"
  | "education"
  | "public_sector"
  | "hospitality"
  | "logistics"
  | "other";

/** Organization entity */
export interface Organization extends BaseEntity {
  /** Display name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Legal entity name */
  legalName?: string;
  /** SIRET number (French companies) */
  siret?: string;
  /** Industry sector */
  sector?: IndustrySector;
  /** Organization size */
  size?: OrganizationSize;
  /** Total headcount */
  headcount?: number;
  /** Account status */
  status: OrganizationStatus;
  /** Subscription plan */
  plan: SubscriptionPlan;
  /** Trial end date */
  trialEndsAt?: ISODateString;
  /** Subscription start date */
  subscriptionStartedAt?: ISODateString;
  /** Working days configuration */
  workingDaysConfig: WorkingDaysConfig;
  /** Timezone (IANA) */
  timezone: string;
  /** Locale (BCP 47) */
  locale: string;
  /** Currency (ISO 4217) */
  currency: string;
  /** Primary contact email */
  contactEmail: string;
  /** Settings and preferences */
  settings: OrganizationSettings;
}

/** Organization settings */
export interface OrganizationSettings {
  /** Absence types enabled */
  absenceTypesEnabled: string[];
  /** Require manager approval */
  requireApproval: boolean;
  /** Approval workflow levels */
  approvalLevels: number;
  /** Enable forecasting */
  forecastingEnabled: boolean;
  /** Forecasting horizon (days) */
  forecastHorizonDays: number;
  /** Alert thresholds */
  alertThresholds: AlertThresholds;
  /** Data retention period (days) */
  dataRetentionDays: number;
  /** SSO configuration */
  ssoEnabled: boolean;
  /** SSO provider */
  ssoProvider?: "azure_ad" | "okta" | "google" | "custom_saml";
}

/** Alert threshold configuration */
export interface AlertThresholds {
  /** Understaffing risk threshold (%) */
  understaffingRisk: number;
  /** Absence rate threshold (%) */
  absenceRate: number;
  /** Consecutive absences threshold (days) */
  consecutiveAbsences: number;
  /** Forecast accuracy threshold (%) */
  forecastAccuracy: number;
}

/** Department/Team within an organization */
export interface Department extends BaseEntity {
  organizationId: UUID;
  name: string;
  code?: string;
  parentId?: UUID;
  managerId?: UUID;
  headcount: number;
  costCenter?: string;
  /** Minimum staffing level (%) */
  minStaffingLevel: number;
  /** Critical roles count */
  criticalRolesCount: number;
}

/** Site/Location */
export interface Site extends BaseEntity {
  organizationId: UUID;
  name: string;
  code?: string;
  address?: Address;
  timezone: string;
  /** Site-specific working days config */
  workingDaysConfig?: WorkingDaysConfig;
  headcount: number;
}

/** Address structure */
export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  region?: string;
}
