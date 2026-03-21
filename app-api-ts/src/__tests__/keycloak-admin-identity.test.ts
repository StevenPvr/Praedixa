import { afterEach, describe, expect, it, vi } from "vitest";

import {
  KeycloakAdminIdentityError,
  KeycloakAdminIdentityService,
  getKeycloakAdminIdentityServiceFromEnv,
} from "../services/keycloak-admin-identity.js";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("keycloak admin identity service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when runtime provisioning credentials are missing", () => {
    expect(
      getKeycloakAdminIdentityServiceFromEnv({
        AUTH_ISSUER_URL: "https://auth.praedixa.com/realms/praedixa",
      }),
    ).toBeNull();
  });

  it("provisions a Keycloak user, syncs canonical attributes, and sends the setup email", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: {
            location:
              "https://auth.praedixa.com/admin/realms/praedixa/users/user-1",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "user-1",
          email: "manager@praedixa.com",
          enabled: true,
          requiredActions: ["UPDATE_PASSWORD"],
          attributes: {
            locale: ["fr"],
            permissions: ["admin:console:access"],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-org-admin", name: "org_admin" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-hr-manager", name: "hr_manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-manager", name: "manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-employee", name: "employee" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-viewer", name: "viewer" }),
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    const result = await service.provisionUser({
      email: "manager@praedixa.com",
      organizationId: "44444444-4444-4444-4444-444444444444",
      role: "manager",
      siteId: "77777777-7777-7777-7777-777777777777",
    });

    expect(result).toEqual({ authUserId: "user-1" });

    const updateCall = fetchMock.mock.calls[9];
    const updateInit = updateCall?.[1] as RequestInit | undefined;
    expect(String(updateCall?.[0])).toContain(
      "/admin/realms/praedixa/users/user-1",
    );
    expect(JSON.parse(String(updateInit?.body))).toMatchObject({
      enabled: true,
      requiredActions: ["UPDATE_PASSWORD"],
      attributes: {
        locale: ["fr"],
        role: ["manager"],
        organization_id: ["44444444-4444-4444-4444-444444444444"],
        site_id: ["77777777-7777-7777-7777-777777777777"],
      },
    });

    const roleMappingCall = fetchMock.mock.calls[10];
    const roleMappingInit = roleMappingCall?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(roleMappingInit?.body))).toEqual([
      { id: "role-manager", name: "manager" },
    ]);

    const inviteCall = fetchMock.mock.calls[11];
    expect(String(inviteCall?.[0])).toContain("execute-actions-email");
    const inviteInit = inviteCall?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(inviteInit?.body))).toEqual(["UPDATE_PASSWORD"]);
  });

  it("deletes the created Keycloak user when the setup email fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: {
            location:
              "https://auth.praedixa.com/admin/realms/praedixa/users/user-2",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "user-2",
          email: "viewer@praedixa.com",
          enabled: true,
          requiredActions: ["UPDATE_PASSWORD"],
          attributes: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-org-admin", name: "org_admin" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-hr-manager", name: "hr_manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-manager", name: "manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-employee", name: "employee" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-viewer", name: "viewer" }),
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        jsonResponse({ errorMessage: "smtp unavailable" }, { status: 500 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    await expect(
      service.provisionUser({
        email: "viewer@praedixa.com",
        organizationId: "44444444-4444-4444-4444-444444444444",
        role: "viewer",
        siteId: null,
      }),
    ).rejects.toBeInstanceOf(KeycloakAdminIdentityError);

    const cleanupCall = fetchMock.mock.calls.at(-1);
    expect(String(cleanupCall?.[0])).toContain(
      "/admin/realms/praedixa/users/user-2",
    );
    const cleanupInit = cleanupCall?.[1] as RequestInit | undefined;
    expect(cleanupInit?.method).toBe("DELETE");
  });

  it("surfaces a realm email sender misconfiguration with an actionable error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: {
            location:
              "https://auth.praedixa.com/admin/realms/praedixa/users/user-2",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "user-2",
          email: "viewer@praedixa.com",
          enabled: true,
          requiredActions: ["UPDATE_PASSWORD"],
          attributes: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-org-admin", name: "org_admin" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-hr-manager", name: "hr_manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-manager", name: "manager" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-employee", name: "employee" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "role-viewer", name: "viewer" }),
      )
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            errorMessage:
              "Failed to send execute actions email: Invalid sender address 'null'.",
          },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    await expect(
      service.provisionUser({
        email: "viewer@praedixa.com",
        organizationId: "44444444-4444-4444-4444-444444444444",
        role: "viewer",
        siteId: null,
      }),
    ).rejects.toMatchObject({
      code: "IDENTITY_EMAIL_NOT_CONFIGURED",
      statusCode: 503,
      message:
        "Keycloak realm email sender is not configured. Set smtpServer.from before sending execute-actions-email.",
      details: {
        cause:
          "Failed to send execute actions email: Invalid sender address 'null'.",
      },
    });
  });

  it("finds managed Keycloak users by exact email with canonical attributes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "user-3",
            email: "ops@test.fr",
            enabled: true,
            attributes: {
              role: ["org_admin"],
              organization_id: ["44444444-4444-4444-4444-444444444444"],
              site_id: ["77777777-7777-7777-7777-777777777777"],
            },
          },
          {
            id: "user-ignored",
            email: "other@test.fr",
            enabled: true,
            attributes: {
              role: ["viewer"],
              organization_id: ["99999999-9999-4999-8999-999999999999"],
            },
          },
        ]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    const result = await service.findManagedUsersByEmail("ops@test.fr");

    expect(result).toEqual([
      {
        authUserId: "user-3",
        username: null,
        email: "ops@test.fr",
        organizationId: "44444444-4444-4444-4444-444444444444",
        role: "org_admin",
        siteId: "77777777-7777-7777-7777-777777777777",
        enabled: true,
      },
    ]);
  });

  it("finds managed Keycloak users by exact username", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "user-4",
            username: "ops@test.fr",
            enabled: true,
            attributes: {},
          },
        ]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    const result = await service.findManagedUsersByUsername("ops@test.fr");

    expect(result).toEqual([
      {
        authUserId: "user-4",
        username: "ops@test.fr",
        email: null,
        organizationId: null,
        role: null,
        siteId: null,
        enabled: true,
      },
    ]);
  });

  it("reports a username conflict when Keycloak rejects user creation on username only", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token" }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "user-5",
            username: "ops@test.fr",
            enabled: true,
            attributes: {},
          },
        ]),
      );

    vi.stubGlobal("fetch", fetchMock);

    const service = new KeycloakAdminIdentityService({
      adminRealm: "master",
      appRealm: "praedixa",
      baseUrl: "https://auth.praedixa.com",
      adminUsername: "kcadmin",
      adminPassword: "secret",
    });

    await expect(
      service.provisionUser({
        email: "ops@test.fr",
        organizationId: "44444444-4444-4444-4444-444444444444",
        role: "org_admin",
        siteId: null,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A Keycloak user with this username already exists",
      details: {
        conflictField: "username",
      },
    });
  });
});
