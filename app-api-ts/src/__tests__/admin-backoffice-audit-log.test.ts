import { describe, expect, it, vi } from "vitest";

import { AdminBackofficeService } from "../services/admin-backoffice.js";

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

describe("admin backoffice audit log", () => {
  it("fails closed for audit log listing without database configuration", async () => {
    const service = new AdminBackofficeService(null);

    await expect(
      service.listAuditLog({
        page: 1,
        pageSize: 30,
      }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("lists audit log entries with pagination and action filter", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql.includes("SELECT COUNT(*)::text AS total")) {
          expect(params).toEqual(["change_role"]);
          return { rows: [{ total: "1" }] };
        }

        if (sql.includes("FROM admin_audit_log aal")) {
          expect(params).toEqual(["change_role", 30, 0]);
          return {
            rows: [
              {
                id: "66666666-6666-4666-8666-666666666666",
                admin_user_id: "11111111-1111-4111-8111-111111111111",
                admin_auth_user_id: "auth-admin-1",
                target_org_id: "33333333-3333-4333-8333-333333333333",
                action: "change_role",
                resource_type: "user",
                resource_id: "77777777-7777-4777-8777-777777777777",
                ip_address: "127.0.0.1",
                user_agent: "vitest",
                request_id: "req-audit",
                metadata_json: { targetRole: "manager" },
                severity: "INFO",
                created_at: new Date("2026-03-18T11:00:00.000Z"),
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in audit log test: ${sql}`);
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.listAuditLog({
      page: 1,
      pageSize: 30,
      action: "change_role",
    });

    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          adminUserId: "11111111-1111-4111-8111-111111111111",
          targetOrgId: "33333333-3333-4333-8333-333333333333",
          action: "change_role",
          resourceType: "user",
          resourceId: "77777777-7777-4777-8777-777777777777",
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          requestId: "req-audit",
          metadataJson: { targetRole: "manager" },
          severity: "INFO",
          createdAt: "2026-03-18T11:00:00.000Z",
        },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("falls back to the auth actor id when the audit row has no local user FK", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql.includes("SELECT COUNT(*)::text AS total")) {
          expect(params).toEqual([null]);
          return { rows: [{ total: "1" }] };
        }

        if (sql.includes("FROM admin_audit_log aal")) {
          expect(params).toEqual([null, 20, 0]);
          return {
            rows: [
              {
                id: "99999999-9999-4999-8999-999999999999",
                admin_user_id: null,
                admin_auth_user_id: "kc-super-admin-1234",
                target_org_id: "33333333-3333-4333-8333-333333333333",
                action: "create_org",
                resource_type: "organization",
                resource_id: "77777777-7777-4777-8777-777777777777",
                ip_address: "127.0.0.1",
                user_agent: "vitest",
                request_id: "req-audit-auth-only",
                metadata_json: { actorAuthUserId: "kc-super-admin-1234" },
                severity: "INFO",
                created_at: new Date("2026-03-19T09:00:00.000Z"),
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in auth actor audit log test: ${sql}`);
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.listAuditLog({
      page: 1,
      pageSize: 20,
      action: null,
    });

    expect(result.items[0]?.adminUserId).toBe("kc-super-admin-1234");
  });
});
