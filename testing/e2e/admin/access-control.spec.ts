import { test, expect } from "./fixtures/coverage";
import type { Page } from "@playwright/test";
import { applyOidcAuthCookies } from "../fixtures/oidc-auth";

const ADMIN_BASE_URL = "http://localhost:3002";
const ADMIN_CLIENT_ID = "praedixa-admin";
const ADMIN_SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ?? "e2e-oidc-session-secret";

async function setupAdminAuthWithoutSuperAdmin(page: Page) {
  await applyOidcAuthCookies(page, {
    app: "admin",
    baseUrl: ADMIN_BASE_URL,
    sessionSecret: ADMIN_SESSION_SECRET,
    clientId: ADMIN_CLIENT_ID,
    userId: "admin-00000000-0000-0000-0000-000000000001",
    email: "admin@praedixa.com",
    role: "admin",
    organizationId: null,
    siteId: null,
  });
}

test.describe("Admin access control", () => {
  test("authenticated admin can access dashboard", async ({
    page,
  }) => {
    await setupAdminAuthWithoutSuperAdmin(page);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Acces non autorise", exact: true }),
    ).toHaveCount(0);
  });
});
