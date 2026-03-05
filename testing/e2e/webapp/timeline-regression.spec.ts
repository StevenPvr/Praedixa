import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";
import { installTimelineMocks } from "./fixtures/timeline-mocks";

test.describe("Webapp timeline regression", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("updates previsions and actions when tick changes D0_AM -> D0_PM -> D1_AM", async ({
    page,
  }) => {
    const timeline = await installTimelineMocks(page, {
      scenarioId: "ops-rollover",
      initialTick: "D0_AM",
    });

    await page.goto("/previsions");
    await expect(
      page.getByRole("heading", { name: "Previsions 7 jours" }),
    ).toBeVisible();
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();
    await expect(page.getByText("Paris-CDG").first()).toBeVisible();
    await expect(page.getByText("Marseille")).toHaveCount(0);

    timeline.setTick("D0_PM");
    await page.reload();

    await expect(page.getByText("Paris-CDG").first()).toBeVisible();
    await expect(page.getByText("Marseille").first()).toBeVisible();
    await expect(page.getByText("Lyon-Sat")).toHaveCount(0);

    await page.goto("/actions");
    await expect(page.getByText("Paris-CDG").first()).toBeVisible();
    await expect(page.getByText("Marseille").first()).toBeVisible();

    timeline.setTick("D1_AM");
    await page.reload();

    await expect(page.getByText("Aucune alerte.")).toBeVisible();

    await page.goto("/previsions");
    await expect(page.getByText("Aucune alerte active.")).toBeVisible();
  });

  test("actions page reflects latest tick after refresh", async ({ page }) => {
    const timeline = await installTimelineMocks(page, {
      scenarioId: "ops-rollover",
      initialTick: "D0_AM",
    });

    await page.goto("/actions");
    await expect(page.getByText("Lyon-Sat").first()).toBeVisible();

    timeline.setTick("D0_PM");
    await page.reload();

    await expect(page.getByText("Paris-CDG").first()).toBeVisible();
    await expect(page.getByText("Marseille").first()).toBeVisible();
    await expect(page.getByText("Lyon-Sat")).toHaveCount(0);
  });
});
