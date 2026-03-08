import type { Page } from "@playwright/test";
import { E2E_AUTH_SESSION_SECRET } from "../../fixtures/oidc-config";
import { applyOidcAuthCookies } from "../../fixtures/oidc-auth";

const WEBAPP_BASE_URL = "http://localhost:3001";
const WEBAPP_CLIENT_ID = "praedixa-webapp";
const WEBAPP_SESSION_SECRET = E2E_AUTH_SESSION_SECRET;

export const MOCK_USER = {
  id: "usr-00000000-0000-0000-0000-000000000001",
  email: "orgadmin@praedixa.com",
  orgId: "org-00000000-0000-0000-0000-000000000001",
  role: "org_admin",
  siteId: "site-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
} as const;

async function installShellApiDefaults(
  page: Page,
  siteId: string | null,
): Promise<void> {
  await page.route("**/api/v1/sites*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: siteId ?? MOCK_USER.siteId,
            organizationId: MOCK_USER.orgId,
            code: "LYS-01",
            name: "Lyon-Sat",
            timezone: "Europe/Paris",
            active: true,
            createdAt: "2026-02-07T12:00:00Z",
            updatedAt: "2026-02-07T12:00:00Z",
          },
        ],
        timestamp: "2026-02-07T12:00:00Z",
      }),
    }),
  );

  await page.route("**/api/v1/conversations/unread-count*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { unreadCount: 0 },
        timestamp: "2026-02-07T12:00:00Z",
      }),
    }),
  );

  await page.route("**/api/v1/live/coverage-alerts*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [],
        timestamp: "2026-02-07T12:00:00Z",
      }),
    }),
  );
}

type WebappRole =
  | "org_admin"
  | "manager"
  | "hr_manager"
  | "employee"
  | "viewer"
  | "super_admin";

interface SetupAuthOptions {
  role?: WebappRole;
  userId?: string;
  email?: string;
  organizationId?: string | null;
  siteId?: string | null;
}

export async function setupAuth(
  page: Page,
  options: SetupAuthOptions = {},
): Promise<void> {
  const role = options.role ?? MOCK_USER.role;
  const siteId =
    role === "manager" || role === "hr_manager"
      ? (options.siteId ?? MOCK_USER.siteId)
      : (options.siteId ?? null);

  await applyOidcAuthCookies(page, {
    app: "webapp",
    baseUrl: WEBAPP_BASE_URL,
    sessionSecret: WEBAPP_SESSION_SECRET,
    clientId: WEBAPP_CLIENT_ID,
    userId: options.userId ?? MOCK_USER.id,
    email: options.email ?? MOCK_USER.email,
    role,
    organizationId: options.organizationId ?? MOCK_USER.orgId,
    siteId,
  });

  await installShellApiDefaults(page, siteId);
}
