import { describe, expect, it, vi } from "vitest";

import { AdminBackofficeService } from "../services/admin-backoffice.js";

const ORGANIZATION_ID = "44444444-4444-4444-4444-444444444444";
const ADMIN_USER_ID = "55555555-5555-5555-5555-555555555555";
const TARGET_USER_ID = "66666666-6666-6666-6666-666666666666";
const TARGET_AUTH_USER_ID = "kc-user-123";
const TARGET_SITE_ID = "77777777-7777-7777-7777-777777777777";

type QueryCall = {
  sql: string;
  params: unknown[] | undefined;
};

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

function createDbUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TARGET_USER_ID,
    organization_id: ORGANIZATION_ID,
    auth_user_id: TARGET_AUTH_USER_ID,
    email: "member@praedixa.com",
    role: "manager",
    status: "active",
    site_id: TARGET_SITE_ID,
    site_name: "Lyon",
    last_login_at: null,
    created_at: new Date("2026-03-01T08:00:00.000Z"),
    updated_at: new Date("2026-03-01T08:00:00.000Z"),
    ...overrides,
  };
}

function createTransactionalService(
  queryHandler: (
    sql: string,
    params: unknown[] | undefined,
  ) => Promise<QueryResult>,
) {
  const identityService = {
    provisionUser: vi.fn(async () => ({ authUserId: TARGET_AUTH_USER_ID })),
    syncUser: vi.fn(async () => undefined),
    deleteProvisionedUser: vi.fn(async () => undefined),
  };
  const calls: QueryCall[] = [];
  const client = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return queryHandler(sql, params);
    }),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return queryHandler(sql, params);
    }),
    connect: vi.fn(async () => client),
  };
  const service = new AdminBackofficeService(null);
  Reflect.set(
    service as unknown as Record<string, unknown>,
    "pool",
    pool as unknown,
  );
  Reflect.set(
    service as unknown as Record<string, unknown>,
    "identityService",
    identityService as unknown,
  );
  return { service, pool, client, calls, identityService };
}

function findAuditCall(calls: QueryCall[]): QueryCall {
  const auditCall = calls.find((call) =>
    call.sql.includes("INSERT INTO admin_audit_log"),
  );
  if (!auditCall) {
    throw new Error("expected admin_audit_log insert");
  }
  return auditCall;
}

function readAuditMetadata(calls: QueryCall[]): Record<string, unknown> {
  const auditCall = findAuditCall(calls);
  const metadata = auditCall.params?.[9];
  if (typeof metadata !== "string") {
    throw new Error("expected serialized audit metadata");
  }
  return JSON.parse(metadata) as Record<string, unknown>;
}

function readAuditSeverity(calls: QueryCall[]): string {
  const auditCall = findAuditCall(calls);
  const severity = auditCall.params?.[10];
  if (typeof severity !== "string") {
    throw new Error("expected audit severity");
  }
  return severity;
}

describe("admin backoffice organization users", () => {
  it("fails closed for organization user reads without database configuration", async () => {
    const service = new AdminBackofficeService(null);

    await expect(
      service.listOrganizationUsers(ORGANIZATION_ID),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
    await expect(
      service.getOrganizationUser(ORGANIZATION_ID, TARGET_USER_ID),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("writes append-only audit metadata for organization user invites", async () => {
    const { service, client, calls, identityService } =
      createTransactionalService(async (sql, params) => {
        if (
          sql === "BEGIN" ||
          sql === "COMMIT" ||
          sql === "ROLLBACK" ||
          sql.includes("INSERT INTO admin_audit_log")
        ) {
          return { rows: [] };
        }

        if (
          sql.includes(
            "SELECT id::text FROM organizations WHERE id = $1::uuid LIMIT 1",
          )
        ) {
          expect(params).toEqual([ORGANIZATION_ID]);
          return { rows: [{ id: ORGANIZATION_ID }] };
        }

        if (sql.includes("FROM sites") && sql.includes("AND id = $2::uuid")) {
          expect(params).toEqual([ORGANIZATION_ID, TARGET_SITE_ID]);
          return { rows: [{ id: TARGET_SITE_ID }] };
        }

        if (
          sql.includes("SELECT id::text FROM users WHERE email = $1 LIMIT 1")
        ) {
          expect(params).toEqual(["new.manager@praedixa.com"]);
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO users")) {
          return {
            rows: [
              createDbUserRow({
                auth_user_id: TARGET_AUTH_USER_ID,
                email: "new.manager@praedixa.com",
                role: "manager",
                status: "pending",
                site_id: TARGET_SITE_ID,
              }),
            ],
          };
        }

        throw new Error(`Unexpected SQL in invite test: ${sql}`);
      });

    const result = await service.inviteOrganizationUser({
      organizationId: ORGANIZATION_ID,
      email: "New.Manager@Praedixa.com",
      role: "manager",
      siteId: TARGET_SITE_ID,
      actorUserId: ADMIN_USER_ID,
      actorEmail: "admin@praedixa.com",
      requestId: "req-invite",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
    });

    expect(result.status).toBe("pending_invite");
    expect(result.email).toBe("new.manager@praedixa.com");
    expect(result.siteId).toBe(TARGET_SITE_ID);
    expect(identityService.provisionUser).toHaveBeenCalledWith({
      email: "new.manager@praedixa.com",
      organizationId: ORGANIZATION_ID,
      role: "manager",
      siteId: TARGET_SITE_ID,
    });

    const metadata = readAuditMetadata(calls);
    expect(metadata).toMatchObject({
      authUserId: TARGET_AUTH_USER_ID,
      email: "new.manager@praedixa.com",
      role: "manager",
      siteId: TARGET_SITE_ID,
      invitedByEmail: "admin@praedixa.com",
      targetStatus: "pending",
      targetUserId: TARGET_USER_ID,
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
      operation: "invite_user",
      outcome: "success",
    });

    const auditIndex = calls.findIndex((call) =>
      call.sql.includes("INSERT INTO admin_audit_log"),
    );
    const commitIndex = calls.findIndex((call) => call.sql === "COMMIT");
    expect(auditIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(auditIndex);
    expect(readAuditSeverity(calls)).toBe("INFO");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("writes append-only audit metadata for organization role changes", async () => {
    const { service, client, calls, identityService } =
      createTransactionalService(async (sql) => {
        if (
          sql === "BEGIN" ||
          sql === "COMMIT" ||
          sql === "ROLLBACK" ||
          sql.includes("INSERT INTO admin_audit_log")
        ) {
          return { rows: [] };
        }

        if (
          sql.includes("FROM users u") &&
          sql.includes("AND u.id = $2::uuid")
        ) {
          return {
            rows: [
              createDbUserRow({
                email: "member@praedixa.com",
                role: "manager",
                status: "active",
              }),
            ],
          };
        }

        if (sql.includes("UPDATE users") && sql.includes("SET role = $3")) {
          return {
            rows: [
              createDbUserRow({
                email: "member@praedixa.com",
                role: "org_admin",
                status: "active",
                site_id: null,
                site_name: null,
              }),
            ],
          };
        }

        throw new Error(`Unexpected SQL in role change test: ${sql}`);
      });

    const result = await service.changeOrganizationUserRole({
      organizationId: ORGANIZATION_ID,
      userId: TARGET_USER_ID,
      role: "org_admin",
      actorUserId: ADMIN_USER_ID,
      requestId: "req-role",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
    });

    expect(result.role).toBe("org_admin");
    expect(result.siteId).toBeNull();
    expect(identityService.syncUser).toHaveBeenCalledWith({
      authUserId: TARGET_AUTH_USER_ID,
      organizationId: ORGANIZATION_ID,
      role: "org_admin",
      siteId: null,
      enabled: true,
    });

    const metadata = readAuditMetadata(calls);
    expect(metadata).toMatchObject({
      authUserId: TARGET_AUTH_USER_ID,
      beforeRole: "manager",
      afterRole: "org_admin",
      beforeSiteId: TARGET_SITE_ID,
      afterSiteId: null,
      beforeStatus: "active",
      afterStatus: "active",
      email: "member@praedixa.com",
      targetUserId: TARGET_USER_ID,
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
      operation: "change_role",
      outcome: "success",
    });

    const auditIndex = calls.findIndex((call) =>
      call.sql.includes("INSERT INTO admin_audit_log"),
    );
    const commitIndex = calls.findIndex((call) => call.sql === "COMMIT");
    expect(auditIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(auditIndex);
    expect(readAuditSeverity(calls)).toBe("INFO");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("audits duplicate invite attempts before rethrowing the conflict", async () => {
    const { service, calls, identityService } = createTransactionalService(
      async (sql, params) => {
        if (
          sql === "BEGIN" ||
          sql === "COMMIT" ||
          sql === "ROLLBACK" ||
          sql.includes("INSERT INTO admin_audit_log")
        ) {
          return { rows: [] };
        }

        if (
          sql.includes(
            "SELECT id::text FROM organizations WHERE id = $1::uuid LIMIT 1",
          )
        ) {
          expect(params).toEqual([ORGANIZATION_ID]);
          return { rows: [{ id: ORGANIZATION_ID }] };
        }

        if (sql.includes("FROM sites") && sql.includes("AND id = $2::uuid")) {
          expect(params).toEqual([ORGANIZATION_ID, TARGET_SITE_ID]);
          return { rows: [{ id: TARGET_SITE_ID }] };
        }

        if (
          sql.includes("SELECT id::text FROM users WHERE email = $1 LIMIT 1")
        ) {
          expect(params).toEqual(["member@praedixa.com"]);
          return { rows: [{ id: TARGET_USER_ID }] };
        }

        throw new Error(`Unexpected SQL in invite conflict audit test: ${sql}`);
      },
    );

    await expect(
      service.inviteOrganizationUser({
        organizationId: ORGANIZATION_ID,
        email: "member@praedixa.com",
        role: "manager",
        siteId: TARGET_SITE_ID,
        actorUserId: ADMIN_USER_ID,
        actorEmail: "admin@praedixa.com",
        requestId: "req-invite-conflict",
        clientIp: "127.0.0.1",
        userAgent: "vitest",
        permissionUsed: "admin:users:write",
        routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
    });

    expect(identityService.provisionUser).not.toHaveBeenCalled();
    expect(readAuditMetadata(calls)).toMatchObject({
      email: "member@praedixa.com",
      role: "manager",
      invitedByEmail: "admin@praedixa.com",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
      operation: "invite_user",
      outcome: "rejected",
      errorCode: "CONFLICT",
    });
    expect(readAuditSeverity(calls)).toBe("WARN");
  });

  it("audits missing-user role changes before rethrowing the not found error", async () => {
    const { service, calls } = createTransactionalService(async (sql) => {
      if (
        sql === "BEGIN" ||
        sql === "COMMIT" ||
        sql === "ROLLBACK" ||
        sql.includes("INSERT INTO admin_audit_log")
      ) {
        return { rows: [] };
      }

      if (sql.includes("FROM users u") && sql.includes("AND u.id = $2::uuid")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in role not-found audit test: ${sql}`);
    });

    await expect(
      service.changeOrganizationUserRole({
        organizationId: ORGANIZATION_ID,
        userId: TARGET_USER_ID,
        role: "org_admin",
        actorUserId: ADMIN_USER_ID,
        requestId: "req-role-not-found",
        clientIp: "127.0.0.1",
        userAgent: "vitest",
        permissionUsed: "admin:users:write",
        routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(readAuditMetadata(calls)).toMatchObject({
      targetUserId: TARGET_USER_ID,
      targetRole: "org_admin",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
      operation: "change_role",
      outcome: "rejected",
      errorCode: "NOT_FOUND",
    });
    expect(readAuditSeverity(calls)).toBe("WARN");
  });

  it("rejects manager invitations without a site_id before provisioning identity", async () => {
    const { service, identityService } = createTransactionalService(
      async (sql, params) => {
        if (
          sql.includes(
            "SELECT id::text FROM organizations WHERE id = $1::uuid LIMIT 1",
          )
        ) {
          expect(params).toEqual([ORGANIZATION_ID]);
          return { rows: [{ id: ORGANIZATION_ID }] };
        }

        throw new Error(
          `Unexpected SQL in manager site validation test: ${sql}`,
        );
      },
    );

    await expect(
      service.inviteOrganizationUser({
        organizationId: ORGANIZATION_ID,
        email: "manager.without.site@praedixa.com",
        role: "manager",
        actorUserId: ADMIN_USER_ID,
        actorEmail: "admin@praedixa.com",
        requestId: "req-missing-site",
        clientIp: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });

    expect(identityService.provisionUser).not.toHaveBeenCalled();
  });

  it("syncs identity enablement when deactivating a user", async () => {
    const { service, identityService } = createTransactionalService(
      async (sql) => {
        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO admin_audit_log")) {
          return { rows: [] };
        }

        if (
          sql.includes("FROM users u") &&
          sql.includes("AND u.id = $2::uuid")
        ) {
          return { rows: [createDbUserRow()] };
        }

        if (sql.includes("UPDATE users") && sql.includes("SET status = $3")) {
          return {
            rows: [
              createDbUserRow({
                status: "inactive",
              }),
            ],
          };
        }

        throw new Error(`Unexpected SQL in deactivate user test: ${sql}`);
      },
    );

    const result = await service.deactivateOrganizationUser({
      organizationId: ORGANIZATION_ID,
      userId: TARGET_USER_ID,
      actorUserId: ADMIN_USER_ID,
      requestId: "req-deactivate",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result.status).toBe("deactivated");
    expect(identityService.syncUser).toHaveBeenCalledWith({
      authUserId: TARGET_AUTH_USER_ID,
      organizationId: ORGANIZATION_ID,
      role: "manager",
      siteId: TARGET_SITE_ID,
      enabled: false,
    });
  });

  it("writes append-only audit metadata for rejected invite attempts", async () => {
    const { service, client, calls } = createTransactionalService(
      async (sql) => {
        if (sql.includes("INSERT INTO admin_audit_log")) {
          return { rows: [] };
        }

        throw new Error(`Unexpected SQL in rejected invite audit test: ${sql}`);
      },
    );

    await service.recordPrivilegedUserAttempt({
      actorUserId: ADMIN_USER_ID,
      targetOrgId: ORGANIZATION_ID,
      requestId: "req-invite-rejected",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
      operation: "invite_user",
      outcome: "rejected",
      metadata: {
        email: "blocked@praedixa.com",
        requestedRole: "super_admin",
        failureCode: "VALIDATION_ERROR",
        failureStatusCode: 422,
      },
    });

    expect(readAuditMetadata(calls)).toMatchObject({
      email: "blocked@praedixa.com",
      requestedRole: "super_admin",
      failureCode: "VALIDATION_ERROR",
      failureStatusCode: 422,
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/invite",
      operation: "invite_user",
      outcome: "rejected",
    });
    expect(readAuditSeverity(calls)).toBe("WARN");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("writes append-only audit metadata for failed role changes", async () => {
    const { service, client, calls } = createTransactionalService(
      async (sql) => {
        if (sql.includes("INSERT INTO admin_audit_log")) {
          return { rows: [] };
        }

        throw new Error(`Unexpected SQL in failed role audit test: ${sql}`);
      },
    );

    await service.recordPrivilegedUserAttempt({
      actorUserId: ADMIN_USER_ID,
      targetOrgId: ORGANIZATION_ID,
      resourceId: TARGET_USER_ID,
      requestId: "req-role-failed",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
      operation: "change_role",
      outcome: "failed",
      metadata: {
        targetUserId: TARGET_USER_ID,
        requestedRole: "org_admin",
        failureCode: "PERSISTENCE_UNAVAILABLE",
        failureStatusCode: 503,
      },
    });

    expect(readAuditMetadata(calls)).toMatchObject({
      targetUserId: TARGET_USER_ID,
      requestedRole: "org_admin",
      failureCode: "PERSISTENCE_UNAVAILABLE",
      failureStatusCode: 503,
      permissionUsed: "admin:users:write",
      routeTemplate: "/api/v1/admin/organizations/:orgId/users/:userId/role",
      operation: "change_role",
      outcome: "failed",
    });
    expect(readAuditSeverity(calls)).toBe("ERROR");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
