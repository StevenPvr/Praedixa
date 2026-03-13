import type { Page } from "@playwright/test";
import { E2E_AUTH_SESSION_SECRET } from "../../fixtures/oidc-config";
import { applyOidcAuthCookies } from "../../fixtures/oidc-auth";

const ADMIN_BASE_URL = "http://localhost:3002";
const ADMIN_CLIENT_ID = "praedixa-admin";
const ADMIN_SESSION_SECRET = E2E_AUTH_SESSION_SECRET;
const ADMIN_E2E_PERMISSIONS = [
  "admin:console:access",
  "admin:monitoring:read",
  "admin:org:read",
  "admin:org:write",
  "admin:users:read",
  "admin:users:write",
  "admin:billing:read",
  "admin:billing:write",
  "admin:audit:read",
  "admin:onboarding:read",
  "admin:onboarding:write",
  "admin:messages:read",
  "admin:messages:write",
  "admin:support:read",
  "admin:support:write",
  "admin:integrations:read",
  "admin:integrations:write",
] as const;

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
    permissions: [...ADMIN_E2E_PERMISSIONS],
    organizationId: null,
    siteId: null,
  });
}
