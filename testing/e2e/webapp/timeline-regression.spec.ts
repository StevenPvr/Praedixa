import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";
import { waitForApiRequest } from "../fixtures/network";
import { installTimelineMocks } from "./fixtures/timeline-mocks";

test.describe("Webapp timeline regression", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("updates pages when switching D0_AM -> D0_PM -> D1_AM", async ({
    page,
  }) => {
    const timeline = await installTimelineMocks(page, {
      scenarioId: "ops-rollover",
      initialTick: "D0_AM",
    });

    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", { name: "Anticipation des tensions" }),
    ).toBeVisible();
    await expect(page.getByText("Tension critique detectee")).toBeVisible();

    const alertsSection = page.getByLabel("Alertes prioritaires");
    await expect(alertsSection.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(alertsSection.getByText("Paris-CDG").first()).toBeVisible();
    await expect(alertsSection.getByText("Marseille")).toHaveCount(0);

    timeline.setTick("D0_PM");
    await page.reload();

    await expect(page.getByText("Tension critique detectee")).toBeVisible();
    await expect(alertsSection.getByText("Paris-CDG").first()).toBeVisible();
    await expect(alertsSection.getByText("Marseille").first()).toBeVisible();
    await expect(alertsSection.getByText("Lyon-Sat")).toHaveCount(0);

    await page.goto("/actions");
    const selector = page.getByLabel("Selection de l'alerte");
    await expect(selector.getByText("Paris-CDG").first()).toBeVisible();
    await expect(selector.getByText("Marseille").first()).toBeVisible();

    timeline.setTick("D1_AM");
    await page.reload();

    await expect(page.getByText("Aucune alerte active")).toBeVisible();
    await expect(page.getByText("Tous vos sites sont couverts")).toBeVisible();

    await page.goto("/previsions");
    await expect(page.getByText("Horizon stabilise")).toBeVisible();
    await expect(
      page.getByText("Aucune alerte active — vos sites sont couverts"),
    ).toBeVisible();
  });

  test("polling refresh picks updated queue without remocking routes", async ({
    page,
  }) => {
    const timeline = await installTimelineMocks(page, {
      scenarioId: "ops-rollover",
      initialTick: "D0_AM",
    });

    await page.goto("/actions");
    const selector = page.getByLabel("Selection de l'alerte");
    await expect(selector.getByText("Lyon-Sat").first()).toBeVisible();

    timeline.setTick("D0_PM");

    await waitForApiRequest(page, {
      pathname: "/api/v1/live/coverage-alerts/queue",
      query: { status: "open", limit: "50" },
      timeout: 15_000,
    });

    await expect(selector.getByText("Paris-CDG").first()).toBeVisible();
    await expect(selector.getByText("Marseille").first()).toBeVisible();
    await expect(selector.getByText("Lyon-Sat")).toHaveCount(0);
  });
});
