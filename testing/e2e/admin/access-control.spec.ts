import { test, expect } from "./fixtures/coverage";
import type { Page } from "@playwright/test";
import { E2E_AUTH_SESSION_SECRET } from "../fixtures/oidc-config";
import { applyOidcAuthCookies } from "../fixtures/oidc-auth";

const ADMIN_BASE_URL = "http://localhost:3002";
const ADMIN_CLIENT_ID = "praedixa-admin";
const ADMIN_SESSION_SECRET = E2E_AUTH_SESSION_SECRET;

async function setupAdminAuthWithoutSuperAdmin(page: Page) {
  await applyOidcAuthCookies(page, {
    app: "admin",
    baseUrl: ADMIN_BASE_URL,
    sessionSecret: ADMIN_SESSION_SECRET,
    clientId: ADMIN_CLIENT_ID,
    userId: "admin-00000000-0000-0000-0000-000000000001",
    email: "admin@praedixa.com",
    role: "org_admin",
    organizationId: "org-00000000-0000-0000-0000-000000000001",
    siteId: null,
  });
}

test.describe("Admin access control", () => {
  test("non-console-admin is redirected back to login", async ({ page }) => {
    await setupAdminAuthWithoutSuperAdmin(page);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      page.getByRole("heading", { name: "Connexion securisee", exact: true }),
    ).toBeVisible();
  });
});
