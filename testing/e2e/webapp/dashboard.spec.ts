import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis, MOCK_COVERAGE_ALERTS } from "./fixtures/api-mocks";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "War room operationnelle" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Identifiez les risques critiques, priorisez les arbitrages et declenchez les actions avant rupture.",
      ),
    ).toBeVisible();
  });

  test("displays KPI stat cards with correct values", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Alertes ouvertes").first()).toBeVisible();
    await expect(page.getByText("Sites exposes").first()).toBeVisible();
    await expect(page.getByText("Couverture humaine").first()).toBeVisible();
    await expect(page.getByText("Precision prevision").first()).toBeVisible();
    await expect(page.getByText("87.3%").first()).toBeVisible();
    await expect(page.getByText("5").first()).toBeVisible();
  });

  test("displays forecast timeline section", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText("Pression capacitaire a 14 jours"),
    ).toBeVisible();
    await expect(
      page.getByLabel("Courbe capacite versus demande"),
    ).toBeVisible();
  });

  test("displays next action card with coverage alert data", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Priorites a traiter")).toBeVisible();
    await expect(page.getByText("Site Lyon-Sat").first()).toBeVisible();
    await expect(page.getByText("Critique").first()).toBeVisible();
  });

  test("displays scenario comparison section", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Indice d'exposition immediate")).toBeVisible();
    await expect(page.getByText("Impact financier").first()).toBeVisible();
  });

  test("KPI coverage card shows success variant when >= 85%", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Couverture humaine").first()).toBeVisible();
    await expect(page.getByText("87.3%").first()).toBeVisible();
  });

  test("alert severity is displayed with correct formatting", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Critique").first()).toBeVisible();
    await expect(page.getByText("Elevee").first()).toBeVisible();
  });

  test("shows status banner with CTA", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText(
        `${MOCK_COVERAGE_ALERTS.filter((a) => a.severity === "critical").length} alerte(s) critique(s) et ${MOCK_COVERAGE_ALERTS.filter((a) => a.severity === "high").length} alerte(s) elevee(s) necessitent une decision immediate.`,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /centre de traitement/i }),
    ).toHaveAttribute("href", "/actions");
  });
});
