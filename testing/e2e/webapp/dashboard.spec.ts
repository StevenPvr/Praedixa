import { test, expect } from "./fixtures/coverage";
import { setupAuth } from "./fixtures/auth";
import { mockAllApis } from "./fixtures/api-mocks";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAllApis(page);
  });

  test("displays page title and subtitle", async ({ page }) => {
    await page.goto("/dashboard");
    const main = page.getByRole("main");

    await expect(
      page.getByRole("heading", { name: "Priorites du jour" }),
    ).toBeVisible();
    await expect(
      main.getByText(
        "Vue synthese des risques, de la qualite data et des prochaines actions.",
      ),
    ).toBeVisible();
  });

  test("displays KPI cards", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Alertes ouvertes").first()).toBeVisible();
    await expect(page.getByText("Couverture humaine").first()).toBeVisible();
    await expect(page.getByText("Qualite data").first()).toBeVisible();
    await expect(page.getByText("Precision prevision").first()).toBeVisible();
    await expect(page.getByText("87%").first()).toBeVisible();
  });

  test("shows alert priority section with actions link", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Alertes prioritaires" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ouvrir Actions" }),
    ).toHaveAttribute("href", "/actions");
  });

  test("shows critical banner copy based on mock counts", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByText(
        "1 alerte(s) critique(s) et 1 alerte(s) elevee(s) necessitent une decision immediate.",
      ),
    ).toBeVisible();
  });
});
