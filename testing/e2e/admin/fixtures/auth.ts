import type { Page } from "@playwright/test";
import { applyOidcAuthCookies } from "../../fixtures/oidc-auth";

const ADMIN_BASE_URL = "http://localhost:3002";
const ADMIN_CLIENT_ID = "praedixa-admin";
const ADMIN_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ?? "e2e-oidc-session-secret";

export const MOCK_ADMIN_USER = {
  id: "sa-00000000-0000-0000-0000-000000000001",
  email: "superadmin@praedixa.com",
  role: "super_admin",
} as const;

export async function setupAdminAuth(page: Page): Promise<void> {
  await applyOidcAuthCookies(page, {
    app: "admin",
    baseUrl: ADMIN_BASE_URL,
    sessionSecret: ADMIN_SESSION_SECRET,
    clientId: ADMIN_CLIENT_ID,
    userId: MOCK_ADMIN_USER.id,
    email: MOCK_ADMIN_USER.email,
    role: MOCK_ADMIN_USER.role,
    organizationId: null,
    siteId: null,
  });
}
