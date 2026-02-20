import type { Page } from "@playwright/test";
import { applyOidcAuthCookies } from "../../fixtures/oidc-auth";

const WEBAPP_BASE_URL = "http://localhost:3001";
const WEBAPP_CLIENT_ID = "praedixa-webapp";
const WEBAPP_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ?? "e2e-oidc-session-secret";

export const MOCK_USER = {
  id: "usr-00000000-0000-0000-0000-000000000001",
  email: "orgadmin@praedixa.com",
  orgId: "org-00000000-0000-0000-0000-000000000001",
  role: "org_admin",
  siteId: "site-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
} as const;

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
}
