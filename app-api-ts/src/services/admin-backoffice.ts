import { randomUUID } from "node:crypto";

import { Pool, type PoolClient } from "pg";

type AssignableRole =
  | "org_admin"
  | "hr_manager"
  | "manager"
  | "employee"
  | "viewer";

type BillingPlan = "free" | "starter" | "professional" | "enterprise";

export interface AdminUserRecord {
  id: string;
  organizationId: string;
  fullName: string | null;
  email: string;
  role: AssignableRole;
  status: "pending_invite" | "active" | "deactivated";
  siteName: string | null;
  lastLoginAt: string | null;
  invitedAt: string;
  invitedBy: string | null;
  updatedAt: string;
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
  action: string;
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
const BILLING_PLAN_SET = new Set<BillingPlan>([
  "free",
  "starter",
  "professional",
  "enterprise",
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
  email: string;
  role: string;
  status: string;
  site_name: string | null;
  last_login_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbBillingRow = {
  plan: BillingPlan;
  user_count: string;
  site_count: string;
  dataset_count: string;
  forecast_count: string;
};

type DbPlanHistoryRow = {
  organization_id: string;
  old_plan: BillingPlan;
  new_plan: BillingPlan;
  effective_at: string | Date;
  reason: string | null;
  changed_by: string | null;
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

function toIso(value: string | Date): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
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

function mapUserStatus(status: string): AdminUserRecord["status"] {
  if (status === "active") return "active";
  if (status === "pending") return "pending_invite";
  return "deactivated";
}

function mapUserRow(row: DbUserRow): AdminUserRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fullName: buildDefaultFullName(row.email),
    email: row.email,
    role: row.role as AssignableRole,
    status: mapUserStatus(row.status),
    siteName: row.site_name,
    lastLoginAt: row.last_login_at == null ? null : toIso(row.last_login_at),
    invitedAt: toIso(row.created_at),
    invitedBy: null,
    updatedAt: toIso(row.updated_at),
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

  constructor(databaseUrl: string | null) {
    this.pool = databaseUrl
      ? new Pool({ connectionString: databaseUrl })
      : null;
  }

  hasDatabase(): boolean {
    return this.pool != null;
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

  private async writeAudit(
    client: PoolClient,
    input: AdminAuditMetadata,
  ): Promise<void> {
    ensureUuid(input.actorUserId, "actorUserId");
    ensureUuid(input.targetOrgId, "targetOrgId");

    await client.query(
      `
      INSERT INTO admin_audit_log (
        id,
        admin_user_id,
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
        $3::uuid,
        $4,
        $5,
        $6::uuid,
        $7,
        $8,
        $9,
        $10::jsonb,
        $11
      )
      `,
      [
        randomUUID(),
        input.actorUserId,
        input.targetOrgId,
        input.action,
        input.resourceType,
        input.resourceId ?? null,
        input.ipAddress ?? "unknown",
        input.userAgent,
        input.requestId,
        JSON.stringify(input.metadata),
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
    const rows = await this.getPool().query<DbUserRow>(
      `
      SELECT
        u.id::text,
        u.organization_id::text,
        u.email,
        u.role::text,
        u.status::text,
        s.name AS site_name,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN sites s ON s.id = u.site_id
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
    const row = await this.getPool().query<DbUserRow>(
      `
      SELECT
        u.id::text,
        u.organization_id::text,
        u.email,
        u.role::text,
        u.status::text,
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
    return row.rows[0] ? mapUserRow(row.rows[0]) : null;
  }

  async inviteOrganizationUser(input: {
    organizationId: string;
    email: string;
    role: string;
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

    try {
      return await this.withTransaction(async (client) => {
        const existing = await client.query<{ id: string }>(
          "SELECT id::text FROM users WHERE email = $1 LIMIT 1",
          [email],
        );
        if (existing.rows[0]) {
          throw new AdminBackofficeError(
            "A user with this email already exists in this organization",
            409,
            "CONFLICT",
            { organizationId: input.organizationId, email },
          );
        }

        const inserted = await client.query<DbUserRow>(
          `
          INSERT INTO users (
            id,
            organization_id,
            auth_user_id,
            email,
            email_verified,
            role,
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
            'pending',
            NOW(),
            NOW()
          )
          RETURNING
            id::text,
            organization_id::text,
            email,
            role::text,
            status::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at
          `,
          [
            randomUUID(),
            input.organizationId,
            `pending-${randomUUID()}`,
            email,
            input.role,
          ],
        );

        const row = inserted.rows[0];
        await this.writeAudit(client, {
          action: "invite_user",
          actorUserId: input.actorUserId,
          targetOrgId: input.organizationId,
          resourceType: "user",
          resourceId: row?.id ?? null,
          requestId: input.requestId,
          ipAddress: input.clientIp,
          userAgent: input.userAgent,
          metadata: {
            email,
            role: input.role,
            invitedByEmail: input.actorEmail,
            targetStatus: row?.status ?? null,
            targetUserId: row?.id ?? null,
            permissionUsed: input.permissionUsed ?? null,
            routeTemplate: input.routeTemplate ?? null,
            operation: "invite_user",
            outcome: "success",
          },
        });

        if (!row) {
          throw new AdminBackofficeError(
            "Unable to create user invite",
            500,
            "INTERNAL_ERROR",
          );
        }
        return mapUserRow(row);
      });
    } catch (error) {
      const normalized =
        error instanceof AdminBackofficeError
          ? error
          : new AdminBackofficeError(
              "Unable to create user invite",
              500,
              "INTERNAL_ERROR",
            );
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
          invitedByEmail: input.actorEmail,
          errorCode: normalized.code,
          failureStatusCode: normalized.statusCode,
        },
      });
      throw error;
    }
  }

  async changeOrganizationUserRole(input: {
    organizationId: string;
    userId: string;
    role: string;
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

    try {
      return await this.withTransaction(async (client) => {
        const current = await client.query<DbUserRow>(
          `
          SELECT
            u.id::text,
            u.organization_id::text,
            u.email,
            u.role::text,
            u.status::text,
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
          [input.organizationId, input.userId],
        );
        const row = current.rows[0];
        if (!row) {
          throw new AdminBackofficeError(
            "User not found for this organization",
            404,
            "NOT_FOUND",
            { organizationId: input.organizationId, userId: input.userId },
          );
        }

        const updated = await client.query<DbUserRow>(
          `
          UPDATE users
          SET role = $3, updated_at = NOW()
          WHERE organization_id = $1::uuid
            AND id = $2::uuid
          RETURNING
            id::text,
            organization_id::text,
            email,
            role::text,
            status::text,
            (SELECT name FROM sites WHERE id = users.site_id) AS site_name,
            last_login_at,
            created_at,
            updated_at
          `,
          [input.organizationId, input.userId, input.role],
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
            beforeRole: row.role,
            afterRole: next.role,
            beforeStatus: row.status,
            afterStatus: next.status,
            email: row.email,
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
          : new AdminBackofficeError(
              "Unable to update user role",
              500,
              "INTERNAL_ERROR",
            );
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
          targetUserId: input.userId,
          targetRole: input.role,
          errorCode: normalized.code,
          failureStatusCode: normalized.statusCode,
        },
      });
      throw error;
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

    return await this.withTransaction(async (client) => {
      const current = await client.query<DbUserRow>(
        `
        SELECT
          u.id::text,
          u.organization_id::text,
          u.email,
          u.role::text,
          u.status::text,
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
        [input.organizationId, input.userId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new AdminBackofficeError(
          "User not found for this organization",
          404,
          "NOT_FOUND",
          { organizationId: input.organizationId, userId: input.userId },
        );
      }

      const updated = await client.query<DbUserRow>(
        `
        UPDATE users
        SET status = $3, updated_at = NOW()
        WHERE organization_id = $1::uuid
          AND id = $2::uuid
        RETURNING
          id::text,
          organization_id::text,
          email,
          role::text,
          status::text,
          NULL::text AS site_name,
          last_login_at,
          created_at,
          updated_at
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
          beforeStatus: row.status,
          afterStatus: next.status,
          email: row.email,
        },
      });

      return mapUserRow(next);
    });
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
          old_plan,
          new_plan,
          reason,
          effective_at,
          created_at,
          updated_at
        )
        VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,NOW(),NOW(),NOW())
        `,
        [
          randomUUID(),
          input.organizationId,
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
        changed_by::text
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
      changedBy: row.changed_by,
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
      process.env.DATABASE_URL?.trim() || null,
    );
  }
  return singleton;
}

export function isAdminBackofficeError(
  error: unknown,
): error is AdminBackofficeError {
  return error instanceof AdminBackofficeError;
}
