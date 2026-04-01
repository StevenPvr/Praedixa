import { randomUUID } from "node:crypto";

import type { EmailDeliveryProof } from "@praedixa/shared-types/api";
import { Pool, type PoolClient } from "pg";
import {
  KeycloakAdminIdentityError,
  KeycloakAdminIdentityService,
  getKeycloakAdminIdentityServiceFromEnv,
  type ManagedAdminUserRole,
} from "./keycloak-admin-identity.js";
import {
  InvitationDeliveryProofService,
  getInvitationDeliveryProofService,
} from "./invitation-delivery-proof.js";

type AssignableRole = ManagedAdminUserRole;
type DbQueryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

type BillingPlan = "free" | "starter" | "professional" | "enterprise";
type OrganizationStatus = "trial" | "active" | "suspended" | "churned";
type ContactRequestStatus = "new" | "in_progress" | "closed";
type ContactRequestType =
  | "founding_pilot"
  | "product_demo"
  | "partnership"
  | "press_other";
type AdminAuditAction =
  | "create_org"
  | "delete_org"
  | "invite_user"
  | "change_role"
  | "deactivate_user"
  | "reactivate_user"
  | "change_plan";

export interface AdminOrganizationListItem {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  plan: BillingPlan;
  contactEmail: string;
  isTest: boolean;
  userCount: number;
  siteCount: number;
  createdAt: string;
  initialInviteProof?: EmailDeliveryProof | null;
}

export interface AdminOrganizationSiteHierarchy {
  id: string;
  name: string;
  city?: string;
  departments: Array<{
    id: string;
    name: string;
    employeeCount: number;
  }>;
}

export interface AdminOrganizationDetail extends AdminOrganizationListItem {
  sector?: string;
  size?: string;
  sites: AdminOrganizationSiteHierarchy[];
}

export interface AdminOrganizationAlertSummary {
  id: string;
  date: string;
  type: string;
  severity: string;
  status: string;
  siteId?: string;
  siteName?: string;
}

export interface AdminOrganizationScenarioSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface AdminOrganizationListFilters {
  page: number;
  pageSize: number;
  search?: string | null;
  status?: string | null;
  plan?: string | null;
}

export interface AdminOrganizationCreateInput {
  name: string;
  slug: string;
  contactEmail: string;
  isTest?: boolean;
  plan?: string | null;
  actorUserId: string;
  requestId: string;
  clientIp: string | null;
  userAgent: string | null;
}

interface CreatedOrganizationShell {
  organizationId: string;
  row: DbOrganizationListRow;
}

export interface AdminOrganizationDeleteInput {
  organizationId: string;
  organizationSlug: string;
  confirmationText: "SUPPRIMER";
  acknowledgeTestDeletion: true;
  actorUserId: string;
  requestId: string;
  clientIp: string | null;
  userAgent: string | null;
}

export interface AdminOrganizationDeleteResult {
  organizationId: string;
  slug: string;
  deleted: true;
}

export interface AdminContactRequestRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  locale: "fr" | "en";
  requestType: ContactRequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactRequestStatus;
  consent: boolean;
  metadataJson: Record<string, unknown>;
}

export interface AdminContactRequestListFilters {
  page: number;
  pageSize: number;
  search?: string | null;
  status?: string | null;
  requestType?: string | null;
}

export interface AdminAuditLogRecord {
  id: string;
  adminUserId: string;
  targetOrgId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestId: string | null;
  metadataJson: Record<string, unknown>;
  severity: string;
  createdAt: string;
}

export interface AdminAuditLogListFilters {
  page: number;
  pageSize: number;
  action?: string | null;
}

export interface AdminConversationUnreadCount {
  total: number;
  byOrg: Array<{
    orgId: string;
    orgName: string;
    count: number;
  }>;
}

export interface AdminUserRecord {
  id: string;
  organizationId: string;
  fullName: string | null;
  email: string;
  role: AssignableRole;
  status: "pending_invite" | "active" | "deactivated";
  siteId: string | null;
  siteName: string | null;
  lastLoginAt: string | null;
  invitedAt: string;
  invitedBy: string | null;
  updatedAt: string;
  deliveryProof?: EmailDeliveryProof | null;
}

export interface AdminIngestionLogRecord {
  id: string;
  datasetId: string;
  datasetName: string;
  fileName: string;
  status: "completed" | "failed" | "running";
  rowsProcessed: number;
  rowsRejected: number;
  createdAt: string;
  completedAt: string | null;
  mode: string;
  triggeredBy: string | null;
}

export interface BillingInfo {
  organizationId: string;
  plan: BillingPlan;
  billingCycle: "monthly";
  monthlyAmount: number | null;
  currentUsage: number;
  usageLimit: number | null;
  nextBillingDate: string;
}

export interface BillingHistoryEntry {
  organizationId: string;
  from: BillingPlan;
  to: BillingPlan;
  at: string;
  reason: string | null;
  changedBy: string | null;
}

export interface DashboardAlertRecord {
  id: string;
  type: "risk" | "decision" | "forecast" | "absence" | "system";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  relatedEntityType?:
    | "absence"
    | "decision"
    | "forecast"
    | "employee"
    | "department";
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  dismissedAt?: string;
  expiresAt?: string;
}

export interface CoverageAlertRecord {
  id: string;
  organizationId: string;
  siteId: string;
  alertDate: string;
  shift: "am" | "pm";
  horizon: string;
  pRupture: number;
  gapH: number;
  predictionIntervalLow?: number;
  predictionIntervalHigh?: number;
  modelVersion?: string;
  calibrationBucket?: string;
  impactEur?: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "expired";
  driversJson: string[];
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageAlertListFilters {
  organizationId: string;
  status?: string | null;
  severity?: string | null;
  siteId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  horizonId?: string | null;
}

interface AdminAuditMetadata {
  action: AdminAuditAction;
  actorUserId: string;
  targetOrgId: string;
  resourceType: string;
  resourceId?: string | null;
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  severity?: "INFO" | "WARN" | "ERROR";
}

type PrivilegedAttemptOutcome = "success" | "rejected" | "failed";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z][a-z0-9-]{2,34}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BILLING_PLAN_SET = new Set<BillingPlan>([
  "free",
  "starter",
  "professional",
  "enterprise",
]);
const ORGANIZATION_STATUS_SET = new Set<OrganizationStatus>([
  "trial",
  "active",
  "suspended",
  "churned",
]);
const CONTACT_REQUEST_STATUS_SET = new Set<ContactRequestStatus>([
  "new",
  "in_progress",
  "closed",
]);
const CONTACT_REQUEST_TYPE_SET = new Set<ContactRequestType>([
  "founding_pilot",
  "product_demo",
  "partnership",
  "press_other",
]);
const ASSIGNABLE_ROLE_SET = new Set<AssignableRole>([
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
  "viewer",
]);
const PLAN_PRICING: Record<BillingPlan, number | null> = {
  free: 0,
  starter: null,
  professional: null,
  enterprise: null,
};
const PLAN_LIMITS: Record<BillingPlan, { forecastsPerMonth: number | null }> = {
  free: { forecastsPerMonth: 5 },
  starter: { forecastsPerMonth: 50 },
  professional: { forecastsPerMonth: 500 },
  enterprise: { forecastsPerMonth: null },
};

class AdminBackofficeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AdminBackofficeError";
  }
}

type DbUserRow = {
  id: string;
  organization_id: string;
  auth_user_id: string;
  email: string;
  role: string;
  status: string;
  site_id: string | null;
  site_name: string | null;
  last_login_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  delivery_proof_status: EmailDeliveryProof["status"] | null;
  delivery_proof_initiated_at: string | Date | null;
  delivery_proof_event_type: string | null;
  delivery_proof_occurred_at: string | Date | null;
  delivery_proof_observed_at: string | Date | null;
  delivery_proof_summary: string | null;
};

type DbBillingRow = {
  plan: BillingPlan;
  user_count: string;
  site_count: string;
  dataset_count: string;
  forecast_count: string;
};

type DbIngestionLogRow = {
  id: string;
  dataset_id: string;
  dataset_name: string;
  file_name: string | null;
  status: string;
  rows_received: string | number;
  rows_transformed: string | number;
  started_at: string | Date;
  completed_at: string | Date | null;
  mode: string;
  triggered_by: string | null;
};

type DbPlanHistoryRow = {
  organization_id: string;
  old_plan: BillingPlan;
  new_plan: BillingPlan;
  effective_at: string | Date;
  reason: string | null;
  changed_by: string | null;
  changed_by_auth_user_id: string | null;
};

type DbDashboardAlertRow = {
  id: string;
  type: DashboardAlertRecord["type"];
  severity: DashboardAlertRecord["severity"];
  title: string;
  message: string;
  related_entity_type: DashboardAlertRecord["relatedEntityType"] | null;
  related_entity_id: string | null;
  action_url: string | null;
  action_label: string | null;
  created_at: string | Date;
  dismissed_at: string | Date | null;
  expires_at: string | Date | null;
};

type DbCoverageAlertRow = {
  id: string;
  organization_id: string;
  site_id: string;
  alert_date: string | Date;
  shift: "am" | "pm";
  horizon: string;
  p_rupture: string;
  gap_h: string;
  prediction_interval_low: string | null;
  prediction_interval_high: string | null;
  model_version: string | null;
  calibration_bucket: string | null;
  impact_eur: string | null;
  severity: CoverageAlertRecord["severity"];
  status: CoverageAlertRecord["status"];
  drivers_json: string[] | null;
  acknowledged_at: string | Date | null;
  resolved_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbOrganizationListRow = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  plan: BillingPlan;
  contact_email: string;
  settings?: Record<string, unknown> | null;
  user_count: string | number;
  site_count: string | number;
  created_at: string | Date;
};

type DbOrganizationDetailRow = DbOrganizationListRow & {
  sector: string | null;
  size: string | null;
};

type DbOrganizationHierarchyRow = {
  site_id: string;
  site_name: string;
  site_city: string | null;
  department_id: string | null;
  department_name: string | null;
  department_headcount: string | number | null;
};

type DbOrganizationAlertSummaryRow = {
  id: string;
  alert_date: string | Date;
  alert_type: string;
  severity: string;
  status: string;
  site_id: string | null;
  site_name: string | null;
};

type DbOrganizationScenarioSummaryRow = {
  id: string;
  name: string;
  status: string;
  created_at: string | Date;
};

type DbContactRequestRow = {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  locale: "fr" | "en";
  request_type: ContactRequestType;
  company_name: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactRequestStatus;
  consent: boolean;
  metadata_json: Record<string, unknown> | null;
};

type DbAdminAuditLogRow = {
  id: string;
  admin_user_id: string | null;
  admin_auth_user_id: string | null;
  target_org_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string;
  user_agent: string | null;
  request_id: string | null;
  metadata_json: Record<string, unknown> | null;
  severity: string;
  created_at: string | Date;
};

type DbAdminConversationUnreadRow = {
  org_id: string;
  org_name: string;
  unread_count: string | number;
};

function ensureUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new AdminBackofficeError(
      `${label} must be a UUID`,
      400,
      "VALIDATION_ERROR",
      { [label]: value },
    );
  }
}

function ensureAssignableRole(role: string): asserts role is AssignableRole {
  if (!ASSIGNABLE_ROLE_SET.has(role as AssignableRole)) {
    throw new AdminBackofficeError(
      "Role must be one of: org_admin, hr_manager, manager, employee, viewer",
      422,
      "VALIDATION_ERROR",
      { role },
    );
  }
}

function assertManagedAssignableRole(role: string): AssignableRole {
  ensureAssignableRole(role);
  return role;
}

function ensureBillingPlan(plan: string): asserts plan is BillingPlan {
  if (!BILLING_PLAN_SET.has(plan as BillingPlan)) {
    throw new AdminBackofficeError(
      "Plan must be one of: free, starter, professional, enterprise",
      422,
      "VALIDATION_ERROR",
      { plan },
    );
  }
}

function ensureOrganizationStatus(
  status: string,
): asserts status is OrganizationStatus {
  if (!ORGANIZATION_STATUS_SET.has(status as OrganizationStatus)) {
    throw new AdminBackofficeError(
      "Organization status filter is invalid",
      422,
      "VALIDATION_ERROR",
      { status },
    );
  }
}

function ensureContactRequestStatus(
  status: string,
): asserts status is ContactRequestStatus {
  if (!CONTACT_REQUEST_STATUS_SET.has(status as ContactRequestStatus)) {
    throw new AdminBackofficeError(
      "Contact request status filter is invalid",
      422,
      "VALIDATION_ERROR",
      { status },
    );
  }
}

function ensureContactRequestType(
  requestType: string,
): asserts requestType is ContactRequestType {
  if (!CONTACT_REQUEST_TYPE_SET.has(requestType as ContactRequestType)) {
    throw new AdminBackofficeError(
      "Contact request type filter is invalid",
      422,
      "VALIDATION_ERROR",
      { requestType },
    );
  }
}

function toIso(value: string | Date): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toInteger(value: string | number): number {
  return typeof value === "number" ? value : Number.parseInt(value, 10) || 0;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(
  value: string,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  const normalized = normalizeOptionalText(value);
  if (normalized == null) {
    throw new AdminBackofficeError(
      `${label} is required`,
      422,
      "VALIDATION_ERROR",
      { [label]: value },
    );
  }

  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new AdminBackofficeError(
      `${label} must be between ${minLength} and ${maxLength} characters`,
      422,
      "VALIDATION_ERROR",
      { [label]: normalized },
    );
  }

  return normalized;
}

function normalizeOrganizationSlugInput(value: string): string {
  const normalized = normalizeRequiredText(value, "slug", 3, 35).toLowerCase();

  if (!ORGANIZATION_SLUG_PATTERN.test(normalized)) {
    throw new AdminBackofficeError(
      "slug must start with a letter and contain only lowercase letters, digits, or hyphens",
      422,
      "VALIDATION_ERROR",
      { slug: normalized },
    );
  }

  if (
    normalized.startsWith("pg-") ||
    normalized.startsWith("pg_") ||
    normalized.startsWith("sql-") ||
    normalized.startsWith("sql_")
  ) {
    throw new AdminBackofficeError(
      "slug uses a reserved prefix",
      422,
      "VALIDATION_ERROR",
      { slug: normalized },
    );
  }

  return normalized;
}

function normalizeContactEmailInput(value: string): string {
  const normalized = normalizeRequiredText(
    value,
    "contactEmail",
    3,
    320,
  ).toLowerCase();

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new AdminBackofficeError(
      "contactEmail must be a valid email address",
      422,
      "VALIDATION_ERROR",
      { contactEmail: normalized },
    );
  }

  return normalized;
}

function normalizeOrganizationStatusFilter(
  value: string | null | undefined,
): OrganizationStatus | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (normalized == null) {
    return null;
  }
  ensureOrganizationStatus(normalized);
  return normalized;
}

function normalizeBillingPlanFilter(
  value: string | null | undefined,
): BillingPlan | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (normalized == null) {
    return null;
  }
  ensureBillingPlan(normalized);
  return normalized;
}

function normalizeContactRequestStatusFilter(
  value: string | null | undefined,
): ContactRequestStatus | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (normalized == null) {
    return null;
  }
  ensureContactRequestStatus(normalized);
  return normalized;
}

function normalizeContactRequestTypeFilter(
  value: string | null | undefined,
): ContactRequestType | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase() ?? null;
  if (normalized == null) {
    return null;
  }
  ensureContactRequestType(normalized);
  return normalized;
}

function buildDefaultFullName(email: string): string {
  const prefix = email.split("@")[0] ?? "";
  const cleaned = prefix.replace(/[._-]+/g, " ").trim();
  if (cleaned.length === 0) {
    return "Utilisateur";
  }
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function requiresSiteScope(role: AssignableRole): boolean {
  return role === "hr_manager" || role === "manager";
}

function isIdentityEnabledForStatus(status: string): boolean {
  return status === "active" || status === "pending";
}

function mapUserStatus(status: string): AdminUserRecord["status"] {
  if (status === "active") return "active";
  if (status === "pending") return "pending_invite";
  return "deactivated";
}

function mapOptionalDeliveryProof(row: DbUserRow): EmailDeliveryProof | null {
  if (!row.delivery_proof_status || row.delivery_proof_initiated_at == null) {
    return null;
  }

  return {
    provider: "resend",
    channel: "keycloak_execute_actions_email",
    delivery: "activation_link",
    status: row.delivery_proof_status,
    initiatedAt: toIso(row.delivery_proof_initiated_at),
    eventType: row.delivery_proof_event_type,
    occurredAt:
      row.delivery_proof_occurred_at == null
        ? null
        : toIso(row.delivery_proof_occurred_at),
    observedAt:
      row.delivery_proof_observed_at == null
        ? null
        : toIso(row.delivery_proof_observed_at),
    summary: row.delivery_proof_summary,
  };
}

function mapUserRow(row: DbUserRow): AdminUserRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fullName: buildDefaultFullName(row.email),
    email: row.email,
    role: row.role as AssignableRole,
    status: mapUserStatus(row.status),
    siteId: row.site_id,
    siteName: row.site_name,
    lastLoginAt: row.last_login_at == null ? null : toIso(row.last_login_at),
    invitedAt: toIso(row.created_at),
    invitedBy: null,
    updatedAt: toIso(row.updated_at),
    deliveryProof: mapOptionalDeliveryProof(row),
  };
}

function mapIngestionStatus(status: string): AdminIngestionLogRecord["status"] {
  switch (status) {
    case "success":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "running";
  }
}

function mapIngestionLogRow(row: DbIngestionLogRow): AdminIngestionLogRecord {
  const rowsReceived = Number.parseInt(String(row.rows_received), 10) || 0;
  const rowsTransformed =
    Number.parseInt(String(row.rows_transformed), 10) || 0;
  return {
    id: row.id,
    datasetId: row.dataset_id,
    datasetName: row.dataset_name,
    fileName: row.file_name ?? row.dataset_name,
    status: mapIngestionStatus(row.status),
    rowsProcessed: rowsTransformed,
    rowsRejected: Math.max(0, rowsReceived - rowsTransformed),
    createdAt: toIso(row.started_at),
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    mode: row.mode,
    triggeredBy: row.triggered_by,
  };
}

const USER_DELIVERY_PROOF_SELECT_SQL = `
      invite_proof.proof_status AS delivery_proof_status,
      invite_proof.initiated_at AS delivery_proof_initiated_at,
      invite_proof.matched_event_type AS delivery_proof_event_type,
      invite_proof.occurred_at AS delivery_proof_occurred_at,
      invite_proof.observed_at AS delivery_proof_observed_at,
      invite_proof.matched_event_summary AS delivery_proof_summary
`;

const USER_DELIVERY_PROOF_JOIN_SQL = `
      LEFT JOIN LATERAL (
        SELECT
          proof_status,
          initiated_at,
          matched_event_type,
          occurred_at,
          observed_at,
          matched_event_summary
        FROM identity_invitation_delivery_attempts
        WHERE user_id = u.id
        ORDER BY initiated_at DESC
        LIMIT 1
      ) invite_proof ON TRUE
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readOrganizationIsTest(settings: unknown): boolean {
  if (!isRecord(settings)) {
    return false;
  }

  const adminBackoffice = settings["adminBackoffice"];
  if (!isRecord(adminBackoffice)) {
    return false;
  }

  return adminBackoffice["isTest"] === true;
}

function buildOrganizationSettings(isTest: boolean): Record<string, unknown> {
  return {
    adminBackoffice: {
      isTest,
    },
  };
}

function mapOrganizationRow(
  row: DbOrganizationListRow,
): AdminOrganizationListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    plan: row.plan,
    contactEmail: row.contact_email,
    isTest: readOrganizationIsTest(row.settings),
    userCount: toInteger(row.user_count),
    siteCount: toInteger(row.site_count),
    createdAt: toIso(row.created_at),
  };
}

function mapOrganizationHierarchyRows(
  rows: readonly DbOrganizationHierarchyRow[],
): AdminOrganizationSiteHierarchy[] {
  const sites = new Map<string, AdminOrganizationSiteHierarchy>();

  for (const row of rows) {
    const current =
      sites.get(row.site_id) ??
      ({
        id: row.site_id,
        name: row.site_name,
        ...(row.site_city ? { city: row.site_city } : {}),
        departments: [],
      } satisfies AdminOrganizationSiteHierarchy);

    if (!sites.has(row.site_id)) {
      sites.set(row.site_id, current);
    }

    if (row.department_id && row.department_name) {
      current.departments.push({
        id: row.department_id,
        name: row.department_name,
        employeeCount: toInteger(row.department_headcount ?? 0),
      });
    }
  }

  return Array.from(sites.values());
}

function mapOrganizationAlertSummaryRow(
  row: DbOrganizationAlertSummaryRow,
): AdminOrganizationAlertSummary {
  return {
    id: row.id,
    date: toIso(row.alert_date),
    type: row.alert_type,
    severity: row.severity,
    status: row.status,
    ...(row.site_id ? { siteId: row.site_id } : {}),
    ...(row.site_name ? { siteName: row.site_name } : {}),
  };
}

function mapOrganizationScenarioSummaryRow(
  row: DbOrganizationScenarioSummaryRow,
): AdminOrganizationScenarioSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: toIso(row.created_at),
  };
}

function mapContactRequestRow(
  row: DbContactRequestRow,
): AdminContactRequestRecord {
  return {
    id: row.id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    locale: row.locale,
    requestType: row.request_type,
    companyName: row.company_name,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    consent: row.consent,
    metadataJson:
      row.metadata_json &&
      typeof row.metadata_json === "object" &&
      !Array.isArray(row.metadata_json)
        ? row.metadata_json
        : {},
  };
}

function mapAdminAuditLogRow(row: DbAdminAuditLogRow): AdminAuditLogRecord {
  return {
    id: row.id,
    adminUserId: row.admin_user_id ?? row.admin_auth_user_id ?? "unknown",
    targetOrgId: row.target_org_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    requestId: row.request_id,
    metadataJson:
      row.metadata_json &&
      typeof row.metadata_json === "object" &&
      !Array.isArray(row.metadata_json)
        ? row.metadata_json
        : {},
    severity: row.severity,
    createdAt: toIso(row.created_at),
  };
}

function mapDashboardAlertRow(row: DbDashboardAlertRow): DashboardAlertRecord {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    ...(row.related_entity_type
      ? { relatedEntityType: row.related_entity_type }
      : {}),
    ...(row.related_entity_id
      ? { relatedEntityId: row.related_entity_id }
      : {}),
    ...(row.action_url ? { actionUrl: row.action_url } : {}),
    ...(row.action_label ? { actionLabel: row.action_label } : {}),
    createdAt: toIso(row.created_at),
    ...(row.dismissed_at ? { dismissedAt: toIso(row.dismissed_at) } : {}),
    ...(row.expires_at ? { expiresAt: toIso(row.expires_at) } : {}),
  };
}

function mapCoverageAlertRow(row: DbCoverageAlertRow): CoverageAlertRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    siteId: row.site_id,
    alertDate: toIso(row.alert_date).slice(0, 10),
    shift: row.shift,
    horizon: row.horizon,
    pRupture: Number.parseFloat(row.p_rupture),
    gapH: Number.parseFloat(row.gap_h),
    ...(row.prediction_interval_low != null
      ? {
          predictionIntervalLow: Number.parseFloat(row.prediction_interval_low),
        }
      : {}),
    ...(row.prediction_interval_high != null
      ? {
          predictionIntervalHigh: Number.parseFloat(
            row.prediction_interval_high,
          ),
        }
      : {}),
    ...(row.model_version ? { modelVersion: row.model_version } : {}),
    ...(row.calibration_bucket
      ? { calibrationBucket: row.calibration_bucket }
      : {}),
    ...(row.impact_eur != null
      ? { impactEur: Number.parseFloat(row.impact_eur) }
      : {}),
    severity: row.severity,
    status: row.status,
    driversJson: Array.isArray(row.drivers_json) ? row.drivers_json : [],
    ...(row.acknowledged_at
      ? { acknowledgedAt: toIso(row.acknowledged_at) }
      : {}),
    ...(row.resolved_at ? { resolvedAt: toIso(row.resolved_at) } : {}),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function nextBillingDate(): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return next.toISOString().slice(0, 10);
}

export class AdminBackofficeService {
  private readonly pool: Pool | null;
  private readonly identityService: KeycloakAdminIdentityService | null;
  private readonly deliveryProofService: InvitationDeliveryProofService;

  constructor(
    databaseUrl: string | null,
    identityService: KeycloakAdminIdentityService | null = null,
  ) {
    this.pool = databaseUrl
      ? new Pool({ connectionString: databaseUrl })
      : null;
    this.identityService = identityService;
    this.deliveryProofService = getInvitationDeliveryProofService(this.pool);
  }

  hasDatabase(): boolean {
    return this.pool != null;
  }

  hasIdentityProvisioning(): boolean {
    return this.identityService != null;
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new AdminBackofficeError(
        "DATABASE_URL is required for persistent admin backoffice operations",
        503,
        "PERSISTENCE_UNAVAILABLE",
      );
    }
    return this.pool;
  }

  private requireIdentityProvisioning(): KeycloakAdminIdentityService {
    if (!this.identityService) {
      throw new AdminBackofficeError(
        "Identity provisioning is unavailable until Keycloak admin runtime credentials are configured",
        503,
        "IDENTITY_PROVISIONING_UNAVAILABLE",
      );
    }
    return this.identityService;
  }

  private async ensureOrganizationExists(
    queryable: DbQueryable,
    organizationId: string,
  ): Promise<void> {
    const result = await queryable.query<{ id: string }>(
      "SELECT id::text FROM organizations WHERE id = $1::uuid LIMIT 1",
      [organizationId],
    );
    if (!result.rows[0]) {
      throw new AdminBackofficeError(
        "Organization not found",
        404,
        "NOT_FOUND",
        { organizationId },
      );
    }
  }

  private async readOrganizationDeletionState(
    queryable: DbQueryable,
    organizationId: string | null,
  ): Promise<"invalid" | "missing" | "test" | "live"> {
    const normalizedId = organizationId?.trim() ?? "";
    if (!UUID_PATTERN.test(normalizedId)) {
      return "invalid";
    }

    const result = await queryable.query<{ settings: unknown }>(
      "SELECT settings FROM organizations WHERE id = $1::uuid LIMIT 1",
      [normalizedId],
    );
    if (!result.rows[0]) {
      return "missing";
    }

    return readOrganizationIsTest(result.rows[0].settings) ? "test" : "live";
  }

  private async readLinkedUserOrganizationState(
    queryable: DbQueryable,
    authUserId: string,
  ): Promise<{
    organizationId: string | null;
    state: "missing" | "test" | "live";
  } | null> {
    const result = await queryable.query<{
      organization_id: string | null;
      settings: unknown;
    }>(
      `
      SELECT
        u.organization_id::text,
        o.settings
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.auth_user_id = $1
      LIMIT 1
      `,
      [authUserId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    if (!row.organization_id || row.settings == null) {
      return {
        organizationId: row.organization_id ?? null,
        state: "missing",
      };
    }

    return {
      organizationId: row.organization_id,
      state: readOrganizationIsTest(row.settings) ? "test" : "live",
    };
  }

  private async findManagedKeycloakUsersByLogin(
    identityService: KeycloakAdminIdentityService,
    login: string,
  ) {
    const candidates = await Promise.all([
      identityService.findManagedUsersByEmail(login),
      identityService.findManagedUsersByUsername(login),
    ]);
    return Array.from(
      new Map(
        candidates
          .flat()
          .map((candidate) => [candidate.authUserId, candidate] as const),
      ).values(),
    );
  }

  private async cleanupOrphanedKeycloakUsersByLogin(
    queryable: DbQueryable,
    identityService: KeycloakAdminIdentityService,
    login: string,
  ): Promise<string[]> {
    const candidates = await this.findManagedKeycloakUsersByLogin(
      identityService,
      login,
    );
    const deletedAuthUserIds = new Set<string>();

    for (const candidate of candidates) {
      const linkedState = await this.readLinkedUserOrganizationState(
        queryable,
        candidate.authUserId,
      );
      if (linkedState) {
        if (linkedState.state === "live") {
          continue;
        }

        await identityService.deleteProvisionedUser(candidate.authUserId);
        deletedAuthUserIds.add(candidate.authUserId);
        continue;
      }

      const orgState = await this.readOrganizationDeletionState(
        queryable,
        candidate.organizationId,
      );
      if (orgState === "live") {
        continue;
      }

      await identityService.deleteProvisionedUser(candidate.authUserId);
      deletedAuthUserIds.add(candidate.authUserId);
    }

    return Array.from(deletedAuthUserIds);
  }

  private async provisionManagedUserWithConflictCleanup(
    queryable: DbQueryable,
    identityService: KeycloakAdminIdentityService,
    input: {
      email: string;
      organizationId: string;
      role: ManagedAdminUserRole;
      siteId: string | null;
    },
  ): Promise<{ authUserId: string }> {
    try {
      return await identityService.provisionUser(input);
    } catch (error) {
      if (
        !(error instanceof KeycloakAdminIdentityError) ||
        error.code !== "CONFLICT"
      ) {
        throw error;
      }

      const deletedOrphanIds = await this.cleanupOrphanedKeycloakUsersByLogin(
        queryable,
        identityService,
        input.email,
      );
      if (deletedOrphanIds.length === 0) {
        throw error;
      }

      return await identityService.provisionUser(input);
    }
  }

  private async cleanupKeycloakUsersForDeletedOrganization(
    queryable: DbQueryable,
    identityService: KeycloakAdminIdentityService,
    organizationId: string,
    logins: string[],
    linkedAuthUserIds: string[],
  ): Promise<string[]> {
    const deletedAuthUserIds = new Set(linkedAuthUserIds);

    for (const authUserId of linkedAuthUserIds) {
      await identityService.deleteProvisionedUser(authUserId);
    }

    for (const login of logins) {
      const candidates = await this.findManagedKeycloakUsersByLogin(
        identityService,
        login,
      );
      for (const candidate of candidates) {
        if (deletedAuthUserIds.has(candidate.authUserId)) {
          continue;
        }

        const linkedState = await this.readLinkedUserOrganizationState(
          queryable,
          candidate.authUserId,
        );
        if (linkedState) {
          if (linkedState.organizationId !== organizationId) {
            continue;
          }

          await identityService.deleteProvisionedUser(candidate.authUserId);
          deletedAuthUserIds.add(candidate.authUserId);
          continue;
        }

        if (candidate.organizationId !== organizationId) {
          continue;
        }

        await identityService.deleteProvisionedUser(candidate.authUserId);
        deletedAuthUserIds.add(candidate.authUserId);
      }
    }

    return Array.from(deletedAuthUserIds);
  }

  async listOrganizations(
    filters: AdminOrganizationListFilters,
  ): Promise<{ items: AdminOrganizationListItem[]; total: number }> {
    const page = Number.isFinite(filters.page)
      ? Math.max(1, Math.floor(filters.page))
      : 1;
    const pageSize = Number.isFinite(filters.pageSize)
      ? Math.max(1, Math.floor(filters.pageSize))
      : 20;
    const offset = (page - 1) * pageSize;
    const search = normalizeOptionalText(filters.search);
    const status = normalizeOrganizationStatusFilter(filters.status);
    const plan = normalizeBillingPlanFilter(filters.plan);
    const searchPattern = search ? `%${search}%` : null;
    const pool = this.getPool();

    const countResult = await pool.query<{ total: string | number }>(
      `
      SELECT COUNT(*)::text AS total
      FROM organizations o
      WHERE ($1::text IS NULL OR o.name ILIKE $1::text OR o.slug ILIKE $1::text OR o.contact_email ILIKE $1::text)
        AND ($2::text IS NULL OR o.status::text = $2::text)
        AND ($3::text IS NULL OR o.plan::text = $3::text)
      `,
      [searchPattern, status, plan],
    );
    const total = toInteger(countResult.rows[0]?.total ?? 0);

    const rows = await pool.query<DbOrganizationListRow>(
      `
      SELECT
        o.id::text,
        o.name,
        o.slug,
        o.status::text,
        o.plan::text,
        o.contact_email,
        o.settings,
        (
          SELECT COUNT(*)::text
          FROM users u
          WHERE u.organization_id = o.id
        ) AS user_count,
        (
          SELECT COUNT(*)::text
          FROM sites s
          WHERE s.organization_id = o.id
        ) AS site_count,
        o.created_at
      FROM organizations o
      WHERE ($1::text IS NULL OR o.name ILIKE $1::text OR o.slug ILIKE $1::text OR o.contact_email ILIKE $1::text)
        AND ($2::text IS NULL OR o.status::text = $2::text)
        AND ($3::text IS NULL OR o.plan::text = $3::text)
      ORDER BY LOWER(o.name) ASC, o.created_at DESC
      LIMIT $4 OFFSET $5
      `,
      [searchPattern, status, plan, pageSize, offset],
    );

    return {
      items: rows.rows.map(mapOrganizationRow),
      total,
    };
  }

  async createOrganization(
    input: AdminOrganizationCreateInput,
  ): Promise<AdminOrganizationListItem> {
    const name = normalizeRequiredText(input.name, "name", 2, 255);
    const slug = normalizeOrganizationSlugInput(input.slug);
    const contactEmail = normalizeContactEmailInput(input.contactEmail);
    const isTest = input.isTest === true;
    const plan = normalizeBillingPlanFilter(input.plan) ?? "free";
    ensureUuid(input.actorUserId, "actorUserId");
    const identityService = this.requireIdentityProvisioning();
    let provisionedAuthUserId: string | null = null;
    let initialInviteProof: EmailDeliveryProof | null = null;

    try {
      return await this.withTransaction(async (client) => {
        const created = await this.createOrganizationShell(client, {
          name,
          slug,
          contactEmail,
          isTest,
          plan,
        });

        await this.writeAudit(client, {
          action: "create_org",
          actorUserId: input.actorUserId,
          targetOrgId: created.organizationId,
          resourceType: "organization",
          resourceId: created.organizationId,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            name,
            slug,
            contactEmail,
            isTest,
            plan,
            autoInvitedContactEmail: contactEmail,
            autoInvitedRole: "org_admin",
          },
        });

        await this.ensureEmailAvailable(client, contactEmail);
        const provisioned = await this.provisionManagedUserWithConflictCleanup(
          client,
          identityService,
          {
            email: contactEmail,
            organizationId: created.organizationId,
            role: "org_admin",
            siteId: null,
          },
        );
        provisionedAuthUserId = provisioned.authUserId;

        const insertedUser = await client.query<DbUserRow>(
          `
          INSERT INTO users (
            id,
            organization_id,
            auth_user_id,
            email,
            email_verified,
            role,
            site_id,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            $4,
            false,
            'org_admin',
            NULL,
            'pending',
            NOW(),
            NOW()
          )
          RETURNING
            id::text,
            organization_id::text,
            auth_user_id,
            email,
            role::text,
            status::text,
            site_id::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at
          `,
          [
            randomUUID(),
            created.organizationId,
            provisioned.authUserId,
            contactEmail,
          ],
        );
        const userRow = insertedUser.rows[0];
        if (!userRow) {
          throw new AdminBackofficeError(
            "Initial organization admin creation failed",
            500,
            "USER_CREATE_FAILED",
          );
        }

        initialInviteProof =
          await this.deliveryProofService.recordInvitationAttempt(client, {
            organizationId: created.organizationId,
            userId: userRow.id,
            authUserId: provisioned.authUserId,
            email: contactEmail,
            metadata: {
              source: "create_organization",
              actorUserId: input.actorUserId,
              requestId: input.requestId,
            },
          });

        await this.writeAudit(client, {
          action: "invite_user",
          actorUserId: input.actorUserId,
          targetOrgId: created.organizationId,
          resourceType: "user",
          resourceId: userRow.id,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            authUserId: provisioned.authUserId,
            email: contactEmail,
            role: "org_admin",
            siteId: null,
            invitedByEmail: null,
            targetStatus: userRow.status,
            targetUserId: userRow.id,
            permissionUsed: "admin:org:write",
            routeTemplate: "/api/v1/admin/organizations",
            operation: "invite_user",
            outcome: "success",
            autoProvisionedFromOrganizationCreate: true,
          },
        });

        return {
          ...mapOrganizationRow({
            ...created.row,
            user_count: "1",
          }),
          initialInviteProof,
        };
      });
    } catch (error) {
      if (provisionedAuthUserId) {
        try {
          await identityService.deleteProvisionedUser(provisionedAuthUserId);
        } catch {
          // Preserve the original organization creation error.
        }
      }

      if (error instanceof AdminBackofficeError) {
        throw error;
      }
      if (error instanceof KeycloakAdminIdentityError) {
        throw new AdminBackofficeError(
          error.message,
          error.statusCode,
          error.code,
          error.details,
        );
      }
      throw new AdminBackofficeError(
        "Organization creation failed",
        500,
        "ORGANIZATION_CREATE_FAILED",
      );
    }
  }

  async deleteOrganization(
    input: AdminOrganizationDeleteInput,
  ): Promise<AdminOrganizationDeleteResult> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.actorUserId, "actorUserId");
    const organizationSlug = normalizeOrganizationSlugInput(
      input.organizationSlug,
    );

    if (input.confirmationText !== "SUPPRIMER") {
      throw new AdminBackofficeError(
        "Type SUPPRIMER to confirm deletion",
        400,
        "DELETE_CONFIRMATION_INVALID",
      );
    }

    if (input.acknowledgeTestDeletion !== true) {
      throw new AdminBackofficeError(
        "Test deletion acknowledgement is required",
        400,
        "DELETE_ACKNOWLEDGEMENT_REQUIRED",
      );
    }

    return await this.withTransaction(async (client) => {
      const currentResult = await client.query<
        Pick<
          DbOrganizationListRow,
          "id" | "name" | "slug" | "settings" | "contact_email"
        >
      >(
        `
        SELECT
          o.id::text,
          o.name,
          o.slug,
          o.settings,
          o.contact_email
        FROM organizations o
        WHERE o.id = $1::uuid
        LIMIT 1
        FOR UPDATE
        `,
        [input.organizationId],
      );

      const current = currentResult.rows[0];
      if (!current) {
        throw new AdminBackofficeError(
          "Organization not found",
          404,
          "NOT_FOUND",
          { organizationId: input.organizationId },
        );
      }

      if (current.slug !== organizationSlug) {
        throw new AdminBackofficeError(
          "Typed slug does not match this organization",
          409,
          "DELETE_SLUG_MISMATCH",
          { organizationId: input.organizationId, expectedSlug: current.slug },
        );
      }

      if (!readOrganizationIsTest(current.settings)) {
        throw new AdminBackofficeError(
          "Only test organizations can be permanently deleted",
          409,
          "DELETE_ONLY_FOR_TEST_ORGS",
          { organizationId: input.organizationId, slug: current.slug },
        );
      }

      const provisionedUsersResult = await client.query<{
        id: string;
        auth_user_id: string;
        email: string;
      }>(
        `
        SELECT
          u.id::text,
          u.auth_user_id,
          u.email
        FROM users u
        WHERE u.organization_id = $1::uuid
          AND u.auth_user_id IS NOT NULL
        ORDER BY u.created_at DESC, u.id DESC
        `,
        [input.organizationId],
      );
      const provisionedUsers = provisionedUsersResult.rows.map((row) => ({
        id: row.id,
        authUserId: row.auth_user_id,
        email: row.email,
      }));

      let deletedProvisionedAuthUserIds: string[] = [];
      const candidateLogins = Array.from(
        new Set([
          current.contact_email,
          ...provisionedUsers.map((user) => user.email),
        ]),
      );

      if (provisionedUsers.length > 0 || candidateLogins.length > 0) {
        const identityService = this.requireIdentityProvisioning();
        deletedProvisionedAuthUserIds =
          await this.cleanupKeycloakUsersForDeletedOrganization(
            client,
            identityService,
            input.organizationId,
            candidateLogins,
            provisionedUsers.map((user) => user.authUserId),
          );
      }

      await this.writeAudit(client, {
        action: "delete_org",
        actorUserId: input.actorUserId,
        targetOrgId: input.organizationId,
        resourceType: "organization",
        resourceId: input.organizationId,
        requestId: input.requestId,
        ipAddress: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          name: current.name,
          slug: current.slug,
          isTest: true,
          deletedProvisionedUserCount: deletedProvisionedAuthUserIds.length,
          deletedProvisionedUserEmails: candidateLogins,
          deletedProvisionedAuthUserIds,
        },
      });

      await client.query("DELETE FROM organizations WHERE id = $1::uuid", [
        input.organizationId,
      ]);

      return {
        organizationId: input.organizationId,
        slug: current.slug,
        deleted: true,
      };
    });
  }

  async listContactRequests(
    filters: AdminContactRequestListFilters,
  ): Promise<{ items: AdminContactRequestRecord[]; total: number }> {
    const page = Number.isFinite(filters.page)
      ? Math.max(1, Math.floor(filters.page))
      : 1;
    const pageSize = Number.isFinite(filters.pageSize)
      ? Math.max(1, Math.floor(filters.pageSize))
      : 20;
    const offset = (page - 1) * pageSize;
    const search = normalizeOptionalText(filters.search);
    const status = normalizeContactRequestStatusFilter(filters.status);
    const requestType = normalizeContactRequestTypeFilter(filters.requestType);
    const searchPattern = search ? `%${search}%` : null;
    const pool = this.getPool();

    const countResult = await pool.query<{ total: string | number }>(
      `
      SELECT COUNT(*)::text AS total
      FROM contact_requests cr
      WHERE (
        $1::text IS NULL
        OR cr.company_name ILIKE $1::text
        OR cr.subject ILIKE $1::text
        OR cr.email ILIKE $1::text
        OR cr.first_name ILIKE $1::text
        OR cr.last_name ILIKE $1::text
      )
        AND ($2::text IS NULL OR cr.status = $2::text)
        AND ($3::text IS NULL OR cr.request_type = $3::text)
      `,
      [searchPattern, status, requestType],
    );
    const total = toInteger(countResult.rows[0]?.total ?? 0);

    const rows = await pool.query<DbContactRequestRow>(
      `
      SELECT
        cr.id::text,
        cr.created_at,
        cr.updated_at,
        cr.locale,
        cr.request_type,
        cr.company_name,
        cr.first_name,
        cr.last_name,
        cr.role,
        cr.email,
        cr.phone,
        cr.subject,
        cr.message,
        cr.status,
        cr.consent,
        cr.metadata_json
      FROM contact_requests cr
      WHERE (
        $1::text IS NULL
        OR cr.company_name ILIKE $1::text
        OR cr.subject ILIKE $1::text
        OR cr.email ILIKE $1::text
        OR cr.first_name ILIKE $1::text
        OR cr.last_name ILIKE $1::text
      )
        AND ($2::text IS NULL OR cr.status = $2::text)
        AND ($3::text IS NULL OR cr.request_type = $3::text)
      ORDER BY cr.created_at DESC, cr.updated_at DESC, cr.id DESC
      LIMIT $4 OFFSET $5
      `,
      [searchPattern, status, requestType, pageSize, offset],
    );

    return {
      items: rows.rows.map(mapContactRequestRow),
      total,
    };
  }

  async listAuditLog(
    filters: AdminAuditLogListFilters,
  ): Promise<{ items: AdminAuditLogRecord[]; total: number }> {
    const page = Number.isFinite(filters.page)
      ? Math.max(1, Math.floor(filters.page))
      : 1;
    const pageSize = Number.isFinite(filters.pageSize)
      ? Math.max(1, Math.floor(filters.pageSize))
      : 20;
    const offset = (page - 1) * pageSize;
    const action = normalizeOptionalText(filters.action);
    const pool = this.getPool();

    const countResult = await pool.query<{ total: string | number }>(
      `
      SELECT COUNT(*)::text AS total
      FROM admin_audit_log aal
      WHERE ($1::text IS NULL OR aal.action::text = $1::text)
      `,
      [action],
    );
    const total = toInteger(countResult.rows[0]?.total ?? 0);

    const rows = await pool.query<DbAdminAuditLogRow>(
      `
      SELECT
        aal.id::text,
        aal.admin_user_id::text,
        aal.admin_auth_user_id,
        aal.target_org_id::text,
        aal.action::text,
        aal.resource_type,
        aal.resource_id::text,
        aal.ip_address,
        aal.user_agent,
        aal.request_id,
        aal.metadata_json,
        aal.severity,
        aal.created_at
      FROM admin_audit_log aal
      WHERE ($1::text IS NULL OR aal.action::text = $1::text)
      ORDER BY aal.created_at DESC, aal.id DESC
      LIMIT $2 OFFSET $3
      `,
      [action, pageSize, offset],
    );

    return {
      items: rows.rows.map(mapAdminAuditLogRow),
      total,
    };
  }

  async getConversationUnreadCount(): Promise<AdminConversationUnreadCount> {
    const pool = this.getPool();
    const totalResult = await pool.query<{ total: string | number }>(
      `
      SELECT COUNT(m.id)::text AS total
      FROM messages m
      WHERE m.is_read = false
      `,
    );
    const rows = await pool.query<DbAdminConversationUnreadRow>(
      `
      SELECT
        c.organization_id::text AS org_id,
        o.name AS org_name,
        COUNT(m.id)::text AS unread_count
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      INNER JOIN organizations o ON o.id = c.organization_id
      WHERE m.is_read = false
      GROUP BY c.organization_id, o.name
      ORDER BY COUNT(m.id) DESC, LOWER(o.name) ASC
      `,
    );

    return {
      total: toInteger(totalResult.rows[0]?.total ?? 0),
      byOrg: rows.rows.map((row) => ({
        orgId: row.org_id,
        orgName: row.org_name,
        count: toInteger(row.unread_count),
      })),
    };
  }

  async updateContactRequestStatus(
    requestId: string,
    status: string,
  ): Promise<AdminContactRequestRecord> {
    ensureUuid(requestId, "requestId");
    ensureContactRequestStatus(status);
    const pool = this.getPool();
    const result = await pool.query<DbContactRequestRow>(
      `
      UPDATE contact_requests
      SET status = $2::text,
          updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        created_at,
        updated_at,
        locale,
        request_type,
        company_name,
        first_name,
        last_name,
        role,
        email,
        phone,
        subject,
        message,
        status,
        consent,
        metadata_json
      `,
      [requestId, status],
    );
    const row = result.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "Contact request not found",
        404,
        "NOT_FOUND",
        { requestId },
      );
    }

    return mapContactRequestRow(row);
  }

  async getOrganizationDetail(
    organizationId: string,
  ): Promise<AdminOrganizationDetail> {
    ensureUuid(organizationId, "organizationId");
    const pool = this.getPool();
    const detailResult = await pool.query<DbOrganizationDetailRow>(
      `
      SELECT
        o.id::text,
        o.name,
        o.slug,
        o.status::text,
        o.plan::text,
        o.contact_email,
        o.settings,
        o.sector::text AS sector,
        o.size::text AS size,
        (
          SELECT COUNT(*)::text
          FROM users u
          WHERE u.organization_id = o.id
        ) AS user_count,
        (
          SELECT COUNT(*)::text
          FROM sites s
          WHERE s.organization_id = o.id
        ) AS site_count,
        o.created_at
      FROM organizations o
      WHERE o.id = $1::uuid
      LIMIT 1
      `,
      [organizationId],
    );
    const row = detailResult.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "Organization not found",
        404,
        "NOT_FOUND",
        { organizationId },
      );
    }

    const hierarchyResult = await pool.query<DbOrganizationHierarchyRow>(
      `
      SELECT
        s.id::text AS site_id,
        s.name AS site_name,
        NULLIF(s.address->>'city', '') AS site_city,
        d.id::text AS department_id,
        d.name AS department_name,
        d.headcount::text AS department_headcount
      FROM sites s
      LEFT JOIN departments d
        ON d.organization_id = s.organization_id
       AND d.site_id = s.id
      WHERE s.organization_id = $1::uuid
      ORDER BY LOWER(s.name) ASC, LOWER(COALESCE(d.name, '')) ASC
      `,
      [organizationId],
    );

    return {
      ...mapOrganizationRow(row),
      ...(row.sector ? { sector: row.sector } : {}),
      ...(row.size ? { size: row.size } : {}),
      sites: mapOrganizationHierarchyRows(hierarchyResult.rows),
    };
  }

  async listOrganizationAlertSummaries(
    organizationId: string,
    limit = 5,
  ): Promise<AdminOrganizationAlertSummary[]> {
    ensureUuid(organizationId, "organizationId");
    const pool = this.getPool();
    const rows = await pool.query<DbOrganizationAlertSummaryRow>(
      `
      SELECT
        ca.id::text AS id,
        ca.alert_date,
        ca.horizon::text AS alert_type,
        ca.severity::text AS severity,
        ca.status::text AS status,
        ca.site_id,
        s.name AS site_name
      FROM coverage_alerts ca
      LEFT JOIN sites s
        ON s.id::text = ca.site_id
       AND s.organization_id = ca.organization_id
      WHERE ca.organization_id = $1::uuid
      ORDER BY ca.alert_date DESC, ca.created_at DESC
      LIMIT $2
      `,
      [organizationId, Math.max(1, Math.floor(limit))],
    );

    return rows.rows.map(mapOrganizationAlertSummaryRow);
  }

  async listOrganizationScenarioSummaries(
    organizationId: string,
    limit = 5,
  ): Promise<AdminOrganizationScenarioSummary[]> {
    ensureUuid(organizationId, "organizationId");
    const pool = this.getPool();
    const rows = await pool.query<DbOrganizationScenarioSummaryRow>(
      `
      SELECT
        so.id::text AS id,
        COALESCE(NULLIF(so.label, ''), so.option_type::text) AS name,
        CASE
          WHEN so.is_recommended THEN 'recommended'
          WHEN so.is_pareto_optimal THEN 'pareto'
          ELSE 'candidate'
        END AS status,
        so.created_at
      FROM scenario_options so
      WHERE so.organization_id = $1::uuid
      ORDER BY
        so.is_recommended DESC,
        so.is_pareto_optimal DESC,
        so.created_at DESC,
        so.id ASC
      LIMIT $2
      `,
      [organizationId, Math.max(1, Math.floor(limit))],
    );

    return rows.rows.map(mapOrganizationScenarioSummaryRow);
  }

  private async ensureEmailAvailable(
    queryable: DbQueryable,
    email: string,
    excludeUserId?: string,
  ): Promise<void> {
    const result = await queryable.query<{ id: string }>(
      excludeUserId
        ? "SELECT id::text FROM users WHERE email = $1 AND id <> $2::uuid LIMIT 1"
        : "SELECT id::text FROM users WHERE email = $1 LIMIT 1",
      excludeUserId ? [email, excludeUserId] : [email],
    );

    if (result.rows[0]) {
      throw new AdminBackofficeError(
        "A user with this email already exists",
        409,
        "CONFLICT",
        { email },
      );
    }
  }

  private async createOrganizationShell(
    client: PoolClient,
    input: {
      name: string;
      slug: string;
      contactEmail: string;
      isTest: boolean;
      plan: BillingPlan;
    },
  ): Promise<CreatedOrganizationShell> {
    const existing = await client.query<{ id: string }>(
      "SELECT id::text FROM organizations WHERE slug = $1 LIMIT 1",
      [input.slug],
    );

    if (existing.rows[0]) {
      throw new AdminBackofficeError(
        "An organization with this slug already exists",
        409,
        "CONFLICT",
        { slug: input.slug },
      );
    }

    const organizationId = randomUUID();
    const inserted = await client.query<DbOrganizationListRow>(
      `
      INSERT INTO organizations (
        id,
        name,
        slug,
        status,
        plan,
        contact_email,
        settings
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        'trial',
        $4,
        $5,
        $6::jsonb
      )
      RETURNING
        id::text,
        name,
        slug,
        status::text,
        plan::text,
        contact_email,
        settings,
        '0'::text AS user_count,
        '0'::text AS site_count,
        created_at
      `,
      [
        organizationId,
        input.name,
        input.slug,
        input.plan,
        input.contactEmail,
        JSON.stringify(buildOrganizationSettings(input.isTest)),
      ],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "Organization creation failed",
        500,
        "ORGANIZATION_CREATE_FAILED",
      );
    }

    return { organizationId: row.id, row };
  }

  private async resolveValidatedSiteId(
    queryable: DbQueryable,
    organizationId: string,
    role: AssignableRole,
    siteId: string | null | undefined,
  ): Promise<string | null> {
    const normalizedSiteId = siteId?.trim() || null;

    if (requiresSiteScope(role) && !normalizedSiteId) {
      throw new AdminBackofficeError(
        "site_id is required for manager and hr_manager accounts",
        422,
        "VALIDATION_ERROR",
        { role, siteId: normalizedSiteId },
      );
    }

    if (!requiresSiteScope(role) && normalizedSiteId) {
      throw new AdminBackofficeError(
        "site_id is only allowed for manager and hr_manager accounts",
        422,
        "VALIDATION_ERROR",
        { role, siteId: normalizedSiteId },
      );
    }

    if (!normalizedSiteId) {
      return null;
    }

    const result = await queryable.query<{ id: string }>(
      `
      SELECT id::text
      FROM sites
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
      LIMIT 1
      `,
      [organizationId, normalizedSiteId],
    );

    if (!result.rows[0]) {
      throw new AdminBackofficeError(
        "site_id does not belong to the target organization",
        404,
        "NOT_FOUND",
        { organizationId, siteId: normalizedSiteId },
      );
    }

    return normalizedSiteId;
  }

  private async getOrganizationUserRow(
    queryable: DbQueryable,
    organizationId: string,
    userId: string,
  ): Promise<DbUserRow> {
    const current = await queryable.query<DbUserRow>(
      `
      SELECT
        u.id::text,
        u.organization_id::text,
        u.auth_user_id,
        u.email,
        u.role::text,
        u.status::text,
        u.site_id::text,
        s.name AS site_name,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN sites s ON s.id = u.site_id
      WHERE u.organization_id = $1::uuid
        AND u.id = $2::uuid
      LIMIT 1
      `,
      [organizationId, userId],
    );
    const row = current.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "User not found for this organization",
        404,
        "NOT_FOUND",
        { organizationId, userId },
      );
    }
    return row;
  }

  private async withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async resolvePersistedActorUserId(
    client: PoolClient,
    actorUserId: string,
  ): Promise<string | null> {
    ensureUuid(actorUserId, "actorUserId");

    const result = await client.query<{ id: string }>(
      `
      SELECT id::text
      FROM users
      WHERE id::text = $1 OR auth_user_id = $1
      ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [actorUserId],
    );

    return result.rows[0]?.id ?? null;
  }

  private async writeAudit(
    client: PoolClient,
    input: AdminAuditMetadata,
  ): Promise<void> {
    ensureUuid(input.actorUserId, "actorUserId");
    ensureUuid(input.targetOrgId, "targetOrgId");
    const persistedActorUserId = await this.resolvePersistedActorUserId(
      client,
      input.actorUserId,
    );

    await client.query(
      `
      INSERT INTO admin_audit_log (
        id,
        admin_user_id,
        admin_auth_user_id,
        target_org_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        request_id,
        metadata_json,
        severity
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3,
        $4::uuid,
        $5,
        $6,
        $7::uuid,
        $8,
        $9,
        $10,
        $11::jsonb,
        $12
      )
      `,
      [
        randomUUID(),
        persistedActorUserId,
        input.actorUserId,
        input.targetOrgId,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        input.ipAddress ?? "unknown",
        input.userAgent,
        input.requestId,
        JSON.stringify({
          actorAuthUserId: input.actorUserId,
          ...input.metadata,
        }),
        input.severity ?? "INFO",
      ],
    );
  }

  async recordPrivilegedUserAttempt(input: {
    actorUserId: string;
    targetOrgId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
    permissionUsed: string;
    routeTemplate: string;
    operation: "invite_user" | "change_role";
    outcome: PrivilegedAttemptOutcome;
    resourceId?: string | null;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const client = await this.getPool().connect();
    try {
      await this.writeAudit(client, {
        action: input.operation,
        actorUserId: input.actorUserId,
        targetOrgId: input.targetOrgId,
        resourceType: "user",
        resourceId: input.resourceId ?? null,
        requestId: input.requestId,
        ipAddress: input.clientIp,
        userAgent: input.userAgent,
        severity:
          input.outcome === "failed"
            ? "ERROR"
            : input.outcome === "rejected"
              ? "WARN"
              : "INFO",
        metadata: {
          ...input.metadata,
          permissionUsed: input.permissionUsed,
          routeTemplate: input.routeTemplate,
          operation: input.operation,
          outcome: input.outcome,
        },
      });
    } finally {
      client.release();
    }
  }

  private async safeRecordPrivilegedUserAttempt(input: {
    actorUserId: string;
    targetOrgId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
    permissionUsed: string;
    routeTemplate: string;
    operation: "invite_user" | "change_role";
    outcome: PrivilegedAttemptOutcome;
    resourceId?: string | null;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.recordPrivilegedUserAttempt(input);
    } catch {
      // Preserve the original admin operation error when audit persistence fails.
    }
  }

  async listOrganizationUsers(
    organizationId: string,
  ): Promise<AdminUserRecord[]> {
    ensureUuid(organizationId, "organizationId");
    const pool = this.getPool();
    await this.deliveryProofService.ensureReady();
    const rows = await pool.query<DbUserRow>(
      `
      SELECT
        u.id::text,
        u.organization_id::text,
        u.auth_user_id,
        u.email,
        u.role::text,
        u.status::text,
        u.site_id::text,
        s.name AS site_name,
        u.last_login_at,
        u.created_at,
        u.updated_at,
${USER_DELIVERY_PROOF_SELECT_SQL}
      FROM users u
      LEFT JOIN sites s ON s.id = u.site_id
${USER_DELIVERY_PROOF_JOIN_SQL}
      WHERE u.organization_id = $1::uuid
      ORDER BY u.created_at DESC
      `,
      [organizationId],
    );
    return rows.rows.map(mapUserRow);
  }

  async getOrganizationUser(
    organizationId: string,
    userId: string,
  ): Promise<AdminUserRecord | null> {
    ensureUuid(organizationId, "organizationId");
    ensureUuid(userId, "userId");
    const pool = this.getPool();
    await this.deliveryProofService.ensureReady();
    const row = await pool.query<DbUserRow>(
      `
      SELECT
        u.id::text,
        u.organization_id::text,
        u.auth_user_id,
        u.email,
        u.role::text,
        u.status::text,
        u.site_id::text,
        s.name AS site_name,
        u.last_login_at,
        u.created_at,
        u.updated_at,
${USER_DELIVERY_PROOF_SELECT_SQL}
      FROM users u
      LEFT JOIN sites s ON s.id = u.site_id
${USER_DELIVERY_PROOF_JOIN_SQL}
      WHERE u.organization_id = $1::uuid
        AND u.id = $2::uuid
      LIMIT 1
      `,
      [organizationId, userId],
    );
    return row.rows[0] ? mapUserRow(row.rows[0]) : null;
  }

  async inviteOrganizationUser(input: {
    organizationId: string;
    email: string;
    role: string;
    siteId?: string | null;
    actorUserId: string;
    actorEmail: string | null;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
    permissionUsed?: string;
    routeTemplate?: string;
  }): Promise<AdminUserRecord> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.actorUserId, "actorUserId");
    ensureAssignableRole(input.role);

    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AdminBackofficeError(
        "A valid email is required",
        422,
        "VALIDATION_ERROR",
        { email: input.email },
      );
    }

    const identityService = this.requireIdentityProvisioning();
    const pool = this.getPool();
    let siteId: string | null = null;
    let provisionedAuthUserId: string | null = null;
    let deliveryProof: EmailDeliveryProof | null = null;
    try {
      await this.ensureOrganizationExists(pool, input.organizationId);
      siteId = await this.resolveValidatedSiteId(
        pool,
        input.organizationId,
        input.role,
        input.siteId,
      );
      await this.ensureEmailAvailable(pool, email);

      const provisioned = await this.provisionManagedUserWithConflictCleanup(
        pool,
        identityService,
        {
          email,
          organizationId: input.organizationId,
          role: input.role,
          siteId,
        },
      );
      provisionedAuthUserId = provisioned.authUserId;

      return await this.withTransaction(async (client) => {
        await this.ensureEmailAvailable(client, email);

        const inserted = await client.query<DbUserRow>(
          `
          INSERT INTO users (
            id,
            organization_id,
            auth_user_id,
            email,
            email_verified,
            role,
            site_id,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            $4,
            false,
            $5,
            $6::uuid,
            'pending',
            NOW(),
            NOW()
          )
          RETURNING
            id::text,
            organization_id::text,
            auth_user_id,
            email,
            role::text,
            status::text,
            site_id::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at,
            NULL::text AS delivery_proof_status,
            NULL::timestamptz AS delivery_proof_initiated_at,
            NULL::text AS delivery_proof_event_type,
            NULL::timestamptz AS delivery_proof_occurred_at,
            NULL::timestamptz AS delivery_proof_observed_at,
            NULL::text AS delivery_proof_summary
          `,
          [
            randomUUID(),
            input.organizationId,
            provisioned.authUserId,
            email,
            input.role,
            siteId,
          ],
        );

        const row = inserted.rows[0];
        if (!row) {
          throw new AdminBackofficeError(
            "Unable to create user",
            500,
            "INTERNAL_ERROR",
          );
        }

        deliveryProof = await this.deliveryProofService.recordInvitationAttempt(
          client,
          {
            organizationId: input.organizationId,
            userId: row.id,
            authUserId: provisioned.authUserId,
            email,
            metadata: {
              source: "invite_user",
              actorUserId: input.actorUserId,
              requestId: input.requestId,
              role: input.role,
            },
          },
        );

        await this.writeAudit(client, {
          action: "invite_user",
          actorUserId: input.actorUserId,
          targetOrgId: input.organizationId,
          resourceType: "user",
          resourceId: row.id,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            authUserId: provisioned.authUserId,
            email,
            role: input.role,
            siteId,
            invitedByEmail: input.actorEmail,
            targetStatus: row.status,
            targetUserId: row.id,
            permissionUsed: input.permissionUsed ?? null,
            routeTemplate: input.routeTemplate ?? null,
            operation: "invite_user",
            outcome: "success",
          },
        });

        return {
          ...mapUserRow(row),
          deliveryProof,
        };
      });
    } catch (error) {
      const normalized =
        error instanceof AdminBackofficeError
          ? error
          : error instanceof KeycloakAdminIdentityError
            ? new AdminBackofficeError(
                error.message,
                error.statusCode,
                error.code,
                error.details,
              )
            : new AdminBackofficeError(
                "Unable to create user",
                500,
                "INTERNAL_ERROR",
              );

      if (provisionedAuthUserId) {
        try {
          await identityService.deleteProvisionedUser(provisionedAuthUserId);
        } catch {
          // Preserve the original DB or Keycloak provisioning error.
        }
      }

      await this.safeRecordPrivilegedUserAttempt({
        actorUserId: input.actorUserId,
        targetOrgId: input.organizationId,
        requestId: input.requestId,
        clientIp: input.clientIp,
        userAgent: input.userAgent,
        permissionUsed: input.permissionUsed ?? "admin:users:write",
        routeTemplate:
          input.routeTemplate ??
          "/api/v1/admin/organizations/:orgId/users/invite",
        operation: "invite_user",
        outcome: normalized.statusCode >= 500 ? "failed" : "rejected",
        metadata: {
          email,
          role: input.role,
          siteId,
          invitedByEmail: input.actorEmail,
          errorCode: normalized.code,
          failureStatusCode: normalized.statusCode,
        },
      });
      throw normalized;
    }
  }

  async changeOrganizationUserRole(input: {
    organizationId: string;
    userId: string;
    role: string;
    siteId?: string | null;
    actorUserId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
    permissionUsed?: string;
    routeTemplate?: string;
  }): Promise<AdminUserRecord> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.userId, "userId");
    ensureUuid(input.actorUserId, "actorUserId");
    ensureAssignableRole(input.role);

    const identityService = this.requireIdentityProvisioning();
    const pool = this.getPool();
    let current: DbUserRow | null = null;
    let siteId: string | null = null;
    try {
      current = await this.getOrganizationUserRow(
        pool,
        input.organizationId,
        input.userId,
      );
      if (!ASSIGNABLE_ROLE_SET.has(current.role as AssignableRole)) {
        throw new AdminBackofficeError(
          "This user cannot be managed from organization user lifecycle routes",
          403,
          "FORBIDDEN",
          { userId: input.userId, currentRole: current.role },
        );
      }

      siteId = await this.resolveValidatedSiteId(
        pool,
        input.organizationId,
        input.role,
        requiresSiteScope(input.role)
          ? (input.siteId ?? current.site_id)
          : null,
      );
      const currentRow = current;

      await identityService.syncUser({
        authUserId: currentRow.auth_user_id,
        organizationId: input.organizationId,
        role: input.role,
        siteId,
        enabled: isIdentityEnabledForStatus(currentRow.status),
      });

      return await this.withTransaction(async (client) => {
        const updated = await client.query<DbUserRow>(
          `
          UPDATE users
          SET role = $3, site_id = $4::uuid, updated_at = NOW()
          WHERE organization_id = $1::uuid
            AND id = $2::uuid
          RETURNING
            id::text,
            organization_id::text,
            auth_user_id,
            email,
            role::text,
            status::text,
            site_id::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at,
            NULL::text AS delivery_proof_status,
            NULL::timestamptz AS delivery_proof_initiated_at,
            NULL::text AS delivery_proof_event_type,
            NULL::timestamptz AS delivery_proof_occurred_at,
            NULL::timestamptz AS delivery_proof_observed_at,
            NULL::text AS delivery_proof_summary
          `,
          [input.organizationId, input.userId, input.role, siteId],
        );
        const next = updated.rows[0];
        if (!next) {
          throw new AdminBackofficeError(
            "Unable to update user role",
            500,
            "INTERNAL_ERROR",
          );
        }

        await this.writeAudit(client, {
          action: "change_role",
          actorUserId: input.actorUserId,
          targetOrgId: input.organizationId,
          resourceType: "user",
          resourceId: input.userId,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            authUserId: currentRow.auth_user_id,
            beforeRole: currentRow.role,
            afterRole: next.role,
            beforeSiteId: currentRow.site_id,
            afterSiteId: next.site_id,
            beforeStatus: currentRow.status,
            afterStatus: next.status,
            email: currentRow.email,
            targetUserId: input.userId,
            permissionUsed: input.permissionUsed ?? null,
            routeTemplate: input.routeTemplate ?? null,
            operation: "change_role",
            outcome: "success",
          },
        });

        return mapUserRow(next);
      });
    } catch (error) {
      const normalized =
        error instanceof AdminBackofficeError
          ? error
          : error instanceof KeycloakAdminIdentityError
            ? new AdminBackofficeError(
                error.message,
                error.statusCode,
                error.code,
                error.details,
              )
            : new AdminBackofficeError(
                "Unable to update user role",
                500,
                "INTERNAL_ERROR",
              );

      if (current && normalized.code !== "NOT_FOUND") {
        try {
          await identityService.syncUser({
            authUserId: current.auth_user_id,
            organizationId: current.organization_id,
            role: assertManagedAssignableRole(current.role),
            siteId: current.site_id,
            enabled: isIdentityEnabledForStatus(current.status),
          });
        } catch {
          // Preserve the original mutation error.
        }
      }

      await this.safeRecordPrivilegedUserAttempt({
        actorUserId: input.actorUserId,
        targetOrgId: input.organizationId,
        resourceId: input.userId,
        requestId: input.requestId,
        clientIp: input.clientIp,
        userAgent: input.userAgent,
        permissionUsed: input.permissionUsed ?? "admin:users:write",
        routeTemplate:
          input.routeTemplate ??
          "/api/v1/admin/organizations/:orgId/users/:userId/role",
        operation: "change_role",
        outcome: normalized.statusCode >= 500 ? "failed" : "rejected",
        metadata: {
          authUserId: current?.auth_user_id ?? null,
          targetUserId: input.userId,
          targetRole: input.role,
          siteId,
          errorCode: normalized.code,
          failureStatusCode: normalized.statusCode,
        },
      });
      throw normalized;
    }
  }

  async deactivateOrganizationUser(input: {
    organizationId: string;
    userId: string;
    actorUserId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
  }): Promise<AdminUserRecord> {
    return this.updateOrganizationUserStatus({
      ...input,
      nextStatus: "inactive",
      auditAction: "deactivate_user",
    });
  }

  async reactivateOrganizationUser(input: {
    organizationId: string;
    userId: string;
    actorUserId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
  }): Promise<AdminUserRecord> {
    return this.updateOrganizationUserStatus({
      ...input,
      nextStatus: "active",
      auditAction: "reactivate_user",
    });
  }

  private async updateOrganizationUserStatus(input: {
    organizationId: string;
    userId: string;
    actorUserId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
    nextStatus: "active" | "inactive";
    auditAction: "deactivate_user" | "reactivate_user";
  }): Promise<AdminUserRecord> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.userId, "userId");
    ensureUuid(input.actorUserId, "actorUserId");

    const identityService = this.requireIdentityProvisioning();
    const pool = this.getPool();
    const current = await this.getOrganizationUserRow(
      pool,
      input.organizationId,
      input.userId,
    );
    if (!ASSIGNABLE_ROLE_SET.has(current.role as AssignableRole)) {
      throw new AdminBackofficeError(
        "This user cannot be managed from organization user lifecycle routes",
        403,
        "FORBIDDEN",
        { userId: input.userId, currentRole: current.role },
      );
    }

    try {
      await identityService.syncUser({
        authUserId: current.auth_user_id,
        organizationId: current.organization_id,
        role: assertManagedAssignableRole(current.role),
        siteId: current.site_id,
        enabled: input.nextStatus === "active",
      });

      return await this.withTransaction(async (client) => {
        const updated = await client.query<DbUserRow>(
          `
          UPDATE users
          SET status = $3, updated_at = NOW()
          WHERE organization_id = $1::uuid
            AND id = $2::uuid
          RETURNING
            id::text,
            organization_id::text,
            auth_user_id,
            email,
            role::text,
            status::text,
            site_id::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at,
            NULL::text AS delivery_proof_status,
            NULL::timestamptz AS delivery_proof_initiated_at,
            NULL::text AS delivery_proof_event_type,
            NULL::timestamptz AS delivery_proof_occurred_at,
            NULL::timestamptz AS delivery_proof_observed_at,
            NULL::text AS delivery_proof_summary
          `,
          [input.organizationId, input.userId, input.nextStatus],
        );
        const next = updated.rows[0];
        if (!next) {
          throw new AdminBackofficeError(
            "Unable to update user status",
            500,
            "INTERNAL_ERROR",
          );
        }

        await this.writeAudit(client, {
          action: input.auditAction,
          actorUserId: input.actorUserId,
          targetOrgId: input.organizationId,
          resourceType: "user",
          resourceId: input.userId,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            authUserId: current.auth_user_id,
            beforeStatus: current.status,
            afterStatus: next.status,
            email: current.email,
          },
        });

        return mapUserRow(next);
      });
    } catch (error) {
      const normalized =
        error instanceof AdminBackofficeError
          ? error
          : error instanceof KeycloakAdminIdentityError
            ? new AdminBackofficeError(
                error.message,
                error.statusCode,
                error.code,
                error.details,
              )
            : new AdminBackofficeError(
                "Unable to update user status",
                500,
                "INTERNAL_ERROR",
              );

      if (normalized.code !== "NOT_FOUND") {
        try {
          await identityService.syncUser({
            authUserId: current.auth_user_id,
            organizationId: current.organization_id,
            role: assertManagedAssignableRole(current.role),
            siteId: current.site_id,
            enabled: isIdentityEnabledForStatus(current.status),
          });
        } catch {
          // Preserve the original mutation error.
        }
      }

      throw normalized;
    }
  }

  async getBillingInfo(organizationId: string): Promise<BillingInfo> {
    ensureUuid(organizationId, "organizationId");

    const result = await this.getPool().query<DbBillingRow>(
      `
      SELECT
        o.plan::text AS plan,
        (
          SELECT COUNT(*)::text
          FROM users u
          WHERE u.organization_id = o.id
        ) AS user_count,
        (
          SELECT COUNT(*)::text
          FROM sites s
          WHERE s.organization_id = o.id
        ) AS site_count,
        (
          SELECT COUNT(*)::text
          FROM client_datasets d
          WHERE d.organization_id = o.id
        ) AS dataset_count,
        (
          SELECT COUNT(*)::text
          FROM forecast_runs f
          WHERE f.organization_id = o.id
            AND DATE_TRUNC('month', f.created_at) = DATE_TRUNC('month', NOW())
        ) AS forecast_count
      FROM organizations o
      WHERE o.id = $1::uuid
      LIMIT 1
      `,
      [organizationId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "Organization not found",
        404,
        "NOT_FOUND",
        { organizationId },
      );
    }

    const plan = row.plan;
    ensureBillingPlan(plan);

    return {
      organizationId,
      plan,
      billingCycle: "monthly",
      monthlyAmount: PLAN_PRICING[plan],
      currentUsage: Number.parseInt(row.forecast_count, 10) || 0,
      usageLimit: PLAN_LIMITS[plan].forecastsPerMonth,
      nextBillingDate: nextBillingDate(),
    };
  }

  async listOrganizationIngestionLog(
    organizationId: string,
    options?: { limit?: number },
  ): Promise<AdminIngestionLogRecord[]> {
    ensureUuid(organizationId, "organizationId");

    const limit = Math.min(100, Math.max(1, options?.limit ?? 50));
    const result = await this.getPool().query<DbIngestionLogRow>(
      `
      SELECT
        il.id::text,
        il.dataset_id::text,
        d.name AS dataset_name,
        il.file_name,
        il.status::text,
        il.rows_received::text,
        il.rows_transformed::text,
        il.started_at,
        il.completed_at,
        il.mode::text,
        il.triggered_by
      FROM ingestion_log il
      JOIN client_datasets d
        ON d.id = il.dataset_id
      WHERE d.organization_id = $1::uuid
      ORDER BY il.started_at DESC, il.id DESC
      LIMIT $2
      `,
      [organizationId, limit],
    );

    return result.rows.map(mapIngestionLogRow);
  }

  async changePlan(input: {
    organizationId: string;
    newPlan: string;
    reason: string;
    actorUserId: string;
    requestId: string;
    clientIp: string | null;
    userAgent: string | null;
  }): Promise<{ organizationId: string; changed: true; plan: BillingPlan }> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.actorUserId, "actorUserId");
    const nextPlan = input.newPlan;
    ensureBillingPlan(nextPlan);

    return await this.withTransaction(async (client) => {
      const persistedActorUserId = await this.resolvePersistedActorUserId(
        client,
        input.actorUserId,
      );
      const current = await client.query<{ plan: BillingPlan }>(
        "SELECT plan::text AS plan FROM organizations WHERE id = $1::uuid LIMIT 1",
        [input.organizationId],
      );
      const currentPlan = current.rows[0]?.plan;
      if (!currentPlan) {
        throw new AdminBackofficeError(
          "Organization not found",
          404,
          "NOT_FOUND",
          { organizationId: input.organizationId },
        );
      }

      if (currentPlan === nextPlan) {
        throw new AdminBackofficeError(
          "Organization is already on this plan",
          409,
          "CONFLICT",
          { organizationId: input.organizationId, plan: nextPlan },
        );
      }

      await client.query(
        "UPDATE organizations SET plan = $2, updated_at = NOW() WHERE id = $1::uuid",
        [input.organizationId, nextPlan],
      );
      await client.query(
        `
        INSERT INTO plan_change_history (
          id,
          organization_id,
          changed_by,
          changed_by_auth_user_id,
          old_plan,
          new_plan,
          reason,
          effective_at,
          created_at,
          updated_at
        )
        VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,NOW(),NOW(),NOW())
        `,
        [
          randomUUID(),
          input.organizationId,
          persistedActorUserId,
          input.actorUserId,
          currentPlan,
          nextPlan,
          input.reason.trim().length > 0 ? input.reason.trim() : null,
        ],
      );

      await this.writeAudit(client, {
        action: "change_plan",
        actorUserId: input.actorUserId,
        targetOrgId: input.organizationId,
        resourceType: "organization_billing",
        resourceId: input.organizationId,
        requestId: input.requestId,
        ipAddress: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          beforePlan: currentPlan,
          afterPlan: nextPlan,
          reason: input.reason.trim(),
        },
      });

      return {
        organizationId: input.organizationId,
        changed: true,
        plan: nextPlan,
      };
    });
  }

  async getPlanHistory(organizationId: string): Promise<BillingHistoryEntry[]> {
    ensureUuid(organizationId, "organizationId");
    const rows = await this.getPool().query<DbPlanHistoryRow>(
      `
      SELECT
        organization_id::text,
        old_plan::text,
        new_plan::text,
        effective_at,
        reason,
        changed_by::text,
        changed_by_auth_user_id
      FROM plan_change_history
      WHERE organization_id = $1::uuid
      ORDER BY created_at DESC
      `,
      [organizationId],
    );
    return rows.rows.map((row) => ({
      organizationId: row.organization_id,
      from: row.old_plan,
      to: row.new_plan,
      at: toIso(row.effective_at),
      reason: row.reason,
      changedBy: row.changed_by ?? row.changed_by_auth_user_id,
    }));
  }

  async listDashboardAlerts(
    organizationId: string,
  ): Promise<DashboardAlertRecord[]> {
    ensureUuid(organizationId, "organizationId");
    const rows = await this.getPool().query<DbDashboardAlertRow>(
      `
      SELECT
        id::text,
        type::text,
        severity::text,
        title,
        message,
        related_entity_type::text,
        related_entity_id::text,
        action_url,
        action_label,
        created_at,
        dismissed_at,
        expires_at
      FROM dashboard_alerts
      WHERE organization_id = $1::uuid
        AND dismissed_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      `,
      [organizationId],
    );
    return rows.rows.map(mapDashboardAlertRow);
  }

  async dismissDashboardAlert(input: {
    organizationId: string;
    alertId: string;
  }): Promise<DashboardAlertRecord> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.alertId, "alertId");

    return await this.withTransaction(async (client) => {
      const updated = await client.query<DbDashboardAlertRow>(
        `
        UPDATE dashboard_alerts
        SET dismissed_at = COALESCE(dismissed_at, NOW())
        WHERE organization_id = $1::uuid
          AND id = $2::uuid
        RETURNING
          id::text,
          type::text,
          severity::text,
          title,
          message,
          related_entity_type::text,
          related_entity_id::text,
          action_url,
          action_label,
          created_at,
          dismissed_at,
          expires_at
        `,
        [input.organizationId, input.alertId],
      );

      const row = updated.rows[0];
      if (!row) {
        throw new AdminBackofficeError(
          "Dashboard alert not found",
          404,
          "NOT_FOUND",
          { organizationId: input.organizationId, alertId: input.alertId },
        );
      }

      return mapDashboardAlertRow(row);
    });
  }

  async acknowledgeCoverageAlert(input: {
    organizationId: string;
    alertId: string;
  }): Promise<CoverageAlertRecord> {
    return await this.updateCoverageAlertStatus({
      ...input,
      nextStatus: "acknowledged",
      timestampColumn: "acknowledged_at",
    });
  }

  async resolveCoverageAlert(input: {
    organizationId: string;
    alertId: string;
  }): Promise<CoverageAlertRecord> {
    return await this.updateCoverageAlertStatus({
      ...input,
      nextStatus: "resolved",
      timestampColumn: "resolved_at",
    });
  }

  private async updateCoverageAlertStatus(input: {
    organizationId: string;
    alertId: string;
    nextStatus: "acknowledged" | "resolved";
    timestampColumn: "acknowledged_at" | "resolved_at";
  }): Promise<CoverageAlertRecord> {
    ensureUuid(input.organizationId, "organizationId");
    ensureUuid(input.alertId, "alertId");

    const updated = await this.getPool().query<DbCoverageAlertRow>(
      `
      UPDATE coverage_alerts
      SET
        status = $3,
        ${input.timestampColumn} = NOW(),
        updated_at = NOW()
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
      RETURNING
        id::text,
        organization_id::text,
        site_id,
        alert_date,
        shift::text,
        horizon::text,
        p_rupture::text,
        gap_h::text,
        prediction_interval_low::text,
        prediction_interval_high::text,
        model_version,
        calibration_bucket,
        impact_eur::text,
        severity::text,
        status::text,
        drivers_json,
        acknowledged_at,
        resolved_at,
        created_at,
        updated_at
      `,
      [input.organizationId, input.alertId, input.nextStatus],
    );

    const row = updated.rows[0];
    if (!row) {
      throw new AdminBackofficeError(
        "Coverage alert not found",
        404,
        "NOT_FOUND",
        { organizationId: input.organizationId, alertId: input.alertId },
      );
    }

    return mapCoverageAlertRow(row);
  }

  async getCoverageAlert(
    organizationId: string,
    alertId: string,
  ): Promise<CoverageAlertRecord | null> {
    ensureUuid(organizationId, "organizationId");
    ensureUuid(alertId, "alertId");

    const row = await this.getPool().query<DbCoverageAlertRow>(
      `
      SELECT
        id::text,
        organization_id::text,
        site_id,
        alert_date,
        shift::text,
        horizon::text,
        p_rupture::text,
        gap_h::text,
        prediction_interval_low::text,
        prediction_interval_high::text,
        model_version,
        calibration_bucket,
        impact_eur::text,
        severity::text,
        status::text,
        drivers_json,
        acknowledged_at,
        resolved_at,
        created_at,
        updated_at
      FROM coverage_alerts
      WHERE organization_id = $1::uuid
        AND id = $2::uuid
      LIMIT 1
      `,
      [organizationId, alertId],
    );
    return row.rows[0] ? mapCoverageAlertRow(row.rows[0]) : null;
  }

  async listCoverageAlerts(
    filters: CoverageAlertListFilters,
  ): Promise<CoverageAlertRecord[]> {
    ensureUuid(filters.organizationId, "organizationId");
    const rows = await this.getPool().query<DbCoverageAlertRow>(
      `
      SELECT
        id::text,
        organization_id::text,
        site_id,
        alert_date,
        shift::text,
        horizon::text,
        p_rupture::text,
        gap_h::text,
        prediction_interval_low::text,
        prediction_interval_high::text,
        model_version,
        calibration_bucket,
        impact_eur::text,
        severity::text,
        status::text,
        drivers_json,
        acknowledged_at,
        resolved_at,
        created_at,
        updated_at
      FROM coverage_alerts
      WHERE organization_id = $1::uuid
        AND ($2::text IS NULL OR status::text = $2::text)
        AND ($3::text IS NULL OR severity::text = $3::text)
        AND ($4::text IS NULL OR site_id = $4::text)
        AND ($5::date IS NULL OR alert_date >= $5::date)
        AND ($6::date IS NULL OR alert_date <= $6::date)
        AND ($7::text IS NULL OR horizon::text = $7::text)
      ORDER BY alert_date DESC, p_rupture DESC
      `,
      [
        filters.organizationId,
        filters.status ?? null,
        filters.severity ?? null,
        filters.siteId ?? null,
        filters.dateFrom ?? null,
        filters.dateTo ?? null,
        filters.horizonId ?? null,
      ],
    );
    return rows.rows.map(mapCoverageAlertRow);
  }
}

let singleton: AdminBackofficeService | null = null;

export function getAdminBackofficeService(): AdminBackofficeService {
  if (!singleton) {
    singleton = new AdminBackofficeService(
      process.env["DATABASE_URL"]?.trim() || null,
      getKeycloakAdminIdentityServiceFromEnv(process.env),
    );
  }
  return singleton;
}

export function isAdminBackofficeError(
  error: unknown,
): error is AdminBackofficeError {
  return error instanceof AdminBackofficeError;
}
