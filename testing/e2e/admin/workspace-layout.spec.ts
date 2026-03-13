import { test, expect } from "./fixtures/coverage";
import { setupAdminAuth } from "./fixtures/auth";
import {
  mockVueClientApis,
  mockOrgDetailError,
  mockCatchAll,
  TEST_ORG_ID,
} from "./fixtures/workspace-mocks";

test.describe("Client workspace layout", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminAuth(page);
  });

  test("displays OrgHeader with org name, plan badge and status badge", async ({
    page,
  }) => {
    await mockCatchAll(page);
    await mockVueClientApis(page);
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(
      page.getByRole("heading", { name: "Acme Logistique", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    // Plan badge (professional) and status badge (active)
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Actif", { exact: true }).first(),
    ).toBeVisible();
  });

  test("displays client workspace tab links in ClientTabsNav", async ({
    page,
  }) => {
    await mockCatchAll(page);
    await mockVueClientApis(page);
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    const nav = page.getByRole("navigation", { name: "Onglets client" });
    await expect(nav).toBeVisible({ timeout: 10000 });

    const expectedTabs = [
      "Dashboard",
      "Donnees",
      "Previsions",
      "Actions",
      "Alertes",
      "Rapports",
      "Onboarding",
      "Config",
      "Equipe",
      "Messages",
    ];
    for (const tab of expectedTabs) {
      await expect(nav.getByText(tab, { exact: true })).toBeVisible();
    }
  });

  test("displays SiteTree with site names", async ({ page }) => {
    await mockCatchAll(page);
    await mockVueClientApis(page);
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    // SiteTree is in an aside (hidden on small screens, visible on lg+)
    // Force large viewport to show it
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByText("Tous les sites")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Lyon-Sat")).toBeVisible();
    await expect(page.getByText("Paris-CDG")).toBeVisible();
  });

  test("shows ErrorFallback when org detail fails", async ({ page }) => {
    await mockCatchAll(page);
    await mockOrgDetailError(page);
    await page.goto(`/clients/${TEST_ORG_ID}/vue-client`);

    await expect(page.getByText("Erreur de chargement")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Reessayer")).toBeVisible();
  });
});
