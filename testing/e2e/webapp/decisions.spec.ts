import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Actions decisions flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("shows treatment sections and alerts list", async ({ page }) => {
    await page.goto("/actions");

    await expect(
      page.getByRole("heading", { name: "Centre Actions" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alertes" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Diagnostic" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Options recommandees" }),
    ).toBeVisible();
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();
  });

  test("recommended option is preselected before validation", async ({
    page,
  }) => {
    await page.goto("/actions");

    const validateButton = page.getByRole("button", {
      name: "Valider la decision",
    });

    await expect(validateButton).toBeEnabled();
  });

  test("history tab shows decision table", async ({ page }) => {
    await page.goto("/actions");
    await page.getByRole("button", { name: "Historique" }).click();

    await expect(
      page.getByRole("columnheader", { name: "Decision" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Statut" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Confiance" }),
    ).toBeVisible();
  });

  test("empty alerts state is shown when API returns no active alerts", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/coverage-alerts*", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("status") !== "open") {
        return route.fallback();
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: "2026-02-07T12:00:00Z",
        }),
      });
    });

    await page.goto("/actions");
    await expect(page.getByText("Aucune alerte.")).toBeVisible();
  });
});
