import { describe, expect, it, vi } from "vitest";

import { AdminBackofficeService } from "../services/admin-backoffice.js";
import { KeycloakAdminIdentityError } from "../services/keycloak-admin-identity.js";

const ORGANIZATION_ID = "44444444-4444-4444-4444-444444444444";

type QueryResult = {
  rows: Array<Record<string, unknown>>;
};

describe("admin backoffice organizations", () => {
  it("fails closed for organization listing without database configuration", async () => {
    const service = new AdminBackofficeService(null);

    await expect(
      service.listOrganizations({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("lists organizations with pagination and filters", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (sql.includes("SELECT COUNT(*)::text AS total")) {
          expect(params).toEqual(["%Acme%", "active", "free"]);
          return { rows: [{ total: "1" }] };
        }

        if (
          sql.includes("FROM organizations o") &&
          sql.includes("user_count")
        ) {
          expect(params).toEqual(["%Acme%", "active", "free", 20, 0]);
          return {
            rows: [
              {
                id: ORGANIZATION_ID,
                name: "Acme Logistics",
                slug: "acme-logistics",
                status: "active",
                plan: "free",
                contact_email: "ops@acme.fr",
                settings: { adminBackoffice: { isTest: true } },
                user_count: "12",
                site_count: "3",
                created_at: new Date("2026-03-01T08:00:00.000Z"),
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in organizations test: ${sql}`);
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.listOrganizations({
      page: 1,
      pageSize: 20,
      search: "Acme",
      status: "active",
      plan: "free",
    });

    expect(result).toEqual({
      total: 1,
      items: [
        {
          id: ORGANIZATION_ID,
          name: "Acme Logistics",
          slug: "acme-logistics",
          status: "active",
          plan: "free",
          contactEmail: "ops@acme.fr",
          isTest: true,
          userCount: 12,
          siteCount: 3,
          createdAt: "2026-03-01T08:00:00.000Z",
        },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid organization filters before querying", async () => {
    const query = vi.fn();
    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    await expect(
      service.listOrganizations({
        page: 1,
        pageSize: 20,
        status: "invalid-status",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("creates an organization shell with a persisted test flag and writes an audit entry", async () => {
    const actorUserId = "11111111-1111-4111-8111-111111111111";
    const provisionUser = vi.fn().mockResolvedValue({
      authUserId: "keycloak-user-1",
    });
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (sql === "BEGIN" || sql === "COMMIT") {
            return { rows: [] };
          }

          if (sql === "ROLLBACK") {
            throw new Error("ROLLBACK should not be called");
          }

          if (sql.includes("SELECT id::text FROM organizations WHERE slug")) {
            expect(params).toEqual(["nouvel-acteur"]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO organizations")) {
            expect(params).toEqual([
              expect.any(String),
              "Nouvel acteur",
              "nouvel-acteur",
              "free",
              "ops@nouvel-acteur.fr",
              '{"adminBackoffice":{"isTest":true}}',
            ]);
            return {
              rows: [
                {
                  id: ORGANIZATION_ID,
                  name: "Nouvel acteur",
                  slug: "nouvel-acteur",
                  status: "trial",
                  plan: "free",
                  contact_email: "ops@nouvel-acteur.fr",
                  settings: { adminBackoffice: { isTest: true } },
                  user_count: "0",
                  site_count: "0",
                  created_at: new Date("2026-03-18T11:00:00.000Z"),
                },
              ],
            };
          }

          if (sql === "SELECT id::text FROM users WHERE email = $1 LIMIT 1") {
            expect(params).toEqual(["ops@nouvel-acteur.fr"]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO users (")) {
            expect(params).toEqual([
              expect.any(String),
              ORGANIZATION_ID,
              "keycloak-user-1",
              "ops@nouvel-acteur.fr",
            ]);
            return {
              rows: [
                {
                  id: "55555555-5555-4555-8555-555555555555",
                  organization_id: ORGANIZATION_ID,
                  auth_user_id: "keycloak-user-1",
                  email: "ops@nouvel-acteur.fr",
                  role: "org_admin",
                  status: "pending",
                  site_id: null,
                  site_name: null,
                  last_login_at: null,
                  created_at: new Date("2026-03-18T11:00:00.000Z"),
                  updated_at: new Date("2026-03-18T11:00:00.000Z"),
                },
              ],
            };
          }

          if (
            sql.includes("FROM users") &&
            sql.includes("auth_user_id = $1") &&
            sql.includes("ORDER BY CASE WHEN id::text = $1")
          ) {
            expect(params).toEqual([actorUserId]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO admin_audit_log")) {
            expect(params?.[2]).toBe(actorUserId);
            return { rows: [] };
          }

          throw new Error(`Unexpected SQL in create organization test: ${sql}`);
        },
      ),
      release: vi.fn(),
    };

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);
    Reflect.set(
      service as unknown as Record<string, unknown>,
      "identityService",
      {
        provisionUser,
      } as unknown,
    );

    const result = await service.createOrganization({
      name: "Nouvel acteur",
      slug: "nouvel-acteur",
      contactEmail: "ops@nouvel-acteur.fr",
      isTest: true,
      actorUserId,
      requestId: "req-create-org",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result).toEqual({
      id: ORGANIZATION_ID,
      name: "Nouvel acteur",
      slug: "nouvel-acteur",
      status: "trial",
      plan: "free",
      contactEmail: "ops@nouvel-acteur.fr",
      isTest: true,
      userCount: 1,
      siteCount: 0,
      createdAt: "2026-03-18T11:00:00.000Z",
    });
    expect(provisionUser).toHaveBeenCalledWith({
      email: "ops@nouvel-acteur.fr",
      organizationId: ORGANIZATION_ID,
      role: "org_admin",
      siteId: null,
    });
    expect(client.release).toHaveBeenCalled();
  });

  it("retries organization contact provisioning after deleting an orphaned Keycloak test user", async () => {
    const actorUserId = "11111111-1111-4111-8111-111111111111";
    const provisionUser = vi
      .fn()
      .mockRejectedValueOnce(
        new KeycloakAdminIdentityError(
          "A Keycloak user with this username already exists",
          409,
          "CONFLICT",
          { email: "ops@nouvel-acteur.fr", username: "ops@nouvel-acteur.fr" },
        ),
      )
      .mockResolvedValueOnce({
        authUserId: "keycloak-user-2",
      });
    const findManagedUsersByEmail = vi.fn().mockResolvedValue([]);
    const findManagedUsersByUsername = vi.fn().mockResolvedValue([
      {
        authUserId: "orphan-keycloak-user-1",
        username: "ops@nouvel-acteur.fr",
        email: null,
        organizationId: null,
        role: null,
        siteId: null,
        enabled: true,
      },
    ]);
    const deleteProvisionedUser = vi.fn().mockResolvedValue(undefined);
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (sql === "BEGIN" || sql === "COMMIT") {
            return { rows: [] };
          }

          if (sql === "ROLLBACK") {
            throw new Error("ROLLBACK should not be called");
          }

          if (sql.includes("SELECT id::text FROM organizations WHERE slug")) {
            expect(params).toEqual(["nouvel-acteur"]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO organizations")) {
            return {
              rows: [
                {
                  id: ORGANIZATION_ID,
                  name: "Nouvel acteur",
                  slug: "nouvel-acteur",
                  status: "trial",
                  plan: "free",
                  contact_email: "ops@nouvel-acteur.fr",
                  settings: { adminBackoffice: { isTest: true } },
                  user_count: "0",
                  site_count: "0",
                  created_at: new Date("2026-03-18T11:00:00.000Z"),
                },
              ],
            };
          }

          if (sql === "SELECT id::text FROM users WHERE email = $1 LIMIT 1") {
            expect(params).toEqual(["ops@nouvel-acteur.fr"]);
            return { rows: [] };
          }

          if (
            sql.includes("FROM users u") &&
            sql.includes(
              "LEFT JOIN organizations o ON o.id = u.organization_id",
            ) &&
            sql.includes("WHERE u.auth_user_id = $1")
          ) {
            expect(params).toEqual(["orphan-keycloak-user-1"]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO users (")) {
            expect(params).toEqual([
              expect.any(String),
              ORGANIZATION_ID,
              "keycloak-user-2",
              "ops@nouvel-acteur.fr",
            ]);
            return {
              rows: [
                {
                  id: "55555555-5555-4555-8555-555555555555",
                  organization_id: ORGANIZATION_ID,
                  auth_user_id: "keycloak-user-2",
                  email: "ops@nouvel-acteur.fr",
                  role: "org_admin",
                  status: "pending",
                  site_id: null,
                  site_name: null,
                  last_login_at: null,
                  created_at: new Date("2026-03-18T11:00:00.000Z"),
                  updated_at: new Date("2026-03-18T11:00:00.000Z"),
                },
              ],
            };
          }

          if (
            sql.includes("FROM users") &&
            sql.includes("auth_user_id = $1") &&
            sql.includes("ORDER BY CASE WHEN id::text = $1")
          ) {
            expect(params).toEqual([actorUserId]);
            return { rows: [] };
          }

          if (sql.includes("INSERT INTO admin_audit_log")) {
            return { rows: [] };
          }

          throw new Error(
            `Unexpected SQL in orphan cleanup create test: ${sql}`,
          );
        },
      ),
      release: vi.fn(),
    };

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);
    Reflect.set(
      service as unknown as Record<string, unknown>,
      "identityService",
      {
        provisionUser,
        findManagedUsersByEmail,
        findManagedUsersByUsername,
        deleteProvisionedUser,
      } as unknown,
    );

    const result = await service.createOrganization({
      name: "Nouvel acteur",
      slug: "nouvel-acteur",
      contactEmail: "ops@nouvel-acteur.fr",
      isTest: true,
      actorUserId,
      requestId: "req-create-org",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result.contactEmail).toBe("ops@nouvel-acteur.fr");
    expect(findManagedUsersByEmail).toHaveBeenCalledWith(
      "ops@nouvel-acteur.fr",
    );
    expect(findManagedUsersByUsername).toHaveBeenCalledWith(
      "ops@nouvel-acteur.fr",
    );
    expect(deleteProvisionedUser).toHaveBeenCalledWith(
      "orphan-keycloak-user-1",
    );
    expect(provisionUser).toHaveBeenCalledTimes(2);
  });

  it("returns organization detail with site hierarchy", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        if (
          sql.includes("FROM organizations o") &&
          sql.includes("o.sector::text")
        ) {
          expect(params).toEqual([ORGANIZATION_ID]);
          return {
            rows: [
              {
                id: ORGANIZATION_ID,
                name: "Acme Logistics",
                slug: "acme-logistics",
                status: "active",
                plan: "professional",
                contact_email: "ops@acme.fr",
                settings: { adminBackoffice: { isTest: false } },
                sector: "logistics",
                size: "mid_market",
                user_count: "12",
                site_count: "2",
                created_at: new Date("2026-03-01T08:00:00.000Z"),
              },
            ],
          };
        }

        if (
          sql.includes("FROM sites s") &&
          sql.includes("LEFT JOIN departments d")
        ) {
          expect(params).toEqual([ORGANIZATION_ID]);
          return {
            rows: [
              {
                site_id: "77777777-7777-4777-8777-777777777777",
                site_name: "Lyon",
                site_city: "Lyon",
                department_id: "88888888-8888-4888-8888-888888888888",
                department_name: "Exploitants",
                department_headcount: "14",
              },
              {
                site_id: "77777777-7777-4777-8777-777777777777",
                site_name: "Lyon",
                site_city: "Lyon",
                department_id: "99999999-9999-4999-8999-999999999999",
                department_name: "Support",
                department_headcount: "6",
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in organization detail test: ${sql}`);
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.getOrganizationDetail(ORGANIZATION_ID);

    expect(result).toEqual({
      id: ORGANIZATION_ID,
      name: "Acme Logistics",
      slug: "acme-logistics",
      status: "active",
      plan: "professional",
      contactEmail: "ops@acme.fr",
      isTest: false,
      sector: "logistics",
      size: "mid_market",
      userCount: 12,
      siteCount: 2,
      createdAt: "2026-03-01T08:00:00.000Z",
      sites: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          name: "Lyon",
          city: "Lyon",
          departments: [
            {
              id: "88888888-8888-4888-8888-888888888888",
              name: "Exploitants",
              employeeCount: 14,
            },
            {
              id: "99999999-9999-4999-8999-999999999999",
              name: "Support",
              employeeCount: 6,
            },
          ],
        },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("joins alert site ids as text for organization overview summaries", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        expect(sql).toContain("s.id::text = ca.site_id");
        expect(params).toEqual([ORGANIZATION_ID, 5]);
        return {
          rows: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              alert_date: new Date("2026-03-19T08:00:00.000Z"),
              alert_type: "j7",
              severity: "high",
              status: "open",
              site_id: "77777777-7777-4777-8777-777777777777",
              site_name: "Lyon",
            },
          ],
        };
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result =
      await service.listOrganizationAlertSummaries(ORGANIZATION_ID);

    expect(result).toEqual([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        date: "2026-03-19T08:00:00.000Z",
        type: "j7",
        severity: "high",
        status: "open",
        siteId: "77777777-7777-4777-8777-777777777777",
        siteName: "Lyon",
      },
    ]);
  });

  it("reads and maps a persistent ingestion log for an organization", async () => {
    const query = vi.fn(
      async (sql: string, params?: unknown[]): Promise<QueryResult> => {
        expect(sql).toContain("FROM ingestion_log il");
        expect(sql).toContain("JOIN client_datasets d");
        expect(params).toEqual([ORGANIZATION_ID, 50]);
        return {
          rows: [
            {
              id: "12121212-1212-4212-8212-121212121212",
              dataset_id: "34343434-3434-4434-8434-343434343434",
              dataset_name: "Absences bronze",
              file_name: null,
              status: "success",
              rows_received: "124",
              rows_transformed: "120",
              started_at: new Date("2026-03-19T07:30:00.000Z"),
              completed_at: new Date("2026-03-19T07:31:00.000Z"),
              mode: "manual_upload",
              triggered_by: "ops@acme.fr",
            },
            {
              id: "56565656-5656-4656-8656-565656565656",
              dataset_id: "78787878-7878-4878-8878-787878787878",
              dataset_name: "Planning silver",
              file_name: "planning-mars.csv",
              status: "running",
              rows_received: "40",
              rows_transformed: "45",
              started_at: new Date("2026-03-19T08:00:00.000Z"),
              completed_at: null,
              mode: "connector_sync",
              triggered_by: null,
            },
          ],
        };
      },
    );

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);

    const result = await service.listOrganizationIngestionLog(ORGANIZATION_ID);

    expect(result).toEqual([
      {
        id: "12121212-1212-4212-8212-121212121212",
        datasetId: "34343434-3434-4434-8434-343434343434",
        datasetName: "Absences bronze",
        fileName: "Absences bronze",
        status: "completed",
        rowsProcessed: 120,
        rowsRejected: 4,
        createdAt: "2026-03-19T07:30:00.000Z",
        completedAt: "2026-03-19T07:31:00.000Z",
        mode: "manual_upload",
        triggeredBy: "ops@acme.fr",
      },
      {
        id: "56565656-5656-4656-8656-565656565656",
        datasetId: "78787878-7878-4878-8878-787878787878",
        datasetName: "Planning silver",
        fileName: "planning-mars.csv",
        status: "running",
        rowsProcessed: 45,
        rowsRejected: 0,
        createdAt: "2026-03-19T08:00:00.000Z",
        completedAt: null,
        mode: "connector_sync",
        triggeredBy: null,
      },
    ]);
  });

  it("deletes only test organizations after confirmation", async () => {
    const actorUserId = "11111111-1111-4111-8111-111111111111";
    const deleteProvisionedUser = vi.fn().mockResolvedValue(undefined);
    const findManagedUsersByEmail = vi.fn().mockResolvedValue([
      {
        authUserId: "keycloak-user-1",
        username: "ops@test.fr",
        email: "ops@test.fr",
        organizationId: ORGANIZATION_ID,
        role: "org_admin",
        siteId: null,
        enabled: true,
      },
      {
        authUserId: "orphan-keycloak-user-2",
        email: "ops@test.fr",
        organizationId: ORGANIZATION_ID,
        role: "org_admin",
        siteId: null,
        enabled: true,
      },
    ]);
    const findManagedUsersByUsername = vi.fn().mockResolvedValue([
      {
        authUserId: "orphan-keycloak-user-2",
        username: "ops@test.fr",
        email: null,
        organizationId: ORGANIZATION_ID,
        role: null,
        siteId: null,
        enabled: true,
      },
    ]);
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (sql === "BEGIN" || sql === "COMMIT") {
            return { rows: [] };
          }

          if (sql === "ROLLBACK") {
            throw new Error("ROLLBACK should not be called");
          }

          if (
            sql.includes("FROM organizations o") &&
            sql.includes("FOR UPDATE")
          ) {
            expect(params).toEqual([ORGANIZATION_ID]);
            return {
              rows: [
                {
                  id: ORGANIZATION_ID,
                  name: "Client test",
                  slug: "client-test",
                  contact_email: "ops@test.fr",
                  settings: { adminBackoffice: { isTest: true } },
                },
              ],
            };
          }

          if (
            sql.includes("FROM users") &&
            sql.includes("auth_user_id = $1") &&
            sql.includes("ORDER BY CASE WHEN id::text = $1")
          ) {
            expect(params).toEqual([actorUserId]);
            return { rows: [] };
          }

          if (
            sql.includes("FROM users u") &&
            sql.includes(
              "LEFT JOIN organizations o ON o.id = u.organization_id",
            ) &&
            sql.includes("WHERE u.auth_user_id = $1")
          ) {
            if (params?.[0] === "keycloak-user-1") {
              return {
                rows: [
                  {
                    organization_id: ORGANIZATION_ID,
                    settings: { adminBackoffice: { isTest: true } },
                  },
                ],
              };
            }
            if (params?.[0] === "orphan-keycloak-user-2") {
              return { rows: [] };
            }
          }

          if (sql.includes("INSERT INTO admin_audit_log")) {
            expect(params).toEqual([
              expect.any(String),
              null,
              actorUserId,
              expect.any(String),
              "delete_org",
              "organization",
              ORGANIZATION_ID,
              "127.0.0.1",
              "vitest",
              "req-delete-org",
              expect.stringContaining('"slug":"client-test"'),
              "INFO",
            ]);
            return { rows: [] };
          }

          if (
            sql.includes("FROM users u") &&
            sql.includes("u.organization_id = $1::uuid") &&
            sql.includes("u.auth_user_id IS NOT NULL")
          ) {
            expect(params).toEqual([ORGANIZATION_ID]);
            return {
              rows: [
                {
                  id: "55555555-5555-4555-8555-555555555555",
                  auth_user_id: "keycloak-user-1",
                  email: "ops@test.fr",
                },
              ],
            };
          }

          if (sql.includes("DELETE FROM organizations")) {
            expect(params).toEqual([ORGANIZATION_ID]);
            return { rows: [] };
          }

          throw new Error(`Unexpected SQL in delete organization test: ${sql}`);
        },
      ),
      release: vi.fn(),
    };

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);
    Reflect.set(
      service as unknown as Record<string, unknown>,
      "identityService",
      {
        deleteProvisionedUser,
        findManagedUsersByEmail,
        findManagedUsersByUsername,
      } as unknown,
    );

    const result = await service.deleteOrganization({
      organizationId: ORGANIZATION_ID,
      organizationSlug: "client-test",
      confirmationText: "SUPPRIMER",
      acknowledgeTestDeletion: true,
      actorUserId,
      requestId: "req-delete-org",
      clientIp: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result).toEqual({
      organizationId: ORGANIZATION_ID,
      slug: "client-test",
      deleted: true,
    });
    expect(deleteProvisionedUser).toHaveBeenCalledWith("keycloak-user-1");
    expect(deleteProvisionedUser).toHaveBeenCalledWith(
      "orphan-keycloak-user-2",
    );
    expect(findManagedUsersByEmail).toHaveBeenCalledWith("ops@test.fr");
    expect(findManagedUsersByUsername).toHaveBeenCalledWith("ops@test.fr");
    expect(client.release).toHaveBeenCalled();
  });

  it("refuses permanent deletion for non-test organizations", async () => {
    const actorUserId = "11111111-1111-4111-8111-111111111111";
    const client = {
      query: vi.fn(
        async (sql: string, params?: unknown[]): Promise<QueryResult> => {
          if (sql === "BEGIN") {
            return { rows: [] };
          }

          if (sql === "ROLLBACK") {
            return { rows: [] };
          }

          if (
            sql.includes("FROM organizations o") &&
            sql.includes("FOR UPDATE")
          ) {
            expect(params).toEqual([ORGANIZATION_ID]);
            return {
              rows: [
                {
                  id: ORGANIZATION_ID,
                  name: "Client reel",
                  slug: "client-reel",
                  settings: { adminBackoffice: { isTest: false } },
                },
              ],
            };
          }

          throw new Error(
            `Unexpected SQL in non-test delete guard test: ${sql}`,
          );
        },
      ),
      release: vi.fn(),
    };

    const service = new AdminBackofficeService(null);
    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown);

    await expect(
      service.deleteOrganization({
        organizationId: ORGANIZATION_ID,
        organizationSlug: "client-reel",
        confirmationText: "SUPPRIMER",
        acknowledgeTestDeletion: true,
        actorUserId,
        requestId: "req-delete-org",
        clientIp: "127.0.0.1",
        userAgent: "vitest",
      }),
    ).rejects.toMatchObject({
      code: "DELETE_ONLY_FOR_TEST_ORGS",
      statusCode: 409,
    });
    expect(client.release).toHaveBeenCalled();
  });
});
