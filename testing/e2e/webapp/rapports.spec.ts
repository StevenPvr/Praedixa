import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Rapports page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays title, subtitle, and report tabs", async ({ page }) => {
    await page.goto("/rapports", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await expect(
      page.getByRole("heading", { name: "Rapports board-ready" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Bilans executifs, suivi des couts et livrables partageables.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("tab", { name: "Bilan de la semaine" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Fiabilite des previsions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Analyse des couts" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Bilans mensuels" }),
    ).toBeVisible();
  });

  test("weekly summary tab is active by default and shows grouped data", async ({
    page,
  }) => {
    await page.goto("/rapports");

    const section = page.getByLabel("Bilan de la semaine");
    await expect(section).toBeVisible();
    await expect(section.getByText("Semaine du")).toBeVisible();
    await expect(
      section.getByRole("columnheader", { name: "Alertes detectees" }),
    ).toBeVisible();
    await expect(
      section.getByRole("cell", { name: "5", exact: true }).first(),
    ).toBeVisible();
  });

  test("weekly summary shows empty message when alerts API returns empty", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: "2026-02-09T07:00:00Z",
        }),
      }),
    );

    await page.goto("/rapports");

    await expect(
      page.getByText(
        "Aucune donnee pour le moment. Les bilans hebdomadaires apparaitront apres votre premiere semaine d'utilisation.",
      ),
    ).toBeVisible();
  });

  test("weekly summary shows error fallback when alerts API fails", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/coverage-alerts*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Erreur alerts" },
          timestamp: "2026-02-09T07:00:00Z",
        }),
      }),
    );

    await page.goto("/rapports");

    await expect(page.getByText("Erreur alerts")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Reessayer" })).toBeVisible();
  });

  test("precision tab shows stats and runs table", async ({ page }) => {
    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Fiabilite des previsions" }).click();

    const section = page.getByLabel("Fiabilite des previsions");
    await expect(section).toBeVisible();
    await expect(section.getByText("Runs completes")).toBeVisible();
    await expect(section.getByText("1", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Precision moyenne")).toBeVisible();
    await expect(section.getByText("91.0%").first()).toBeVisible();
    await expect(section.getByText("Meilleure precision")).toBeVisible();
  });

  test("precision tab handles mixed accuracy formats and null completed date", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/forecasts*", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname !== "/api/v1/live/forecasts") {
        return route.fallback();
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "run-1",
              modelType: "sarimax",
              horizonDays: 7,
              status: "completed",
              accuracyScore: 0.9,
              startedAt: "2026-02-01T08:00:00Z",
              completedAt: "2026-02-01T08:10:00Z",
            },
            {
              id: "run-2",
              modelType: "xgboost",
              horizonDays: 14,
              status: "completed",
              accuracyScore: 92,
              startedAt: "2026-02-02T08:00:00Z",
              completedAt: null,
            },
            {
              id: "run-3",
              modelType: "rf",
              horizonDays: 3,
              status: "completed",
              accuracyScore: null,
              startedAt: "2026-02-03T08:00:00Z",
              completedAt: "2026-02-03T08:10:00Z",
            },
          ],
          pagination: {
            total: 3,
            page: 1,
            pageSize: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: "2026-02-09T07:00:00Z",
        }),
      });
    });

    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Fiabilite des previsions" }).click();

    await expect(page.getByText("Runs completes")).toBeVisible();
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("91.0%").first()).toBeVisible();
    await expect(page.getByText("92.0%").first()).toBeVisible();
    await expect(
      page
        .getByLabel("Fiabilite des previsions")
        .getByRole("cell", { name: "-" })
        .first(),
    ).toBeVisible();
  });

  test("cost analysis tab shows waterfall chart", async ({ page }) => {
    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Analyse des couts" }).click();

    const section = page.getByLabel("Analyse des couts");
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("img", { name: "Waterfall chart" }),
    ).toBeVisible();
    await expect(
      section.getByTestId("waterfall-item-0").getByText("Sans intervention"),
    ).toBeVisible();
    await expect(
      section.getByText("Cout final", { exact: true }),
    ).toBeVisible();
  });

  test("cost analysis tab shows empty state when proof data is empty", async ({
    page,
  }) => {
    await page.route("**/api/v1/live/proof*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          timestamp: "2026-02-09T07:00:00Z",
        }),
      }),
    );

    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Analyse des couts" }).click();

    await expect(
      page.getByText(
        "Pas encore de donnees de couts. L'analyse apparaitra apres la cloture de votre premier mois.",
      ),
    ).toBeVisible();
  });

  test("monthly reports tab shows table and download button", async ({
    page,
  }) => {
    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Bilans mensuels" }).click();

    const section = page.getByLabel("Bilans mensuels");
    await expect(section).toBeVisible();
    await expect(section.getByText("Lyon-Sat")).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Telecharger en PDF" }),
    ).toBeEnabled();
  });

  test("monthly reports shows download error when PDF endpoint fails", async ({
    page,
  }) => {
    await page.route("**/api/v1/proof/pdf*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Erreur PDF" },
        }),
      }),
    );

    await page.goto("/rapports");
    await page.getByRole("tab", { name: "Bilans mensuels" }).click();
    await page.getByRole("button", { name: "Telecharger en PDF" }).click();

    await expect(page.getByText("Echec du telechargement (500)")).toBeVisible();
  });
});
